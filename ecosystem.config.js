// Cau hinh PM2 (Phase 5 - Van hanh & Go-live). Xem huong dan day du: docs/DEPLOY.md.
// KHONG ghi SESSION_SECRET truc tiep vao file nay (file nay duoc commit vao git - xem
// CLAUDE.md "khong hardcode thong tin tai khoan/API key/secret") - dat truoc bang bien moi
// truong he thong (setx SESSION_SECRET "..."), PM2 se tu ke thua khi chay "pm2 start" tu
// chinh phien terminal da dat bien do.

module.exports = {
  apps: [
    {
      name: 'kho-app',
      script: 'backend/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
