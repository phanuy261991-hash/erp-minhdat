// Route "Tra hang" (migration 032/033). Quyen module 'kho' da gan khi mount o server.js, giong
// het pattern stockReceipts.routes.js/stockIssues.routes.js.
//
// Quy trinh 2 buoc (migration 033): POST / mac dinh chi "Luu" (status='cho_tru_kho'), truyen
// process:true de tao va tru kho ngay 1 buoc (dung y het hanh vi cu). PUT /:id sua phieu dang
// 'cho_tru_kho'. POST /:id/process tru kho cho 1 phieu da 'Luu' truoc do.

const express = require('express');
const db = require('../db/database');
const {
  createStockReturn,
  updateStockReturn,
  processStockReturn,
  getReturnReference,
  ServiceError,
} = require('../services/stockReturn.service');

const router = express.Router();

const SELECT_RETURN = `
  SELECT r.id, r.code, r.partner_id, pa.name AS partner_name, pa.phone AS partner_phone,
         r.created_by, u.full_name AS created_by_name, r.note, r.created_at, r.status,
         r.project_id, pr.name AS project_name
  FROM stock_receipts r
  JOIN partners pa ON pa.id = r.partner_id
  JOIN users u ON u.id = r.created_by
  LEFT JOIN projects pr ON pr.id = r.project_id
  WHERE r.is_return = 1
`;

// Tong tien giam cong no cua 1 phieu tra - tinh tu items (khong luu rieng tren stock_receipts),
// dung chung cho ca list va detail de khong lech cong thuc.
function sumCredit(receiptId) {
  const row = db
    .prepare('SELECT COALESCE(SUM(quantity * sale_price), 0) AS total FROM stock_receipt_items WHERE receipt_id = ?')
    .get(receiptId);
  return row.total;
}

router.get('/', (req, res) => {
  const returns = db.prepare(`${SELECT_RETURN} ORDER BY r.created_at DESC`).all();
  const withTotal = returns.map((r) => ({ ...r, total_credit: sumCredit(r.id) }));
  res.json({ returns: withTotal });
});

router.get('/reference', (req, res) => {
  const partnerId = Number(req.query.partner_id);
  const productId = Number(req.query.product_id);
  const projectId = req.query.project_id ? Number(req.query.project_id) : null;

  if (!partnerId || !productId) {
    return res.status(400).json({ error: 'Thiếu khách hàng hoặc sản phẩm' });
  }

  const { issuedQuantity, returnedQuantity, remainingReturnable } = getReturnReference(partnerId, productId, projectId);
  res.json({
    issued_quantity: issuedQuantity,
    returned_quantity: returnedQuantity,
    remaining_returnable: remainingReturnable,
  });
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const stockReturn = db.prepare(`${SELECT_RETURN} AND r.id = ?`).get(id);
  if (!stockReturn) {
    return res.status(404).json({ error: 'Không tìm thấy phiếu trả hàng' });
  }

  const items = db
    .prepare(`
      SELECT i.id, i.product_id, p.code AS product_code, p.name AS product_name, p.unit,
             i.quantity, i.sale_price
      FROM stock_receipt_items i
      JOIN products p ON p.id = i.product_id
      WHERE i.receipt_id = ?
    `)
    .all(id);

  const totalCredit = items.reduce((sum, item) => sum + item.quantity * item.sale_price, 0);

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
    const salePrice = raw.sale_price === undefined || raw.sale_price === null || raw.sale_price === '' ? 0 : Number(raw.sale_price);

    if (!productId || !(quantity > 0)) {
      return { error: 'Dữ liệu dòng sản phẩm không hợp lệ (thiếu sản phẩm, số lượng trả lại phải > 0)' };
    }
    if (Number.isNaN(salePrice) || salePrice < 0) {
      return { error: 'Giá bán từng dòng phải là số không âm' };
    }

    items.push({ productId, quantity, salePrice });
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
  const { partner_id: partnerId, project_id: rawProjectId, note, return_date: rawReturnDate, process } = req.body || {};
  const { items, error } = readItems((req.body || {}).items);
  if (error) {
    return res.status(400).json({ error });
  }

  const { returnDate, error: dateError } = readReturnDate(rawReturnDate);
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }

  try {
    const stockReturn = createStockReturn({
      partnerId: partnerId ? Number(partnerId) : null,
      projectId: rawProjectId ? Number(rawProjectId) : null,
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
  const { partner_id: partnerId, project_id: rawProjectId, note, return_date: rawReturnDate } = req.body || {};
  const { items, error } = readItems((req.body || {}).items);
  if (error) {
    return res.status(400).json({ error });
  }

  const { returnDate, error: dateError } = readReturnDate(rawReturnDate);
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }

  try {
    const stockReturn = updateStockReturn(id, {
      partnerId: partnerId ? Number(partnerId) : null,
      projectId: rawProjectId ? Number(rawProjectId) : null,
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
    const stockReturn = processStockReturn(id, { createdBy: req.session.user.id });
    res.json({ return: stockReturn });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

module.exports = router;