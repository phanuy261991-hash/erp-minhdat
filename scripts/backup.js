// Script backup data.db (Phase 5, xem docs/Plan.md muc 4 va docs/DEPLOY.md).
// Doc duong dan luu backup tu warehouse_settings.backup_path (cau hinh qua trang "Cau hinh
// kho" trong ung dung, khong hardcode duong dan co dinh trong script - nguoi dung tu chon).
//
// Chay tay:      node scripts/backup.js
// Chay theo lich: dat 1 Task trong Windows Task Scheduler goi "node scripts/backup.js"
//                 (xem huong dan chi tiet trong docs/DEPLOY.md) - script nay khong tu dang
//                 ky lich, chi thuc hien 1 lan backup moi khi duoc goi.
//
// Cung duoc goi lai (qua ham runBackup) tu backend/routes/warehouseSettings.routes.js cho nut
// "Backup ngay" tren giao dien, de nguoi dung xac nhan cau hinh dung ma khong can doi den lich
// chay tu dong.

const fs = require('fs');
const path = require('path');
const db = require('../backend/db/database');

const RETENTION_DAYS = 14;
// Lay tu chinh db (da tinh dung theo BASE_DIR trong database.js), khong tu ghep __dirname o day -
// se sai khi chay tu ban dong goi .exe (xem backend/db/database.js).
const DATA_FILE_PATH = db.dataFilePath;

class BackupError extends Error {}

// Xoa ban backup cu hon RETENTION_DAYS - tranh thu muc backup phinh to vo han theo thoi gian,
// nguoi dung van co the tu sao chep ra noi khac neu muon giu lau hon.
function pruneOldBackups(backupPath) {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(backupPath).filter((name) => /^data-.*\.db$/.test(name));

  files.forEach((name) => {
    const filePath = path.join(backupPath, name);
    const stat = fs.statSync(filePath);
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(filePath);
    }
  });
}

function runBackup() {
  const row = db.prepare("SELECT value FROM warehouse_settings WHERE key = 'backup_path'").get();
  const backupPath = row && row.value ? row.value.trim() : '';

  if (!backupPath) {
    throw new BackupError('Chua cau hinh duong dan backup - vao trang "Cau hinh kho" de chon.');
  }

  try {
    fs.mkdirSync(backupPath, { recursive: true });
  } catch (err) {
    throw new BackupError(`Khong the tao/truy cap thu muc backup "${backupPath}": ${err.message}`);
  }

  // Checkpoint WAL truoc khi copy - dam bao du lieu moi nhat da duoc ghi vao file data.db
  // chinh (khong nam rieng trong file -wal), tranh ban backup thieu giao dich gan nhat.
  db.pragma('wal_checkpoint(TRUNCATE)');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destPath = path.join(backupPath, `data-${timestamp}.db`);

  fs.copyFileSync(DATA_FILE_PATH, destPath);
  pruneOldBackups(backupPath);

  return destPath;
}

if (require.main === module) {
  try {
    const destPath = runBackup();
    console.log(`Backup thanh cong: ${destPath}`);
    process.exit(0);
  } catch (err) {
    console.error(`Backup that bai: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { runBackup, BackupError };
