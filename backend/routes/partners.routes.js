// Route doi tac (nha cung cap/khach hang). GET danh sach + POST tao nhanh la ban rut gon tu
// Phase 2, dung khi lap phieu nhap/xuat can chon hoac them nhanh doi tac moi ngay tai form.
// PUT/DELETE (quan ly doi tac day du) them o Phase 3 - xem docs/DECISIONS.md muc "Doi tac".
//
// GET mo cho moi nguoi da dang nhap (can de hien dropdown chon doi tac o nhieu module khac nhau -
// kho/du_an/... khong doi hoi quyen quan ly doi tac day du). POST (them nhanh) cho nhieu quyen -
// thu kho (lap phieu nhap), ke toan, hoac nguoi phu trach du an deu co the can.
//
// PUT/DELETE (sua/xoa day du tren trang quan ly doi tac): tu migration 039 (2026-08-19, "tach
// quyen Cong no khach hang khoi NCC") KHONG con dung 1 quyen 'cong_no' chung cho ca 2 loai doi
// tac - phai kiem tra theo DUNG type cua doi tac dang thao tac ('nha_cung_cap' -> 'cong_no',
// 'khach_hang' -> 'khach_hang'). Vi vay khong gan requirePermission() lam middleware co dinh nua
// (luc do chua biet type) - kiem tra thu cong NGAY TRONG handler sau khi da doc duoc doi tac.
const express = require('express');
const db = require('../db/database');
const { requireAnyPermission, userHasPermission } = require('../middleware/requirePermission');

const router = express.Router();

const PARTNER_TYPES = ['nha_cung_cap', 'khach_hang'];
const PARTNER_TYPE_MODULE = { nha_cung_cap: 'cong_no', khach_hang: 'khach_hang' };

// Validate category_id: chi co y nghia voi khach hang (xem migration 015) - NCC gui len se bi
// tu bo qua (luon luu NULL) de tranh du lieu nham lan giua 2 loai doi tac.
function resolveCategoryId(type, categoryId) {
  if (type !== 'khach_hang' || categoryId === undefined || categoryId === null || categoryId === '') {
    return null;
  }
  const category = db.prepare('SELECT id FROM customer_categories WHERE id = ?').get(Number(categoryId));
  if (!category) {
    throw new Error('Loai khach hang khong hop le');
  }
  return Number(categoryId);
}

router.get('/', (req, res) => {
  const { type } = req.query;

  if (type && !PARTNER_TYPES.includes(type)) {
    return res.status(400).json({ error: `Loai doi tac khong hop le: ${type}` });
  }

  const baseQuery = `
    SELECT p.*, c.name AS category_name, c.debt_limit AS category_debt_limit,
           u.full_name AS assigned_user_name
    FROM partners p
    LEFT JOIN customer_categories c ON c.id = p.category_id
    LEFT JOIN users u ON u.id = p.assigned_user_id
  `;

  const partners = type
    ? db.prepare(`${baseQuery} WHERE p.type = ? ORDER BY p.name ASC`).all(type)
    : db.prepare(`${baseQuery} ORDER BY p.name ASC`).all();

  res.json({ partners });
});

// Danh sach tai khoan dang hoat dong cho combobox "Nguoi phu trach" - khong dung lai GET
// /api/users vi route do khoa quyen 'nguoi_dung' (chi Admin), trong khi trang Khach hang chi
// doi hoi 'cong_no' - cung huong giai quyet da dung cho GET /api/cash-vouchers/staff.
router.get('/staff', (req, res) => {
  const staff = db.prepare('SELECT id, full_name FROM users WHERE is_active = 1 ORDER BY full_name ASC').all();
  res.json({ staff });
});

