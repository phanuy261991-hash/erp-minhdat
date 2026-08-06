// Logic trang "Chi tiet du an" (project-detail.html) - pattern MOI: trang chi tiet dang TAB
// (chua tung co trong du an truoc day). Dot 1: Tong quan + Giai doan (kem bieu do Gantt tu ve
// bang SVG tay, khong dung thu vien ngoai - dung nguyen tac du an, xem docs/DESIGN-SYSTEM.md).
// Dot 2 (2026-08-04): them Cong viec + % tien do tung giai doan (hien trong Gantt va bang
// danh sach giai doan) - tinh tu ti le cong viec hoan_thanh, KHONG luu so co dinh.
//
// Cap nhat sau Dot 2 (2026-08-04, theo yeu cau nguoi dung): bo han tab "Cong viec" rieng - gop
// toan bo thao tac (xem/them/sua/xoa/cap nhat trang thai) vao ngay tab "Giai doan": bam vao 1
// dong giai doan se xo ra bang cong viec con ngay duoi, co san 2 truong "Bat dau thuc te"/"Ket
// thuc thuc te" (nhap tay, thay the hoan toan completed_at tu dong - xem migration 023) + chon
// Trang thai + nut Luu de cap nhat nhanh ngay tai day (khong can mo modal). Bieu do Gantt cung
// dong bo: bam vao giai doan xo ra danh sach cong viec dang text ngan gon ben duoi thanh giai
// doan do (dung chung 1 trang thai mo rong `expandedPhaseIds` cho ca 2 noi). Cac tab con lai
// (Vat tu/Thanh toan & Cong no/Phat sinh) se them o Dot 3-4, xem docs/Plan.md.

const projectId = new URLSearchParams(window.location.search).get('id');

const STATUS_LABELS = {
  chuan_bi: 'Chuẩn bị',
  dang_thuc_hien: 'Đang thực hiện',
  tam_dung: 'Tạm dừng',
  hoan_thanh: 'Hoàn thành',
  huy: 'Hủy',
};

const PHASE_STATUS_LABELS = {
  chua_bat_dau: 'Chưa bắt đầu',
  dang_lam: 'Đang làm',
  hoan_thanh: 'Hoàn thành',
};

const TASK_STATUS_LABELS = {
  chua_lam: 'Chưa làm',
  dang_lam: 'Đang làm',
  hoan_thanh: 'Hoàn thành',
};

let currentProject = null;
let currentMembers = [];
let currentPhases = [];
let currentTasks = [];
let currentMaterials = [];
let currentDocuments = [];
let productsCache = [];
let editingPhaseId = null;
let editingTaskId = null;
let editingMaterialId = null;
// Giai doan dang mo rong (xo ra danh sach cong viec) - dung chung 1 trang thai cho ca bang
// "Danh sach giai doan" lan bieu do Gantt, de 2 noi luon dong bo khi nguoi dung bam mo/dong.
const expandedPhaseIds = new Set();

const detailErrorBox = document.getElementById('detail-error');
const detailErrorText = document.getElementById('detail-error-text');

const projectNameHeading = document.getElementById('project-name');
const projectStatusBadge = document.getElementById('project-status-badge');
const btnEditProject = document.getElementById('btn-edit-project');

const overviewStatsEl = document.getElementById('overview-stats');
const overviewInfoEl = document.getElementById('overview-info');
const overviewMembersEl = document.getElementById('overview-members');
const overviewMembersEmptyEl = document.getElementById('overview-members-empty');

const detailTabs = document.getElementById('detail-tabs');
const tabPanels = {
  overview: document.getElementById('tab-overview'),
  phases: document.getElementById('tab-phases'),
  materials: document.getElementById('tab-materials'),
  payments: document.getElementById('tab-payments'),
  variations: document.getElementById('tab-variations'),
};

const ganttSvg = document.getElementById('gantt-svg');
const ganttEmpty = document.getElementById('gantt-empty');
const phasesTbody = document.getElementById('phases-tbody');
const btnAddPhase = document.getElementById('btn-add-phase');

const phaseModal = document.getElementById('phase-modal');
const phaseModalTitle = document.getElementById('phase-modal-title');
const phaseForm = document.getElementById('phase-form');
const phaseFormErrorBox = document.getElementById('phase-form-error');
const phaseFormErrorText = document.getElementById('phase-form-error-text');
const btnCancelPhase = document.getElementById('btn-cancel-phase');
const btnSubmitPhase = document.getElementById('btn-submit-phase');

const phaseNameInput = document.getElementById('phase-name');
const phaseSortOrderInput = document.getElementById('phase-sort-order');
const phaseStatusSelect = document.getElementById('phase-status');
const phasePlannedStartInput = document.getElementById('phase-planned-start');
const phasePlannedEndInput = document.getElementById('phase-planned-end');
const phaseActualStartInput = document.getElementById('phase-actual-start');
const phaseActualEndInput = document.getElementById('phase-actual-end');
const phaseNoteInput = document.getElementById('phase-note');

const taskModal = document.getElementById('task-modal');
const taskModalTitle = document.getElementById('task-modal-title');
const taskForm = document.getElementById('task-form');
const taskFormErrorBox = document.getElementById('task-form-error');
const taskFormErrorText = document.getElementById('task-form-error-text');
const btnCancelTask = document.getElementById('btn-cancel-task');
const btnSubmitTask = document.getElementById('btn-submit-task');

const taskNameInput = document.getElementById('task-name');
const taskPhaseSelect = document.getElementById('task-phase');
const taskAssignedUserSelect = document.getElementById('task-assigned-user');
const taskStartDateInput = document.getElementById('task-start-date');
const taskDueDateInput = document.getElementById('task-due-date');
const taskActualStartInput = document.getElementById('task-actual-start');
const taskActualEndInput = document.getElementById('task-actual-end');
const taskStatusSelect = document.getElementById('task-status');
const taskNoteInput = document.getElementById('task-note');

const materialsTbody = document.getElementById('materials-tbody');
const materialsEmpty = document.getElementById('materials-empty');
const materialsTableWrap = document.getElementById('materials-table-wrap');
const btnAddMaterial = document.getElementById('btn-add-material');
const documentsTbody = document.getElementById('documents-tbody');
const documentsEmpty = document.getElementById('documents-empty');
const documentsTableWrap = document.getElementById('documents-table-wrap');

const materialModal = document.getElementById('material-modal');
const materialModalTitle = document.getElementById('material-modal-title');
const materialForm = document.getElementById('material-form');
const materialFormErrorBox = document.getElementById('material-form-error');
const materialFormErrorText = document.getElementById('material-form-error-text');
const btnCancelMaterial = document.getElementById('btn-cancel-material');
const btnSubmitMaterial = document.getElementById('btn-submit-material');
const materialProductSelect = document.getElementById('material-product');
const materialQuantityInput = document.getElementById('material-quantity');
const materialNoteInput = document.getElementById('material-note');

const paymentsStatsEl = document.getElementById('payments-stats');
const milestonesTbody = document.getElementById('milestones-tbody');
const milestonesEmpty = document.getElementById('milestones-empty');
const milestonesTableWrap = document.getElementById('milestones-table-wrap');
const btnAddMilestone = document.getElementById('btn-add-milestone');

const milestoneModal = document.getElementById('milestone-modal');
const milestoneModalTitle = document.getElementById('milestone-modal-title');
const milestoneForm = document.getElementById('milestone-form');
const milestoneFormErrorBox = document.getElementById('milestone-form-error');
const milestoneFormErrorText = document.getElementById('milestone-form-error-text');
const btnCancelMilestone = document.getElementById('btn-cancel-milestone');
const btnSubmitMilestone = document.getElementById('btn-submit-milestone');
const milestoneNameInput = document.getElementById('milestone-name');
const milestoneAmountInput = document.getElementById('milestone-amount');
const milestonePercentInput = document.getElementById('milestone-percent');
const milestoneSortOrderInput = document.getElementById('milestone-sort-order');
const milestoneDueDateInput = document.getElementById('milestone-due-date');
const milestoneNoteInput = document.getElementById('milestone-note');
const milestoneRecipientNameInput = document.getElementById('milestone-recipient-name');
const milestoneRecipientTitleSelect = document.getElementById('milestone-recipient-title');
let editingMilestoneId = null;

