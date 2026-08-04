// Route module "Quan ly du an" - Dot 1: CRUD du an (kem nguoi tham gia) + giai doan cua tung
// du an. Toan bo route trong file nay chi danh cho ai co quyen module 'du_an' (gan
// requirePermission khi mount o server.js). Logic nghiep vu (validate, transaction) nam o
// backend/services/project.service.js - xem file do de biet ly do cac quyet dinh ky thuat.

const express = require('express');
const db = require('../db/database');
const projectService = require('../services/project.service');
const projectTasksRoutes = require('./projectTasks.routes');
const projectMaterialsRoutes = require('./projectMaterials.routes');
const projectMilestonesRoutes = require('./projectMilestones.routes');
const projectVariationsRoutes = require('./projectVariations.routes');

const router = express.Router();

// Long router "Cong viec" (migration 022, Dot 2) tai '/:id/tasks' - projectTasks.routes.js dung
// { mergeParams: true } nen doc duoc dung req.params.id la project_id.
router.use('/:id/tasks', projectTasksRoutes);
// Long router "Vat tu" (migration 024, Dot 3) tai '/:id/materials' - cung pattern mergeParams.
router.use('/:id/materials', projectMaterialsRoutes);
// Long 2 router "Dot thanh toan"/"Phat sinh" (migration 025, Dot 4) - cung pattern mergeParams.
router.use('/:id/milestones', projectMilestonesRoutes);
router.use('/:id/variations', projectVariationsRoutes);

const SELECT_PROJECT = `
  SELECT pr.*, p.name AS partner_name, p.phone AS partner_phone, u.full_name AS manager_name
  FROM projects pr
  JOIN partners p ON p.id = pr.partner_id
  LEFT JOIN users u ON u.id = pr.manager_id
`;

function getMembers(projectId) {
  return db
    .prepare(`
      SELECT pm.id, pm.user_id, pm.role_in_project, u.full_name
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = ?
      ORDER BY u.full_name ASC
    `)
    .all(projectId);
}

// progress_percent tung giai doan: tinh tu ti le cong viec hoan_thanh CUA DUNG giai doan do (khac
// projectService.getProjectProgress von gop chung ca du an) - null (hien "-") neu giai doan chua
// co cong viec nao, dung nguyen tac "khong lam trong rong = 0%" da chot o Dot 1.
// is_late/late_days (2026-08-04, theo yeu cau nguoi dung): "tre tien do" so sanh planned_end vs
// actual_end (da xong) hoac vs hom nay (chua xong) - xem computeDelay() trong project.service.js.
function getPhases(projectId) {
  const phases = db
    .prepare('SELECT * FROM project_phases WHERE project_id = ? ORDER BY sort_order ASC, id ASC')
    .all(projectId);

  const withDelay = (phase) => ({
    ...phase,
    ...projectService.computeDelay({
      plannedEnd: phase.planned_end,
      actualEnd: phase.actual_end,
      isDone: phase.status === 'hoan_thanh',
    }),
  });

  const taskTableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'project_tasks'")
    .get();
  if (!taskTableExists) {
    return phases.map((phase) => withDelay({ ...phase, progress_percent: null }));
  }

  const counts = db
    .prepare(`
      SELECT phase_id, COUNT(*) AS total, SUM(CASE WHEN status = 'hoan_thanh' THEN 1 ELSE 0 END) AS done
      FROM project_tasks
      WHERE phase_id IN (SELECT id FROM project_phases WHERE project_id = ?)
      GROUP BY phase_id
    `)
    .all(projectId);
  const countsByPhase = new Map(counts.map((c) => [c.phase_id, c]));

  return phases.map((phase) => {
    const count = countsByPhase.get(phase.id);
    const progress = count && count.total > 0 ? Math.round((count.done / count.total) * 100) : null;
    return withDelay({ ...phase, progress_percent: progress });
  });
}

function serializeProjectSummary(row) {
  return { ...row, progress_percent: projectService.getProjectProgress(row.id) };
}

