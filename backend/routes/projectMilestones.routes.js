// Route "Dot thanh toan theo hop dong" (migration 025, Dot 4 module Quan ly du an) - long vao
// projects.routes.js tai '/:id/milestones' (mergeParams:true, cung pattern voi
// projectTasks.routes.js/projectMaterials.routes.js). Quyen 'du_an' da gan o tang cha.
//
// Khong luu so tien da thu hay trang thai - suy ra tu SUM(debt_ledger WHERE milestone_id) so
// voi amount (computeMilestoneStatus() trong project.service.js, dung chung nguyen tac voi
// computeDelay()/getProjectProgress() da co tu Dot 1-2).

const express = require('express');
const db = require('../db/database');
const projectService = require('../services/project.service');

const router = express.Router({ mergeParams: true });

function getProject(projectId) {
  return db.prepare('SELECT id, contract_value FROM projects WHERE id = ?').get(projectId);
}

function getCollectedByMilestone(projectId) {
  const rows = db
    .prepare(`
      SELECT milestone_id, SUM(amount) AS collected
      FROM debt_ledger
      WHERE milestone_id IN (SELECT id FROM project_payment_milestones WHERE project_id = ?)
        AND type = 'tra'
      GROUP BY milestone_id
    `)
    .all(projectId);
  return new Map(rows.map((r) => [r.milestone_id, r.collected]));
}

function getMilestonesForProject(projectId) {
  const milestones = db
    .prepare('SELECT * FROM project_payment_milestones WHERE project_id = ? ORDER BY sort_order ASC, id ASC')
    .all(projectId);
  const collectedMap = getCollectedByMilestone(projectId);

  return milestones.map((m) => {
    const collected = collectedMap.get(m.id) || 0;
    return {
      ...m,
      collected_amount: collected,
      remaining_amount: m.amount - collected,
      status: projectService.computeMilestoneStatus({ amount: m.amount, collected, dueDate: m.due_date }),
    };
  });
}

router.get('/', (req, res) => {
  const projectId = Number(req.params.id);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }
  res.json({ milestones: getMilestonesForProject(projectId) });
});

// Danh xung "Thong tin phieu in" - danh sach co dinh khop CHECK cua cot recipient_title
// (migration 031), '' nghia la chua chon (khong bat buoc).
// 2026-08-08: giao dien (project-detail.html) khong con cho chon 'anh'/'chi' rieng biet nua -
// gop thanh 1 lua chon "Khach hang" dung chung gia tri 'anh' (xem print-template-render.js).
// Gia tri 'chi' van de trong danh sach nay + CHECK o DB de KHONG chan du lieu cu (neu co) va
// tranh phai rebuild bang chi de xoa 1 gia tri enum khong con dung - xem docs/DECISIONS.md.
const RECIPIENT_TITLES = ['', 'anh', 'chi', 'cong_ty', 'don_vi'];

function readMilestoneInput(body) {
  const {
    name,
    sort_order: sortOrder,
    amount,
    percent,
    due_date: dueDate,
    note,
    recipient_name: recipientName,
    recipient_title: recipientTitle,
  } = body || {};
  return {
    name: name ? String(name).trim() : '',
    sortOrder: sortOrder !== undefined && sortOrder !== null && sortOrder !== '' ? Number(sortOrder) : 0,
    amount: Number(amount),
    percent: percent !== undefined && percent !== null && percent !== '' ? Number(percent) : null,
    dueDate: dueDate || null,
    note: note ? String(note).trim() : '',
    recipientName: recipientName ? String(recipientName).trim() : '',
    recipientTitle: recipientTitle ? String(recipientTitle).trim() : '',
  };
}

function validateMilestoneInput(input) {
  if (!input.name) return 'Thiếu tên đợt thanh toán';
  if (!(input.amount > 0)) return 'Số tiền đợt thanh toán phải lớn hơn 0';
  if (input.percent !== null && (input.percent < 0 || input.percent > 100)) return 'Phần trăm phải từ 0 đến 100';
  if (!RECIPIENT_TITLES.includes(input.recipientTitle)) return 'Danh xưng không hợp lệ';
  return null;
}

router.post('/', (req, res) => {
  const projectId = Number(req.params.id);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }

  const input = readMilestoneInput(req.body);
  const error = validateMilestoneInput(input);
  if (error) {
    return res.status(400).json({ error });
  }

  const maxOrder = db.prepare('SELECT MAX(sort_order) AS maxOrder FROM project_payment_milestones WHERE project_id = ?').get(projectId);
  const sortOrder = req.body && req.body.sort_order !== undefined && req.body.sort_order !== null && req.body.sort_order !== ''
    ? input.sortOrder
    : (maxOrder.maxOrder || 0) + 1;

  const result = db
    .prepare(`
      INSERT INTO project_payment_milestones
        (project_id, name, sort_order, amount, percent, due_date, note, recipient_name, recipient_title)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(projectId, input.name, sortOrder, input.amount, input.percent, input.dueDate, input.note, input.recipientName, input.recipientTitle);

  const milestones = getMilestonesForProject(projectId);
  res.status(201).json({ milestone: milestones.find((m) => m.id === result.lastInsertRowid) });
});

router.put('/:milestoneId', (req, res) => {
  const projectId = Number(req.params.id);
  const milestoneId = Number(req.params.milestoneId);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }
  const existing = db.prepare('SELECT id FROM project_payment_milestones WHERE id = ? AND project_id = ?').get(milestoneId, projectId);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy đợt thanh toán' });
  }

  const input = readMilestoneInput(req.body);
  const error = validateMilestoneInput(input);
  if (error) {
    return res.status(400).json({ error });
  }

  db.prepare(`
    UPDATE project_payment_milestones SET
      name = ?, sort_order = ?, amount = ?, percent = ?, due_date = ?, note = ?,
      recipient_name = ?, recipient_title = ?
    WHERE id = ?
  `).run(
    input.name,
    input.sortOrder,
    input.amount,
    input.percent,
    input.dueDate,
    input.note,
    input.recipientName,
    input.recipientTitle,
    milestoneId
  );

  const milestones = getMilestonesForProject(projectId);
  res.json({ milestone: milestones.find((m) => m.id === milestoneId) });
});

// Xoa: chan neu da co thanh toan gan vao (collected > 0) - tranh xoa mat dau vet da thu tien
// that, giong nguyen tac chan xoa giai doan/du an da co du lieu that.
router.delete('/:milestoneId', (req, res) => {
  const projectId = Number(req.params.id);
  const milestoneId = Number(req.params.milestoneId);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }
  const existing = db.prepare('SELECT id FROM project_payment_milestones WHERE id = ? AND project_id = ?').get(milestoneId, projectId);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy đợt thanh toán' });
  }

  const collected = db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM debt_ledger WHERE milestone_id = ? AND type = 'tra'").get(milestoneId);
  if (collected.total > 0) {
    return res.status(400).json({ error: 'Đợt thanh toán này đã có tiền thu, không thể xóa' });
  }

  db.prepare('DELETE FROM project_payment_milestones WHERE id = ?').run(milestoneId);
  res.json({ ok: true });
});

module.exports = router;