const variationsTbody = document.getElementById('variations-tbody');
const variationsEmpty = document.getElementById('variations-empty');
const variationsTableWrap = document.getElementById('variations-table-wrap');
const btnAddVariation = document.getElementById('btn-add-variation');

const variationModal = document.getElementById('variation-modal');
const variationModalTitle = document.getElementById('variation-modal-title');
const variationForm = document.getElementById('variation-form');
const variationFormErrorBox = document.getElementById('variation-form-error');
const variationFormErrorText = document.getElementById('variation-form-error-text');
const btnCancelVariation = document.getElementById('btn-cancel-variation');
const btnSubmitVariation = document.getElementById('btn-submit-variation');
const variationTypeSelect = document.getElementById('variation-type');
const variationStatusSelect = document.getElementById('variation-status');
const variationTitleInput = document.getElementById('variation-title');
const variationAmountField = document.getElementById('variation-amount-field');
const variationAmountInput = document.getElementById('variation-amount');
const variationOccurredDateInput = document.getElementById('variation-occurred-date');
const variationDescriptionInput = document.getElementById('variation-description');
const variationResolutionInput = document.getElementById('variation-resolution');
let editingVariationId = null;

let currentMilestones = [];
let currentVariations = [];

function renderDetailError(message) {
  detailErrorText.textContent = message;
  detailErrorBox.hidden = false;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function formatDateVN(value) {
  if (!value) return '-';
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

// ----- Chuyen tab -----

detailTabs.addEventListener('click', (event) => {
  const button = event.target.closest('.detail-tab');
  if (!button) return;

  detailTabs.querySelectorAll('.detail-tab').forEach((btn) => btn.classList.toggle('active', btn === button));
  Object.entries(tabPanels).forEach(([key, panel]) => {
    panel.hidden = key !== button.dataset.tab;
  });
});

// ----- Tab Tong quan -----

function detailInfoItem(label, value, fullWidth) {
  return `<div class="detail-info-item${fullWidth ? ' full-width' : ''}"><p class="detail-label">${label}</p><p class="detail-value">${value}</p></div>`;
}

function renderOverview(project, members) {
  projectNameHeading.textContent = project.name;
  projectStatusBadge.textContent = STATUS_LABELS[project.status];
  projectStatusBadge.className = `project-status-badge project-status-badge--${project.status}`;
  btnEditProject.href = `projects.html?edit=${project.id}`;

  const progressText = project.progress_percent === null || project.progress_percent === undefined
    ? '-'
    : `${project.progress_percent}%`;

  overviewStatsEl.innerHTML = `
    <div class="stat-card">
      <p class="stat-card-label">Tiến độ dự án</p>
      <p class="stat-card-value">${progressText}</p>
    </div>
    <div class="stat-card">
      <p class="stat-card-label">Giá trị hợp đồng</p>
      <p class="stat-card-value stat-card-value--primary">${formatMoney(project.contract_value)} đ</p>
      ${project.contract_value_actual !== undefined && project.contract_value_actual !== project.contract_value
        ? `<p style="margin:4px 0 0;font-size:12px;color:var(--color-muted-foreground)">Thực tế (gồm phát sinh đã duyệt): ${formatMoney(project.contract_value_actual)} đ</p>`
        : ''}
    </div>
  `;

  overviewInfoEl.innerHTML = [
    detailInfoItem('Mã dự án', project.code),
    detailInfoItem('Khách hàng', project.partner_name),
    detailInfoItem('Số hợp đồng', project.contract_no || '-'),
    detailInfoItem('Ngày ký hợp đồng', formatDateVN(project.contract_date)),
    detailInfoItem('Ngày bắt đầu', formatDateVN(project.start_date)),
    detailInfoItem('Ngày hoàn thành dự kiến', formatDateVN(project.planned_end_date)),
    detailInfoItem('Ngày hoàn thành thực tế', formatDateVN(project.actual_end_date)),
    detailInfoItem('Người phụ trách', project.manager_name || '-'),
    detailInfoItem('Địa chỉ công trình', project.site_address || '-', true),
    detailInfoItem('Ghi chú', project.note || '-', true),
  ].join('');

  if (members.length === 0) {
    overviewMembersEmptyEl.hidden = false;
    overviewMembersEl.innerHTML = '';
  } else {
    overviewMembersEmptyEl.hidden = true;
    overviewMembersEl.innerHTML = members
      .map((m) => `
        <div class="member-row">
          <span class="member-row-name">${m.full_name}</span>
          <span class="member-row-role">${m.role_in_project || 'Chưa có vai trò'}</span>
        </div>
      `)
      .join('');
  }
}

// ----- Tab Giai doan: bieu do Gantt (SVG tu ve tay) + bang danh sach -----

const GANTT_ROW_HEIGHT = 40;
const GANTT_LABEL_WIDTH = 180;
const GANTT_AXIS_HEIGHT = 28;
const GANTT_RIGHT_PADDING = 60;
const GANTT_TASK_LINE_HEIGHT = 18;
const GANTT_TASK_LIST_PADDING = 10;

const PHASE_BAR_COLOR = {
  chua_bat_dau: '#cbd5e1',
  dang_lam: 'var(--color-primary)',
  hoan_thanh: 'var(--color-accent)',
};

const TASK_DOT_COLOR = {
  chua_lam: '#cbd5e1',
  dang_lam: 'var(--color-primary)',
  hoan_thanh: 'var(--color-accent)',
};

function getTasksForPhase(phaseId) {
  return currentTasks.filter((t) => t.phase_id === phaseId);
}

// Chieu cao 1 dong giai doan tren Gantt - co dinh 40px, cong them phan danh sach cong viec dang
// text khi giai doan dang duoc mo rong (expandedPhaseIds, dung chung voi bang "Danh sach giai
// doan" ben duoi de 2 noi luon dong bo).
function computePhaseRowHeight(phase) {
  if (!expandedPhaseIds.has(phase.id)) return GANTT_ROW_HEIGHT;
  const tasks = getTasksForPhase(phase.id);
  const lines = tasks.length > 0 ? tasks.length : 1;
  return GANTT_ROW_HEIGHT + lines * GANTT_TASK_LINE_HEIGHT + GANTT_TASK_LIST_PADDING;
}

function togglePhaseExpand(phaseId) {
  if (expandedPhaseIds.has(phaseId)) {
    expandedPhaseIds.delete(phaseId);
  } else {
    expandedPhaseIds.add(phaseId);
  }
  renderPhasesTab();
}

function parseDate(value) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function addMonths(date, count) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + count);
  return d;
}