// "Gia tri hop dong thuc te" = contract_value goc + SUM cac dong phat sinh type='chi_phi' DA
// DUYET (status='da_duyet') - dung PRD 4.12, khong luu san ma tinh lai moi lan (nguyen tac chung
// cua du an). Tom tat cong no du an (no phat sinh/da thu/con phai thu) tinh truc tiep tu
// debt_ledger.project_id - chi tra o GET /:id (khong tra o danh sach de tranh N+1 query khong
// can thiet cho trang danh sach du an).
function getProjectFinancials(projectId, contractValue) {
  const variationTableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'project_variations'")
    .get();
  const approvedVariations = variationTableExists
    ? db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM project_variations WHERE project_id = ? AND type = 'chi_phi' AND status = 'da_duyet'").get(projectId).total
    : 0;

  const debtColumnExists = db
    .prepare("SELECT 1 FROM pragma_table_info('debt_ledger') WHERE name = 'project_id'")
    .get();
  const debtSummary = debtColumnExists
    ? db
        .prepare(`
          SELECT
            COALESCE(SUM(CASE WHEN type = 'no' THEN amount ELSE 0 END), 0) AS total_debt,
            COALESCE(SUM(CASE WHEN type = 'tra' THEN amount ELSE 0 END), 0) AS total_collected
          FROM debt_ledger
          WHERE project_id = ?
        `)
        .get(projectId)
    : { total_debt: 0, total_collected: 0 };

  return {
    contract_value_actual: contractValue + approvedVariations,
    debt_summary: {
      total_debt: debtSummary.total_debt,
      total_collected: debtSummary.total_collected,
      remaining: debtSummary.total_debt - debtSummary.total_collected,
    },
  };
}

function readMembersInput(body) {
  const raw = Array.isArray(body.members) ? body.members : [];
  return raw.map((m) => ({
    userId: Number(m.user_id) || null,
    roleInProject: m.role_in_project ? String(m.role_in_project).trim() : '',
  }));
}

// ?partner_id= (tuy chon, Dot 4): loc du an theo 1 khach hang - dung cho select "Du an" tren
// form Ghi nhan thanh toan/Dieu chinh cong no o customer-debts.html (chi hien du an CUA DUNG
// khach hang dang chon).
router.get('/', (req, res) => {
  const { partner_id: rawPartnerId } = req.query;
  const whereClause = rawPartnerId ? 'WHERE pr.partner_id = ?' : '';
  const params = rawPartnerId ? [Number(rawPartnerId)] : [];

  const projects = db.prepare(`${SELECT_PROJECT} ${whereClause} ORDER BY pr.created_at DESC`).all(...params);
  res.json({ projects: projects.map(serializeProjectSummary) });
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const project = db.prepare(`${SELECT_PROJECT} WHERE pr.id = ?`).get(id);
  if (!project) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }

  res.json({
    project: { ...serializeProjectSummary(project), ...getProjectFinancials(id, project.contract_value) },
    members: getMembers(id),
    phases: getPhases(id),
  });
});

router.post('/', (req, res) => {
  const body = req.body || {};

  try {
    const projectId = projectService.createProject({
      name: body.name,
      partnerId: Number(body.partner_id) || null,
      contractNo: body.contract_no,
      contractDate: body.contract_date,
      siteAddress: body.site_address,
      contractValue: Number(body.contract_value) || 0,
      startDate: body.start_date,
      plannedEndDate: body.planned_end_date,
      status: body.status,
      managerId: body.manager_id ? Number(body.manager_id) : null,
      note: body.note,
      createdBy: req.session.user.id,
      members: readMembersInput(body),
    });

    const project = db.prepare(`${SELECT_PROJECT} WHERE pr.id = ?`).get(projectId);
    res.status(201).json({
      project: serializeProjectSummary(project),
      members: getMembers(projectId),
      phases: getPhases(projectId),
    });
  } catch (err) {
    if (err instanceof projectService.ServiceError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};

  try {
    projectService.updateProject(id, {
      name: body.name,
      partnerId: Number(body.partner_id) || null,
      contractNo: body.contract_no,
      contractDate: body.contract_date,
      siteAddress: body.site_address,
      contractValue: Number(body.contract_value) || 0,
      startDate: body.start_date,
      plannedEndDate: body.planned_end_date,
      actualEndDate: body.actual_end_date,
      status: body.status,
      managerId: body.manager_id ? Number(body.manager_id) : null,
      note: body.note,
      members: readMembersInput(body),
    });

    const project = db.prepare(`${SELECT_PROJECT} WHERE pr.id = ?`).get(id);
    res.json({
      project: serializeProjectSummary(project),
      members: getMembers(id),
      phases: getPhases(id),
    });
  } catch (err) {
    if (err instanceof projectService.ServiceError) {
      const status = err.message === 'Không tìm thấy dự án' ? 404 : 400;
      return res.status(status).json({ error: err.message });
    }
    throw err;
  }
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);

  try {
    projectService.deleteProject(id);
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof projectService.ServiceError) {
      const status = err.message === 'Không tìm thấy dự án' ? 404 : 400;
      return res.status(status).json({ error: err.message });
    }
    throw err;
  }
});

