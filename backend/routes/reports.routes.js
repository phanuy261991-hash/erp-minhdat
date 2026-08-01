// Route bao cao (Phase 4). Ca 3 route deu yeu cau quyen module 'bao_cao' (kiem tra khi mount
// o server.js). Khong luu so lieu tong hop rieng - moi bao cao tinh truc tiep tu bang goc
// (products/stock_movements/stock_lots, stock_receipts/stock_issues, debt_ledger) tai thoi
// diem goi, dung nguyen tac ledger cua du an (xem .claude/docs/inventory-debt-ledger.md).

const express = require('express');
const db = require('../db/database');
const { getCostingMethod, getWeightedAverageCost } = require('../services/costing.service');

const router = express.Router();

// Bao cao ton kho hien tai: tung san pham kem gia von binh quan gia quyen (dung nhat quan de
// dinh gia TON KHO du costing_method dang chon la gi - khac voi gia XUAT tung phieu, xem
// costing.service.js) va gia tri ton (SL * gia von).
router.get('/inventory', (req, res) => {
  const products = db
    .prepare(`
      SELECT p.id, p.code, p.name, p.unit, p.is_active,
             COALESCE(SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE -sm.quantity END), 0) AS stock
      FROM products p
      LEFT JOIN stock_movements sm ON sm.product_id = p.id
      GROUP BY p.id
      ORDER BY p.name ASC
    `)
    .all();

  let totalValue = 0;
  const items = products.map((p) => {
    const unitCost = getWeightedAverageCost(p.id);
    const value = p.stock * unitCost;
    totalValue += value;
    return { ...p, is_active: Boolean(p.is_active), unit_cost: unitCost, value };
  });

  res.json({ items, total_value: totalValue, costing_method: getCostingMethod() });
});

// Danh sach "YYYY-MM" cho N thang gan nhat, tinh ca thang hien tai (vd months=6 va dang la
// thang 7 -> ['2026-02', ..., '2026-07']).
function lastNMonthKeys(n) {
  const keys = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

// Moc ngay dau thang cua thang xa nhat trong khoang N thang - dung lam WHERE created_at >= .
function nMonthsAgoStart(n) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01 00:00:00`;
}

// Tong hop mua hang (tu stock_receipts) va ban hang (tu stock_issues) theo tung thang, tinh
// theo gia NET (da tru chiet khau) - dien du cac thang khong co phat sinh bang 0 de bieu do
// khong bi hut thang.
router.get('/stock-movements', (req, res) => {
  const months = Math.min(Math.max(Number(req.query.months) || 6, 2), 12);
  const fromDate = nMonthsAgoStart(months);
  const monthKeys = lastNMonthKeys(months);

  const purchaseRows = db
    .prepare(`
      SELECT strftime('%Y-%m', r.created_at) AS month,
             COALESCE(SUM(i.quantity * i.unit_price * (1 - i.discount_percent / 100.0)), 0) AS total
      FROM stock_receipts r
      JOIN stock_receipt_items i ON i.receipt_id = r.id
      WHERE r.created_at >= ?
      GROUP BY month
    `)
    .all(fromDate);

  const salesRows = db
    .prepare(`
      SELECT strftime('%Y-%m', iss.created_at) AS month,
             COALESCE(SUM(it.quantity * it.unit_price * (1 - it.discount_percent / 100.0)), 0) AS total
      FROM stock_issues iss
      JOIN stock_issue_items it ON it.issue_id = iss.id
      WHERE iss.created_at >= ?
      GROUP BY month
    `)
    .all(fromDate);

  const purchaseMap = Object.fromEntries(purchaseRows.map((r) => [r.month, r.total]));
  const salesMap = Object.fromEntries(salesRows.map((r) => [r.month, r.total]));

  res.json({
    purchases: monthKeys.map((month) => ({ month, total: purchaseMap[month] || 0 })),
    sales: monthKeys.map((month) => ({ month, total: salesMap[month] || 0 })),
  });
});

// Tong hop cong no toan he thong: tong phai tra NCC + tong phai thu khach hang, tinh tu
// SUM(debt_ledger) nhom theo partners.type (giong cong thuc o debts.routes.js/summary).
router.get('/debts', (req, res) => {
  const rows = db
    .prepare(`
      SELECT p.type,
             COALESCE(SUM(CASE WHEN d.type = 'no' THEN d.amount ELSE -d.amount END), 0) AS balance
      FROM partners p
      LEFT JOIN debt_ledger d ON d.partner_id = p.id
      GROUP BY p.type
    `)
    .all();

  const totals = { nha_cung_cap: 0, khach_hang: 0 };
  rows.forEach((row) => {
    totals[row.type] = row.balance;
  });

  res.json({ total_payable: totals.nha_cung_cap, total_receivable: totals.khach_hang });
});

module.exports = router;
