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

// Gio VN co dinh UTC+7 - dong bo nguyen tac da chot o cashVoucher.service.js/project.service.js
// (khong dung gio server/UTC tho, vi nguoi dung luon o VN). Dung cho bo loc "Tong so tien da
// thu" cua the "Du an dang hoat dong" (them 2026-08-07, theo yeu cau nguoi dung).
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function currentMonthVN() {
  const d = new Date(Date.now() + VN_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// month: 'YYYY-MM' theo lich VN -> { startUtc, endUtc } dang chuoi 'YYYY-MM-DD HH:MM:SS' (UTC,
// khong hau to 'Z') - cung dinh dang voi created_at da luu, so sanh truc tiep bang < / >= la
// dung. Dung y het cach monthBoundsUtc() da lam o cashVoucher.service.js (khong import cheo
// giua 2 service - dung dung tien le da co: moi noi can tu giu 1 ban VN_OFFSET_MS + ham rieng,
// xem cac comment tuong tu o project.service.js/notification.service.js/utils/logger.js).
function monthBoundsUtc(monthStr) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthStr || '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const startMs = Date.UTC(year, month - 1, 1, 0, 0, 0);
  const endMs = Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1, 0, 0, 0);
  const toSqlite = (ms) => new Date(ms - VN_OFFSET_MS).toISOString().slice(0, 19).replace('T', ' ');
  return { startUtc: toSqlite(startMs), endUtc: toSqlite(endMs) };
}

// from/to: 'YYYY-MM-DD' theo lich VN -> [00:00 VN cua from, 00:00 VN cua NGAY SAU to) quy doi
// UTC - "to" la ngay CUOI CUNG duoc tinh (bao gom ca ngay do), nen can +1 ngay lam moc ket thuc.
function dateRangeBoundsUtc(fromStr, toStr) {
  const fromMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fromStr || '');
  const toMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toStr || '');
  if (!fromMatch || !toMatch) return null;
  const startMs = Date.UTC(Number(fromMatch[1]), Number(fromMatch[2]) - 1, Number(fromMatch[3]), 0, 0, 0);
  const endMs =
    Date.UTC(Number(toMatch[1]), Number(toMatch[2]) - 1, Number(toMatch[3]), 0, 0, 0) + 24 * 60 * 60 * 1000;
  if (endMs <= startMs) return null;
  const toSqlite = (ms) => new Date(ms - VN_OFFSET_MS).toISOString().slice(0, 19).replace('T', ' ');
  return { startUtc: toSqlite(startMs), endUtc: toSqlite(endMs) };
}

