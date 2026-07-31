// Route xu ly dang nhap / dang xuat / lay thong tin user hien tai qua session.

const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { MODULE_KEYS } = require('../config/modules');

const router = express.Router();

// Admin (is_protected) mac nhien co moi module, khong tra bang role_permissions.
function getPermissions(roleId, isProtected) {
  if (isProtected) {
    return MODULE_KEYS.slice();
  }
  const rows = db.prepare('SELECT module_key FROM role_permissions WHERE role_id = ?').all(roleId);
  return rows.map((row) => row.module_key);
}

function buildSessionUser(row) {
  return {
    id: row.id,
    username: row.username,
    full_name: row.full_name,
    role_id: row.role_id,
    role_name: row.role_name,
    is_protected: Boolean(row.is_protected),
  };
}

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Thieu username hoac password' });
  }

  const user = db
    .prepare(
      `SELECT u.*, r.name AS role_name, r.is_protected
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.username = ?`
    )
    .get(username);

  // Tra ve chung 1 thong bao loi cho ca 2 truong hop (sai username / sai password / tai khoan
  // bi khoa) de tranh lo thong tin username nao ton tai trong he thong.
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Sai username hoac password' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Sai username hoac password' });
  }

  // Chi luu thong tin toi thieu can thiet vao session, tuyet doi khong luu password_hash.
  req.session.user = buildSessionUser(user);

  res.json({
    user: { ...req.session.user, permissions: getPermissions(user.role_id, user.is_protected) },
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Khong the dang xuat' });
    }
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', requireAuth, (req, res) => {
  const { user } = req.session;
  res.json({
    user: { ...user, permissions: getPermissions(user.role_id, user.is_protected) },
  });
});

module.exports = router;
