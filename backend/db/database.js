// Khoi tao ket noi better-sqlite3 toi file data/data.db.
// Bat buoc WAL mode de giam loi khoa (SQLITE_BUSY) khi nhieu nguoi cung ghi du lieu.
// Khong duoc tat WAL mode - xem CLAUDE.md muc "Key Constraints".

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'data.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
// Bat rang buoc khoa ngoai (foreign_keys) de dam bao dung quan he da thiet ke trong erd.mermaid.
db.pragma('foreign_keys = ON');

// Gan kem duong dan file data.db thuc te vao chinh instance db - de cac noi khac (vd
// scripts/backup.js) dung chung 1 nguon, khong tu ghep lai duong dan.
db.dataFilePath = DB_PATH;

module.exports = db;