function renderGanttChart(phases) {
  const datedPhases = phases.filter((p) => p.planned_start && p.planned_end);

  if (datedPhases.length === 0) {
    ganttEmpty.hidden = false;
    ganttSvg.innerHTML = '';
    ganttSvg.setAttribute('height', 0);
    return;
  }
  ganttEmpty.hidden = true;

  const chartWidth = Math.max(640, ganttSvg.parentElement.clientWidth - 40);
  const trackWidth = chartWidth - GANTT_LABEL_WIDTH - GANTT_RIGHT_PADDING;

  const starts = datedPhases.map((p) => parseDate(p.planned_start));
  const ends = datedPhases.map((p) => parseDate(p.planned_end));
  const rawMinDate = new Date(Math.min(...starts));
  const rawMaxDate = new Date(Math.max(...ends));

  // Dem them vai ngay 2 ben (khong chi dung dung sat mep) - neu khong, giai doan co ngay bat
  // dau trung dung diem dau vung ve se nam sat mep trai, khong co nhan thang nao hien ra truoc
  // do de biet thanh do thuoc thang nao (phat hien khi test qua trinh duyet that, giai doan
  // "Khao sat" 10-20/07 khong co nhan "Th7" vi thang 7 nam ngoai vung ve).
  const PADDING_DAYS = 3 * 24 * 60 * 60 * 1000;
  const minDate = new Date(rawMinDate.getTime() - PADDING_DAYS);
  const maxDate = new Date(rawMaxDate.getTime() + PADDING_DAYS);
  const totalMs = Math.max(maxDate - minDate, 24 * 60 * 60 * 1000);

  const scaleX = (date) => GANTT_LABEL_WIDTH + ((date - minDate) / totalMs) * trackWidth;

  // Chieu cao tung dong khac nhau: dong thuong 40px, dong dang mo rong (bam vao giai doan) cong
  // them phan danh sach cong viec dang text ben duoi (computePhaseRowHeight).
  const rowHeights = phases.map(computePhaseRowHeight);
  const totalHeight = GANTT_AXIS_HEIGHT + rowHeights.reduce((sum, h) => sum + h, 0) + 10;
  ganttSvg.setAttribute('width', chartWidth);
  ganttSvg.setAttribute('height', totalHeight);
  ganttSvg.setAttribute('viewBox', `0 0 ${chartWidth} ${totalHeight}`);

  let svgContent = '';

  // Duong ke luoi theo thang, nhan thang o hang dau. Bat dau tu thang CHUA thang bat dau vung
  // ve (co the som hon minDate) de luon co it nhat 1 nhan thang gan mep trai lam moc tham chieu -
  // ep vi tri ve toi thieu la GANTT_LABEL_WIDTH (khong ve am ra ngoai cot nhan ten giai doan).
  //
  // Bo qua nhan neu qua gan nhan truoc do (< MIN_LABEL_GAP px) - phat hien khi test qua trinh
  // duyet that: khi khoang dem 3 ngay day domain sang thang lien truoc chi vai ngay, ca thang do
  // lan thang ke tiep deu bi ep ve gan sat GANTT_LABEL_WIDTH, 2 nhan chu de len nhau khong doc
  // duoc (vd "Th6/2026" chong "Th7/2026"). Van ve duong ke luoi (khong bo qua duong ke, chi bo
  // nhan chu) de khong mat moc phan chia thang.
  const MIN_LABEL_GAP = 55;
  // Chan an toan MAX_MONTH_TICKS (phat hien 2026-08-06, dieu tra bao cao "dung ung dung thi bi
  // do"): vong lap nay truoc day khong co gioi han - neu 1 giai doan bi nhap nham nam o "Ngay bat
  // dau/hoan thanh du kien" (vd go "2260" thay vi "2026"), khoang cach ngay bi thoi phong len
  // hang tram/nghin nam, vong lap chay hang chuc nghin lan dung chuoi SVG khong lo -> dong cung
  // tab trinh duyet. 1000 thang (~83 nam) du du cho bat ky du an that nao, khong anh huong hien
  // thi binh thuong.
  const MAX_MONTH_TICKS = 1000;
  let cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  let lastLabelX = -Infinity;
  let monthTicks = 0;
  while (cursor <= maxDate && monthTicks < MAX_MONTH_TICKS) {
    const x = Math.max(scaleX(cursor), GANTT_LABEL_WIDTH);
    svgContent += `<line x1="${x}" y1="${GANTT_AXIS_HEIGHT}" x2="${x}" y2="${totalHeight}" stroke="#e4ecfc" stroke-width="1" />`;
    if (x - lastLabelX >= MIN_LABEL_GAP) {
      svgContent += `<text x="${x + 4}" y="16" font-size="11" fill="#64748b">Th${cursor.getMonth() + 1}/${cursor.getFullYear()}</text>`;
      lastLabelX = x;
    }
    cursor = addMonths(cursor, 1);
    monthTicks += 1;
  }

  let cursorY = GANTT_AXIS_HEIGHT;
  phases.forEach((phase, index) => {
    const y = cursorY;
    const rowHeight = rowHeights[index];
    const rowCenter = y + GANTT_ROW_HEIGHT / 2;
    const expanded = expandedPhaseIds.has(phase.id);

    // Bam vao bat ky phan tu nao trong dong (nhan ten/thanh) se xo/thu danh sach cong viec ben
    // duoi - boc ca dong trong 1 <g data-phase-id> de delegation click (xem ganttSvg click o
    // ngoai) chi can closest('[data-phase-id]'), khong quan tam bam trung text hay rect con nao.
    svgContent += `<g data-phase-id="${phase.id}" style="cursor:pointer">`;
    svgContent += `<text x="0" y="${rowCenter + 4}" font-size="13" fill="#0f172a">${escapeXml(phase.name)}</text>`;

    if (phase.planned_start && phase.planned_end) {
      const x1 = scaleX(parseDate(phase.planned_start));
      const x2 = scaleX(parseDate(phase.planned_end));
      const barWidth = Math.max(x2 - x1, 6);
      const barY = y + 8;
      const barHeight = GANTT_ROW_HEIGHT - 16;
      const color = PHASE_BAR_COLOR[phase.status] || PHASE_BAR_COLOR.chua_bat_dau;
      const hasProgress = phase.progress_percent !== null && phase.progress_percent !== undefined;
      const tooltip = `${escapeXml(phase.name)}: ${formatDateVN(phase.planned_start)} - ${formatDateVN(phase.planned_end)}${hasProgress ? ` (${phase.progress_percent}%)` : ''}`;

      svgContent += `<rect x="${x1}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="6" fill="${color}" fill-opacity="0.35"><title>${tooltip}</title></rect>`;
      // Phan to dam ben trong (tu trai sang) la % hoan thanh (tinh tu cong viec cua giai doan,
      // Dot 2) - khong ve phan nay neu giai doan chua co cong viec nao (progress_percent = null).
      // Nhan % dat NGAY SAU thanh (khong de de trong thanh) de luon du tuong phan doc duoc, khong
      // phu thuoc thanh dang to dam bao nhieu %.
      if (hasProgress) {
        const progressWidth = Math.max((barWidth * phase.progress_percent) / 100, phase.progress_percent > 0 ? 4 : 0);
        svgContent += `<rect x="${x1}" y="${barY}" width="${progressWidth}" height="${barHeight}" rx="6" fill="${color}"><title>${tooltip}</title></rect>`;
        svgContent += `<text x="${x1 + barWidth + 6}" y="${rowCenter + 4}" font-size="11" font-weight="600" fill="#334155">${phase.progress_percent}%</text>`;
      }
    } else {
      svgContent += `<text x="${GANTT_LABEL_WIDTH}" y="${rowCenter + 4}" font-size="12" fill="#94a3b8" font-style="italic">Chưa đặt lịch</text>`;
    }

    // Danh sach cong viec dang text ngan gon khi giai doan dang mo rong (theo lua chon nguoi
    // dung: khong ve them thanh SVG rieng cho tung cong viec) - moi dong 1 cham mau + ten + trang
    // thai, kem "Tre X ngay" mau do neu co (dung is_late/late_days da tinh san o backend).
    if (expanded) {
      const tasks = getTasksForPhase(phase.id);
      let taskY = y + GANTT_ROW_HEIGHT + GANTT_TASK_LINE_HEIGHT - 5;
      if (tasks.length === 0) {
        svgContent += `<text x="${GANTT_LABEL_WIDTH}" y="${taskY}" font-size="11" fill="#94a3b8" font-style="italic">Chưa có công việc nào</text>`;
      } else {
        tasks.forEach((task) => {
          const dotColor = TASK_DOT_COLOR[task.status] || TASK_DOT_COLOR.chua_lam;
          const delaySuffix = task.is_late ? `  ·  Trễ ${task.late_days} ngày` : '';
          svgContent += `<text x="${GANTT_LABEL_WIDTH}" y="${taskY}" font-size="11">` +
            `<tspan fill="${dotColor}">●</tspan> ` +
            `<tspan fill="#334155">${escapeXml(task.name)} — ${TASK_STATUS_LABELS[task.status]}</tspan>` +
            (delaySuffix ? `<tspan fill="var(--color-destructive)" font-weight="600">${escapeXml(delaySuffix)}</tspan>` : '') +
            `</text>`;
          taskY += GANTT_TASK_LINE_HEIGHT;
        });
      }
    }

    svgContent += `</g>`;
    cursorY += rowHeight;
  });

  ganttSvg.innerHTML = svgContent;
}

