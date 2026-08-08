// Route Phieu thu/Phieu chi (module "So quy"). Ca GET va POST/DELETE deu yeu cau quyen module
// 'so_quy' (kiem tra khi mount o server.js) - module doc lap, khong co nhu cau mo GET rieng cho
// module khac doc nhu partners/products.

const express = require('express');
const db = require('../db/database');
const {
  getCashBookSummary,
  listVouchers,
  createCashVoucher,
  deleteCashVoucher,
  ServiceError,
} = require('../services/cashVoucher.service');

const router = express.Router();

// month bat buoc, khong tu suy doan "thang hien tai" o backend - frontend luon gui tuong minh
// (mac dinh = thang hien tai theo gio trinh duyet luc tai trang), tranh 2 noi tu dinh nghia
// "thang hien tai" theo 2 cach khac nhau (server co the chay tren may co timezone he thong sai).
router.get('/', (req, res) => {
  const month = req.query.month;
  try {
    const summary = getCashBookSummary(month);
    const vouchers = listVouchers(month);
    res.json({ vouchers, summary });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

// Danh sach nhan vien dang hoat dong cho dropdown "Nguoi thu/chi" - khong dung lai
// GET /api/users vi route do khoa quyen 'nguoi_dung', trong khi trang nay chi doi hoi 'so_quy'.
router.get('/staff', (req, res) => {
  const staff = db.prepare('SELECT id, full_name FROM users WHERE is_active = 1 ORDER BY full_name ASC').all();
  res.json({ staff });
});

router.post('/', (req, res) => {
  const {
    type,
    category_id: categoryId,
    counterpart_name: counterpartName,
    handled_by: handledBy,
    amount,
    note,
    record_business_result: recordBusinessResult,
    voucher_date: voucherDate,
  } = req.body || {};

  try {
    const voucher = createCashVoucher({
      type,
      categoryId: Number(categoryId),
      counterpartName: counterpartName ? String(counterpartName).trim() : '',
      handledBy: handledBy ? Number(handledBy) : null,
      amount,
      note: note ? String(note).trim() : '',
      recordBusinessResult: recordBusinessResult !== false,
      voucherDate: voucherDate || null,
      createdBy: req.session.user.id,
    });
    res.status(201).json({ voucher });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

router.delete('/:id', (req, res) => {
  try {
    const deleted = deleteCashVoucher(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Khong tim thay phieu' });
    }
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

module.exports = router;
