// Route "Cong viec" (migration 022, Dot 2 module Quan ly du an) - long vao projects.routes.js
// tai '/:id/tasks' (mergeParams:true de doc duoc req.params.id la project_id). Quyen 'du_an' da
// gan o tang cha (server.js), khong can khai bao lai o day.
//
// Nguoi phu trach (assigned_user_id) BAT BUOC phai nam trong project_members cua dung du an do
// (theo quyet dinh da chot voi nguoi dung, xem docs/DECISIONS.md muc 2026-08-04) - tranh giao
// nham cong viec cho nguoi ngoai du an.

const express = require('express');
const db = require('../db/database');
const projectService = require('../services/project.service');

const router = express.Router({ mergeParams: true });

const SELECT_TASK = `
  SELECT t.*, p.name AS phase_name, p.project_id, u.full_name AS assigned_user_name
  FROM project_tasks t
  JOIN project_phases p ON p.id = t.phase_id
  LEFT JOIN users u ON u.id = t.assigned_user_id
`;

// is_late/late_days (2026-08-04, theo yeu cau nguoi dung): "tre tien do" so sanh due_date voi
// actual_end_date (da xong) hoac voi hom nay (chua xong) - xem computeDelay() trong
// project.service.js, dung chung logic voi giai doan. Tu migration 023, actual_end_date la truong
// nhap tay (giong cach project_phases.actual_end da lam) - thay the hoan toan completed_at tu dong.
function withDelay(task) {
  return {
    ...task,
    ...projectService.computeDelay({
      plannedEnd: task.due_date,
      actualEnd: task.actual_end_date || null,
      isDone: task.status === 'hoan_thanh',
    }),
  };
}

function getProject(projectId) {
  return db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
}

function isPhaseOfProject(phaseId, projectId) {
  return db.prepare('SELECT id FROM project_phases WHERE id = ? AND project_id = ?').get(phaseId, projectId);
}

function isMemberOfProject(userId, projectId) {
  return db.prepare('SELECT id FROM project_members WHERE user_id = ? AND project_id = ?').get(userId, projectId);
}

function readTaskInput(body) {
  const {
    phase_id: phaseId,
    name,
    assigned_user_id: assignedUserId,
    start_date: startDate,
    due_date: dueDate,
    actual_start_date: actualStartDate,
    actual_end_date: actualEndDate,
    status,
    note,
  } = body || {};

  return {
    phaseId: Number(phaseId) || null,
    name: name ? String(name).trim() : '',
    assignedUserId: assignedUserId ? Number(assignedUserId) : null,
    startDate: startDate || null,
    dueDate: dueDate || null,
    actualStartDate: actualStartDate || null,
    actualEndDate: actualEndDate || null,
    status: ['chua_lam', 'dang_lam', 'hoan_thanh'].includes(status) ? status : 'chua_lam',
    note: note ? String(note).trim() : '',
  };
}

function validateTaskInput(input, projectId) {
  if (!input.phaseId) {
    return 'Thiếu giai đoạn';
  }
  if (!isPhaseOfProject(input.phaseId, projectId)) {
    return 'Giai đoạn không thuộc dự án này';
  }
  if (!input.name) {
    return 'Thiếu tên công việc';
  }
  if (input.assignedUserId && !isMemberOfProject(input.assignedUserId, projectId)) {
    return 'Người phụ trách phải nằm trong danh sách người tham gia dự án';
  }
  return null;
}

router.get('/', (req, res) => {
  const projectId = Number(req.params.id);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }

  const tasks = db.prepare(`${SELECT_TASK} WHERE p.project_id = ? ORDER BY p.sort_order ASC, t.id ASC`).all(projectId);
  res.json({ tasks: tasks.map(withDelay) });
});

router.post('/', (req, res) => {
  const projectId = Number(req.params.id);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }

  const input = readTaskInput(req.body);
  const error = validateTaskInput(input, projectId);
  if (error) {
    return res.status(400).json({ error });
  }

  const result = db
    .prepare(`
      INSERT INTO project_tasks (phase_id, name, assigned_user_id, start_date, due_date, actual_start_date, actual_end_date, status, note, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(input.phaseId, input.name, input.assignedUserId, input.startDate, input.dueDate, input.actualStartDate, input.actualEndDate, input.status, input.note, req.session.user.id);

  const task = db.prepare(`${SELECT_TASK} WHERE t.id = ?`).get(result.lastInsertRowid);
  res.status(201).json({ task: withDelay(task) });
});

router.put('/:taskId', (req, res) => {
  const projectId = Number(req.params.id);
  const taskId = Number(req.params.taskId);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }

  const existing = db.prepare(`${SELECT_TASK} WHERE t.id = ? AND p.project_id = ?`).get(taskId, projectId);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy công việc' });
  }

  const input = readTaskInput(req.body);
  const error = validateTaskInput(input, projectId);
  if (error) {
    return res.status(400).json({ error });
  }

  db.prepare(`
    UPDATE project_tasks SET
      phase_id = ?, name = ?, assigned_user_id = ?, start_date = ?, due_date = ?,
      actual_start_date = ?, actual_end_date = ?, status = ?, note = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(input.phaseId, input.name, input.assignedUserId, input.startDate, input.dueDate, input.actualStartDate, input.actualEndDate, input.status, input.note, taskId);

  const task = db.prepare(`${SELECT_TASK} WHERE t.id = ?`).get(taskId);
  res.json({ task: withDelay(task) });
});

router.delete('/:taskId', (req, res) => {
  const projectId = Number(req.params.id);
  const taskId = Number(req.params.taskId);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }

  const existing = db.prepare(`SELECT t.id FROM project_tasks t JOIN project_phases p ON p.id = t.phase_id WHERE t.id = ? AND p.project_id = ?`).get(taskId, projectId);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy công việc' });
  }

  db.prepare('DELETE FROM project_tasks WHERE id = ?').run(taskId);
  res.json({ ok: true });
});

module.exports = router;
