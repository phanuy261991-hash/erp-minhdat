// Route "Phat sinh du an" (migration 025, Dot 4 module Quan ly du an) - long vao
// projects.routes.js tai '/:id/variations' (mergeParams:true, cung pattern voi cac router con
// khac cua du an). Quyen 'du_an' da gan o tang cha.
//
// 1 bang chung, phan biet bang type: 'chi_phi' (co tien, khi status='da_duyet' thi cong vao gia
// tri hop dong thuc te cua du an - xem getProjectFinancials() trong projects.routes.js) hoac
// 'van_de' (nhat ky su co, khong gan tien, amount luon 0 du client co gui gi len).

const express = require('express');
const db = require('../db/database');

const router = express.Router({ mergeParams: true });

const TYPES = ['chi_phi', 'van_de'];
const STATUSES = ['cho_duyet', 'da_duyet', 'tu_choi'];

function getProject(projectId) {
  return db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
}

router.get('/', (req, res) => {
  const projectId = Number(req.params.id);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }

  const variations = db
    .prepare(`
      SELECT v.*, u.full_name AS created_by_name
      FROM project_variations v
      JOIN users u ON u.id = v.created_by
      WHERE v.project_id = ?
      ORDER BY v.occurred_date DESC, v.id DESC
    `)
    .all(projectId);
  res.json({ variations });
});

function readVariationInput(body) {
  const { type, title, amount, occurred_date: occurredDate, description, status, resolution } = body || {};
  const resolvedType = TYPES.includes(type) ? type : null;
  return {
    type: resolvedType,
    title: title ? String(title).trim() : '',
    // Van de (khong tien) luon amount=0 du client gui gi len - dung nguyen tac schema comment.
    amount: resolvedType === 'chi_phi' ? Number(amount) || 0 : 0,
    occurredDate: occurredDate || null,
    description: description ? String(description).trim() : '',
    status: STATUSES.includes(status) ? status : 'cho_duyet',
    resolution: resolution ? String(resolution).trim() : '',
  };
}

function validateVariationInput(input) {
  if (!input.type) return 'Loại phát sinh không hợp lệ';
  if (!input.title) return 'Thiếu tiêu đề phát sinh';
  if (input.type === 'chi_phi' && !(input.amount > 0)) return 'Chi phí phát sinh phải có số tiền lớn hơn 0';
  return null;
}

router.post('/', (req, res) => {
  const projectId = Number(req.params.id);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }

  const input = readVariationInput(req.body);
  const error = validateVariationInput(input);
  if (error) {
    return res.status(400).json({ error });
  }

  const result = db
    .prepare(`
      INSERT INTO project_variations (project_id, type, title, amount, occurred_date, description, status, resolution, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(projectId, input.type, input.title, input.amount, input.occurredDate, input.description, input.status, input.resolution, req.session.user.id);

  const variation = db
    .prepare('SELECT v.*, u.full_name AS created_by_name FROM project_variations v JOIN users u ON u.id = v.created_by WHERE v.id = ?')
    .get(result.lastInsertRowid);
  res.status(201).json({ variation });
});

router.put('/:variationId', (req, res) => {
  const projectId = Number(req.params.id);
  const variationId = Number(req.params.variationId);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }
  const existing = db.prepare('SELECT id FROM project_variations WHERE id = ? AND project_id = ?').get(variationId, projectId);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy phát sinh' });
  }

  const input = readVariationInput(req.body);
  const error = validateVariationInput(input);
  if (error) {
    return res.status(400).json({ error });
  }

  db.prepare(`
    UPDATE project_variations SET
      type = ?, title = ?, amount = ?, occurred_date = ?, description = ?, status = ?, resolution = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(input.type, input.title, input.amount, input.occurredDate, input.description, input.status, input.resolution, variationId);

  const variation = db
    .prepare('SELECT v.*, u.full_name AS created_by_name FROM project_variations v JOIN users u ON u.id = v.created_by WHERE v.id = ?')
    .get(variationId);
  res.json({ variation });
});

router.delete('/:variationId', (req, res) => {
  const projectId = Number(req.params.id);
  const variationId = Number(req.params.variationId);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }
  const existing = db.prepare('SELECT id FROM project_variations WHERE id = ? AND project_id = ?').get(variationId, projectId);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy phát sinh' });
  }

  db.prepare('DELETE FROM project_variations WHERE id = ?').run(variationId);
  res.json({ ok: true });
});

module.exports = router;
