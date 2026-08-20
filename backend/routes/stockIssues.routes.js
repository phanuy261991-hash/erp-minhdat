// Route phieu xuat kho. Ca GET va POST deu yeu cau quyen module 'kho' (kiem tra khi mount
// o server.js). payment_status quyet dinh phieu co phat sinh cong no hay khong - logic ghi
// vao debt_ledger se lam o Phase 3 (debt.service.js), o day chi luu du lieu payment_status.

const express = require('express');
const db = require('../db/database');
const { createStockIssue, updateStockIssue, processStockIssue, ServiceError } = require('../services/stockIssue.service');

const router = express.Router();

const PAYMENT_STATUSES = ['da_thu_tien', 'cong_no'];
const ADJUSTS_TYPES = ['receipt', 'issue'];

// adjusts_code: xem chu thich tuong ung trong stockReceipts.routes.js. partner_phone/
// partner_address: dung cho trang in phieu xuat (Phase 4, xem docs/PRD.md muc 4.5).
// project_name (migration 024, Dot 3): dung de hien dong "Cong trinh: ..." khi in phieu.
const SELECT_ISSUE = `
  SELECT i.id, i.code, i.partner_id, pa.name AS partner_name, pa.phone AS partner_phone,
         pa.address AS partner_address, i.created_by,
         u.full_name AS created_by_name, i.note, i.payment_status, i.created_at, i.status,
         i.adjusts_type, i.adjusts_id, i.project_id, pr.name AS project_name,
         CASE i.adjusts_type WHEN 'receipt' THEN ar.code WHEN 'issue' THEN ai.code ELSE NULL END AS adjusts_code
  FROM stock_issues i
  LEFT JOIN partners pa ON pa.id = i.partner_id
  JOIN users u ON u.id = i.created_by
  LEFT JOIN stock_receipts ar ON i.adjusts_type = 'receipt' AND ar.id = i.adjusts_id
  LEFT JOIN stock_issues ai ON i.adjusts_type = 'issue' AND ai.id = i.adjusts_id
  LEFT JOIN projects pr ON pr.id = i.project_id
`;

// Doc + validate lien ket "dieu chinh cho phieu nao" tu body (tuy chon, xem migration 010).
function readAdjustment(body) {
  const { adjusts_type: adjustsType, adjusts_id: rawAdjustsId } = body || {};
  if (!adjustsType) {
    return { adjustsType: null, adjustsId: null };
  }
  if (!ADJUSTS_TYPES.includes(adjustsType)) {
    return { error: `Loai phieu dieu chinh khong hop le: ${adjustsType}` };
  }

  const adjustsId = Number(rawAdjustsId);
  const table = adjustsType === 'receipt' ? 'stock_receipts' : 'stock_issues';
  const exists = db.prepare(`SELECT id, status FROM ${table} WHERE id = ?`).get(adjustsId);
  if (!exists) {
    return { error: 'Khong tim thay phieu goc de dieu chinh' };
  }
  // Phieu dang nhap ('cho_tru_kho', 2026-08-20) chua chac chan se duoc xuat kho that - khong hop
  // ly de chon lam moc "dieu chinh cho phieu nao" (xem docs/DECISIONS.md).
  if (exists.status !== 'da_tru_kho') {
    return { error: 'Phieu goc dang o trang thai nhap, chua the chon de dieu chinh' };
  }

  return { adjustsType, adjustsId };
}

// issue_date tu client dang 'YYYY-MM-DD HH:MM:SS' (da quy doi ve UTC o frontend) - giong het
// pattern readReceiptDate o stockReceipts.routes.js. Cho phep rong (dung thoi diem hien tai).
const SQLITE_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

function readIssueDate(raw) {
  if (!raw) return { issueDate: null };
  if (!SQLITE_DATETIME_PATTERN.test(raw)) {
    return { error: 'Thoi gian xuat khong hop le' };
  }
  return { issueDate: raw };
}

function readItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: 'Phieu xuat phai co it nhat 1 dong san pham' };
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

