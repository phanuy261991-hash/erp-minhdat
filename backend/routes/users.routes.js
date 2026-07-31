// Route quan tri tai khoan nguoi dung: danh sach, tao moi, khoa/mo.
// Toan bo route trong file nay chi danh cho ai co quyen module 'nguoi_dung' (gan
// requirePermission khi mount o server.js).

const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/database');

const router = express.Router();

const SALT_ROUNDS = 10;

const SELECT_USER_WITH_ROLE = `
  SELECT u.id, u.username, u.full_name, u.role_id, r.name AS role_name, r.is_protected,
         u.is_active, u.created_at
  FROM users u
  JOIN roles r ON r.id = u.role_id
`;

router.get('/', (req, res) => {
  const users = db.prepare(`${SELECT_USER_WITH_ROLE} ORDER BY u.created_at DESC`).all();
  res.json({ users: users.map(withBooleanProtected) });
});

router.post('/', (req, res) => {
  const { username, password, full_name: fullName, role_id: roleId } = req.body || {};

  if (!username || !password || !fullName || !roleId) {
    return res.status(400).json({ error: 'Thieu thong tin bat buoc' });
  }

  const role = db.prepare('SELECT id FROM roles WHERE id = ?').get(roleId);
  if (!role) {
    return res.status(400).json({ error: 'Vai tro khong hop le' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Mat khau phai co it nhat 6 ky tu' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Ten dang nhap da ton tai' });
  }

  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);

  const result = db
    .prepare('INSERT INTO users (username, password_hash, full_name, role_id, is_active) VALUES (?, ?, ?, ?, 1)')
    .run(username, passwordHash, fullName, roleId);

  const user = db
    .prepare(`${SELECT_USER_WITH_ROLE} WHERE u.id = ?`)
    .get(result.lastInsertRowid);

  res.status(201).json({ user: withBooleanProtected(user) });
});

router.patch('/:id/deactivate', (req, res) => {
  setActiveState(req, res, 0);
});

router.patch('/:id/activate', (req, res) => {
  setActiveState(req, res, 1);
});

// Khoa/mo tai khoan dung chung 1 ham - tranh lap logic kiem tra ton tai + tu khoa chinh minh.
function setActiveState(req, res, isActive) {
  const targetId = Number(req.params.id);

  if (isActive === 0 && targetId === req.session.user.id) {
    return res.status(400).json({ error: 'Khong the tu khoa chinh tai khoan dang dang nhap' });
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
  if (!user) {
    return res.status(404).json({ error: 'Khong tim thay tai khoan' });
  }

  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive, targetId);

  const updated = db.prepare(`${SELECT_USER_WITH_ROLE} WHERE u.id = ?`).get(targetId);
  res.json({ user: withBooleanProtected(updated) });
}

function withBooleanProtected(user) {
  return { ...user, is_protected: Boolean(user.is_protected) };
}

module.exports = router;
