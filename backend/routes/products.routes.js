// Route danh muc san pham. Ton kho khong luu cot rieng - luon tinh tu SUM(stock_movements)
// (xem .claude/docs/inventory-debt-ledger.md). GET mo cho moi nguoi da dang nhap (can de
// chon san pham luc lap phieu nhap/xuat), POST/PUT rieng kiem tra quyen module 'kho'.

const express = require('express');
const db = require('../db/database');
const { requirePermission } = require('../middleware/requirePermission');
const { getCostingMethod, getWeightedAverageCost } = require('../services/costing.service');

const router = express.Router();

// Cac truong duoc theo doi lich su chinh sua (product_change_log) - so sanh gia tri cu/moi
// moi lan PUT thanh cong, chi ghi dong nao thuc su thay doi.
const TRACKED_FIELDS = ['code', 'name', 'unit', 'cost_price', 'sale_price', 'low_stock_threshold'];

const SELECT_PRODUCTS_WITH_STOCK = `
  SELECT p.id, p.code, p.name, p.unit, p.cost_price, p.sale_price, p.low_stock_threshold,
         p.is_active, p.created_at,
         COALESCE(SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE -sm.quantity END), 0) AS stock
  FROM products p
  LEFT JOIN stock_movements sm ON sm.product_id = p.id
  GROUP BY p.id
`;

// sale_price bat buoc nhap (khac cost_price/low_stock_threshold co the de trong = 0) - theo
// yeu cau nguoi dung khi thiet ke form trang Danh muc san pham.
function readProductInput(body) {
  const {
    code,
    name,
    unit,
    cost_price: costPrice,
    sale_price: salePrice,
    low_stock_threshold: lowStockThreshold,
  } = body || {};

  return {
    code: code ? String(code).trim() : '',
    name: name ? String(name).trim() : '',
    unit: unit ? String(unit).trim() : '',
    costPrice: Number(costPrice) || 0,
    salePrice: salePrice === undefined || salePrice === null || salePrice === '' ? null : Number(salePrice),
    lowStockThreshold: Number(lowStockThreshold) || 0,
  };
}

function withBooleanActive(product) {
  return { ...product, is_active: Boolean(product.is_active) };
}

router.get('/', (req, res) => {
  const products = db.prepare(`${SELECT_PRODUCTS_WITH_STOCK} ORDER BY p.created_at DESC`).all();
  res.json({ products: products.map(withBooleanActive) });
});

router.post('/', requirePermission('kho'), (req, res) => {
  const input = readProductInput(req.body);

  if (!input.code || !input.name || !input.unit || input.salePrice === null || Number.isNaN(input.salePrice)) {
    return res.status(400).json({ error: 'Thieu thong tin bat buoc (ma, ten, don vi tinh, gia ban)' });
  }

  const existing = db.prepare('SELECT id FROM products WHERE code = ?').get(input.code);
  if (existing) {
    return res.status(409).json({ error: 'Ma san pham da ton tai' });
  }

  const result = db
    .prepare(
      'INSERT INTO products (code, name, unit, cost_price, sale_price, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(input.code, input.name, input.unit, input.costPrice, input.salePrice, input.lowStockThreshold);

  const product = db.prepare(`${SELECT_PRODUCTS_WITH_STOCK} HAVING p.id = ?`).get(result.lastInsertRowid);
  res.status(201).json({ product: withBooleanActive(product) });
});

router.put('/:id', requirePermission('kho'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay san pham' });
  }

  const input = readProductInput(req.body);
  if (!input.code || !input.name || !input.unit || input.salePrice === null || Number.isNaN(input.salePrice)) {
    return res.status(400).json({ error: 'Thieu thong tin bat buoc (ma, ten, don vi tinh, gia ban)' });
  }

  const duplicateCode = db.prepare('SELECT id FROM products WHERE code = ? AND id != ?').get(input.code, id);
  if (duplicateCode) {
    return res.status(409).json({ error: 'Ma san pham da ton tai' });
  }

  const newValues = {
    code: input.code,
    name: input.name,
    unit: input.unit,
    cost_price: input.costPrice,
    sale_price: input.salePrice,
    low_stock_threshold: input.lowStockThreshold,
  };
  const changes = TRACKED_FIELDS.filter((field) => String(existing[field]) !== String(newValues[field]));

  const applyUpdate = db.transaction(() => {
    db.prepare(
      'UPDATE products SET code = ?, name = ?, unit = ?, cost_price = ?, sale_price = ?, low_stock_threshold = ? WHERE id = ?'
    ).run(input.code, input.name, input.unit, input.costPrice, input.salePrice, input.lowStockThreshold, id);

    if (changes.length > 0) {
      const insertLog = db.prepare(
        'INSERT INTO product_change_log (product_id, changed_by, field_name, old_value, new_value) VALUES (?, ?, ?, ?, ?)'
      );
      changes.forEach((field) => {
        insertLog.run(id, req.session.user.id, field, String(existing[field]), String(newValues[field]));
      });
    }
  });
  applyUpdate();

  const product = db.prepare(`${SELECT_PRODUCTS_WITH_STOCK} HAVING p.id = ?`).get(id);
  res.json({ product: withBooleanActive(product) });
});

