// Route danh muc san pham. Ton kho khong luu cot rieng - luon tinh tu SUM(stock_movements)
// (xem .claude/docs/inventory-debt-ledger.md). GET mo cho moi nguoi da dang nhap (can de
// chon san pham luc lap phieu nhap/xuat), POST/PUT rieng kiem tra quyen module 'kho'.

const express = require('express');
const db = require('../db/database');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

const SELECT_PRODUCTS_WITH_STOCK = `
  SELECT p.id, p.code, p.name, p.unit, p.cost_price, p.sale_price, p.low_stock_threshold, p.created_at,
         COALESCE(SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE -sm.quantity END), 0) AS stock
  FROM products p
  LEFT JOIN stock_movements sm ON sm.product_id = p.id
  GROUP BY p.id
`;

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
    salePrice: Number(salePrice) || 0,
    lowStockThreshold: Number(lowStockThreshold) || 0,
  };
}

router.get('/', (req, res) => {
  const products = db.prepare(`${SELECT_PRODUCTS_WITH_STOCK} ORDER BY p.created_at DESC`).all();
  res.json({ products });
});

router.post('/', requirePermission('kho'), (req, res) => {
  const input = readProductInput(req.body);

  if (!input.code || !input.name || !input.unit) {
    return res.status(400).json({ error: 'Thieu thong tin bat buoc (ma, ten, don vi tinh)' });
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
  res.status(201).json({ product });
});

router.put('/:id', requirePermission('kho'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay san pham' });
  }

  const input = readProductInput(req.body);
  if (!input.code || !input.name || !input.unit) {
    return res.status(400).json({ error: 'Thieu thong tin bat buoc (ma, ten, don vi tinh)' });
  }

  const duplicateCode = db.prepare('SELECT id FROM products WHERE code = ? AND id != ?').get(input.code, id);
  if (duplicateCode) {
    return res.status(409).json({ error: 'Ma san pham da ton tai' });
  }

  db.prepare(
    'UPDATE products SET code = ?, name = ?, unit = ?, cost_price = ?, sale_price = ?, low_stock_threshold = ? WHERE id = ?'
  ).run(input.code, input.name, input.unit, input.costPrice, input.salePrice, input.lowStockThreshold, id);

  const product = db.prepare(`${SELECT_PRODUCTS_WITH_STOCK} HAVING p.id = ?`).get(id);
  res.json({ product });
});

module.exports = router;
