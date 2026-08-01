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

router.get('/', (req, res) => {
  const { type } = req.query;

  if (type && !PARTNER_TYPES.includes(type)) {
    return res.status(400).json({ error: `Loai doi tac khong hop le: ${type}` });
  }

  const partners = type
    ? db.prepare('SELECT * FROM partners WHERE type = ? ORDER BY name ASC').all(type)
    : db.prepare('SELECT * FROM partners ORDER BY name ASC').all();

  res.json({ partners });
});

router.post('/', requireAnyPermission(['kho', 'cong_no']), (req, res) => {
  const { type, name, phone, address } = req.body || {};

  if (!PARTNER_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Loai doi tac khong hop le' });
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Thieu ten doi tac' });
  }

  const result = db
    .prepare('INSERT INTO partners (type, name, phone, address) VALUES (?, ?, ?, ?)')
    .run(type, String(name).trim(), phone ? String(phone).trim() : '', address ? String(address).trim() : '');

  const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ partner });
});

// Sua ten/sdt/dia chi - khong cho doi "type" sau khi tao (giong nguyen tac khong doi username
// cua users), tranh doi tac da co lich su phieu nhap/xuat bi doi nhap nhang giua NCC/khach hang.
router.put('/:id', requirePermission('cong_no'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM partners WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay doi tac' });
  }

  const { name, phone, address } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Thieu ten doi tac' });
  }

  db.prepare('UPDATE partners SET name = ?, phone = ?, address = ? WHERE id = ?').run(
    String(name).trim(),
    phone ? String(phone).trim() : '',
    address ? String(address).trim() : '',
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
