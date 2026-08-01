// Route "Loai khach hang" (migration 015) - danh muc phan loai doi tac type='khach_hang', kem
// han muc cong no de canh bao (khong chan cung, xem docs/DECISIONS.md). GET mo cho moi nguoi
// da dang nhap (dung khi chon loai luc them/sua khach hang), POST/PUT/DELETE rieng quyen 'cau_hinh'
// (thuoc menu Cau hinh - giong company-settings/warehouse-settings).

const express = require('express');
const db = require('../db/database');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM customer_categories ORDER BY name ASC').all();
  res.json({ categories });
});

router.post('/', requirePermission('cau_hinh'), (req, res) => {
  const { name, debt_limit: debtLimit } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Thieu ten loai khach hang' });
  }
  if (debtLimit !== undefined && debtLimit !== null && debtLimit !== '' && !(Number(debtLimit) >= 0)) {
    return res.status(400).json({ error: 'Han muc cong no khong hop le' });
  }

  const trimmedName = String(name).trim();
  const existing = db.prepare('SELECT id FROM customer_categories WHERE name = ?').get(trimmedName);
  if (existing) {
    return res.status(400).json({ error: 'Ten loai khach hang da ton tai' });
  }

  const normalizedLimit = debtLimit === undefined || debtLimit === null || debtLimit === '' ? null : Number(debtLimit);
  const result = db
    .prepare('INSERT INTO customer_categories (name, debt_limit) VALUES (?, ?)')
    .run(trimmedName, normalizedLimit);

  const category = db.prepare('SELECT * FROM customer_categories WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ category });
});

router.put('/:id', requirePermission('cau_hinh'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM customer_categories WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay loai khach hang' });
  }

  const { name, debt_limit: debtLimit } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Thieu ten loai khach hang' });
  }
  if (debtLimit !== undefined && debtLimit !== null && debtLimit !== '' && !(Number(debtLimit) >= 0)) {
    return res.status(400).json({ error: 'Han muc cong no khong hop le' });
  }

  const trimmedName = String(name).trim();
  const duplicate = db.prepare('SELECT id FROM customer_categories WHERE name = ? AND id != ?').get(trimmedName, id);
  if (duplicate) {
    return res.status(400).json({ error: 'Ten loai khach hang da ton tai' });
  }

  const normalizedLimit = debtLimit === undefined || debtLimit === null || debtLimit === '' ? null : Number(debtLimit);
  db.prepare('UPDATE customer_categories SET name = ?, debt_limit = ? WHERE id = ?').run(trimmedName, normalizedLimit, id);

  const category = db.prepare('SELECT * FROM customer_categories WHERE id = ?').get(id);
  res.json({ category });
});

// Xoa cung: chan neu dang co doi tac nao gan loai nay - giu nguyen tac giu lich su nhu cac
// danh muc khac (xem CLAUDE.md).
router.delete('/:id', requirePermission('cau_hinh'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM customer_categories WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay loai khach hang' });
  }

  const inUse = db.prepare('SELECT COUNT(*) AS count FROM partners WHERE category_id = ?').get(id);
  if (inUse.count > 0) {
    return res.status(400).json({ error: 'Dang co khach hang thuoc loai nay, khong the xoa' });
  }

  db.prepare('DELETE FROM customer_categories WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
