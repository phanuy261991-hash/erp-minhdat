// Logic trang Bao cao (Phase 4): ton kho hien tai, mua/ban hang theo thang (bieu do cot ve
// tay bang SVG - khong dung thu vien ngoai, dung nguyen tac du an khong phu thuoc CDN/build
// step), tong hop cong no toan he thong. Ca 3 nguon du lieu deu tinh truc tiep tu bang goc
// o backend (reports.routes.js), khong luu so tong hop rieng.

let currentUser = null;

const errorBox = document.getElementById('reports-error');
const errorText = document.getElementById('reports-error-text');

function renderPageError(message) {
  errorText.textContent = message;
  errorBox.hidden = false;
}

function formatMoney(value) {
  return Math.round(Number(value)).toLocaleString('vi-VN');
}

// So gon cho nhan tren dinh cot (12.5tr / 1.2 tỷ) - so lieu day du van co qua title (hover).
function formatCompactMoney(value) {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}tr`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(0)}k`;
  return formatMoney(value);
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-');
  return `${month}/${year.slice(2)}`;
}

function statCard(label, value) {
  return `
    <div class="stat-card">
      <p class="stat-card-label">${label}</p>
      <p class="stat-card-value">${value}</p>
    </div>
  `;
}

// null = khong co du lieu ky truoc de so sanh (ca 2 ky deu 0); Infinity = tu 0 len co phat
// sinh (khong tinh duoc % nhung van la tin tot).
function computeGrowth(current, previous) {
  if (previous === 0) {
    return current === 0 ? null : Infinity;
  }
  return ((current - previous) / previous) * 100;
}

function renderDeltaLine(growth) {
  if (growth === null) {
    return '<p class="stat-delta">Chưa có dữ liệu tháng trước</p>';
  }
  if (growth === Infinity) {
    return `<p class="stat-delta stat-delta--up">${icon('chevronUp', 12)} Mới phát sinh so với tháng trước</p>`;
  }
  const isUp = growth >= 0;
  const cls = isUp ? 'stat-delta--up' : 'stat-delta--down';
  const iconName = isUp ? 'chevronUp' : 'chevronDown';
  return `<p class="stat-delta ${cls}">${icon(iconName, 12)} ${Math.abs(growth).toFixed(1)}% so với tháng trước</p>`;
}

// title (tuy chon): gan vao thuoc tinh title cua the gia tri, xem duoc day du qua tooltip khi
// ruot chuot vao - phong truong hop gia tri qua dai bi cat bot (text-overflow:ellipsis) o khung
// hep .report-chart-row (xem style.css).
function statCardWithDelta(label, value, growth, title) {
  const titleAttr = title ? ` title="${title}"` : '';
  return `
    <div class="stat-card">
      <p class="stat-card-label">${label}</p>
      <p class="stat-card-value"${titleAttr}>${value}</p>
      ${renderDeltaLine(growth)}
    </div>
  `;
}

// Duong bao quanh 1 cot, bo goc CHI o 2 dinh tren (data-end), vuong o day (baseline) - dung
// path thay vi <rect rx> vi rect bo tron ca 4 goc (xem skill dataviz muc marks-and-anatomy).
function roundedTopBarPath(x, yTop, width, yBottom, radius) {
  const r = Math.min(radius, width / 2, Math.max(yBottom - yTop, 0) / 2);
  if (r <= 0) {
    return `M${x},${yBottom} L${x},${yTop} L${x + width},${yTop} L${x + width},${yBottom} Z`;
  }
  return `
    M${x},${yBottom}
    L${x},${yTop + r}
    Q${x},${yTop} ${x + r},${yTop}
    L${x + width - r},${yTop}
    Q${x + width},${yTop} ${x + width},${yTop + r}
    L${x + width},${yBottom}
    Z
  `;
}

