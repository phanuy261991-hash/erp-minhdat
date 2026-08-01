// Route "Thiet lap lan dau" (2026-08-01) - dung khi dong goi app thanh file .exe chay tren may
// nguoi dung khong co san npm/bien moi truong de chay "npm run seed:admin". Chi hoat dong khi
// bang users CHUA co tai khoan nao - ngay khi co 1 tai khoan (thuong la Admin vua tao), route
// POST tu dong khoa lai vinh vien, tranh ai do tao them tai khoan Admin khong qua kiem soat.
//
// Khong gan requireAuth (hien nhien - chua ai dang nhap duoc luc nay).

const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/database');

const router = express.Router();
const SALT_ROUNDS = 10;

function hasAnyUser() {
  const row = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  return row.count > 0;
}

router.get('/status', (req, res) => {
  res.json({ needs_setup: !hasAnyUser() });
});

router.post('/', (req, res) => {
  if (hasAnyUser()) {
    return res.status(400).json({ error: 'He thong da duoc thiet lap truoc do, khong the tao lai tai khoan admin dau tien.' });
  }

  const { username, password, full_name: fullName, company_name: companyName } = req.body || {};

  if (!username || !String(username).trim()) {
    return res.status(400).json({ error: 'Thieu ten dang nhap' });
  }
  if (!fullName || !String(fullName).trim()) {
    return res.status(400).json({ error: 'Thieu ho ten' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Mat khau phai co it nhat 6 ky tu' });
  }

  const adminRole = db.prepare('SELECT id FROM roles WHERE is_protected = 1').get();
  if (!adminRole) {
    // Khong the xay ra trong dieu kien binh thuong (migration 002 luon seed san vai tro Admin) -
    // chi xay ra neu database bi loi/thieu migration, bao loi ro thay vi crash mo ho.
    return res.status(500).json({ error: 'Du lieu he thong chua day du (thieu vai tro Admin) - kiem tra lai qua trinh khoi tao database.' });
  }

  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  const result = db
    .prepare('INSERT INTO users (username, password_hash, full_name, role_id, is_active) VALUES (?, ?, ?, ?, 1)')
    .run(String(username).trim(), passwordHash, String(fullName).trim(), adminRole.id);

  if (companyName && String(companyName).trim()) {
    db.prepare("UPDATE company_settings SET company_name = ?, updated_at = datetime('now') WHERE id = 1")
      .run(String(companyName).trim());
  }

  res.status(201).json({ ok: true, user_id: result.lastInsertRowid });
});

module.exports = router;
