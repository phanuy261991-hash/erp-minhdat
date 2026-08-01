// Dong goi ung dung thanh 1 thu muc "portable" tu chua Node.js (khong can nguoi dung tu cai
// Node/npm) - giai phap thay the cho pkg (da thu va bi loi crash native-addon voi
// better-sqlite3/bcrypt trong moi truong build hien tai, xem docs/DECISIONS.md).
//
// Ket qua: thu muc dist/ co the nen lai (zip) va copy nguyen sang may nguoi dung, giai nen roi
// chay start.bat - khong can cai gi them. Luu y: khac voi 1 file .exe don, cach nay KHONG che
// giau ma nguon backend (van la file .js thuong, doc duoc neu ai co quyen truy cap truc tiep
// thu muc tren may chu) - da trao doi ro voi nguoi dung truoc khi chon huong nay.
//
// Chay: npm run build:portable

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

function findSystemNodeExe() {
  try {
    const nodePath = execSync('where node', { encoding: 'utf8' }).split(/\r?\n/)[0].trim();
    if (nodePath && fs.existsSync(nodePath)) {
      return nodePath;
    }
  } catch (err) {
    // roi xuong bao loi ben duoi
  }
  console.error('Khong tim thay node.exe he thong (lenh "where node" that bai). Hay cai Node.js tren may build.');
  process.exit(1);
}

function copyDir(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
}

console.log('Don dep thu muc dist/ cu...');
fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(DIST_DIR, { recursive: true });

console.log('Copy backend/...');
copyDir(path.join(ROOT_DIR, 'backend'), path.join(DIST_DIR, 'backend'));

console.log('Copy frontend/...');
copyDir(path.join(ROOT_DIR, 'frontend'), path.join(DIST_DIR, 'frontend'));

console.log('Copy scripts/ (backup.js duoc backend/routes/warehouseSettings.routes.js goi lai)...');
copyDir(path.join(ROOT_DIR, 'scripts'), path.join(DIST_DIR, 'scripts'));

console.log('Copy node_modules/ (co the mat vai phut vi bao gom ca better-sqlite3/bcrypt)...');
copyDir(path.join(ROOT_DIR, 'node_modules'), path.join(DIST_DIR, 'node_modules'));

console.log('Copy package.json...');
fs.copyFileSync(path.join(ROOT_DIR, 'package.json'), path.join(DIST_DIR, 'package.json'));

console.log('Tao thu muc data/ rong...');
fs.mkdirSync(path.join(DIST_DIR, 'data'), { recursive: true });

console.log('Copy node.exe portable...');
const systemNodeExe = findSystemNodeExe();
fs.copyFileSync(systemNodeExe, path.join(DIST_DIR, 'node.exe'));

console.log('Tao start.bat...');
const startBat = [
  '@echo off',
  'title Phan mem quan ly kho va cong no - MinhDat',
  'cd /d "%~dp0"',
  '"%~dp0node.exe" "%~dp0backend\\server.js"',
  'echo.',
  'echo Server da dung. Nhan phim bat ky de dong cua so nay.',
  'pause >nul',
].join('\r\n');
fs.writeFileSync(path.join(DIST_DIR, 'start.bat'), startBat);

console.log('Copy script cai/go tu dong khoi dong...');
['install-autostart.ps1', 'uninstall-autostart.ps1'].forEach((name) => {
  fs.copyFileSync(path.join(__dirname, name), path.join(DIST_DIR, name));
});

console.log('\nHoan tat. Thu muc dist/ da san sang:');
console.log('  - Chay thu tai cho: dist/start.bat');
console.log('  - Trien khai: nen (zip) toan bo thu muc dist/, copy sang may/server that, giai nen, chay start.bat.');
console.log('  - Tu dong khoi dong cung Windows: xem docs/DEPLOY.md muc "Tu dong khoi dong cung Windows".');
