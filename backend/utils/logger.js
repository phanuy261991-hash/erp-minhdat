// Logger dung chung: ghi ra console (nhu truoc) DONG THOI ghi ra file xoay theo ngay trong
// data/logs/ - truoc day server chi console.log/console.error, mat het khi dong cua so
// terminal/portable start.bat (chua co PM2 tren may chu that de tu luu log, xem docs/TASK.md
// Phase 5). Them sau khi dieu tra bao cao "dung ung dung thi bi do" (2026-08-06) - can log ton
// tai lau dai de phan tich neu tai dien, thay vi khong co gi de doi chieu nhu lan dau.

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', '..', 'data', 'logs');
const RETENTION_DAYS = 14; // dong bo RETENTION_DAYS cua scripts/backup.js

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Gio VN co dinh UTC+7 - dong bo nguyen tac todayVN() da dung o project.service.js/cashVoucher.service.js.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
function nowVN() {
  return new Date(Date.now() + VN_OFFSET_MS);
}
function todayFileSuffix() {
  return nowVN().toISOString().slice(0, 10); // YYYY-MM-DD
}
function formatTimestamp() {
  return nowVN().toISOString().replace('T', ' ').slice(0, 19); // YYYY-MM-DD HH:MM:SS
}

// Xoa file log cu hon RETENTION_DAYS - tranh thu muc log phinh to vo han (cung ly do voi
// pruneOldBackups() trong scripts/backup.js).
function pruneOldLogs() {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let files;
  try {
    files = fs.readdirSync(LOG_DIR);
  } catch (err) {
    return;
  }
  files
    .filter((name) => /^server-\d{4}-\d{2}-\d{2}\.log$/.test(name))
    .forEach((name) => {
      const filePath = path.join(LOG_DIR, name);
      try {
        if (fs.statSync(filePath).mtimeMs < cutoff) fs.unlinkSync(filePath);
      } catch (err) {
        // Bo qua loi xoa 1 file don le - khong lam gian doan ghi log chinh.
      }
    });
}

function writeLine(level, message) {
  const line = `[${formatTimestamp()}] [${level}] ${message}\n`;
  try {
    fs.appendFileSync(path.join(LOG_DIR, `server-${todayFileSuffix()}.log`), line, 'utf8');
  } catch (err) {
    // Ghi file loi thi thoi - khong duoc lam crash ung dung chi vi khong ghi duoc log.
  }
  return line;
}

const log = {
  info(message) {
    process.stdout.write(writeLine('INFO', message));
  },
  warn(message) {
    process.stdout.write(writeLine('WARN', message));
  },
  error(message) {
    process.stderr.write(writeLine('ERROR', message));
  },
};

pruneOldLogs();

module.exports = log;
