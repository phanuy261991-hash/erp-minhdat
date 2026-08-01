// Service so cai cong no (Phase 3). So du tung doi tac luon tinh tu SUM cong don, khong luu so
// co dinh (xem .claude/docs/inventory-debt-ledger.md, docs/DECISIONS.md).
// recordDebtFromDocument() duoc goi TRONG transaction co san cua stockReceipt/stockIssue.service.js
// (khong tu mo transaction rieng) - dam bao phieu + movement + no phat sinh cung 1 giao dich.

const db = require('../db/database');

class ServiceError extends Error {}

// referenceType: 'receipt' (no phai tra NCC) hoac 'issue' (no phai thu khach hang).
function recordDebtFromDocument({ partnerId, amount, referenceType, referenceId, createdBy }) {
  db.prepare(
    "INSERT INTO debt_ledger (partner_id, type, amount, reference_type, reference_id, created_by) VALUES (?, 'no', ?, ?, ?, ?)"
  ).run(partnerId, amount, referenceType, referenceId, createdBy);
}

// Ghi nhan thanh toan thu cong (khong gan phieu nhap/xuat cu the) - cho phep thanh toan tung
// phan, khong can khop dung 1 khoan no nao (dung nguyen tac so du tong theo doi tac).
function recordPayment({ partnerId, amount, note, createdBy }) {
  if (!(amount > 0)) {
    throw new ServiceError('So tien thanh toan phai lon hon 0');
  }

  const partner = db.prepare('SELECT id FROM partners WHERE id = ?').get(partnerId);
  if (!partner) {
    throw new ServiceError('Khong tim thay doi tac');
  }

  db.prepare(
    "INSERT INTO debt_ledger (partner_id, type, amount, reference_type, reference_id, note, created_by) VALUES (?, 'tra', ?, 'payment', NULL, ?, ?)"
  ).run(partnerId, amount, note || '', createdBy);

  return db.prepare('SELECT * FROM debt_ledger WHERE id = last_insert_rowid()').get();
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

module.exports = { recordDebtFromDocument, recordPayment, getDebtBalance, ServiceError };
