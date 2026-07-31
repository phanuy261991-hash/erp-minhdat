// Route phieu xuat kho. Ca GET va POST deu yeu cau quyen module 'kho' (kiem tra khi mount
// o server.js). payment_status quyet dinh phieu co phat sinh cong no hay khong - logic ghi
// vao debt_ledger se lam o Phase 3 (debt.service.js), o day chi luu du lieu payment_status.

const express = require('express');
const db = require('../db/database');
const { createStockIssue, ServiceError } = require('../services/stockIssue.service');

const router = express.Router();

const PAYMENT_STATUSES = ['da_thu_tien', 'cong_no'];

const SELECT_ISSUE = `
  SELECT i.id, i.code, i.partner_id, pa.name AS partner_name, i.created_by,
         u.full_name AS created_by_name, i.note, i.payment_status, i.created_at
  FROM stock_issues i
  LEFT JOIN partners pa ON pa.id = i.partner_id
  JOIN users u ON u.id = i.created_by
`;

function readItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: 'Phieu xuat phai co it nhat 1 dong san pham' };
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
  const issues = db.prepare(`${SELECT_ISSUE} ORDER BY i.created_at DESC`).all();
  res.json({ issues });
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const issue = db.prepare(`${SELECT_ISSUE} WHERE i.id = ?`).get(id);
  if (!issue) {
    return res.status(404).json({ error: 'Khong tim thay phieu xuat' });
  }

  const items = db
    .prepare(`
      SELECT it.id, it.product_id, p.code AS product_code, p.name AS product_name, p.unit,
             it.quantity, it.unit_price
      FROM stock_issue_items it
      JOIN products p ON p.id = it.product_id
      WHERE it.issue_id = ?
    `)
    .all(id);

  res.json({ issue: { ...issue, items } });
});

router.post('/', (req, res) => {
  const { partner_id: partnerId, note, payment_status: paymentStatus } = req.body || {};
  const { items, error } = readItems((req.body || {}).items);

  if (error) {
    return res.status(400).json({ error });
  }

  const resolvedPaymentStatus = paymentStatus || 'da_thu_tien';
  if (!PAYMENT_STATUSES.includes(resolvedPaymentStatus)) {
    return res.status(400).json({ error: `payment_status khong hop le: ${resolvedPaymentStatus}` });
  }

  try {
    const issue = createStockIssue({
      partnerId: partnerId ? Number(partnerId) : null,
      createdBy: req.session.user.id,
      note: note ? String(note).trim() : '',
      paymentStatus: resolvedPaymentStatus,
      items,
    });
    res.status(201).json({ issue });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

module.exports = router;
