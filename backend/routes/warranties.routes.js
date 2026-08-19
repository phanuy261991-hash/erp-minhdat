// Route "Bao hanh" (migration 017) - gan voi 1 khach hang cu the (partners.type='khach_hang'),
// khong ap dung cho NCC. Toan bo route trong file nay chi danh cho ai co quyen module 'bao_hanh'
// (gan requirePermission khi mount o server.js) - module rieng tu migration 036 (2026-08-08,
// truoc do dung chung 'cong_no'), van nam trong nhom menu "Khach hang" o sidebar.
//
// Khong tu tinh lai expiry_date tu duration o tang backend - frontend da giu 2 chieu dong bo
// (doi 1 trong 2 truong tu tinh lai truong con lai), backend chi luu nguyen nhung gi frontend
// gui len va validate hop le (expiry_date > acceptance_date).
//
// Migration 038 (2026-08-19, "quy bao hanh ve theo du an"): them project_id (TUY CHON - da chot
// qua AskUserQuestion, khong bat buoc de khong chan luong cua khach hang chua co du an nao) +
// bang warranty_visits (lich su bao hanh, xem CRUD o cuoi file). 1 du an co the co nhieu ban ghi
// warranties (khong ep unique project_id).

const express = require('express');
const db = require('../db/database');

const router = express.Router();

const DURATION_UNITS = ['ngay', 'thang', 'nam'];
const VISIT_RESULTS = ['hoan_thanh', 'chua_hoan_thanh', 'tam_dung'];

const SELECT_WARRANTY = `
  SELECT w.id, w.partner_id, w.project_id, w.phone, w.address, w.acceptance_date, w.expiry_date,
         w.duration_value, w.duration_unit, w.note, w.is_active, w.created_by, w.created_at, w.updated_at,
         p.name AS partner_name, pr.code AS project_code, pr.name AS project_name
  FROM warranties w
  JOIN partners p ON p.id = w.partner_id
  LEFT JOIN projects pr ON pr.id = w.project_id
`;

function withBooleanActive(warranty) {
  return { ...warranty, is_active: Boolean(warranty.is_active) };
}

