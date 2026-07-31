// Route phieu nhap kho. Ca GET va POST deu yeu cau quyen module 'kho' (kiem tra khi mount
// o server.js).

const express = require('express');
const db = require('../db/database');
const { createStockReceipt, ServiceError } = require('../services/stockReceipt.service');

const router = express.Router();

const SELECT_RECEIPT = `
  SELECT r.id, r.code, r.order_code, r.partner_id, pa.name AS partner_name, r.created_by,
         u.full_name AS created_by_name, r.note, r.created_at
  FROM stock_receipts r
  LEFT JOIN partners pa ON pa.id = r.partner_id
  JOIN users u ON u.id = r.created_by
`;

function readItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: 'Phieu nhap phai co it nhat 1 dong san pham' };
  }

  const items = [];
  for (const raw of rawItems) {
    const productId = Number(raw.product_id);
    const quantity = Number(raw.quantity);
    const unitPrice = Number(raw.unit_price);
    const discountPercent = raw.discount_percent === undefined || raw.discount_percent === null || raw.discount_percent === ''
      ? 0
      : Number(raw.discount_percent);

    if (!productId || !(quantity > 0) || !(unitPrice >= 0)) {
      return {
        error: 'Du lieu dong san pham khong hop le (thieu product_id, quantity phai > 0, unit_price phai >= 0)',
      };
    }
    if (Number.isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      return { error: 'Chiet khau tung dong phai tu 0 den 100%' };
    }

    items.push({ productId, quantity, unitPrice, discountPercent });
  }

  return { items };
}

// receipt_date tu client dang 'YYYY-MM-DD HH:MM:SS' (da quy doi ve UTC o frontend, dung
// chung dinh dang voi datetime('now') cua SQLite). Cho phep rong (dung thoi diem hien tai).
const SQLITE_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

function readReceiptDate(raw) {
  if (!raw) return { receiptDate: null };
  if (!SQLITE_DATETIME_PATTERN.test(raw)) {
    return { error: 'Thoi gian nhap khong hop le' };
  }
  return { receiptDate: raw };
}

router.get('/', (req, res) => {
  const receipts = db.prepare(`${SELECT_RECEIPT} ORDER BY r.created_at DESC`).all();
  res.json({ receipts });
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const receipt = db.prepare(`${SELECT_RECEIPT} WHERE r.id = ?`).get(id);
  if (!receipt) {
    return res.status(404).json({ error: 'Khong tim thay phieu nhap' });
  }

  const items = db
    .prepare(`
      SELECT i.id, i.product_id, p.code AS product_code, p.name AS product_name, p.unit,
             i.quantity, i.unit_price, i.discount_percent
      FROM stock_receipt_items i
      JOIN products p ON p.id = i.product_id
      WHERE i.receipt_id = ?
    `)
    .all(id);

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price * (1 - item.discount_percent / 100),
    0
  );

  res.json({ receipt: { ...receipt, items, total_amount: totalAmount } });
});

router.post('/', (req, res) => {
  const { partner_id: partnerId, note, receipt_date: rawReceiptDate, order_code: orderCode } = req.body || {};
  const { items, error } = readItems((req.body || {}).items);

  if (error) {
    return res.status(400).json({ error });
  }

  const { receiptDate, error: dateError } = readReceiptDate(rawReceiptDate);
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }

  try {
    const receipt = createStockReceipt({
      partnerId: partnerId ? Number(partnerId) : null,
      createdBy: req.session.user.id,
      note: note ? String(note).trim() : '',
      items,
      receiptDate,
      orderCode: orderCode ? String(orderCode).trim() : '',
    });
    res.status(201).json({ receipt });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

module.exports = router;
