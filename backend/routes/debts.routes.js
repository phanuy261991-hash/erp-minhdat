// Route cong no (Phase 3). Ca GET va POST deu yeu cau quyen module 'cong_no' (kiem tra khi
// mount o server.js). So du khong luu co dinh - luon tinh tu SUM(debt_ledger) theo partner_id
// (xem .claude/docs/inventory-debt-ledger.md).

const express = require('express');
const db = require('../db/database');
const { recordPayment, recordDebtAdjustment, ServiceError } = require('../services/debt.service');

const router = express.Router();

const PARTNER_TYPES = ['nha_cung_cap', 'khach_hang'];

// Tong hop so du hien tai cua tung doi tac. Chieu dien giai so du: NCC = khoan MINH con phai
// tra ho; khach hang = khoan HO con phai tra minh (xem migration 012).
router.get('/summary', (req, res) => {
  const { type } = req.query;
  if (type && !PARTNER_TYPES.includes(type)) {
    return res.status(400).json({ error: `Loai doi tac khong hop le: ${type}` });
  }

  const whereClause = type ? 'WHERE p.type = ?' : '';
  const params = type ? [type] : [];

  const summary = db
    .prepare(`
      SELECT p.id AS partner_id, p.name, p.type, p.phone,
             c.name AS category_name, c.debt_limit AS category_debt_limit,
             COALESCE(SUM(CASE WHEN d.type = 'no' THEN d.amount ELSE -d.amount END), 0) AS balance
      FROM partners p
      LEFT JOIN customer_categories c ON c.id = p.category_id
      LEFT JOIN debt_ledger d ON d.partner_id = p.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.name ASC
    `)
    .all(...params);

  res.json({ summary });
});

// Tong tien hang da giao dich voi 1 doi tac, tinh TRUC TIEP tu stock_receipts/stock_issues
// (khong phai tu debt_ledger) - vi debt_ledger chi co dong khi phieu danh dau cong_no, con o
// day can ca phieu da thanh toan/thu tien ngay de biet TONG gia tri da mua/ban, dung de doi
// chieu truc quan voi so du cong no con lai (xem yeu cau nguoi dung 2026-07-31).
function getTotalTransacted(partnerId, partnerType) {
  if (partnerType === 'nha_cung_cap') {
    const row = db
      .prepare(`
        SELECT COALESCE(SUM(i.quantity * i.unit_price * (1 - i.discount_percent / 100.0)), 0) AS total
        FROM stock_receipts r
        JOIN stock_receipt_items i ON i.receipt_id = r.id
        WHERE r.partner_id = ?
      `)
      .get(partnerId);
    return row.total;
  }

  const row = db
    .prepare(`
      SELECT COALESCE(SUM(i.quantity * i.unit_price * (1 - i.discount_percent / 100.0)), 0) AS total
      FROM stock_issues iss
      JOIN stock_issue_items i ON i.issue_id = iss.id
      WHERE iss.partner_id = ?
    `)
    .get(partnerId);
  return row.total;
}

// Lich su giao dich cong no cua 1 doi tac (ca phat sinh no lan thanh toan), kem ma phieu goc
// (neu phat sinh tu phieu nhap/xuat) de doi chieu. Kem tong tien hang da mua/ban (xem
// getTotalTransacted) de so sanh truc quan voi so du con no tren giao dien.
router.get('/', (req, res) => {
  const partnerId = Number(req.query.partner_id);
  if (!partnerId) {
    return res.status(400).json({ error: 'Thieu partner_id' });
  }

  const partner = db.prepare('SELECT id, type FROM partners WHERE id = ?').get(partnerId);
  if (!partner) {
    return res.status(404).json({ error: 'Khong tim thay doi tac' });
  }

  const entries = db
    .prepare(`
      SELECT d.id, d.type, d.amount, d.reference_type, d.reference_id, d.note, d.created_at, d.is_adjustment,
             u.full_name AS created_by_name,
             CASE d.reference_type WHEN 'receipt' THEN r.code WHEN 'issue' THEN i.code ELSE NULL END AS document_code
      FROM debt_ledger d
      JOIN users u ON u.id = d.created_by
      LEFT JOIN stock_receipts r ON d.reference_type = 'receipt' AND r.id = d.reference_id
      LEFT JOIN stock_issues i ON d.reference_type = 'issue' AND i.id = d.reference_id
      WHERE d.partner_id = ?
      ORDER BY d.created_at DESC, d.id DESC
    `)
    .all(partnerId);

  res.json({ entries, total_transacted: getTotalTransacted(partnerId, partner.type) });
});

router.post('/payment', (req, res) => {
  const { partner_id: partnerId, amount, note } = req.body || {};

  if (!partnerId || !(Number(amount) > 0)) {
    return res.status(400).json({ error: 'Thieu doi tac hoac so tien thanh toan khong hop le' });
  }

  try {
    const entry = recordPayment({
      partnerId: Number(partnerId),
      amount: Number(amount),
      note: note ? String(note).trim() : '',
      createdBy: req.session.user.id,
    });
    res.status(201).json({ entry });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

// Danh sach phieu nhap/xuat CONG_NO cua 1 doi tac - dung cho combobox chon "phieu goc bi sai"
// khi dieu chinh cong no (migration 016). Chi lay phieu cong_no vi chi phieu do moi phat sinh
// dong debt_ledger dang can dieu chinh - phieu da_thanh_toan/da_thu_tien khong lien quan.
router.get('/documents', (req, res) => {
  const partnerId = Number(req.query.partner_id);
  if (!partnerId) {
    return res.status(400).json({ error: 'Thieu partner_id' });
  }

  const receipts = db
    .prepare("SELECT id, code, created_at FROM stock_receipts WHERE partner_id = ? AND payment_status = 'cong_no' ORDER BY created_at DESC")
    .all(partnerId)
    .map((r) => ({ type: 'receipt', id: r.id, code: r.code, created_at: r.created_at }));

  const issues = db
    .prepare("SELECT id, code, created_at FROM stock_issues WHERE partner_id = ? AND payment_status = 'cong_no' ORDER BY created_at DESC")
    .all(partnerId)
    .map((i) => ({ type: 'issue', id: i.id, code: i.code, created_at: i.created_at }));

  res.json({ documents: [...receipts, ...issues].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)) });
});

// Dieu chinh cong no thu cong (migration 016, khac "Ghi nhan thanh toan"): sua so du sai (vd
// nhap nham gia von phieu nhap) ma khong sua/xoa dong ledger goc - xem debt.service.js.
router.post('/adjustment', (req, res) => {
  const { partner_id: partnerId, type, amount, reference_type: referenceType, reference_id: referenceId, note } = req.body || {};

  if (!partnerId) {
    return res.status(400).json({ error: 'Thieu doi tac' });
  }

  try {
    const entry = recordDebtAdjustment({
      partnerId: Number(partnerId),
      type,
      amount: Number(amount),
      referenceType: referenceType || null,
      referenceId: referenceId ? Number(referenceId) : null,
      note,
      createdBy: req.session.user.id,
    });
    res.status(201).json({ entry });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

module.exports = router;
