// Route "Giai doan mau" (migration 021, module Quan ly du an) - danh muc dung de copy vao du an
// moi tao (xem project.service.js copyPhaseTemplatesIntoProject). GET mo cho moi nguoi da dang
// nhap (dung khi tao du an moi de xem truoc danh sach se duoc copy), POST/PUT/DELETE rieng quyen
// 'cau_hinh' - giong pattern customerCategories.routes.js (danh muc thuoc menu Cau hinh).

const express = require('express');
const db = require('../db/database');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

router.get('/', (req, res) => {
  const templates = db.prepare('SELECT * FROM project_phase_templates ORDER BY sort_order ASC, id ASC').all();
  res.json({ templates });
});

router.post('/', requirePermission('cau_hinh'), (req, res) => {
  const { name, sort_order: sortOrder } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Thiếu tên giai đoạn' });
  }

  const maxOrder = db.prepare('SELECT MAX(sort_order) AS maxOrder FROM project_phase_templates').get();
  const normalizedOrder = sortOrder !== undefined && sortOrder !== null && sortOrder !== ''
    ? Number(sortOrder)
    : (maxOrder.maxOrder || 0) + 1;

  const result = db
    .prepare('INSERT INTO project_phase_templates (name, sort_order) VALUES (?, ?)')
    .run(String(name).trim(), normalizedOrder);

  const template = db.prepare('SELECT * FROM project_phase_templates WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ template });
});

router.put('/:id', requirePermission('cau_hinh'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM project_phase_templates WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy giai đoạn mẫu' });
  }

  const { name, sort_order: sortOrder } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Thiếu tên giai đoạn' });
  }

  const normalizedOrder = sortOrder !== undefined && sortOrder !== null && sortOrder !== '' ? Number(sortOrder) : 0;

  db.prepare('UPDATE project_phase_templates SET name = ?, sort_order = ? WHERE id = ?')
    .run(String(name).trim(), normalizedOrder, id);

  const template = db.prepare('SELECT * FROM project_phase_templates WHERE id = ?').get(id);
  res.json({ template });
});

// Xoa cung: khong anh huong du an da tao (chi la danh muc mau, cac du an da copy tach roi hoan
// toan - xem docs/DECISIONS.md), nen khong can kiem tra "dang duoc dung".
router.delete('/:id', requirePermission('cau_hinh'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM project_phase_templates WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy giai đoạn mẫu' });
  }

  db.prepare('DELETE FROM project_phase_templates WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;