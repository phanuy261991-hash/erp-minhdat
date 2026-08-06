// Route nhan bao loi JS chua xu ly tu trinh duyet (window.onerror/unhandledrejection, gan o
// frontend/assets/api.js - nap tren MOI trang ke ca login.html/setup.html), ghi vao log server
// dung chung (backend/utils/logger.js). Khong doi hoi dang nhap (loi co the xay ra ngay ca truoc
// khi dang nhap), khong gan quyen module nao vi day la ha tang chan doan, khong phai du lieu
// nghiep vu - xem docs/CHANGELOG.md muc dieu tra "dung ung dung thi bi do" (2026-08-06).

const express = require('express');
const log = require('../utils/logger');

const router = express.Router();

const MAX_FIELD_LENGTH = 2000;
function truncate(value) {
  const str = value === undefined || value === null ? '' : String(value);
  return str.length > MAX_FIELD_LENGTH ? `${str.slice(0, MAX_FIELD_LENGTH)}...(cat bot)` : str;
}

router.post('/', (req, res) => {
  const body = req.body || {};
  const user = req.session && req.session.user ? req.session.user.username : '(chua dang nhap)';
  const message = truncate(body.message);
  const stack = truncate(body.stack);
  const url = truncate(body.url);
  const userAgent = truncate(body.userAgent);

  log.error(`CLIENT JS ERROR - user=${user} - url=${url} - userAgent=${userAgent} - message=${message}${stack ? ` - stack: ${stack}` : ''}`);
  res.json({ ok: true });
});

module.exports = router;