// ----- Giai doan cua rieng 1 du an (khong dung chung voi project_phase_templates) -----

router.post('/:id/phases', (req, res) => {
  const projectId = Number(req.params.id);
  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }

  const {
    name,
    sort_order: sortOrder,
    planned_start: plannedStart,
    planned_end: plannedEnd,
    actual_start: actualStart,
    actual_end: actualEnd,
    status,
    note,
  } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Thiếu tên giai đoạn' });
  }

  const maxOrder = db.prepare('SELECT MAX(sort_order) AS maxOrder FROM project_phases WHERE project_id = ?').get(projectId);
  const normalizedOrder = sortOrder !== undefined && sortOrder !== null && sortOrder !== ''
    ? Number(sortOrder)
    : (maxOrder.maxOrder || 0) + 1;

  // Bug phat hien 2026-08-04 (nguoi dung bao cao): dien trang thai + ngay thuc te khi "Them giai
  // doan" bi bo qua hoan toan - truoc day route nay khong doc/ghi status/actual_start/actual_end,
  // luon roi vao DEFAULT 'chua_bat_dau' cua schema. Sua cho dong bo dung nhu route PUT ben duoi.
  const validPhaseStatuses = ['chua_bat_dau', 'dang_lam', 'hoan_thanh'];
  const normalizedStatus = validPhaseStatuses.includes(status) ? status : 'chua_bat_dau';

  const result = db
    .prepare('INSERT INTO project_phases (project_id, name, sort_order, planned_start, planned_end, actual_start, actual_end, status, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(projectId, String(name).trim(), normalizedOrder, plannedStart || null, plannedEnd || null, actualStart || null, actualEnd || null, normalizedStatus, note || '');

  const phase = db.prepare('SELECT * FROM project_phases WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({
    phase: {
      ...phase,
      ...projectService.computeDelay({ plannedEnd: phase.planned_end, actualEnd: phase.actual_end, isDone: phase.status === 'hoan_thanh' }),
    },
  });
});

router.put('/:id/phases/:phaseId', (req, res) => {
  const projectId = Number(req.params.id);
  const phaseId = Number(req.params.phaseId);
  const existing = db.prepare('SELECT id FROM project_phases WHERE id = ? AND project_id = ?').get(phaseId, projectId);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy giai đoạn' });
  }

  const {
    name,
    sort_order: sortOrder,
    planned_start: plannedStart,
    planned_end: plannedEnd,
    actual_start: actualStart,
    actual_end: actualEnd,
    status,
    note,
  } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Thiếu tên giai đoạn' });
  }

  const validStatuses = ['chua_bat_dau', 'dang_lam', 'hoan_thanh'];
  const normalizedStatus = validStatuses.includes(status) ? status : 'chua_bat_dau';

  db.prepare(`
    UPDATE project_phases SET
      name = ?, sort_order = ?, planned_start = ?, planned_end = ?, actual_start = ?, actual_end = ?,
      status = ?, note = ?
    WHERE id = ?
  `).run(
    String(name).trim(),
    sortOrder !== undefined && sortOrder !== null && sortOrder !== '' ? Number(sortOrder) : 0,
    plannedStart || null,
    plannedEnd || null,
    actualStart || null,
    actualEnd || null,
    normalizedStatus,
    note || '',
    phaseId
  );

  const phase = db.prepare('SELECT * FROM project_phases WHERE id = ?').get(phaseId);
  res.json({
    phase: {
      ...phase,
      ...projectService.computeDelay({ plannedEnd: phase.planned_end, actualEnd: phase.actual_end, isDone: phase.status === 'hoan_thanh' }),
    },
  });
});

// Xoa giai doan: chan neu da co cong viec (project_tasks, tu migration 022) gan vao - kiem tra
// dong bang co ton tai truoc de khong loi "no such table" o Dot 1.
router.delete('/:id/phases/:phaseId', (req, res) => {
  const projectId = Number(req.params.id);
  const phaseId = Number(req.params.phaseId);
  const existing = db.prepare('SELECT id FROM project_phases WHERE id = ? AND project_id = ?').get(phaseId, projectId);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy giai đoạn' });
  }

  const taskTableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'project_tasks'")
    .get();
  if (taskTableExists) {
    const inUse = db.prepare('SELECT COUNT(*) AS count FROM project_tasks WHERE phase_id = ?').get(phaseId);
    if (inUse.count > 0) {
      return res.status(400).json({ error: 'Giai đoạn này đang có công việc, không thể xóa' });
    }
  }

  db.prepare('DELETE FROM project_phases WHERE id = ?').run(phaseId);
  res.json({ ok: true });
});

module.exports = router;