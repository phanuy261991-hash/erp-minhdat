// Route phieu nhap kho. Ca GET va POST deu yeu cau quyen module 'kho' (kiem tra khi mount
// o server.js).

const express = require('express');
const db = require('../db/database');
const { createStockReceipt, ServiceError } = require('../services/stockReceipt.service');

const router = express.Router();

const SELECT_RECEIPT = `
  SELECT r.id, r.code, r.partner_id, pa.name AS partner_name, r.created_by,
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

    if (!productId || !(quantity > 0) || !(unitPrice >= 0)) {
      return {
        error: 'Du lieu dong san pham khong hop le (thieu product_id, quantity phai > 0, unit_price phai >= 0)',
      };
    }

    items.push({ productId, quantity, unitPrice });
  }

  return { items };
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
             i.quantity, i.unit_price
      FROM stock_receipt_items i
      JOIN products p ON p.id = i.product_id
      WHERE i.receipt_id = ?
    `)
    .all(id);

  res.json({ receipt: { ...receipt, items } });
});

router.post('/', (req, res) => {
  const { partner_id: partnerId, note } = req.body || {};
  const { items, error } = readItems((req.body || {}).items);

  if (error) {
    return res.status(400).json({ error });
  }

  try {
    const receipt = createStockReceipt({
      partnerId: partnerId ? Number(partnerId) : null,
      createdBy: req.session.user.id,
      note: note ? String(note).trim() : '',
      items,
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