// Tong "gia tri" (project_payment_milestones.amount) cua cac dot thanh toan DA THU DU
// (SUM(debt_ledger 'tra') >= amount, dung y het dieu kien computeMilestoneStatus() ap dung cho
// trang thai 'da_thu_du' o project.service.js) VA thoi diem thuc su du tien (ngay cua dong 'tra'
// lam cumulative vuot/bang amount) roi vao dung khoang [startUtc, endUtc) dang loc. Chi tinh
// dot thanh toan thuoc cac du an trong projectIds (dang hoat dong - khop pham vi voi 3 the con
// lai cua section "Du an dang hoat dong", da chot qua AskUserQuestion 2026-08-07).
function getTotalCollectedInPeriod(projectIds, startUtc, endUtc) {
  if (projectIds.length === 0) return 0;

  const projectPlaceholders = projectIds.map(() => '?').join(',');
  const milestones = db
    .prepare(`SELECT id, amount FROM project_payment_milestones WHERE project_id IN (${projectPlaceholders})`)
    .all(...projectIds);
  if (milestones.length === 0) return 0;

  const milestoneIds = milestones.map((m) => m.id);
  const milestonePlaceholders = milestoneIds.map(() => '?').join(',');
  const payments = db
    .prepare(`
      SELECT milestone_id, amount, created_at
      FROM debt_ledger
      WHERE milestone_id IN (${milestonePlaceholders}) AND type = 'tra'
      ORDER BY milestone_id ASC, created_at ASC, id ASC
    `)
    .all(...milestoneIds);

  const paymentsByMilestone = new Map();
  payments.forEach((p) => {
    if (!paymentsByMilestone.has(p.milestone_id)) paymentsByMilestone.set(p.milestone_id, []);
    paymentsByMilestone.get(p.milestone_id).push(p);
  });

  let total = 0;
  milestones.forEach((m) => {
    if (!(m.amount > 0)) return;
    const list = paymentsByMilestone.get(m.id) || [];
    let cumulative = 0;
    let fullyPaidAt = null;
    for (const p of list) {
      cumulative += p.amount;
      if (cumulative >= m.amount) {
        fullyPaidAt = p.created_at;
        break;
      }
    }
    if (fullyPaidAt && fullyPaidAt >= startUtc && fullyPaidAt < endUtc) {
      total += m.amount;
    }
  });
  return total;
}

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
  // Bo loc ky cho the "Tong so tien da thu" (them 2026-08-07) - CHI anh huong the nay, 3 the
  // con lai (So du an/Tong gia tri hop dong/Tong con phai thu) van la so du "hien tai", khong
  // doi theo ky (da chot qua AskUserQuestion). Uu tien ?from&?to (khoang ngay tuy chinh) neu ca
  // 2 cung co; nguoc lai dung ?month (YYYY-MM); khong co gi ca thi mac dinh thang hien tai (VN).
  let periodBounds;
  let period;
  if (req.query.from && req.query.to) {
    periodBounds = dateRangeBoundsUtc(req.query.from, req.query.to);
    if (!periodBounds) {
      return res.status(400).json({ error: 'Khoảng ngày không hợp lệ (định dạng YYYY-MM-DD, từ ngày phải trước đến ngày)' });
    }
    period = { mode: 'range', from: req.query.from, to: req.query.to };
  } else {
    const month = req.query.month || currentMonthVN();
    periodBounds = monthBoundsUtc(month);
    if (!periodBounds) {
      return res.status(400).json({ error: 'Tháng không hợp lệ, định dạng YYYY-MM' });
    }
    period = { mode: 'month', month };
  }

  const placeholders = ACTIVE_PROJECT_STATUSES.map(() => '?').join(',');

  const projects = db
    .prepare(`
      SELECT pr.id, pr.code, pr.name, pr.status, pr.planned_end_date, pr.actual_end_date,
             pr.contract_value, pa.name AS partner_name
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
      contract_value: pr.contract_value,
      remaining_debt: remainingDebtMap.get(pr.id) || 0,
      over_budget_count: overBudgetCountMap.get(pr.id) || 0,
    };
  });

  res.json({
    items,
    summary: {
      active_count: items.length,
      // The "Tong gia tri hop dong" (2026-08-07, thay the "Tre tien do" cu): tong contract_value
      // GOC cua cac du an DANG HOAT DONG dang hien trong items o tren (khong gom phat sinh da
      // duyet, khong gom du an Hoan thanh/Huy - dung pham vi voi 3 the con lai cua section nay).
      total_contract_value: items.reduce((sum, i) => sum + i.contract_value, 0),
      total_receivable: items.reduce((sum, i) => sum + i.remaining_debt, 0),
      // The "Tong so tien da thu" (2026-08-07, thay the "Du an vuot du toan vat tu" cu - cot
      // "Vat tu" o bang chi tiet VAN con nguyen, chi doi the tong hop dau trang) - CO loc theo
      // ky (thang/khoang ngay), 3 the con lai KHONG doi theo ky.
      total_collected_amount: getTotalCollectedInPeriod(
        items.map((i) => i.id),
        periodBounds.startUtc,
        periodBounds.endUtc
      ),
    },
    period,
  });
});

module.exports = router;