// Validate assigned_user_id (khong bat buoc): neu co gui len, phai la tai khoan dang hoat dong.
function resolveAssignedUserId(assignedUserId) {
  if (assignedUserId === undefined || assignedUserId === null || assignedUserId === '') {
    return null;
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ? AND is_active = 1').get(Number(assignedUserId));
  if (!user) {
    throw new Error('Nguoi phu trach khong hop le');
  }
  return Number(assignedUserId);
}

// 'du_an' them 2026-08-06: form "Them du an" co nut them nhanh khach hang ngay tai cho (giong
// pattern da co o stock-issues.html) - tai khoan chi co quyen module 'du_an' (khong co
// 'kho'/'cong_no'/'khach_hang') can dung duoc nut nay, xem docs/DECISIONS.md. 'khach_hang' them
// 2026-08-19 (migration 039) - doi xung voi 'cong_no', ke toan chi duoc cap rieng quyen nay van
// tao nhanh duoc khach hang.
router.post('/', requireAnyPermission(['kho', 'cong_no', 'khach_hang', 'du_an']), (req, res) => {
  const { type, name, phone, address, category_id: categoryId, assigned_user_id: assignedUserId } = req.body || {};

  if (!PARTNER_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Loai doi tac khong hop le' });
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Thieu ten doi tac' });
  }

  let resolvedCategoryId;
  let resolvedAssignedUserId;
  try {
    resolvedCategoryId = resolveCategoryId(type, categoryId);
    resolvedAssignedUserId = resolveAssignedUserId(assignedUserId);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const result = db
    .prepare('INSERT INTO partners (type, name, phone, address, category_id, assigned_user_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(
      type,
      String(name).trim(),
      phone ? String(phone).trim() : '',
      address ? String(address).trim() : '',
      resolvedCategoryId,
      resolvedAssignedUserId
    );

  const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ partner });
});

// Sua ten/sdt/dia chi - khong cho doi "type" sau khi tao (giong nguyen tac khong doi username
// cua users), tranh doi tac da co lich su phieu nhap/xuat bi doi nhap nhang giua NCC/khach hang.
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id, type FROM partners WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay doi tac' });
  }
  if (!userHasPermission(req.session.user, PARTNER_TYPE_MODULE[existing.type])) {
    return res.status(403).json({ error: 'Khong co quyen truy cap chuc nang nay' });
  }

  const { name, phone, address, category_id: categoryId, assigned_user_id: assignedUserId } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Thieu ten doi tac' });
  }

  let resolvedCategoryId;
  let resolvedAssignedUserId;
  try {
    resolvedCategoryId = resolveCategoryId(existing.type, categoryId);
    resolvedAssignedUserId = resolveAssignedUserId(assignedUserId);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.prepare('UPDATE partners SET name = ?, phone = ?, address = ?, category_id = ?, assigned_user_id = ? WHERE id = ?').run(
    String(name).trim(),
    phone ? String(phone).trim() : '',
    address ? String(address).trim() : '',
    resolvedCategoryId,
    resolvedAssignedUserId,
    id
  );

  const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(id);
  res.json({ partner });
});

// Xoa cung: chan neu doi tac da co lich su (phieu nhap/xuat hoac dong cong no) - giu nguyen
// tac giu lich su nhu xoa san pham/tai khoan (xem CLAUDE.md).
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id, type FROM partners WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay doi tac' });
  }
  if (!userHasPermission(req.session.user, PARTNER_TYPE_MODULE[existing.type])) {
    return res.status(403).json({ error: 'Khong co quyen truy cap chuc nang nay' });
  }

  const inUse = db
    .prepare(`
      SELECT
        (SELECT COUNT(*) FROM stock_receipts WHERE partner_id = ?) +
        (SELECT COUNT(*) FROM stock_issues WHERE partner_id = ?) +
        (SELECT COUNT(*) FROM debt_ledger WHERE partner_id = ?) AS count
    `)
    .get(id, id, id);

  if (inUse.count > 0) {
    return res.status(400).json({ error: 'Doi tac da co lich su phieu nhap/xuat hoac cong no, khong the xoa' });
  }

  db.prepare('DELETE FROM partners WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