// is_return = 0: an phieu "Tra hang nha cung cap" (migration 034, supplierReturns.routes.js co
// trang/API rieng) khoi danh sach Phieu xuat kho - tach biet hoan toan, dung pattern da ap dung
// cho stockReceipts.routes.js voi "Tra hang xuat".
router.get('/', (req, res) => {
  const issues = db.prepare(`${SELECT_ISSUE} WHERE i.is_return = 0 ORDER BY i.created_at DESC`).all();
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
             it.quantity, it.unit_price, it.discount_percent
      FROM stock_issue_items it
      JOIN products p ON p.id = it.product_id
      WHERE it.issue_id = ?
    `)
    .all(id);

  const adjustedBy = db
    .prepare(`
      SELECT 'receipt' AS type, code FROM stock_receipts WHERE adjusts_type = 'issue' AND adjusts_id = ?
      UNION ALL
      SELECT 'issue' AS type, code FROM stock_issues WHERE adjusts_type = 'issue' AND adjusts_id = ?
    `)
    .all(id, id);

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price * (1 - item.discount_percent / 100),
    0
  );

  res.json({ issue: { ...issue, items, total_amount: totalAmount, adjusted_by: adjustedBy } });
});

// is_draft (tuy chon, mac dinh false, 2026-08-20): true = chi "Luu tam" (status='cho_tru_kho',
// chua dong stock_movements/debt_ledger/cash_vouchers), khong truyen/false = xuat kho ngay (dung
// y het hanh vi cu 1 buoc) - xem stockIssue.service.js.
router.post('/', (req, res) => {
  const {
    partner_id: partnerId,
    note,
    payment_status: paymentStatus,
    issue_date: rawIssueDate,
    project_id: rawProjectId,
    is_draft: isDraft,
  } = req.body || {};
  const { items, error } = readItems((req.body || {}).items);

  if (error) {
    return res.status(400).json({ error });
  }

  const resolvedPaymentStatus = paymentStatus || 'da_thu_tien';
  if (!PAYMENT_STATUSES.includes(resolvedPaymentStatus)) {
    return res.status(400).json({ error: `payment_status khong hop le: ${resolvedPaymentStatus}` });
  }

  const { issueDate, error: dateError } = readIssueDate(rawIssueDate);
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }

  const { adjustsType, adjustsId, error: adjustError } = readAdjustment(req.body);
  if (adjustError) {
    return res.status(400).json({ error: adjustError });
  }

  try {
    const issue = createStockIssue({
      partnerId: partnerId ? Number(partnerId) : null,
      createdBy: req.session.user.id,
      note: note ? String(note).trim() : '',
      paymentStatus: resolvedPaymentStatus,
      items,
      adjustsType,
      adjustsId,
      issueDate,
      projectId: rawProjectId ? Number(rawProjectId) : null,
      isDraft: isDraft === true,
    });
    res.status(201).json({ issue });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

// Sua phieu dang 'cho_tru_kho' (nhap) - xem chu thich updateStockIssue() trong service.
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const {
    partner_id: partnerId,
    note,
    payment_status: paymentStatus,
    issue_date: rawIssueDate,
    project_id: rawProjectId,
  } = req.body || {};
  const { items, error } = readItems((req.body || {}).items);

  if (error) {
    return res.status(400).json({ error });
  }

  const resolvedPaymentStatus = paymentStatus || 'da_thu_tien';
  if (!PAYMENT_STATUSES.includes(resolvedPaymentStatus)) {
    return res.status(400).json({ error: `payment_status khong hop le: ${resolvedPaymentStatus}` });
  }

  const { issueDate, error: dateError } = readIssueDate(rawIssueDate);
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }

  try {
    const issue = updateStockIssue(id, {
      partnerId: partnerId ? Number(partnerId) : null,
      note: note ? String(note).trim() : '',
      paymentStatus: resolvedPaymentStatus,
      items,
      issueDate,
      projectId: rawProjectId ? Number(rawProjectId) : null,
    });
    res.json({ issue });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

// Xuat kho cho 1 phieu da "Luu tam" truoc do - xem chu thich processStockIssue() trong service.
router.post('/:id/process', (req, res) => {
  const id = Number(req.params.id);
  try {
    const issue = processStockIssue(id, { createdBy: req.session.user.id });
    res.json({ issue });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

module.exports = router;
