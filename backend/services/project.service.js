// Service module "Quan ly du an" - Dot 1 (migration 021): sinh ma DA..., tao/sua/xoa du an kem
// nguoi tham gia + copy giai doan mau, tinh % tien do (chua co du lieu that cho toi migration 022
// - project_tasks - nen luon tra null o dot nay, frontend hien "-").
//
// Nguyen tac quan trong: SO CAI CONG NO VAN THUOC KHACH HANG (xem docs/DECISIONS.md 2026-08-04) -
// service nay KHONG dung toi debt_ledger. Xoa du an chan cung khi da co du lieu Kho/Cong no gan
// vao se lam o migration 023/024 (khi cot project_id ton tai tren cac bang do) - o Dot 1 chi can
// chan khi da co project_phases/project_members (luon co vi tu tao cung luc) bang cach xoa het
// trong 1 transaction, khong co rang buoc nao khac can kiem tra.

const db = require('../db/database');

class ServiceError extends Error {}

const PROJECT_STATUSES = ['chuan_bi', 'dang_thuc_hien', 'tam_dung', 'hoan_thanh', 'huy'];

// Moc "hom nay" theo gio Viet Nam (UTC+7 co dinh, khong doi theo DST) - dung dung nguyen tac da
// chot o cashVoucher.service.js (VN_OFFSET_MS) thay vi gio server hay UTC tho, vi nguoi dung luon
// o VN. Cac cot ngay lien quan (planned_end, actual_end, due_date) luu dang 'YYYY-MM-DD' thuan,
// khong co gio, nen chi can lay dung ngay lich theo gio VN de so sanh cho dung.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
function todayVN() {
  return new Date(Date.now() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

// So ngay tu dateA den dateB (dang 'YYYY-MM-DD'), duong neu B sau A. Dung Date.UTC de tranh sai
// lech do DST/leo gio khi tru truc tiep 2 chuoi ngay.
function diffDaysBetween(dateA, dateB) {
  const [ay, am, ad] = dateA.split('-').map(Number);
  const [by, bm, bd] = dateB.split('-').map(Number);
  const msA = Date.UTC(ay, am - 1, ad);
  const msB = Date.UTC(by, bm - 1, bd);
  return Math.round((msB - msA) / (24 * 60 * 60 * 1000));
}

// "Tre tien do" (theo yeu cau nguoi dung 2026-08-04) - tinh CA 2 truong hop, dung chung cho ca
// giai doan (plannedEnd=planned_end, actualEnd=actual_end) va cong viec (plannedEnd=due_date,
// actualEnd=completed_at, chi lay phan ngay):
//   (1) Chua xong (isDone=false) ma da qua ngay du kien (so voi hom nay) -> DANG tre.
//   (2) Da xong (isDone=true) nhung ngay thuc te xong tre hon ngay du kien -> XONG TRE.
// Khong co planned date thi khong tinh duoc, luon tra khong tre (khong doan).
//
// Bug phat hien 2026-08-04 (nguoi dung bao cao "tao lich tre nhung khong bao"): giai doan co
// actual_end la truong nhap tay RIENG BIET voi status - danh dau "Hoan thanh" qua dropdown
// KHONG tu dien actual_end (khac cong viec, completed_at tu dong gan). Neu da hoan thanh ma
// actual_end con trong, truoc day compareDate = null -> luon tra khong tre du planned_end da
// qua rat lau. Sua: thieu actual_end thi lay tam "hom nay" lam moc so sanh (giong het truong
// hop chua xong) - dam bao van canh bao dung neu da qua han du kien, khong im lang chi vi thieu
// 1 truong nhap lieu tuy chon.
function computeDelay({ plannedEnd, actualEnd, isDone }) {
  if (!plannedEnd) {
    return { is_late: false, late_days: null };
  }

  const compareDate = (isDone && actualEnd) ? actualEnd : todayVN();

  const lateDays = diffDaysBetween(plannedEnd, compareDate);
  return lateDays > 0 ? { is_late: true, late_days: lateDays } : { is_late: false, late_days: null };
}

// Trang thai dot thanh toan (Dot 4) - KHONG luu, suy ra tu so tien da thu (collected, tinh o
// tang goi ham bang SUM debt_ledger WHERE milestone_id) so voi amount cua dot. "Qua han" chi
// tinh khi CHUA thu du va da qua due_date - dot da thu du thi khong con "qua han" du co tre ngay
// thuc te hay khong (dung nguyen tac PRD: chi 4 trang thai, khong chong lan).
function computeMilestoneStatus({ amount, collected, dueDate }) {
  if (amount > 0 && collected >= amount) {
    return 'da_thu_du';
  }
  if (dueDate && todayVN() > dueDate) {
    return 'qua_han';
  }
  if (collected > 0) {
    return 'thu_mot_phan';
  }
  return 'chua_thu';
}

function generateProjectCode() {
  const row = db.prepare('SELECT code FROM projects ORDER BY id DESC LIMIT 1').get();
  const lastNumber = row ? parseInt(row.code.replace('DA', ''), 10) : 0;
  return `DA${String(lastNumber + 1).padStart(6, '0')}`;
}

function assertPartnerIsCustomer(partnerId) {
  const partner = db.prepare('SELECT id, type FROM partners WHERE id = ?').get(partnerId);
  if (!partner) {
    throw new ServiceError('Không tìm thấy khách hàng');
  }
  if (partner.type !== 'khach_hang') {
    throw new ServiceError('Dự án chỉ gắn được với đối tác loại Khách hàng');
  }
}

// members: [{ userId, roleInProject }]. Validate tung user_id ton tai va dang hoat dong,
// khong cho trung 1 nguoi 2 lan (UNIQUE(project_id, user_id) o DB da chan nhung kiem truoc de
// bao loi ro rang hon thay vi de SQLite nem loi constraint kho hieu).
function assertValidMembers(members) {
  const seen = new Set();
  members.forEach((member) => {
    if (!member.userId) {
      throw new ServiceError('Thiếu tài khoản người tham gia');
    }
    if (seen.has(member.userId)) {
      throw new ServiceError('Một tài khoản không được chọn 2 lần trong danh sách tham gia');
    }
    seen.add(member.userId);

    const user = db.prepare('SELECT id, is_active FROM users WHERE id = ?').get(member.userId);
    if (!user || !user.is_active) {
      throw new ServiceError(`Tai khoan id=${member.userId} không tồn tại hoặc đã bị khóa`);
    }
  });
}

function insertMembers(projectId, members) {
  const insertMember = db.prepare(
    'INSERT INTO project_members (project_id, user_id, role_in_project) VALUES (?, ?, ?)'
  );
  members.forEach((member) => {
    insertMember.run(projectId, member.userId, member.roleInProject || '');
  });
}

// Copy toan bo Giai doan mau vao du an moi tao - TACH ROI hoan toan ngay sau khi copy (chi con
// tham chieu project_id, khong con lien ket nguoc ve project_phase_templates.id).
function copyPhaseTemplatesIntoProject(projectId) {
  const templates = db.prepare('SELECT name, sort_order FROM project_phase_templates ORDER BY sort_order ASC').all();
  const insertPhase = db.prepare(
    'INSERT INTO project_phases (project_id, name, sort_order) VALUES (?, ?, ?)'
  );
  templates.forEach((tpl) => insertPhase.run(projectId, tpl.name, tpl.sort_order));
}

// input: { name, partnerId, contractNo, contractDate, siteAddress, contractValue, startDate,
//          plannedEndDate, managerId, note, createdBy, members: [{userId, roleInProject}] }
function createProject(input) {
  if (!input.name || !String(input.name).trim()) {
    throw new ServiceError('Thiếu tên dự án');
  }
  if (!input.partnerId) {
    throw new ServiceError('Thiếu khách hàng');
  }
  assertPartnerIsCustomer(input.partnerId);

  const members = Array.isArray(input.members) ? input.members : [];
  assertValidMembers(members);

  if (input.managerId) {
    const manager = db.prepare('SELECT id FROM users WHERE id = ? AND is_active = 1').get(input.managerId);
    if (!manager) {
      throw new ServiceError('Người phụ trách không hợp lệ hoặc đã bị khóa');
    }
  }

  // Bug phat hien 2026-08-04 (nguoi dung bao cao): chon trang thai "Dang thuc hien" luc tao du
  // an nhung danh sach van hien "Chuan bi" - do INSERT truoc day thieu han cot status, luon roi
  // vao DEFAULT 'chuan_bi' cua schema du body co gui gi len cung khong anh huong.
  const status = input.status && PROJECT_STATUSES.includes(input.status) ? input.status : 'chuan_bi';

  const run = db.transaction(() => {
    const code = generateProjectCode();
    const result = db
      .prepare(`
        INSERT INTO projects
          (code, name, partner_id, contract_no, contract_date, site_address, contract_value,
           start_date, planned_end_date, status, manager_id, note, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        code,
        String(input.name).trim(),
        input.partnerId,
        input.contractNo || '',
        input.contractDate || null,
        input.siteAddress || '',
        input.contractValue || 0,
        input.startDate || null,
        input.plannedEndDate || null,
        status,
        input.managerId || null,
        input.note || '',
        input.createdBy
      );
    const projectId = result.lastInsertRowid;

    insertMembers(projectId, members);
    copyPhaseTemplatesIntoProject(projectId);

    return projectId;
  });

  return run();
}

// input giong createProject (tru createdBy) + status/actualEndDate (tuy chon). Danh sach nguoi
// tham gia thay the TOAN BO (xoa het roi ghi lai) - don gian hon doi chieu tung dong, chap nhan
// duoc vi bang nay khong bi bang nao khac tham chieu nguoc.
function updateProject(id, input) {
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
  if (!existing) {
    throw new ServiceError('Không tìm thấy dự án');
  }
  if (!input.name || !String(input.name).trim()) {
    throw new ServiceError('Thiếu tên dự án');
  }
  if (!input.partnerId) {
    throw new ServiceError('Thiếu khách hàng');
  }
  assertPartnerIsCustomer(input.partnerId);

  const members = Array.isArray(input.members) ? input.members : [];
  assertValidMembers(members);

  if (input.managerId) {
    const manager = db.prepare('SELECT id FROM users WHERE id = ? AND is_active = 1').get(input.managerId);
    if (!manager) {
      throw new ServiceError('Người phụ trách không hợp lệ hoặc đã bị khóa');
    }
  }

  const status = input.status && PROJECT_STATUSES.includes(input.status) ? input.status : 'chuan_bi';

  const run = db.transaction(() => {
    db.prepare(`
      UPDATE projects SET
        name = ?, partner_id = ?, contract_no = ?, contract_date = ?, site_address = ?,
        contract_value = ?, start_date = ?, planned_end_date = ?, actual_end_date = ?,
        status = ?, manager_id = ?, note = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      String(input.name).trim(),
      input.partnerId,
      input.contractNo || '',
      input.contractDate || null,
      input.siteAddress || '',
      input.contractValue || 0,
      input.startDate || null,
      input.plannedEndDate || null,
      input.actualEndDate || null,
      status,
      input.managerId || null,
      input.note || '',
      id
    );

    db.prepare('DELETE FROM project_members WHERE project_id = ?').run(id);
    insertMembers(id, members);
  });

  run();
}

// Xoa cung: chan neu khong phai trang thai 'huy' va da co giai doan dang lam/hoan thanh, HOAC
// da co cong viec nao (tranh xoa nham du an co du lieu tien do that - phase co the con
// 'chua_bat_dau' ve mat trang thai du da co cong viec gan vao neu nguoi dung quen cap nhat).
// Tu migration 024 (Dot 3): chan them neu da co phieu nhap/xuat hoac dong cong no gan project_id
// (dung nguyen tac PRD 4.12 "khong xoa duoc du an da co phieu/cong no - chi chuyen trang thai Huy").
function deleteProject(id) {
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
  if (!existing) {
    throw new ServiceError('Không tìm thấy dự án');
  }

  const hasProgress = db
    .prepare("SELECT COUNT(*) AS count FROM project_phases WHERE project_id = ? AND status != 'chua_bat_dau'")
    .get(id);
  if (hasProgress.count > 0) {
    throw new ServiceError('Dự án đã có giai đoạn đang làm hoặc hoàn thành, không thể xóa - chỉ chuyển trạng thái "Hủy"');
  }

  const taskTableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'project_tasks'")
    .get();
  if (taskTableExists) {
    const hasTasks = db
      .prepare('SELECT COUNT(*) AS count FROM project_tasks WHERE phase_id IN (SELECT id FROM project_phases WHERE project_id = ?)')
      .get(id);
    if (hasTasks.count > 0) {
      throw new ServiceError('Dự án đã có công việc, không thể xóa - chỉ chuyển trạng thái "Hủy"');
    }
  }

  const documentColumnExists = db
    .prepare("SELECT 1 FROM pragma_table_info('stock_receipts') WHERE name = 'project_id'")
    .get();
  if (documentColumnExists) {
    const hasDocuments = db
      .prepare(`
        SELECT
          (SELECT COUNT(*) FROM stock_receipts WHERE project_id = ?) +
          (SELECT COUNT(*) FROM stock_issues WHERE project_id = ?) +
          (SELECT COUNT(*) FROM debt_ledger WHERE project_id = ?) AS count
      `)
      .get(id, id, id);
    if (hasDocuments.count > 0) {
      throw new ServiceError('Dự án đã có phiếu nhập/xuất hoặc công nợ gắn vào, không thể xóa - chỉ chuyển trạng thái "Hủy"');
    }
  }

  const run = db.transaction(() => {
    db.prepare('DELETE FROM project_members WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM project_phases WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  });
  run();
}

// % tien do = so cong viec Hoan thanh / tong so cong viec CUA CA DU AN (gop tat ca giai doan).
// project_tasks chua ton tai truoc migration 022 (Dot 2) - tra null (frontend hien "-") thay vi
// loi "no such table" cho toi khi migration do duoc ap dung.
function getProjectProgress(projectId) {
  const tableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'project_tasks'")
    .get();
  if (!tableExists) {
    return null;
  }

  const row = db
    .prepare(`
      SELECT COUNT(*) AS total, SUM(CASE WHEN t.status = 'hoan_thanh' THEN 1 ELSE 0 END) AS done
      FROM project_tasks t
      JOIN project_phases p ON p.id = t.phase_id
      WHERE p.project_id = ?
    `)
    .get(projectId);

  if (!row || row.total === 0) {
    return null;
  }
  return Math.round((row.done / row.total) * 100);
}

module.exports = {
  ServiceError,
  generateProjectCode,
  createProject,
  updateProject,
  deleteProject,
  copyPhaseTemplatesIntoProject,
  getProjectProgress,
  computeDelay,
  computeMilestoneStatus,
  todayVN,
};