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

  // Tim vai tro Admin (is_protected) thay vi cot "role" TEXT co dinh cu - da doi sang
  // role_id/bang roles tu migration 002 (xem docs/Plan.md muc 2b), script nay truoc do van
  // dung schema cu nen se loi neu chay - da sua lai cho dung schema hien tai.
  const adminRole = db.prepare('SELECT id FROM roles WHERE is_protected = 1').get();
  if (!adminRole) {
    console.error('Khong tim thay vai tro Admin (is_protected=1) - hay chay "npm run migrate" truoc.');
    process.exitCode = 1;
    return;
  }

  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);

  db.prepare(
    'INSERT INTO users (username, password_hash, full_name, role_id, is_active) VALUES (?, ?, ?, ?, 1)'
  ).run(username, passwordHash, fullName, adminRole.id);

  console.log(`Da tao tai khoan admin '${username}'.`);
}

if (require.main === module) {
  seedAdmin();
}

module.exports = { seedAdmin };