// Click de mo/thu danh sach cong viec cua 1 giai doan tren Gantt - gan 1 lan duy nhat (khong
// phai trong renderGanttChart, vi innerHTML bi thay moi lan ve lai nhung ganttSvg la cung 1 the
// DOM nen event delegation van hoat dong dung).
ganttSvg.addEventListener('click', (event) => {
  const target = event.target.closest('[data-phase-id]');
  if (target) togglePhaseExpand(Number(target.dataset.phaseId));
});

function escapeXml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// Nhan canh bao "Tre X ngay" (2026-08-04, theo yeu cau nguoi dung) - dat duoi badge Trang thai,
// dung chung cho ca bang Giai doan lan bang Cong viec. is_late/late_days tinh san o backend
// (xem computeDelay() trong project.service.js), frontend chi hien thi lai, khong tu tinh.
function renderDelayBadge(isLate, lateDays) {
  if (!isLate) return '';
  return `<span class="delay-badge">${icon('warningTriangle', 12)} Trễ ${lateDays} ngày</span>`;
}

function renderPhaseProgressCell(progressPercent) {
  if (progressPercent === null || progressPercent === undefined) {
    return '-';
  }
  return `
    <div class="phase-progress-cell">
      <div class="phase-progress-track"><div class="phase-progress-fill" style="width:${progressPercent}%"></div></div>
      <span>${progressPercent}%</span>
    </div>
  `;
}

// Danh sach cong viec cua 1 giai doan, hien ngay duoi dong giai doan do trong bang (bam dong de
// xo ra/thu vao - xem phasesTbody click delegation). Moi cong viec la 1 dong voi 2 o ngay thuc
// te nhap tay + chon Trang thai + nut "Luu" rieng (khong can mo modal) - dung 2 truong
// actual_start_date/actual_end_date moi (migration 023), thay the hoan toan completed_at tu dong.
// Nut "Sua"/"Xoa" van mo modal day du (doi ten/nguoi phu trach/giai doan/ngay ke hoach).
function renderTaskStatusOptions(selected) {
  return Object.entries(TASK_STATUS_LABELS)
    .map(([value, label]) => `<option value="${value}"${selected === value ? ' selected' : ''}>${label}</option>`)
    .join('');
}

function renderPhaseTasksContent(phase) {
  const tasks = getTasksForPhase(phase.id);

  const rows = tasks.length === 0
    ? `<tr><td colspan="5" class="subtask-empty">Giai đoạn này chưa có công việc nào.</td></tr>`
    : tasks
        .map((task) => `
          <tr data-task-id="${task.id}">
            <td>
              <div class="subtask-name">${task.name}</div>
              <div class="subtask-meta">${task.assigned_user_name || 'Chưa có người phụ trách'} · KH: ${formatDateVN(task.start_date)} → ${formatDateVN(task.due_date)}</div>
            </td>
            <td><input type="date" class="subtask-actual-start filter-select" value="${task.actual_start_date || ''}" /></td>
            <td><input type="date" class="subtask-actual-end filter-select" value="${task.actual_end_date || ''}" /></td>
            <td>
              <select class="subtask-status filter-select">${renderTaskStatusOptions(task.status)}</select>
              ${renderDelayBadge(task.is_late, task.late_days)}
            </td>
            <td>
              <div class="subtask-actions">
                <button type="button" class="btn-secondary btn-sm" data-action="save-task" data-id="${task.id}">Lưu</button>
                <button type="button" class="icon-btn" data-action="edit-task" data-id="${task.id}" title="Sửa đầy đủ">${icon('pencil', 14)}</button>
                <button type="button" class="icon-btn icon-btn-danger" data-action="delete-task" data-id="${task.id}" title="Xóa công việc">${icon('trash', 14)}</button>
              </div>
            </td>
          </tr>
        `)
        .join('');

  return `
    <div class="subtask-panel">
      <div class="subtask-panel-header">
        <h4>Công việc trong giai đoạn "${phase.name}"</h4>
        <button type="button" class="btn-add btn-sm" data-action="add-task" data-phase-id="${phase.id}">${icon('plus', 14)} Thêm công việc</button>
      </div>
      <table class="data-table subtask-table">
        <thead>
          <tr>
            <th>Tên công việc</th>
            <th>Bắt đầu thực tế</th>
            <th>Kết thúc thực tế</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderPhasesTable(phases) {
  phasesTbody.innerHTML = phases
    .map((phase) => {
      const expanded = expandedPhaseIds.has(phase.id);
      const mainRow = `
        <tr class="phase-row${expanded ? ' expanded' : ''}" data-id="${phase.id}">
          <td><span class="row-toggle-icon">${icon(expanded ? 'chevronUp' : 'chevronDown', 14)}</span>${phase.sort_order}</td>
          <td>${phase.name}</td>
          <td>${formatDateVN(phase.planned_start)}</td>
          <td>${formatDateVN(phase.planned_end)}</td>
          <td>${formatDateVN(phase.actual_start)}</td>
          <td>${formatDateVN(phase.actual_end)}</td>
          <td>
            <span class="project-status-badge project-status-badge--${phase.status === 'hoan_thanh' ? 'hoan_thanh' : phase.status === 'dang_lam' ? 'dang_thuc_hien' : 'chuan_bi'}">${PHASE_STATUS_LABELS[phase.status]}</span>
            ${renderDelayBadge(phase.is_late, phase.late_days)}
          </td>
          <td>${renderPhaseProgressCell(phase.progress_percent)}</td>
          <td>
            <button type="button" class="icon-btn" data-action="edit-phase" data-id="${phase.id}" title="Sửa giai đoạn">${icon('pencil', 14)}</button>
            <button type="button" class="icon-btn icon-btn-danger" data-action="delete-phase" data-id="${phase.id}" title="Xóa giai đoạn">${icon('trash', 14)}</button>
          </td>
        </tr>
      `;
      const expandRow = expanded
        ? `<tr class="phase-tasks-row"><td colspan="9">${renderPhaseTasksContent(phase)}</td></tr>`
        : '';
      return mainRow + expandRow;
    })
    .join('');
}

function renderPhasesTab() {
  renderGanttChart(currentPhases);
  renderPhasesTable(currentPhases);
}

function openCreatePhaseModal() {
  editingPhaseId = null;
  phaseModalTitle.textContent = 'Thêm giai đoạn';
  phaseForm.reset();
  phaseStatusSelect.value = 'chua_bat_dau';
  phaseSortOrderInput.value = currentPhases.length > 0 ? Math.max(...currentPhases.map((p) => p.sort_order)) + 1 : 1;
  phaseFormErrorBox.hidden = true;
  phaseModal.hidden = false;
  phaseNameInput.focus();
}

function openEditPhaseModal(phase) {
  editingPhaseId = phase.id;
  phaseModalTitle.textContent = 'Sửa giai đoạn';
  phaseNameInput.value = phase.name;
  phaseSortOrderInput.value = phase.sort_order;
  phaseStatusSelect.value = phase.status;
  phasePlannedStartInput.value = phase.planned_start || '';
  phasePlannedEndInput.value = phase.planned_end || '';
  phaseActualStartInput.value = phase.actual_start || '';
  phaseActualEndInput.value = phase.actual_end || '';
  phaseNoteInput.value = phase.note || '';
  phaseFormErrorBox.hidden = true;
  phaseModal.hidden = false;
  phaseNameInput.focus();
}

function closePhaseModal() {
  phaseModal.hidden = true;
}

btnAddPhase.addEventListener('click', openCreatePhaseModal);
btnCancelPhase.addEventListener('click', closePhaseModal);
phaseModal.addEventListener('click', (event) => {
  if (event.target === phaseModal) closePhaseModal();
});

// Delegation dung chung cho ca dong giai doan lan bang cong viec long ben trong (khi mo rong) -
// gom du: sua/xoa giai doan, them/sua/xoa cong viec, luu nhanh ngay thuc te + trang thai cong
// viec, va bam vao dong giai doan (ngoai vung nut) de mo/thu danh sach cong viec.
phasesTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (button) {
    const { action, id } = button.dataset;

    if (action === 'edit-phase') {
      const phase = currentPhases.find((p) => String(p.id) === id);
      if (phase) openEditPhaseModal(phase);
      return;
    }

    if (action === 'delete-phase') {
      if (!confirm('Xóa giai đoạn này? Chỉ xóa được khi chưa có công việc nào gán vào.')) return;
      button.disabled = true;
      try {
        await apiFetch(`/projects/${projectId}/phases/${id}`, { method: 'DELETE' });
        await loadProjectDetail();
      } catch (err) {
        renderDetailError(err.message);
        button.disabled = false;
      }
      return;
    }

    if (action === 'add-task') {
      openCreateTaskModal(Number(button.dataset.phaseId));
      return;
    }

    if (action === 'edit-task') {
      const task = currentTasks.find((t) => String(t.id) === id);
      if (task) openEditTaskModal(task);
      return;
    }

    if (action === 'delete-task') {
      if (!confirm('Xóa công việc này?')) return;
      button.disabled = true;
      try {
        await apiFetch(`/projects/${projectId}/tasks/${id}`, { method: 'DELETE' });
        await loadProjectDetail();
      } catch (err) {
        renderDetailError(err.message);
        button.disabled = false;
      }
      return;
    }

    if (action === 'save-task') {
      const row = button.closest('tr[data-task-id]');
      const task = currentTasks.find((t) => String(t.id) === id);
      if (!task || !row) return;
      const actualStart = row.querySelector('.subtask-actual-start').value || null;
      const actualEnd = row.querySelector('.subtask-actual-end').value || null;
      const status = row.querySelector('.subtask-status').value;

      button.disabled = true;
      button.textContent = 'Đang lưu...';
      try {
        await apiFetch(`/projects/${projectId}/tasks/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: task.name,
            phase_id: task.phase_id,
            assigned_user_id: task.assigned_user_id,
            start_date: task.start_date,
            due_date: task.due_date,
            actual_start_date: actualStart,
            actual_end_date: actualEnd,
            status,
            note: task.note,
          }),
        });
        await loadProjectDetail();
      } catch (err) {
        renderDetailError(err.message);
        button.disabled = false;
        button.textContent = 'Lưu';
      }
      return;
    }

    return;
  }

  // Khong bam vao nut hanh dong nao - kiem tra co phai bam vao dong giai doan (khong phai vao
  // input/select ben trong bang cong viec da mo rong, vi do la <tr> khac, khong khop .phase-row).
  const row = event.target.closest('tr.phase-row');
  if (row) {
    togglePhaseExpand(Number(row.dataset.id));
  }
});

phaseForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  phaseFormErrorBox.hidden = true;
  btnSubmitPhase.disabled = true;
  btnSubmitPhase.textContent = 'Đang lưu...';

  const body = {
    name: phaseNameInput.value.trim(),
    sort_order: phaseSortOrderInput.value === '' ? 0 : Number(phaseSortOrderInput.value),
    status: phaseStatusSelect.value,
    planned_start: phasePlannedStartInput.value || null,
    planned_end: phasePlannedEndInput.value || null,
    actual_start: phaseActualStartInput.value || null,
    actual_end: phaseActualEndInput.value || null,
    note: phaseNoteInput.value.trim(),
  };

  try {
    if (editingPhaseId === null) {
      await apiFetch(`/projects/${projectId}/phases`, { method: 'POST', body: JSON.stringify(body) });
    } else {
      await apiFetch(`/projects/${projectId}/phases/${editingPhaseId}`, { method: 'PUT', body: JSON.stringify(body) });
    }
    closePhaseModal();
    await loadProjectDetail();
  } catch (err) {
    phaseFormErrorText.textContent = err.message;
    phaseFormErrorBox.hidden = false;
  } finally {
    btnSubmitPhase.disabled = false;
    btnSubmitPhase.textContent = 'Lưu';
  }
});

// ----- Modal them/sua Cong viec (bo tab rieng - kich hoat tu nut "Them cong viec"/"Sua dau du"
// nam ngay trong bang cong viec con cua tung giai doan da mo rong, xem renderPhaseTasksContent) -----

// Select "Giai doan" (modal) va "Nguoi phu trach" (modal, CHI lay tu currentMembers - khong phai
// toan bo tai khoan he thong, dung quyet dinh da chot voi nguoi dung: giao viec chi chon duoc
// nguoi trong danh sach tham gia du an) - goi lai moi khi currentPhases/currentMembers thay doi.
function populateTaskSelects() {
  taskPhaseSelect.innerHTML = currentPhases.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  taskAssignedUserSelect.innerHTML = '<option value="">-- Không chọn --</option>' +
    currentMembers.map((m) => `<option value="${m.user_id}">${m.full_name}</option>`).join('');
}

function openCreateTaskModal(presetPhaseId) {
  if (currentPhases.length === 0) {
    alert('Dự án chưa có giai đoạn nào - thêm giai đoạn trước.');
    return;
  }
  editingTaskId = null;
  taskModalTitle.textContent = 'Thêm công việc';
  taskForm.reset();
  taskPhaseSelect.value = presetPhaseId || currentPhases[0].id;
  taskStatusSelect.value = 'chua_lam';
  taskFormErrorBox.hidden = true;
  taskModal.hidden = false;
  taskNameInput.focus();
}

function openEditTaskModal(task) {
  editingTaskId = task.id;
  taskModalTitle.textContent = 'Sửa công việc';
  taskNameInput.value = task.name;
  taskPhaseSelect.value = task.phase_id;
  taskAssignedUserSelect.value = task.assigned_user_id || '';
  taskStartDateInput.value = task.start_date || '';
  taskDueDateInput.value = task.due_date || '';
  taskActualStartInput.value = task.actual_start_date || '';
  taskActualEndInput.value = task.actual_end_date || '';
  taskStatusSelect.value = task.status;
  taskNoteInput.value = task.note || '';
  taskFormErrorBox.hidden = true;
  taskModal.hidden = false;
  taskNameInput.focus();
}

function closeTaskModal() {
  taskModal.hidden = true;
}

btnCancelTask.addEventListener('click', closeTaskModal);
taskModal.addEventListener('click', (event) => {
  if (event.target === taskModal) closeTaskModal();
});

taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  taskFormErrorBox.hidden = true;
  btnSubmitTask.disabled = true;
  btnSubmitTask.textContent = 'Đang lưu...';

  const body = {
    name: taskNameInput.value.trim(),
    phase_id: Number(taskPhaseSelect.value),
    assigned_user_id: taskAssignedUserSelect.value ? Number(taskAssignedUserSelect.value) : null,
    start_date: taskStartDateInput.value || null,
    due_date: taskDueDateInput.value || null,
    actual_start_date: taskActualStartInput.value || null,
    actual_end_date: taskActualEndInput.value || null,
    status: taskStatusSelect.value,
    note: taskNoteInput.value.trim(),
  };

  try {
    if (editingTaskId === null) {
      await apiFetch(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(body) });
    } else {
      await apiFetch(`/projects/${projectId}/tasks/${editingTaskId}`, { method: 'PUT', body: JSON.stringify(body) });
    }
    closeTaskModal();
    await loadProjectDetail();
  } catch (err) {
    taskFormErrorText.textContent = err.message;
    taskFormErrorBox.hidden = false;
  } finally {
    btnSubmitTask.disabled = false;
    btnSubmitTask.textContent = 'Lưu';
  }
});

// ----- Tab Vat tu (Dot 3, migration 024) -----
// Du toan (project_material_plan) chi luu so luong du kien - issued_quantity/remaining_quantity/
// is_over da tinh san o backend (getMaterialsForProject() trong projectMaterials.routes.js),
// frontend chi hien thi lai, khong tu tinh (dung nguyen tac da ap dung cho progress_percent/is_late).

const DOCUMENT_TYPE_LABELS = { receipt: 'Nhập kho', issue: 'Xuất kho' };
// Phieu "Tra hang xuat" (migration 032) van la 1 dong stock_receipts (type='receipt') nhung
// danh dau is_return=1 - doi nhan rieng de khong nham voi phieu nhap mua hang tu NCC.
function documentTypeLabel(d) {
  if (d.type === 'receipt' && d.is_return) return 'Trả hàng';
  return DOCUMENT_TYPE_LABELS[d.type];
}

function renderMaterialsTable(materials) {
  const hasRows = materials.length > 0;
  materialsEmpty.hidden = hasRows;
  materialsTableWrap.hidden = !hasRows;
  if (!hasRows) {
    materialsTbody.innerHTML = '';
    return;
  }

  materialsTbody.innerHTML = materials
    .map((m) => `
      <tr data-id="${m.id}">
        <td>${m.product_code} - ${m.product_name}</td>
        <td>${m.unit}</td>
        <td>${formatMoney(m.planned_quantity)}</td>
        <td>${formatMoney(m.issued_quantity)}</td>
        <td>
          ${formatMoney(m.remaining_quantity)}
          ${m.is_over ? `<span class="delay-badge">${icon('warningTriangle', 12)} Vượt dự toán</span>` : ''}
        </td>
        <td>
          <button type="button" class="icon-btn" data-action="edit-material" data-id="${m.id}" title="Sửa dự toán">${icon('pencil', 14)}</button>
          <button type="button" class="icon-btn icon-btn-danger" data-action="delete-material" data-id="${m.id}" title="Xóa dự toán">${icon('trash', 14)}</button>
        </td>
      </tr>
    `)
    .join('');
}

function renderDocumentsTable(documents) {
  const hasRows = documents.length > 0;
  documentsEmpty.hidden = hasRows;
  documentsTableWrap.hidden = !hasRows;
  if (!hasRows) {
    documentsTbody.innerHTML = '';
    return;
  }

  documentsTbody.innerHTML = documents
    .map((d) => {
      const paymentBadge = d.payment_status === 'cong_no'
        ? '<span class="badge badge-inactive">Công nợ</span>'
        : '<span class="badge badge-active">Đã thanh toán/thu</span>';
      return `
        <tr>
          <td>${documentTypeLabel(d)}</td>
          <td>${d.code}</td>
          <td>${d.partner_name || '-'}</td>
          <td>${paymentBadge}</td>
          <td>${formatDateTimeVN(d.created_at)}</td>
        </tr>
      `;
    })
    .join('');
}

function formatDateTimeVN(sqliteDateTime) {
  const iso = sqliteDateTime.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderMaterialsTab() {
  renderMaterialsTable(currentMaterials);
  renderDocumentsTable(currentDocuments);
}

function populateMaterialProductSelect() {
  materialProductSelect.innerHTML = productsCache
    .map((p) => `<option value="${p.id}">${p.code} - ${p.name}</option>`)
    .join('');
}

function openCreateMaterialModal() {
  if (productsCache.length === 0) {
    alert('Chưa có sản phẩm nào trong danh mục - thêm sản phẩm trước.');
    return;
  }
  editingMaterialId = null;
  materialModalTitle.textContent = 'Thêm dự toán vật tư';
  materialForm.reset();
  materialProductSelect.disabled = false;
  materialFormErrorBox.hidden = true;
  materialModal.hidden = false;
}

function openEditMaterialModal(material) {
  editingMaterialId = material.id;
  materialModalTitle.textContent = 'Sửa dự toán vật tư';
  materialProductSelect.value = material.product_id;
  materialProductSelect.disabled = true;
  materialQuantityInput.value = material.planned_quantity;
  materialNoteInput.value = material.note || '';
  materialFormErrorBox.hidden = true;
  materialModal.hidden = false;
}

function closeMaterialModal() {
  materialModal.hidden = true;
  materialProductSelect.disabled = false;
}

btnAddMaterial.addEventListener('click', openCreateMaterialModal);
btnCancelMaterial.addEventListener('click', closeMaterialModal);
materialModal.addEventListener('click', (event) => {
  if (event.target === materialModal) closeMaterialModal();
});

materialsTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;

  if (action === 'edit-material') {
    const material = currentMaterials.find((m) => String(m.id) === id);
    if (material) openEditMaterialModal(material);
    return;
  }

  if (action === 'delete-material') {
    if (!confirm('Xóa dòng dự toán này?')) return;
    button.disabled = true;
    try {
      await apiFetch(`/projects/${projectId}/materials/${id}`, { method: 'DELETE' });
      await loadProjectDetail();
    } catch (err) {
      renderDetailError(err.message);
      button.disabled = false;
    }
  }
});

materialForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  materialFormErrorBox.hidden = true;
  btnSubmitMaterial.disabled = true;
  btnSubmitMaterial.textContent = 'Đang lưu...';

  const body = {
    product_id: Number(materialProductSelect.value),
    quantity: Number(materialQuantityInput.value),
    note: materialNoteInput.value.trim(),
  };

  try {
    if (editingMaterialId === null) {
      await apiFetch(`/projects/${projectId}/materials`, { method: 'POST', body: JSON.stringify(body) });
    } else {
      await apiFetch(`/projects/${projectId}/materials/${editingMaterialId}`, { method: 'PUT', body: JSON.stringify(body) });
    }
    closeMaterialModal();
    await loadProjectDetail();
  } catch (err) {
    materialFormErrorText.textContent = err.message;
    materialFormErrorBox.hidden = false;
  } finally {
    btnSubmitMaterial.disabled = false;
    btnSubmitMaterial.textContent = 'Lưu';
  }
});

// ----- Tab Thanh toan & Cong no (Dot 4, migration 025) -----
// Chi bat tab nay o Dot 4 (khong bat som hon Dot 3) - dung quyet dinh da chot: giua Dot 3 va 4,
// no da gan du an nhung tien thu thi chua, hien so se sai (xem docs/DECISIONS.md).

const MILESTONE_STATUS_LABELS = {
  chua_thu: 'Chưa thu',
  thu_mot_phan: 'Thu một phần',
  da_thu_du: 'Đã thu đủ',
  qua_han: 'Quá hạn',
};

const MILESTONE_STATUS_BADGE_CLASS = {
  chua_thu: 'badge-inactive',
  thu_mot_phan: 'badge-inactive',
  da_thu_du: 'badge-active',
  qua_han: 'badge-down',
};