function readWarrantyInput(body) {
  const {
    partner_id: partnerId,
    project_id: projectId,
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
    // Tuy chon (xem ghi chu migration 038) - rong/0/null deu hieu la "khong gan du an".
    projectId: Number(projectId) || null,
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
  if (input.projectId) {
    const project = db.prepare('SELECT id, partner_id FROM projects WHERE id = ?').get(input.projectId);
    if (!project) {
      return 'Khong tim thay du an';
    }
    if (project.partner_id !== input.partnerId) {
      return 'Du an khong thuoc ve khach hang da chon';
    }
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

// ?partner_id= va/hoac ?project_id= (deu tuy chon) - loc bao hanh, dung cho trang Chi tiet
// khach hang va tab "Bao hanh" o Chi tiet du an.
router.get('/', (req, res) => {
  const { partner_id: partnerId, project_id: projectId } = req.query;

  const conditions = [];
  const params = [];
  if (partnerId) {
    conditions.push('w.partner_id = ?');
    params.push(Number(partnerId));
  }
  if (projectId) {
    conditions.push('w.project_id = ?');
    params.push(Number(projectId));
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderClause = conditions.length ? 'ORDER BY w.expiry_date DESC' : 'ORDER BY w.created_at DESC';

  const warranties = db.prepare(`${SELECT_WARRANTY} ${whereClause} ${orderClause}`).all(...params);

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
        (partner_id, project_id, phone, address, acceptance_date, expiry_date, duration_value, duration_unit, note, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.partnerId,
      input.projectId,
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
      partner_id = ?, project_id = ?, phone = ?, address = ?, acceptance_date = ?, expiry_date = ?,
      duration_value = ?, duration_unit = ?, note = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    input.partnerId,
    input.projectId,
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
// xoa tai khoan/san pham (xem CLAUDE.md). Tu migration 038: chan xoa neu da co lich su bao hanh
// (warranty_visits) - giu nguyen tac chung "giu lich su, khong xoa duoc du lieu da co giao dich".
router.delete('/:id', (req, res) => {
  if (!req.session.user.is_protected) {
    return res.status(403).json({ error: 'Chi Admin moi co the xoa thong tin bao hanh' });
  }

  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM warranties WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay thong tin bao hanh' });
  }

  const hasVisits = db.prepare('SELECT COUNT(*) AS count FROM warranty_visits WHERE warranty_id = ?').get(id);
  if (hasVisits.count > 0) {
    return res.status(400).json({ error: 'Bao hanh da co lich su bao hanh, khong the xoa' });
  }

  db.prepare('DELETE FROM warranties WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ===== Lich su bao hanh (warranty_visits, migration 038) =====
// Gan voi 1 ban ghi warranties cu the qua :warrantyId. "Lan" (visit_number) do BACKEND tu tinh
// (MAX+1 trong pham vi warranty do), khong nhan tu client.

const SELECT_VISIT = `
  SELECT wv.id, wv.warranty_id, wv.visit_number, wv.performed_date, wv.content,
         wv.performed_by_user_id, wv.result, wv.note, wv.created_by, wv.created_at, wv.updated_at,
         u.full_name AS performed_by_name
  FROM warranty_visits wv
  LEFT JOIN users u ON u.id = wv.performed_by_user_id
`;

function getWarrantyOr404(res, warrantyId) {
  const warranty = db.prepare('SELECT id FROM warranties WHERE id = ?').get(warrantyId);
  if (!warranty) {
    res.status(404).json({ error: 'Khong tim thay thong tin bao hanh' });
    return null;
  }
  return warranty;
}

function readVisitInput(body) {
  const {
    performed_date: performedDate,
    content,
    performed_by_user_id: performedByUserId,
    result,
    note,
  } = body || {};

  return {
    performedDate: performedDate ? String(performedDate).trim() : '',
    content: content ? String(content).trim() : '',
    performedByUserId: Number(performedByUserId) || null,
    result: VISIT_RESULTS.includes(result) ? result : null,
    note: note ? String(note).trim() : '',
  };
}

function validateVisitInput(input) {
  if (!input.performedDate) {
    return 'Thieu ngay thuc hien';
  }
  if (!input.content) {
    return 'Thieu noi dung bao hanh';
  }
  if (!input.performedByUserId) {
    return 'Thieu nhan vien thuc hien';
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(input.performedByUserId);
  if (!user) {
    return 'Khong tim thay nhan vien thuc hien';
  }
  if (!input.result) {
    return 'Ket qua khong hop le';
  }
  return null;
}

router.get('/:warrantyId/visits', (req, res) => {
  const warrantyId = Number(req.params.warrantyId);
  if (!getWarrantyOr404(res, warrantyId)) return;

  const visits = db.prepare(`${SELECT_VISIT} WHERE wv.warranty_id = ? ORDER BY wv.visit_number ASC`).all(warrantyId);
  res.json({ visits });
});

router.post('/:warrantyId/visits', (req, res) => {
  const warrantyId = Number(req.params.warrantyId);
  if (!getWarrantyOr404(res, warrantyId)) return;

  const input = readVisitInput(req.body);
  const error = validateVisitInput(input);
  if (error) {
    return res.status(400).json({ error });
  }

  const nextNumber = db
    .prepare('SELECT COALESCE(MAX(visit_number), 0) + 1 AS next FROM warranty_visits WHERE warranty_id = ?')
    .get(warrantyId).next;

  const result = db
    .prepare(`
      INSERT INTO warranty_visits
        (warranty_id, visit_number, performed_date, content, performed_by_user_id, result, note, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(warrantyId, nextNumber, input.performedDate, input.content, input.performedByUserId, input.result, input.note, req.session.user.id);

  const visit = db.prepare(`${SELECT_VISIT} WHERE wv.id = ?`).get(result.lastInsertRowid);
  res.status(201).json({ visit });
});

router.put('/:warrantyId/visits/:visitId', (req, res) => {
  const warrantyId = Number(req.params.warrantyId);
  const visitId = Number(req.params.visitId);
  if (!getWarrantyOr404(res, warrantyId)) return;

  const existing = db.prepare('SELECT id FROM warranty_visits WHERE id = ? AND warranty_id = ?').get(visitId, warrantyId);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay lich su bao hanh' });
  }

  const input = readVisitInput(req.body);
  const error = validateVisitInput(input);
  if (error) {
    return res.status(400).json({ error });
  }

  db.prepare(`
    UPDATE warranty_visits SET
      performed_date = ?, content = ?, performed_by_user_id = ?, result = ?, note = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(input.performedDate, input.content, input.performedByUserId, input.result, input.note, visitId);

  const visit = db.prepare(`${SELECT_VISIT} WHERE wv.id = ?`).get(visitId);
  res.json({ visit });
});

router.delete('/:warrantyId/visits/:visitId', (req, res) => {
  const warrantyId = Number(req.params.warrantyId);
  const visitId = Number(req.params.visitId);
  if (!getWarrantyOr404(res, warrantyId)) return;

  const existing = db.prepare('SELECT id FROM warranty_visits WHERE id = ? AND warranty_id = ?').get(visitId, warrantyId);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay lich su bao hanh' });
  }

  db.prepare('DELETE FROM warranty_visits WHERE id = ?').run(visitId);
  res.json({ ok: true });
});

module.exports = router;
