// Route doi tac (nha cung cap/khach hang). GET danh sach + POST tao nhanh la ban rut gon tu
// Phase 2, dung khi lap phieu nhap/xuat can chon hoac them nhanh doi tac moi ngay tai form.
// PUT/DELETE (quan ly doi tac day du, gan voi module Cong no) them o Phase 3 - xem
// docs/DECISIONS.md muc "Doi tac".
//
// GET mo cho moi nguoi da dang nhap (can de hien dropdown chon doi tac). POST (them nhanh)
// cho ca quyen 'kho' hoac 'cong_no' - ca thu kho (lap phieu nhap) lan ke toan deu co the can.
// PUT/DELETE (sua/xoa day du tren trang quan ly doi tac) rieng chi quyen 'cong_no'.

const express = require('express');
const db = require('../db/database');
const { requireAnyPermission, requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

const PARTNER_TYPES = ['nha_cung_cap', 'khach_hang'];

// Validate category_id: chi co y nghia voi khach hang (xem migration 015) - NCC gui len se bi
// tu bo qua (luon luu NULL) de tranh du lieu nham lan giua 2 loai doi tac.
function resolveCategoryId(type, categoryId) {
  if (type !== 'khach_hang' || categoryId === undefined || categoryId === null || categoryId === '') {
    return null;
  }
  const category = db.prepare('SELECT id FROM customer_categories WHERE id = ?').get(Number(categoryId));
  if (!category) {
    throw new Error('Loai khach hang khong hop le');
  }
  return Number(categoryId);
}

router.get('/', (req, res) => {
  const { type } = req.query;

  if (type && !PARTNER_TYPES.includes(type)) {
    return res.status(400).json({ error: `Loai doi tac khong hop le: ${type}` });
  }

  const baseQuery = `
    SELECT p.*, c.name AS category_name, c.debt_limit AS category_debt_limit
    FROM partners p
    LEFT JOIN customer_categories c ON c.id = p.category_id
  `;

  const partners = type
    ? db.prepare(`${baseQuery} WHERE p.type = ? ORDER BY p.name ASC`).all(type)
    : db.prepare(`${baseQuery} ORDER BY p.name ASC`).all();

  res.json({ partners });
});

router.post('/', requireAnyPermission(['kho', 'cong_no']), (req, res) => {
  const { type, name, phone, address, category_id: categoryId } = req.body || {};

  if (!PARTNER_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Loai doi tac khong hop le' });
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Thieu ten doi tac' });
  }

  let resolvedCategoryId;
  try {
    resolvedCategoryId = resolveCategoryId(type, categoryId);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const result = db
    .prepare('INSERT INTO partners (type, name, phone, address, category_id) VALUES (?, ?, ?, ?, ?)')
    .run(type, String(name).trim(), phone ? String(phone).trim() : '', address ? String(address).trim() : '', resolvedCategoryId);

  const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ partner });
});

// Sua ten/sdt/dia chi - khong cho doi "type" sau khi tao (giong nguyen tac khong doi username
// cua users), tranh doi tac da co lich su phieu nhap/xuat bi doi nhap nhang giua NCC/khach hang.
router.put('/:id', requirePermission('cong_no'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id, type FROM partners WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay doi tac' });
  }

  const { name, phone, address, category_id: categoryId } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Thieu ten doi tac' });
  }

  let resolvedCategoryId;
  try {
    resolvedCategoryId = resolveCategoryId(existing.type, categoryId);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.prepare('UPDATE partners SET name = ?, phone = ?, address = ?, category_id = ? WHERE id = ?').run(
    String(name).trim(),
    phone ? String(phone).trim() : '',
    address ? String(address).trim() : '',
    resolvedCategoryId,
    id
  );

  const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(id);
  res.json({ partner });
});

// Xoa cung: chan neu doi tac da co lich su (phieu nhap/xuat hoac dong cong no) - giu nguyen
// tac giu lich su nhu xoa san pham/tai khoan (xem CLAUDE.md).
router.delete('/:id', requirePermission('cong_no'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM partners WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay doi tac' });
  }

  const inUse = db
    .prepare(`
      SELECT
        (SELECT COUNT(*) FROM stock_receipts WHERE partner_id = ?) +
        (SELECT COUNT(*) FROM stock_issues WHERE partner_id = ?) +
        (SELECT COUNT(*) FROM debt_ledger WHERE partner_id = ?) AS count
    `)
    .get(id, id, id);

  if (inUse.count > 0) {
    return res.status(400).json({ error: 'Doi tac da co lich su phieu nhap/xuat hoac cong no, khong the xoa' });
  }

  db.prepare('DELETE FROM partners WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
