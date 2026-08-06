// Service so cai cong no (Phase 3). So du tung doi tac luon tinh tu SUM cong don, khong luu so
// co dinh (xem .claude/docs/inventory-debt-ledger.md, docs/DECISIONS.md).
// recordDebtFromDocument() duoc goi TRONG transaction co san cua stockReceipt/stockIssue.service.js
// (khong tu mo transaction rieng) - dam bao phieu + movement + no phat sinh cung 1 giao dich.

const db = require('../db/database');
const notificationService = require('./notification.service');

class ServiceError extends Error {}

// referenceType: 'receipt' (no phai tra NCC) hoac 'issue' (no phai thu khach hang).
// projectId (tuy chon, migration 024): nhan du an cho dong no de tinh duoc "con phai thu cua
// du an" khi 1 khach hang co nhieu du an - xem docs/DECISIONS.md muc 2026-08-04 quyet dinh #10.
function recordDebtFromDocument({ partnerId, amount, referenceType, referenceId, createdBy, projectId }) {
  db.prepare(
    "INSERT INTO debt_ledger (partner_id, type, amount, reference_type, reference_id, created_by, project_id) VALUES (?, 'no', ?, ?, ?, ?, ?)"
  ).run(partnerId, amount, referenceType, referenceId, createdBy, projectId || null);
}

// Validate du an (neu co) thuoc DUNG doi tac dang thao tac, va dot thanh toan (neu co) thuoc
// DUNG du an do - dung chung cho recordPayment/recordDebtAdjustment (Dot 4, xem docs/DECISIONS.md
// muc 2026-08-04 "on Du an co ca o form Ghi nhan thanh toan lan Dieu chinh cong no"). Nem loi ro
// rang thay vi de lech du lieu am tham khi 1 khach hang co nhieu du an.
function assertProjectAndMilestone(partnerId, projectId, milestoneId) {
  if (!projectId) {
    if (milestoneId) {
      throw new ServiceError('Phải chọn dự án trước khi chọn đợt thanh toán');
    }
    return;
  }

  const project = db.prepare('SELECT id, partner_id FROM projects WHERE id = ?').get(projectId);
  if (!project) {
    throw new ServiceError('Không tìm thấy dự án');
  }
  if (project.partner_id !== partnerId) {
    throw new ServiceError('Dự án không thuộc đối tác đang thao tác');
  }

  if (milestoneId) {
    const milestone = db.prepare('SELECT id, project_id FROM project_payment_milestones WHERE id = ?').get(milestoneId);
    if (!milestone) {
      throw new ServiceError('Không tìm thấy đợt thanh toán');
    }
    if (milestone.project_id !== projectId) {
      throw new ServiceError('Đợt thanh toán không thuộc dự án đã chọn');
    }
  }
}

// Ghi nhan thanh toan thu cong (khong gan phieu nhap/xuat cu the) - cho phep thanh toan tung
// phan, khong can khop dung 1 khoan no nao (dung nguyen tac so du tong theo doi tac).
// projectId/milestoneId (tuy chon, migration 025, Dot 4): nhan du an/dot thanh toan cho dong
// thanh toan - ve ban chat van la 1 dong 'tra' binh thuong, chi gan them nhan de loc theo du an.
function recordPayment({ partnerId, amount, note, createdBy, projectId, milestoneId }) {
  if (!(amount > 0)) {
    throw new ServiceError('So tien thanh toan phai lon hon 0');
  }

  const partner = db.prepare('SELECT id, name, type FROM partners WHERE id = ?').get(partnerId);
  if (!partner) {
    throw new ServiceError('Khong tim thay doi tac');
  }

  assertProjectAndMilestone(partnerId, projectId || null, milestoneId || null);

  db.prepare(
    "INSERT INTO debt_ledger (partner_id, type, amount, reference_type, reference_id, note, created_by, project_id, milestone_id) VALUES (?, 'tra', ?, 'payment', NULL, ?, ?, ?, ?)"
  ).run(partnerId, amount, note || '', createdBy, projectId || null, milestoneId || null);

  // Thong bao (migration 027) - khong de loi ghi thong bao lam hong viec ghi nhan thanh toan
  // (da ghi vao debt_ledger thanh cong roi), chi log canh bao.
  try {
    if (partner.type === 'nha_cung_cap') {
      notificationService.notifySupplierPayment({ partnerId, partnerName: partner.name, amount });
    } else if (partner.type === 'khach_hang') {
      notificationService.notifyCustomerPayment({ partnerId, partnerName: partner.name, amount });
    }
  } catch (err) {
    console.error('[CANH BAO] Khong the ghi thong bao thanh toan:', err.message);
  }

  return db.prepare('SELECT * FROM debt_ledger WHERE id = last_insert_rowid()').get();
}