// Chi tiet 1 san pham, kem gia von tinh theo costing_method dang chon (xem
// backend/services/costing.service.js) - dung cho trang chi tiet san pham.
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const product = db.prepare(`${SELECT_PRODUCTS_WITH_STOCK} HAVING p.id = ?`).get(id);
  if (!product) {
    return res.status(404).json({ error: 'Khong tim thay san pham' });
  }

  const costingMethod = getCostingMethod();
  res.json({
    product: withBooleanActive(product),
    costing_method: costingMethod,
    current_cost: getWeightedAverageCost(id),
  });
});

// Lich su nhap/xuat kho cua 1 san pham - kem ma phieu goc de doi chieu.
router.get('/:id/movements', (req, res) => {
  const id = Number(req.params.id);
  const movements = db
    .prepare(`
      SELECT sm.id, sm.movement_type, sm.quantity, sm.unit_cost, sm.reference_type,
             sm.reference_id, sm.created_at,
             CASE sm.reference_type WHEN 'receipt' THEN r.code ELSE i.code END AS document_code
      FROM stock_movements sm
      LEFT JOIN stock_receipts r ON sm.reference_type = 'receipt' AND r.id = sm.reference_id
      LEFT JOIN stock_issues i ON sm.reference_type = 'issue' AND i.id = sm.reference_id
      WHERE sm.product_id = ?
      ORDER BY sm.created_at DESC, sm.id DESC
    `)
    .all(id);
  res.json({ movements });
});

// Lich su chinh sua thong tin san pham (product_change_log).
router.get('/:id/history', (req, res) => {
  const id = Number(req.params.id);
  const history = db
    .prepare(`
      SELECT pcl.id, pcl.field_name, pcl.old_value, pcl.new_value, pcl.created_at,
             u.full_name AS changed_by_name
      FROM product_change_log pcl
      JOIN users u ON u.id = pcl.changed_by
      WHERE pcl.product_id = ?
      ORDER BY pcl.created_at DESC, pcl.id DESC
    `)
    .all(id);
  res.json({ history });
});

// Vo hieu hoa/mo lai: danh cho ai co quyen module 'kho' (khong rieng Admin) - khac voi xoa cung
// ben duoi (chi Admin). San pham vo hieu hoa van hien trong danh sach (kem badge), chi khong
// duoc chon khi lap phieu nhap/xuat moi (kiem tra trong stockReceipt/stockIssue.service.js).
router.patch('/:id/deactivate', requirePermission('kho'), (req, res) => {
  setActiveState(req, res, 0);
});

router.patch('/:id/activate', requirePermission('kho'), (req, res) => {
  setActiveState(req, res, 1);
});

function setActiveState(req, res, isActive) {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay san pham' });
  }

  db.prepare('UPDATE products SET is_active = ? WHERE id = ?').run(isActive, id);

  const product = db.prepare(`${SELECT_PRODUCTS_WITH_STOCK} HAVING p.id = ?`).get(id);
  res.json({ product: withBooleanActive(product) });
}

// Xoa cung: chi Admin (is_protected), va chi khi san pham chua tung xuat hien trong
// stock_movements - giu nguyen tac giu lich su nhu phieu nhap/xuat (xem CLAUDE.md).
router.delete('/:id', (req, res) => {
  if (!req.session.user.is_protected) {
    return res.status(403).json({ error: 'Chi Admin moi co the xoa san pham' });
  }

  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay san pham' });
  }

  const inUse = db.prepare('SELECT COUNT(*) AS count FROM stock_movements WHERE product_id = ?').get(id);
  if (inUse.count > 0) {
    return res.status(400).json({ error: 'San pham da co lich su nhap/xuat kho, khong the xoa - chi co the vo hieu hoa' });
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
