// Route bao cao (Phase 4). Ca 3 route deu yeu cau quyen module 'bao_cao' (kiem tra khi mount
// o server.js). Khong luu so lieu tong hop rieng - moi bao cao tinh truc tiep tu bang goc
// (products/stock_movements/stock_lots, stock_receipts/stock_issues, debt_ledger) tai thoi
// diem goi, dung nguyen tac ledger cua du an (xem .claude/docs/inventory-debt-ledger.md).

const express = require('express');
const db = require('../db/database');
const { getCostingMethod, getWeightedAverageCost } = require('../services/costing.service');
const projectService = require('../services/project.service');

const router = express.Router();

const ACTIVE_PROJECT_STATUSES = ['chuan_bi', 'dang_thuc_hien', 'tam_dung'];

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

// Bao cao Du an (Dot 5, tuy chon, PRD 4.12): chi tinh cac du an DANG HOAT DONG (Chuan bi/Dang
// thuc hien/Tam dung) - da chot voi nguoi dung 2026-08-05, khong gom Hoan thanh/Huy vi trang nay
// dung de theo doi du an dang can quan ly. Tien do/tre tien do dung lai dung ham
// project.service.js (computeDelay/getProjectProgress) da co san tu Dot 1-2, khong tu tinh lai
// theo cach khac. Cong no "con phai thu" va "vuot du toan vat tu" tinh gop 1 lan cho toan bo du
// an dang hoat dong (khong N+1 query rieng tung du an) - dung y het cong thuc da dung o
// getProjectFinancials() (projects.routes.js) va getMaterialsForProject() (projectMaterials.routes.js).
router.get('/projects', (req, res) => {
  const placeholders = ACTIVE_PROJECT_STATUSES.map(() => '?').join(',');

  const projects = db
    .prepare(`
      SELECT pr.id, pr.code, pr.name, pr.status, pr.planned_end_date, pr.actual_end_date,
             pa.name AS partner_name
      FROM projects pr
      JOIN partners pa ON pa.id = pr.partner_id
      WHERE pr.status IN (${placeholders})
      ORDER BY pr.created_at DESC
    `)
    .all(...ACTIVE_PROJECT_STATUSES);

  const debtRows = db
    .prepare(`
      SELECT project_id,
             COALESCE(SUM(CASE WHEN type = 'no' THEN amount ELSE 0 END), 0) AS total_debt,
             COALESCE(SUM(CASE WHEN type = 'tra' THEN amount ELSE 0 END), 0) AS total_collected
      FROM debt_ledger
      WHERE project_id IS NOT NULL
      GROUP BY project_id
    `)
    .all();
  const remainingDebtMap = new Map(debtRows.map((r) => [r.project_id, r.total_debt - r.total_collected]));

  const key = (projectId, productId) => `${projectId}:${productId}`;

  const issuedRows = db
    .prepare(`
      SELECT i.project_id, it.product_id, SUM(it.quantity) AS qty
      FROM stock_issues i JOIN stock_issue_items it ON it.issue_id = i.id
      WHERE i.project_id IS NOT NULL
      GROUP BY i.project_id, it.product_id
    `)
    .all();
  const receivedRows = db
    .prepare(`
      SELECT r.project_id, it.product_id, SUM(it.quantity) AS qty
      FROM stock_receipts r JOIN stock_receipt_items it ON it.receipt_id = r.id
      WHERE r.project_id IS NOT NULL
      GROUP BY r.project_id, it.product_id
    `)
    .all();
  const issuedMap = new Map(issuedRows.map((r) => [key(r.project_id, r.product_id), r.qty]));
  const receivedMap = new Map(receivedRows.map((r) => [key(r.project_id, r.product_id), r.qty]));

  const planRows = db.prepare('SELECT project_id, product_id, quantity FROM project_material_plan').all();
  const overBudgetCountMap = new Map();
  planRows.forEach((plan) => {
    const k = key(plan.project_id, plan.product_id);
    const issued = (issuedMap.get(k) || 0) - (receivedMap.get(k) || 0);
    if (issued > plan.quantity) {
      overBudgetCountMap.set(plan.project_id, (overBudgetCountMap.get(plan.project_id) || 0) + 1);
    }
  });

  const items = projects.map((pr) => {
    const delay = projectService.computeDelay({
      plannedEnd: pr.planned_end_date,
      actualEnd: pr.actual_end_date,
      isDone: pr.status === 'hoan_thanh',
    });
    return {
      id: pr.id,
      code: pr.code,
      name: pr.name,
      partner_name: pr.partner_name,
      status: pr.status,
      progress_percent: projectService.getProjectProgress(pr.id),
      is_late: delay.is_late,
      late_days: delay.late_days,
      remaining_debt: remainingDebtMap.get(pr.id) || 0,
      over_budget_count: overBudgetCountMap.get(pr.id) || 0,
    };
  });

  res.json({
    items,
    summary: {
      active_count: items.length,
      late_count: items.filter((i) => i.is_late).length,
      total_receivable: items.reduce((sum, i) => sum + i.remaining_debt, 0),
      over_budget_projects_count: items.filter((i) => i.over_budget_count > 0).length,
    },
  });
});

module.exports = router;