function renderPaymentsStats(project) {
  const summary = project.debt_summary || { total_debt: 0, total_collected: 0, remaining: 0 };
  paymentsStatsEl.innerHTML = `
    <div class="stat-card">
      <p class="stat-card-label">Nợ phát sinh</p>
      <p class="stat-card-value">${formatMoney(summary.total_debt)} đ</p>
    </div>
    <div class="stat-card">
      <p class="stat-card-label">Đã thu</p>
      <p class="stat-card-value stat-card-value--primary">${formatMoney(summary.total_collected)} đ</p>
    </div>
    <div class="stat-card">
      <p class="stat-card-label">Còn phải thu</p>
      <p class="stat-card-value${summary.remaining > 0 ? ' stat-card-value--warning' : ''}">${formatMoney(summary.remaining)} đ</p>
    </div>
  `;
}

function renderMilestonesTable(milestones) {
  const hasRows = milestones.length > 0;
  milestonesEmpty.hidden = hasRows;
  milestonesTableWrap.hidden = !hasRows;
  if (!hasRows) {
    milestonesTbody.innerHTML = '';
    return;
  }

  milestonesTbody.innerHTML = milestones
    .map((m) => `
      <tr data-id="${m.id}">
        <td>${m.name}</td>
        <td>${formatMoney(m.amount)}${m.percent !== null && m.percent !== undefined ? ` <span style="color:var(--color-muted-foreground)">(${m.percent}%)</span>` : ''}</td>
        <td>${formatDateVN(m.due_date)}</td>
        <td>${formatMoney(m.collected_amount)}</td>
        <td>${formatMoney(m.remaining_amount)}</td>
        <td><span class="badge ${MILESTONE_STATUS_BADGE_CLASS[m.status]}">${MILESTONE_STATUS_LABELS[m.status]}</span></td>
        <td>
          <button type="button" class="icon-btn" data-action="print-milestone" data-id="${m.id}" title="In giấy đề nghị tạm ứng">${icon('printer', 14)}</button>
          <button type="button" class="icon-btn" data-action="collect-milestone" data-id="${m.id}" title="${m.status === 'da_thu_du' ? 'Đợt này đã thu đủ' : 'Ghi nhận đã thu'}" ${m.status === 'da_thu_du' ? 'disabled' : ''}>${icon('check', 14)}</button>
          <button type="button" class="icon-btn" data-action="edit-milestone" data-id="${m.id}" title="Sửa đợt thanh toán">${icon('pencil', 14)}</button>
          <button type="button" class="icon-btn icon-btn-danger" data-action="delete-milestone" data-id="${m.id}" title="Xóa đợt thanh toán">${icon('trash', 14)}</button>
        </td>
      </tr>
    `)
    .join('');
}

function renderPaymentsTab() {
  if (currentProject) renderPaymentsStats(currentProject);
  renderMilestonesTable(currentMilestones);
}

function openCreateMilestoneModal() {
  editingMilestoneId = null;
  milestoneModalTitle.textContent = 'Thêm đợt thanh toán';
  milestoneForm.reset();
  milestoneSortOrderInput.value = currentMilestones.length > 0 ? Math.max(...currentMilestones.map((m) => m.sort_order)) + 1 : 1;
  milestoneFormErrorBox.hidden = true;
  milestoneModal.hidden = false;
  milestoneNameInput.focus();
}

function openEditMilestoneModal(milestone) {
  editingMilestoneId = milestone.id;
  milestoneModalTitle.textContent = 'Sửa đợt thanh toán';
  milestoneNameInput.value = milestone.name;
  setMoneyValue(milestoneAmountInput, milestone.amount);
  milestonePercentInput.value = milestone.percent === null || milestone.percent === undefined ? '' : milestone.percent;
  milestoneSortOrderInput.value = milestone.sort_order;
  milestoneDueDateInput.value = milestone.due_date || '';
  milestoneNoteInput.value = milestone.note || '';
  milestoneRecipientNameInput.value = milestone.recipient_name || '';
  milestoneRecipientTitleSelect.value = milestone.recipient_title || '';
  milestoneFormErrorBox.hidden = true;
  milestoneModal.hidden = false;
  milestoneNameInput.focus();
}

function closeMilestoneModal() {
  milestoneModal.hidden = true;
}

btnAddMilestone.addEventListener('click', openCreateMilestoneModal);
btnCancelMilestone.addEventListener('click', closeMilestoneModal);
milestoneModal.addEventListener('click', (event) => {
  if (event.target === milestoneModal) closeMilestoneModal();
});

// Nut "Ghi nhan da thu" - dieu huong sang trang Cong no khach hang, mo san modal Ghi nhan thanh
// toan voi Khach hang/Du an/Dot thanh toan da chon san va khoa lai (dung PRD 4.12: "mo dung form
// thanh toan cong no khach hang dang dung, tu chon san du an dang xem va khoa lai khong cho doi").
// Giong pattern da dung o Bao hanh (dieu huong qua URL tu customer-detail.html).
function goToRecordPayment(milestoneId) {
  const url = new URL('customer-debts.html', window.location.href);
  url.searchParams.set('open_payment', '1');
  url.searchParams.set('partner_id', currentProject.partner_id);
  url.searchParams.set('project_id', projectId);
  if (milestoneId) url.searchParams.set('milestone_id', milestoneId);
  window.location.href = url.toString();
}

milestonesTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;

  if (action === 'collect-milestone') {
    goToRecordPayment(id);
    return;
  }

  if (action === 'print-milestone') {
    openPrintPreview(`print-project-advance.html?project_id=${projectId}&milestone_id=${id}`);
    return;
  }

  if (action === 'edit-milestone') {
    const milestone = currentMilestones.find((m) => String(m.id) === id);
    if (milestone) openEditMilestoneModal(milestone);
    return;
  }

  if (action === 'delete-milestone') {
    if (!confirm('Xóa đợt thanh toán này?')) return;
    button.disabled = true;
    try {
      await apiFetch(`/projects/${projectId}/milestones/${id}`, { method: 'DELETE' });
      await loadProjectDetail();
    } catch (err) {
      renderDetailError(err.message);
      button.disabled = false;
    }
  }
});

milestoneForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  milestoneFormErrorBox.hidden = true;
  btnSubmitMilestone.disabled = true;
  btnSubmitMilestone.textContent = 'Đang lưu...';

  const body = {
    name: milestoneNameInput.value.trim(),
    amount: getMoneyValue(milestoneAmountInput),
    percent: milestonePercentInput.value === '' ? null : Number(milestonePercentInput.value),
    sort_order: milestoneSortOrderInput.value === '' ? 0 : Number(milestoneSortOrderInput.value),
    due_date: milestoneDueDateInput.value || null,
    note: milestoneNoteInput.value.trim(),
    recipient_name: milestoneRecipientNameInput.value.trim(),
    recipient_title: milestoneRecipientTitleSelect.value,
  };

  try {
    if (editingMilestoneId === null) {
      await apiFetch(`/projects/${projectId}/milestones`, { method: 'POST', body: JSON.stringify(body) });
    } else {
      await apiFetch(`/projects/${projectId}/milestones/${editingMilestoneId}`, { method: 'PUT', body: JSON.stringify(body) });
    }
    closeMilestoneModal();
    await loadProjectDetail();
  } catch (err) {
    milestoneFormErrorText.textContent = err.message;
    milestoneFormErrorBox.hidden = false;
  } finally {
    btnSubmitMilestone.disabled = false;
    btnSubmitMilestone.textContent = 'Lưu';
  }
});

// ----- Tab Phat sinh (Dot 4, migration 025) -----

const VARIATION_TYPE_LABELS = { chi_phi: 'Chi phí', van_de: 'Vấn đề' };
const VARIATION_STATUS_LABELS = { cho_duyet: 'Chờ duyệt', da_duyet: 'Đã duyệt', tu_choi: 'Từ chối' };
const VARIATION_STATUS_BADGE_CLASS = { cho_duyet: 'badge-inactive', da_duyet: 'badge-active', tu_choi: 'badge-down' };

