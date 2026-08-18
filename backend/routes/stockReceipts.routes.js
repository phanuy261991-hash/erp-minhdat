// Route phieu nhap kho. Ca GET va POST deu yeu cau quyen module 'kho' (kiem tra khi mount
// o server.js).

const express = require('express');
const db = require('../db/database');
const { createStockReceipt, updateStockReceiptDate, ServiceError } = require('../services/stockReceipt.service');

const router = express.Router();

// adjusts_code: ma phieu goc (nhap hoac xuat) ma phieu nay dang dieu chinh bu tru cho - resolve
// qua 2 LEFT JOIN dieu kien theo adjusts_type (giong pattern document_code o products.routes.js).
// project_name (migration 024, Dot 3): LEFT JOIN vi project_id khong bat buoc.
const SELECT_RECEIPT = `
  SELECT r.id, r.code, r.order_code, r.partner_id, pa.name AS partner_name, r.created_by,
         u.full_name AS created_by_name, r.note, r.payment_status, r.created_at,
         r.adjusts_type, r.adjusts_id, r.project_id, pr.name AS project_name, r.is_opening_balance,
         CASE r.adjusts_type WHEN 'receipt' THEN ar.code WHEN 'issue' THEN ai.code ELSE NULL END AS adjusts_code
  FROM stock_receipts r
  LEFT JOIN partners pa ON pa.id = r.partner_id
  JOIN users u ON u.id = r.created_by
  LEFT JOIN stock_receipts ar ON r.adjusts_type = 'receipt' AND ar.id = r.adjusts_id
  LEFT JOIN stock_issues ai ON r.adjusts_type = 'issue' AND ai.id = r.adjusts_id
  LEFT JOIN projects pr ON pr.id = r.project_id
`;

const ADJUSTS_TYPES = ['receipt', 'issue'];
const PAYMENT_STATUSES = ['da_thanh_toan', 'cong_no'];

// Doc + validate lien ket "dieu chinh cho phieu nao" tu body (tuy chon, xem migration 010).
// Phieu goc phai ton tai dung bang tuong ung voi adjusts_type.
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
  const exists = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(adjustsId);
  if (!exists) {
    return { error: 'Khong tim thay phieu goc de dieu chinh' };
  }

  return { adjustsType, adjustsId };
}

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

// is_return = 0: an phieu "Tra hang xuat" (migration 032, stockReturns.routes.js co trang/API
// rieng) khoi danh sach Phieu nhap kho - tach biet hoan toan theo dung quyet dinh da chot.
router.get('/', (req, res) => {
  const receipts = db.prepare(`${SELECT_RECEIPT} WHERE r.is_return = 0 ORDER BY r.created_at DESC`).all();
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

  // Tra nguoc: phieu nao (nhap hoac xuat) dang dung phieu nay lam phieu goc de dieu chinh -
  // dung UNION vi 2 bang khac nhau (khong the JOIN 1 chieu nhu adjusts_code o tren).
  const adjustedBy = db
    .prepare(`
      SELECT 'receipt' AS type, code FROM stock_receipts WHERE adjusts_type = 'receipt' AND adjusts_id = ?
      UNION ALL
      SELECT 'issue' AS type, code FROM stock_issues WHERE adjusts_type = 'receipt' AND adjusts_id = ?
    `)
    .all(id, id);

  res.json({ receipt: { ...receipt, items, total_amount: totalAmount, adjusted_by: adjustedBy } });
});

router.post('/', (req, res) => {
  const {
    partner_id: partnerId,
    note,
    receipt_date: rawReceiptDate,
    order_code: orderCode,
    payment_status: paymentStatus,
    project_id: rawProjectId,
    is_opening_balance: rawIsOpeningBalance,
  } = req.body || {};
  const { items, error } = readItems((req.body || {}).items);

  if (error) {
    return res.status(400).json({ error });
  }

  const { receiptDate, error: dateError } = readReceiptDate(rawReceiptDate);
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }

  const { adjustsType, adjustsId, error: adjustError } = readAdjustment(req.body);
  if (adjustError) {
    return res.status(400).json({ error: adjustError });
  }

  const resolvedPaymentStatus = paymentStatus || 'da_thanh_toan';
  if (!PAYMENT_STATUSES.includes(resolvedPaymentStatus)) {
    return res.status(400).json({ error: `payment_status khong hop le: ${resolvedPaymentStatus}` });
  }
  const isOpeningBalance = rawIsOpeningBalance === true || rawIsOpeningBalance === 'true';

  try {
    const receipt = createStockReceipt({
      partnerId: partnerId ? Number(partnerId) : null,
      createdBy: req.session.user.id,
      note: note ? String(note).trim() : '',
      items,
      receiptDate,
      orderCode: orderCode ? String(orderCode).trim() : '',
      adjustsType,
      adjustsId,
      paymentStatus: resolvedPaymentStatus,
      projectId: rawProjectId ? Number(rawProjectId) : null,
      isOpeningBalance,
    });
    res.status(201).json({ receipt });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

// Chi cho sua rieng ngay nhap - moi truong khac cua phieu bi khoa (xem ghi chu o
// updateStockReceiptDate()). rawReceiptDate bat buoc o day (khac POST, khong cho de rong).
router.patch('/:id/date', (req, res) => {
  const id = Number(req.params.id);
  const { receiptDate, error: dateError } = readReceiptDate((req.body || {}).receipt_date);
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }
  if (!receiptDate) {
    return res.status(400).json({ error: 'Thieu thoi gian nhap' });
  }

  try {
    const receipt = updateStockReceiptDate({ id, receiptDate });
    if (!receipt) {
      return res.status(404).json({ error: 'Khong tim thay phieu nhap' });
    }
    res.json({ receipt });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

module.exports = router;
