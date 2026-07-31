// Route doi tac (nha cung cap/khach hang) - PHIEN BAN RUT GON cho Phase 2: chi GET danh sach
// + POST tao nhanh, dung khi lap phieu nhap/xuat can chon hoac them nhanh doi tac moi ngay
// tai form. CRUD day du (sua/xoa, trang quan ly doi tac rieng, gan voi cong no) se lam o
// Phase 3 - xem docs/DECISIONS.md muc "Doi tac".
//
// GET mo cho moi nguoi da dang nhap (can de hien dropdown chon doi tac). POST (them nhanh)
// cho ca quyen 'kho' hoac 'cong_no' - ca thu kho (lap phieu nhap) lan ke toan deu co the can.

const express = require('express');
const db = require('../db/database');
const { requireAnyPermission } = require('../middleware/requirePermission');

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

module.exports = router;
