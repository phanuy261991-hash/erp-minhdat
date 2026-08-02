// Route cau hinh So quy: chi 1 gia tri duy nhat "Quy dau ky" (opening_balance, migration 019),
// tu dong cong don qua cac thang - chi sua o day 1 lan luc bat dau dung module, khong nhap lai
// tung thang (xem docs/DECISIONS.md). GET mo cho moi nguoi da dang nhap (can de hien thi so lieu
// tren trang So quy), PUT rieng quyen module 'so_quy' - giong pattern warehouse-settings.routes.js.

const express = require('express');
const db = require('../db/database');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

router.get('/', (req, res) => {
  const settings = db.prepare('SELECT opening_balance FROM cash_book_settings WHERE id = 1').get();
  res.json({ settings });
});

router.put('/', requirePermission('so_quy'), (req, res) => {
  const { opening_balance: openingBalance } = req.body || {};
  if (!(Number(openingBalance) >= 0)) {
    return res.status(400).json({ error: 'Quy dau ky khong hop le' });
  }

  db.prepare("UPDATE cash_book_settings SET opening_balance = ?, updated_at = datetime('now') WHERE id = 1").run(Number(openingBalance));

  const settings = db.prepare('SELECT opening_balance FROM cash_book_settings WHERE id = 1').get();
  res.json({ settings });
});

module.exports = router;