function renderVariationsTable(variations) {
  const hasRows = variations.length > 0;
  variationsEmpty.hidden = hasRows;
  variationsTableWrap.hidden = !hasRows;
  if (!hasRows) {
    variationsTbody.innerHTML = '';
    return;
  }

  variationsTbody.innerHTML = variations
    .map((v) => `
      <tr data-id="${v.id}">
        <td>${VARIATION_TYPE_LABELS[v.type]}</td>
        <td>${v.title}</td>
        <td>${v.type === 'chi_phi' ? `${formatMoney(v.amount)} đ` : '-'}</td>
        <td>${formatDateVN(v.occurred_date)}</td>
        <td><span class="badge ${VARIATION_STATUS_BADGE_CLASS[v.status]}">${VARIATION_STATUS_LABELS[v.status]}</span></td>
        <td>${v.created_by_name}</td>
        <td>
          <button type="button" class="icon-btn" data-action="edit-variation" data-id="${v.id}" title="Sửa phát sinh">${icon('pencil', 14)}</button>
          <button type="button" class="icon-btn icon-btn-danger" data-action="delete-variation" data-id="${v.id}" title="Xóa phát sinh">${icon('trash', 14)}</button>
        </td>
      </tr>
    `)
    .join('');
}

function renderVariationsTab() {
  renderVariationsTable(currentVariations);
}

function updateVariationAmountFieldVisibility() {
  const isChiPhi = variationTypeSelect.value === 'chi_phi';
  variationAmountField.hidden = !isChiPhi;
  variationAmountInput.required = isChiPhi;
}

variationTypeSelect.addEventListener('change', updateVariationAmountFieldVisibility);

function openCreateVariationModal() {
  editingVariationId = null;
  variationModalTitle.textContent = 'Thêm phát sinh';
  variationForm.reset();
  variationStatusSelect.value = 'cho_duyet';
  updateVariationAmountFieldVisibility();
  variationFormErrorBox.hidden = true;
  variationModal.hidden = false;
  variationTitleInput.focus();
}

function openEditVariationModal(variation) {
  editingVariationId = variation.id;
  variationModalTitle.textContent = 'Sửa phát sinh';
  variationTypeSelect.value = variation.type;
  variationStatusSelect.value = variation.status;
  variationTitleInput.value = variation.title;
  setMoneyValue(variationAmountInput, variation.amount);
  variationOccurredDateInput.value = variation.occurred_date || '';
  variationDescriptionInput.value = variation.description || '';
  variationResolutionInput.value = variation.resolution || '';
  updateVariationAmountFieldVisibility();
  variationFormErrorBox.hidden = true;
  variationModal.hidden = false;
  variationTitleInput.focus();
}

function closeVariationModal() {
  variationModal.hidden = true;
}

btnAddVariation.addEventListener('click', openCreateVariationModal);
btnCancelVariation.addEventListener('click', closeVariationModal);
variationModal.addEventListener('click', (event) => {
  if (event.target === variationModal) closeVariationModal();
});

variationsTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;

  if (action === 'edit-variation') {
    const variation = currentVariations.find((v) => String(v.id) === id);
    if (variation) openEditVariationModal(variation);
    return;
  }

  if (action === 'delete-variation') {
    if (!confirm('Xóa phát sinh này?')) return;
    button.disabled = true;
    try {
      await apiFetch(`/projects/${projectId}/variations/${id}`, { method: 'DELETE' });
      await loadProjectDetail();
    } catch (err) {
      renderDetailError(err.message);
      button.disabled = false;
    }
  }
});

variationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  variationFormErrorBox.hidden = true;
  btnSubmitVariation.disabled = true;
  btnSubmitVariation.textContent = 'Đang lưu...';

  const body = {
    type: variationTypeSelect.value,
    status: variationStatusSelect.value,
    title: variationTitleInput.value.trim(),
    amount: variationTypeSelect.value === 'chi_phi' ? getMoneyValue(variationAmountInput) : 0,
    occurred_date: variationOccurredDateInput.value || null,
    description: variationDescriptionInput.value.trim(),
    resolution: variationResolutionInput.value.trim(),
  };

  try {
    if (editingVariationId === null) {
      await apiFetch(`/projects/${projectId}/variations`, { method: 'POST', body: JSON.stringify(body) });
    } else {
      await apiFetch(`/projects/${projectId}/variations/${editingVariationId}`, { method: 'PUT', body: JSON.stringify(body) });
    }
    closeVariationModal();
    await loadProjectDetail();
  } catch (err) {
    variationFormErrorText.textContent = err.message;
    variationFormErrorBox.hidden = false;
  } finally {
    btnSubmitVariation.disabled = false;
    btnSubmitVariation.textContent = 'Lưu';
  }
});

// ----- Nap du lieu -----

async function loadProjectDetail() {
  try {
    const [{ project, members, phases }, { tasks }, { materials, documents }, { milestones }, { variations }] = await Promise.all([
      apiFetch(`/projects/${projectId}`),
      apiFetch(`/projects/${projectId}/tasks`),
      apiFetch(`/projects/${projectId}/materials`),
      apiFetch(`/projects/${projectId}/milestones`),
      apiFetch(`/projects/${projectId}/variations`),
    ]);
    currentProject = project;
    currentMembers = members;
    currentPhases = phases;
    currentTasks = tasks;
    currentMaterials = materials;
    currentDocuments = documents;
    currentMilestones = milestones;
    currentVariations = variations;

    renderOverview(project, members);
    renderPhasesTab();
    populateTaskSelects();
    renderMaterialsTab();
    renderPaymentsTab();
    renderVariationsTab();
  } catch (err) {
    renderDetailError(err.message);
  }
}

async function loadProducts() {
  const { products } = await apiFetch('/products');
  productsCache = products.filter((p) => p.is_active);
  populateMaterialProductSelect();
}

(async function init() {
  const currentUser = await initLayout('projects');
  if (!currentUser) return;

  document.getElementById('btn-back').innerHTML = icon('arrowLeft', 16);
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });
  // Bug phat hien 2026-08-04 (nguoi dung bao cao "nut them moi giai doan bi loi"): 2 nut nay
  // chi co class .btn-add (nen gradient) nhung chua bao gio duoc gan icon+chu qua JS nhu moi
  // nut .btn-add khac trong du an (vd customer-categories.js, projects.js) - hien thanh 1 khoi
  // mau rong khong chu, trong nhu bi hong du HTML/CSS/API deu dung.
  btnAddPhase.innerHTML = `${icon('plus', 16)} Thêm giai đoạn`;
  btnAddMaterial.innerHTML = `${icon('plus', 16)} Thêm dự toán`;
  btnAddMilestone.innerHTML = `${icon('plus', 16)} Thêm đợt thanh toán`;
  btnAddVariation.innerHTML = `${icon('plus', 16)} Thêm phát sinh`;

  if (!projectId) {
    renderDetailError('Thiếu id dự án trên đường dẫn');
    return;
  }

  await loadProducts();
  await loadProjectDetail();

  // Mo san 1 tab cu the qua URL (?tab=materials...) - dung cho link tu trang Bao cao (Dot 5,
  // cot "Vat tu vuot du toan") dieu huong thang vao dung tab thay vi luon mo "Tong quan".
  const requestedTab = new URLSearchParams(window.location.search).get('tab');
  if (requestedTab && tabPanels[requestedTab]) {
    const targetTabBtn = detailTabs.querySelector(`[data-tab="${requestedTab}"]`);
    if (targetTabBtn) targetTabBtn.click();
  }

  // Ve lai Gantt neu nguoi dung thay doi kich thuoc cua so (chart do lai theo be rong container).
  window.addEventListener('resize', () => {
    if (!tabPanels.phases.hidden) renderGanttChart(currentPhases);
  });
})();