// Dieu chinh cong no thu cong (migration 016) - sua so du sai (vd nhap nham gia von phieu nhap
// lam ghi no NCC sai) MA KHONG sua/xoa dong ledger goc, chi ghi them 1 dong bu tru, danh dau
// is_adjustment=1 de phan biet voi dong tu dong ('no' khi tao phieu) va thanh toan that ('tra',
// reference_type='payment'). referenceType/referenceId (tuy chon) tro ve dung phieu nhap/xuat
// bi sai de doi chieu - validate phieu do THUOC DUNG doi tac dang dieu chinh, tranh lien ket nham.
// projectId (tuy chon, migration 025, Dot 4): xem chu thich assertProjectAndMilestone o tren -
// dieu chinh cong no KHONG co milestoneId (chi form Ghi nhan thanh toan moi co, theo dung PRD 4.12).
function recordDebtAdjustment({ partnerId, type, amount, referenceType, referenceId, note, createdBy, projectId }) {
  if (!['no', 'tra'].includes(type)) {
    throw new ServiceError('Loai dieu chinh khong hop le');
  }
  if (!(amount > 0)) {
    throw new ServiceError('So tien dieu chinh phai lon hon 0');
  }
  if (!note || !String(note).trim()) {
    throw new ServiceError('Phai ghi ro ly do dieu chinh cong no');
  }

  const partner = db.prepare('SELECT id FROM partners WHERE id = ?').get(partnerId);
  if (!partner) {
    throw new ServiceError('Khong tim thay doi tac');
  }

  assertProjectAndMilestone(partnerId, projectId || null, null);

  let resolvedReferenceType = null;
  let resolvedReferenceId = null;
  if (referenceType) {
    if (!['receipt', 'issue'].includes(referenceType)) {
      throw new ServiceError('Loai phieu goc khong hop le');
    }
    const table = referenceType === 'receipt' ? 'stock_receipts' : 'stock_issues';
    const document = db.prepare(`SELECT id, partner_id FROM ${table} WHERE id = ?`).get(referenceId);
    if (!document) {
      throw new ServiceError('Khong tim thay phieu goc');
    }
    if (document.partner_id !== partnerId) {
      throw new ServiceError('Phieu goc khong thuoc doi tac dang dieu chinh');
    }
    resolvedReferenceType = referenceType;
    resolvedReferenceId = referenceId;
  }

  db.prepare(
    'INSERT INTO debt_ledger (partner_id, type, amount, reference_type, reference_id, note, created_by, is_adjustment, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)'
  ).run(partnerId, type, amount, resolvedReferenceType, resolvedReferenceId, String(note).trim(), createdBy, projectId || null);

  return db.prepare('SELECT * FROM debt_ledger WHERE id = last_insert_rowid()').get();
}

// Giam cong no tu 1 phieu tra hang xuat (migration 032, stockReturn.service.js) - KHONG dung
// recordDebtFromDocument() vi ham do luon ghi type='no' (tang no), sai chieu cho hang tra ve.
// reference_type='receipt' vi phieu tra hang ve ban chat van la 1 dong stock_receipts (is_return
// =1) - to hop type='tra' + reference_type='receipt' + is_adjustment=0 truoc gio khong xay ra
// voi 2 duong ghi con lai (thanh toan luon reference_type='payment', dieu chinh luon
// is_adjustment=1) nen tu phan biet duoc o lich su giao dich ma khong can them cot moi.
function recordReturnCredit({ partnerId, amount, referenceId, createdBy, projectId }) {
  db.prepare(
    "INSERT INTO debt_ledger (partner_id, type, amount, reference_type, reference_id, created_by, project_id) VALUES (?, 'tra', ?, 'receipt', ?, ?, ?)"
  ).run(partnerId, amount, referenceId, createdBy, projectId || null);
}

function getDebtBalance(partnerId) {
  const row = db
    .prepare(`
      SELECT COALESCE(SUM(CASE WHEN type = 'no' THEN amount ELSE -amount END), 0) AS balance
      FROM debt_ledger
      WHERE partner_id = ?
    `)
    .get(partnerId);
  return row.balance;
}

module.exports = {
  recordDebtFromDocument,
  recordPayment,
  recordDebtAdjustment,
  recordReturnCredit,
  getDebtBalance,
  ServiceError,
};
