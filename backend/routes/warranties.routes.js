// Route "Bao hanh" (migration 017) - gan voi 1 khach hang cu the (partners.type='khach_hang'),
// khong ap dung cho NCC. Toan bo route trong file nay chi danh cho ai co quyen module 'bao_hanh'
// (gan requirePermission khi mount o server.js) - module rieng tu migration 036 (2026-08-08,
// truoc do dung chung 'cong_no'), van nam trong nhom menu "Khach hang" o sidebar.
//
// Khong tu tinh lai expiry_date tu duration o tang backend - frontend da giu 2 chieu dong bo
// (doi 1 trong 2 truong tu tinh lai truong con lai), backend chi luu nguyen nhung gi frontend
// gui len va validate hop le (expiry_date > acceptance_date).

const express = require('express');
const db = require('../db/database');

const router = express.Router();

const DURATION_UNITS = ['ngay', 'thang', 'nam'];

const SELECT_WARRANTY = `
  SELECT w.id, w.partner_id, w.phone, w.address, w.acceptance_date, w.expiry_date,
         w.duration_value, w.duration_unit, w.note, w.is_active, w.created_by, w.created_at, w.updated_at,
         p.name AS partner_name
  FROM warranties w
  JOIN partners p ON p.id = w.partner_id
`;

function withBooleanActive(warranty) {
  return { ...warranty, is_active: Boolean(warranty.is_active) };
}

function readWarrantyInput(body) {
  const {
    partner_id: partnerId,
    phone,
    address,
    acceptance_date: acceptanceDate,
    expiry_date: expiryDate,
    duration_value: durationValue,
    duration_unit: durationUnit,
    note,
  } = body || {};

  return {
    partnerId: Number(partnerId) || null,
    phone: phone ? String(phone).trim() : '',
    address: address ? String(address).trim() : '',
    acceptanceDate: acceptanceDate ? String(acceptanceDate).trim() : '',
    expiryDate: expiryDate ? String(expiryDate).trim() : '',
    durationValue: Number(durationValue),
    durationUnit: durationUnit ? String(durationUnit).trim() : '',
    note: note ? String(note).trim() : '',
  };
}

function validateWarrantyInput(input) {
  if (!input.partnerId) {
    return 'Thieu khach hang';
  }
  const partner = db.prepare('SELECT id, type FROM partners WHERE id = ?').get(input.partnerId);
  if (!partner) {
    return 'Khong tim thay khach hang';
  }
  if (partner.type !== 'khach_hang') {
    return 'Chi tao duoc bao hanh cho doi tac loai Khach hang';
  }
  if (!input.acceptanceDate || !input.expiryDate) {
    return 'Thieu ngay nghiem thu hoac ngay het han';
  }
  if (input.expiryDate <= input.acceptanceDate) {
    return 'Ngay het han phai sau ngay nghiem thu';
  }
  if (!(input.durationValue > 0)) {
    return 'Thoi gian bao hanh khong hop le';
  }
  if (!DURATION_UNITS.includes(input.durationUnit)) {
    return 'Don vi thoi gian bao hanh khong hop le';
  }
  return null;
}

// ?partner_id= (tuy chon) - loc bao hanh cua 1 khach hang, dung cho trang Chi tiet khach hang.
router.get('/', (req, res) => {
  const { partner_id: partnerId } = req.query;

  const warranties = partnerId
    ? db.prepare(`${SELECT_WARRANTY} WHERE w.partner_id = ? ORDER BY w.expiry_date DESC`).all(Number(partnerId))
    : db.prepare(`${SELECT_WARRANTY} ORDER BY w.created_at DESC`).all();

  res.json({ warranties: warranties.map(withBooleanActive) });
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const warranty = db.prepare(`${SELECT_WARRANTY} WHERE w.id = ?`).get(id);
  if (!warranty) {
    return res.status(404).json({ error: 'Khong tim thay thong tin bao hanh' });
  }
  res.json({ warranty: withBooleanActive(warranty) });
});

router.post('/', (req, res) => {
  const input = readWarrantyInput(req.body);
  const error = validateWarrantyInput(input);
  if (error) {
    return res.status(400).json({ error });
  }

  const result = db
    .prepare(`
      INSERT INTO warranties
        (partner_id, phone, address, acceptance_date, expiry_date, duration_value, duration_unit, note, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.partnerId,
      input.phone,
      input.address,
      input.acceptanceDate,
      input.expiryDate,
      input.durationValue,
      input.durationUnit,
      input.note,
      req.session.user.id
    );

  const warranty = db.prepare(`${SELECT_WARRANTY} WHERE w.id = ?`).get(result.lastInsertRowid);
  res.status(201).json({ warranty: withBooleanActive(warranty) });
});

// Sua thong tin bao hanh - luu tren giao dien xem chi tiet bao hanh (khong phai modal rieng,
// xem yeu cau nguoi dung 2026-08-01).
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM warranties WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay thong tin bao hanh' });
  }

  const input = readWarrantyInput(req.body);
  const error = validateWarrantyInput(input);
  if (error) {
    return res.status(400).json({ error });
  }

  db.prepare(`
    UPDATE warranties SET
      partner_id = ?, phone = ?, address = ?, acceptance_date = ?, expiry_date = ?,
      duration_value = ?, duration_unit = ?, note = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    input.partnerId,
    input.phone,
    input.address,
    input.acceptanceDate,
    input.expiryDate,
    input.durationValue,
    input.durationUnit,
    input.note,
    id
  );

  const warranty = db.prepare(`${SELECT_WARRANTY} WHERE w.id = ?`).get(id);
  res.json({ warranty: withBooleanActive(warranty) });
});

router.patch('/:id/deactivate', (req, res) => {
  setActiveState(req, res, 0);
});

router.patch('/:id/activate', (req, res) => {
  setActiveState(req, res, 1);
});

function setActiveState(req, res, isActive) {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM warranties WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay thong tin bao hanh' });
  }

  db.prepare("UPDATE warranties SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(isActive, id);

  const warranty = db.prepare(`${SELECT_WARRANTY} WHERE w.id = ?`).get(id);
  res.json({ warranty: withBooleanActive(warranty) });
}

// Xoa cung: chi Admin (is_protected) - theo yeu cau nguoi dung 2026-08-01, giong nguyen tac
// xoa tai khoan/san pham (xem CLAUDE.md). Khong co du lieu nao khac tham chieu warranties.id
// nen khong can kiem tra "da co lich su".
router.delete('/:id', (req, res) => {
  if (!req.session.user.is_protected) {
    return res.status(403).json({ error: 'Chi Admin moi co the xoa thong tin bao hanh' });
  }

  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM warranties WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay thong tin bao hanh' });
  }

  db.prepare('DELETE FROM warranties WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
