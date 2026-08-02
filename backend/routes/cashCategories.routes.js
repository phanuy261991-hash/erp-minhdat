// Route "Loai thu chi" (danh muc cho module So quy, migration 019). Ca GET/POST/PUT/DELETE deu
// yeu cau quyen module 'so_quy' (kiem tra khi mount o server.js) - khac customer_categories vi
// khong co module nao khac ngoai So quy can doc danh muc nay.

const express = require('express');
const db = require('../db/database');

const router = express.Router();

const TYPES = ['thu', 'chi'];

router.get('/', (req, res) => {
  const { type } = req.query;
  if (type && !TYPES.includes(type)) {
    return res.status(400).json({ error: `Loai khong hop le: ${type}` });
  }

  const whereClause = type ? 'WHERE type = ?' : '';
  const params = type ? [type] : [];
  const categories = db.prepare(`SELECT * FROM cash_categories ${whereClause} ORDER BY type ASC, name ASC`).all(...params);
  res.json({ categories });
});

router.post('/', (req, res) => {
  const { name, type } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Thieu ten loai thu chi' });
  }
  if (!TYPES.includes(type)) {
    return res.status(400).json({ error: 'Loai khong hop le' });
  }

  const trimmedName = String(name).trim();
  const existing = db.prepare('SELECT id FROM cash_categories WHERE name = ? AND type = ?').get(trimmedName, type);
  if (existing) {
    return res.status(400).json({ error: 'Ten loai nay da ton tai' });
  }

  const result = db.prepare('INSERT INTO cash_categories (name, type) VALUES (?, ?)').run(trimmedName, type);
  const category = db.prepare('SELECT * FROM cash_categories WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ category });
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM cash_categories WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay loai thu chi' });
  }

  const { name, type } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Thieu ten loai thu chi' });
  }
  if (!TYPES.includes(type)) {
    return res.status(400).json({ error: 'Loai khong hop le' });
  }

  const trimmedName = String(name).trim();
  const duplicate = db.prepare('SELECT id FROM cash_categories WHERE name = ? AND type = ? AND id != ?').get(trimmedName, type, id);
  if (duplicate) {
    return res.status(400).json({ error: 'Ten loai nay da ton tai' });
  }

  db.prepare('UPDATE cash_categories SET name = ?, type = ? WHERE id = ?').run(trimmedName, type, id);
  const category = db.prepare('SELECT * FROM cash_categories WHERE id = ?').get(id);
  res.json({ category });
});

// Xoa cung: chan neu dang co phieu thu/chi nao dung loai nay - kiem tra tuong minh truoc (thong
// bao than thien) thay vi de FK constraint (foreign_keys=ON) nem loi SQLite tho ve client.
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM cash_categories WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay loai thu chi' });
  }

  const inUse = db.prepare('SELECT COUNT(*) AS count FROM cash_vouchers WHERE category_id = ?').get(id);
  if (inUse.count > 0) {
    return res.status(400).json({ error: 'Loai thu chi da co phieu su dung, khong the xoa' });
  }

  db.prepare('DELETE FROM cash_categories WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
