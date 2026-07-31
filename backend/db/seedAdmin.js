// Script seed tai khoan admin dau tien cho he thong.
// KHONG hardcode username/password vao code - doc tu bien moi truong
// ADMIN_USERNAME / ADMIN_PASSWORD (tuy chon them ADMIN_FULL_NAME).
//
// Vi du chay (PowerShell):
//   $env:ADMIN_USERNAME="admin"; $env:ADMIN_PASSWORD="MatKhauManh123"; npm run seed:admin
// Vi du chay (Git Bash / cmd tren Linux-like shell):
//   ADMIN_USERNAME=admin ADMIN_PASSWORD=MatKhauManh123 npm run seed:admin

const bcrypt = require('bcrypt');
const db = require('./database');

const SALT_ROUNDS = 10;

function seedAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME || 'Quản trị viên';

  if (!username || !password) {
    console.error('Thieu bien moi truong ADMIN_USERNAME hoac ADMIN_PASSWORD.');
    console.error('Vi du (PowerShell): $env:ADMIN_USERNAME="admin"; $env:ADMIN_PASSWORD="MatKhauManh123"; npm run seed:admin');
    process.exitCode = 1;
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    console.log(`Tai khoan '${username}' da ton tai, bo qua seed.`);
    return;
  }

  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);

  db.prepare(
    'INSERT INTO users (username, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, 1)'
  ).run(username, passwordHash, fullName, 'admin');

  console.log(`Da tao tai khoan admin '${username}'.`);
}

if (require.main === module) {
  seedAdmin();
}

module.exports = { seedAdmin };
