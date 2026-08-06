// Route "Tra hang nha cung cap" (migration 034). Quyen module 'kho' da gan khi mount o
// server.js, cau truc doi xung stockReturns.routes.js ("Tra hang xuat") nhung doi tuong la
// nha_cung_cap va khong co Cong trinh.

const express = require('express');
const db = require('../db/database');
const {
  createSupplierReturn,
  updateSupplierReturn,
  processSupplierReturn,
  getSupplierReturnReference,
  getSupplierPrices,
  ServiceError,
} = require('../services/supplierReturn.service');

const router = express.Router();

const SELECT_RETURN = `
  SELECT i.id, i.code, i.partner_id, pa.name AS partner_name, pa.phone AS partner_phone,
         i.created_by, u.full_name AS created_by_name, i.note, i.created_at, i.status
  FROM stock_issues i
  JOIN partners pa ON pa.id = i.partner_id
  JOIN users u ON u.id = i.created_by
  WHERE i.is_return = 1
`;

// Tong tien giam cong no cua 1 phieu tra - tinh tu items (khong luu rieng tren stock_issues).
function sumCredit(issueId) {
  const row = db
    .prepare('SELECT COALESCE(SUM(quantity * unit_price), 0) AS total FROM stock_issue_items WHERE issue_id = ?')
    .get(issueId);
  return row.total;
}

router.get('/', (req, res) => {
  const returns = db.prepare(`${SELECT_RETURN} ORDER BY i.created_at DESC`).all();
  const withTotal = returns.map((r) => ({ ...r, total_credit: sumCredit(r.id) }));
  res.json({ returns: withTotal });
});

router.get('/reference', (req, res) => {
  const partnerId = Number(req.query.partner_id);
  const productId = Number(req.query.product_id);

  if (!partnerId || !productId) {
    return res.status(400).json({ error: 'Thiếu nhà cung cấp hoặc sản phẩm' });
  }

  const { receivedQuantity, returnedQuantity, remainingReturnable } = getSupplierReturnReference(partnerId, productId);
  res.json({
    received_quantity: receivedQuantity,
    returned_quantity: returnedQuantity,
    remaining_returnable: remainingReturnable,
  });
});

// Danh sach gia nhap phan biet tung mua tu NCC nay cho san pham nay - de frontend tu dien (1
// gia) hoac hien cho chon (>=2 gia).
router.get('/prices', (req, res) => {
  const partnerId = Number(req.query.partner_id);
  const productId = Number(req.query.product_id);

  if (!partnerId || !productId) {
    return res.status(400).json({ error: 'Thiếu nhà cung cấp hoặc sản phẩm' });
  }

  res.json({ prices: getSupplierPrices(partnerId, productId) });
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const stockReturn = db.prepare(`${SELECT_RETURN} AND i.id = ?`).get(id);
  if (!stockReturn) {
    return res.status(404).json({ error: 'Không tìm thấy phiếu trả hàng' });
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

  const totalCredit = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  res.json({ return: { ...stockReturn, items, total_credit: totalCredit } });
});

const SQLITE_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

function readItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: 'Phiếu trả hàng phải có ít nhất 1 dòng sản phẩm' };
  }

  const items = [];
  for (const raw of rawItems) {
    const productId = Number(raw.product_id);
    const quantity = Number(raw.quantity);
    const unitPrice = raw.unit_price === undefined || raw.unit_price === null || raw.unit_price === '' ? 0 : Number(raw.unit_price);

    if (!productId || !(quantity > 0)) {
      return { error: 'Dữ liệu dòng sản phẩm không hợp lệ (thiếu sản phẩm, số lượng trả lại phải > 0)' };
    }
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      return { error: 'Giá nhập từng dòng phải là số không âm' };
    }

    items.push({ productId, quantity, unitPrice });
  }

  return { items };
}

function readReturnDate(raw) {
  if (!raw) return { returnDate: null };
  if (!SQLITE_DATETIME_PATTERN.test(raw)) {
    return { error: 'Thời gian trả không hợp lệ' };
  }
  return { returnDate: raw };
}

router.post('/', (req, res) => {
  const { partner_id: partnerId, note, return_date: rawReturnDate, process } = req.body || {};
  const { items, error } = readItems((req.body || {}).items);
  if (error) {
    return res.status(400).json({ error });
  }

  const { returnDate, error: dateError } = readReturnDate(rawReturnDate);
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }

  try {
    const stockReturn = createSupplierReturn({
      partnerId: partnerId ? Number(partnerId) : null,
      createdBy: req.session.user.id,
      note: note ? String(note).trim() : '',
      items,
      returnDate,
      process: process === true,
    });
    res.status(201).json({ return: stockReturn });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { partner_id: partnerId, note, return_date: rawReturnDate } = req.body || {};
  const { items, error } = readItems((req.body || {}).items);
  if (error) {
    return res.status(400).json({ error });
  }

  const { returnDate, error: dateError } = readReturnDate(rawReturnDate);
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }

  try {
    const stockReturn = updateSupplierReturn(id, {
      partnerId: partnerId ? Number(partnerId) : null,
      note: note ? String(note).trim() : '',
      items,
      returnDate,
    });
    res.json({ return: stockReturn });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

router.post('/:id/process', (req, res) => {
  const id = Number(req.params.id);
  try {
    const stockReturn = processSupplierReturn(id, { createdBy: req.session.user.id });
    res.json({ return: stockReturn });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

module.exports = router;