// Bieu do cot don gian, 1 chuoi so lieu duy nhat (khong can chu thich mau vi chi 1 mau - xem
// skill dataviz: "mot chuoi khong can legend"). Nhan gia tri chi hien o cot cuoi cung (thang
// hien tai) de tranh roi mat, cac cot khac xem qua tooltip (title) khi ruot chuot vao.
function renderBarChart(container, data, color) {
  const width = 560;
  const height = 200;
  const paddingTop = 30;
  const paddingBottom = 28;
  const paddingX = 10;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingTop - paddingBottom;
  const maxValue = Math.max(...data.map((d) => d.total), 1);
  const n = data.length;
  const slot = innerWidth / n;
  const barWidth = Math.min(28, slot * 0.55);
  const baselineY = paddingTop + innerHeight;

  const bars = data
    .map((d, index) => {
      const barHeight = (d.total / maxValue) * innerHeight;
      const x = paddingX + slot * index + (slot - barWidth) / 2;
      const yTop = baselineY - barHeight;
      const isLast = index === n - 1;
      const monthLabel = formatMonthLabel(d.month);
      const path = roundedTopBarPath(x, yTop, barWidth, baselineY, 4);

      return `
        <path d="${path}" fill="${color}">
          <title>Tháng ${monthLabel}: ${formatMoney(d.total)} đ</title>
        </path>
        ${isLast && d.total > 0 ? `<text x="${x + barWidth / 2}" y="${yTop - 8}" text-anchor="middle" class="chart-bar-value">${formatCompactMoney(d.total)}</text>` : ''}
        <text x="${x + barWidth / 2}" y="${height - 10}" text-anchor="middle" class="chart-month-label">${monthLabel}</text>
      `;
    })
    .join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="report-chart-svg" role="img" aria-label="Biểu đồ theo tháng">
      <line x1="${paddingX}" y1="${baselineY}" x2="${width - paddingX}" y2="${baselineY}" class="chart-baseline" />
      ${bars}
    </svg>
  `;
}

// Phan trang bang ton kho (toi da 15 dong/trang, theo yeu cau nguoi dung 2026-08-05) - danh
// sach da tai het 1 lan (khong goi lai API khi doi trang), chi cat mang va ve lai tbody.
const INVENTORY_PAGE_SIZE = 15;
let inventoryItemsCache = [];
let inventoryCurrentPage = 1;

function renderInventoryPage() {
  const totalPages = Math.max(1, Math.ceil(inventoryItemsCache.length / INVENTORY_PAGE_SIZE));
  inventoryCurrentPage = Math.min(inventoryCurrentPage, totalPages);

  const start = (inventoryCurrentPage - 1) * INVENTORY_PAGE_SIZE;
  const pageItems = inventoryItemsCache.slice(start, start + INVENTORY_PAGE_SIZE);

  document.getElementById('inventory-tbody').innerHTML = pageItems
    .map(
      (item) => `
        <tr>
          <td>${item.code}</td>
          <td>${item.name}</td>
          <td>${item.unit}</td>
          <td>${formatMoney(item.stock)}</td>
          <td>${formatMoney(item.unit_cost)}</td>
          <td>${formatMoney(item.value)}</td>
        </tr>
      `
    )
    .join('');

  const paginationEl = document.getElementById('inventory-pagination');
  paginationEl.hidden = inventoryItemsCache.length <= INVENTORY_PAGE_SIZE;

  document.getElementById('inventory-pagination-info').textContent =
    inventoryItemsCache.length === 0
      ? 'Không có sản phẩm nào'
      : `Hiển thị ${start + 1}-${Math.min(start + INVENTORY_PAGE_SIZE, inventoryItemsCache.length)} trên tổng ${inventoryItemsCache.length} sản phẩm`;
  document.getElementById('inventory-page-label').textContent = `Trang ${inventoryCurrentPage}/${totalPages}`;
  document.getElementById('inventory-prev-page').disabled = inventoryCurrentPage <= 1;
  document.getElementById('inventory-next-page').disabled = inventoryCurrentPage >= totalPages;
}

document.getElementById('inventory-prev-page').addEventListener('click', () => {
  inventoryCurrentPage -= 1;
  renderInventoryPage();
});

document.getElementById('inventory-next-page').addEventListener('click', () => {
  inventoryCurrentPage += 1;
  renderInventoryPage();
});

async function loadInventoryReport() {
  const { items, total_value: totalValue } = await apiFetch('/reports/inventory');

  document.getElementById('inventory-stats').innerHTML = [
    statCard('Tổng giá trị tồn kho', `${formatMoney(totalValue)} đ`),
    statCard('Số sản phẩm đang theo dõi', items.length),
  ].join('');

  inventoryItemsCache = items;
  inventoryCurrentPage = 1;
  renderInventoryPage();
}

async function loadStockMovementsReport() {
  const { purchases, sales } = await apiFetch('/reports/stock-movements?months=6');

  const currentPurchase = purchases[purchases.length - 1].total;
  const previousPurchase = purchases[purchases.length - 2].total;
  document.getElementById('purchase-stats').innerHTML = statCardWithDelta(
    'Mua hàng tháng này',
    `${formatMoney(currentPurchase)} đ`,
    computeGrowth(currentPurchase, previousPurchase),
    `${formatMoney(currentPurchase)} đ`
  );
  renderBarChart(document.getElementById('purchase-chart'), purchases, 'var(--color-primary)');

  const currentSales = sales[sales.length - 1].total;
  const previousSales = sales[sales.length - 2].total;
  document.getElementById('sales-stats').innerHTML = statCardWithDelta(
    'Bán hàng tháng này',
    `${formatMoney(currentSales)} đ`,
    computeGrowth(currentSales, previousSales),
    `${formatMoney(currentSales)} đ`
  );
  renderBarChart(document.getElementById('sales-chart'), sales, 'var(--color-accent)');
}

async function loadDebtsReport() {
  const { total_payable: totalPayable, total_receivable: totalReceivable } = await apiFetch('/reports/debts');

  document.getElementById('debt-stats').innerHTML = [
    statCard('Tổng phải trả (NCC)', `${formatMoney(totalPayable)} đ`),
    statCard('Tổng phải thu (khách hàng)', `${formatMoney(totalReceivable)} đ`),
  ].join('');
}

const PROJECT_STATUS_LABELS = {
  chuan_bi: 'Chuẩn bị',
  dang_thuc_hien: 'Đang thực hiện',
  tam_dung: 'Tạm dừng',
};

function renderProjectProgressCell(progressPercent) {
  return progressPercent === null || progressPercent === undefined ? '-' : `${progressPercent}%`;
}

function renderProjectDelayCell(isLate, lateDays) {
  return isLate ? `<span class="delay-badge">${icon('warningTriangle', 12)} Trễ ${lateDays} ngày</span>` : '';
}

function renderProjectMaterialCell(project) {
  if (project.over_budget_count > 0) {
    return `<a href="project-detail.html?id=${project.id}&tab=materials" class="table-link-btn">${project.over_budget_count} SP vượt dự toán</a>`;
  }
  return 'Đủ dự toán';
}

// Chi tinh du an DANG HOAT DONG (Chuan bi/Dang thuc hien/Tam dung) - da chot voi nguoi dung
// 2026-08-05, xem docs/DECISIONS.md. So lieu tinh truc tiep o backend (reports.routes.js), trang
// nay chi hien thi lai, khong tu tinh them.
async function loadProjectsReport() {
  const { items, summary } = await apiFetch('/reports/projects');

  document.getElementById('project-stats').innerHTML = [
    statCard('Dự án đang hoạt động', summary.active_count),
    statCard('Trễ tiến độ', summary.late_count),
    statCard('Tổng còn phải thu', `${formatMoney(summary.total_receivable)} đ`),
    statCard('Dự án vượt dự toán vật tư', summary.over_budget_projects_count),
  ].join('');

  const tbody = document.getElementById('project-report-tbody');
  const emptyEl = document.getElementById('project-report-empty');
  emptyEl.hidden = items.length > 0;

  tbody.innerHTML = items
    .map(
      (p) => `
        <tr>
          <td><a href="project-detail.html?id=${p.id}" class="table-link-btn">${p.code}</a></td>
          <td>${p.name}</td>
          <td>${p.partner_name}</td>
          <td>${renderProjectProgressCell(p.progress_percent)} ${renderProjectDelayCell(p.is_late, p.late_days)}</td>
          <td><span class="project-status-badge project-status-badge--${p.status}">${PROJECT_STATUS_LABELS[p.status]}</span></td>
          <td>${formatMoney(p.remaining_debt)} đ</td>
          <td>${renderProjectMaterialCell(p)}</td>
        </tr>
      `
    )
    .join('');
}

(async function init() {
  currentUser = await initLayout('reports');
  if (!currentUser) return;

  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });
  document.getElementById('inventory-prev-page').innerHTML = icon('arrowLeft', 14);
  document.getElementById('inventory-next-page').innerHTML = icon('arrowRight', 14);

  try {
    await Promise.all([loadInventoryReport(), loadStockMovementsReport(), loadDebtsReport(), loadProjectsReport()]);
  } catch (err) {
    renderPageError(err.message);
  }
})();
