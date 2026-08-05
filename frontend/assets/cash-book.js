// Logic trang "So quy" (module doc lap voi Cong no, migration 019, xem docs/DECISIONS.md).
// Danh sach phieu thu/chi theo thang (mac dinh thang hien tai theo gio trinh duyet, khong luu
// localStorage nen tai lai trang la tu ve dung thang hien tai), thanh tong hop Quy dau ky/Tong
// thu/Tong chi/Ton quy, modal tao phieu (dung chung cho Thu va Chi), modal sua Quy dau ky.

let currentUser = null;
let categoriesCache = [];
let staffCache = [];
let vouchersCache = [];
let currentVoucherType = 'thu';

const monthSelect = document.getElementById('cash-month-select');
const yearSelect = document.getElementById('cash-year-select');
const statsEl = document.getElementById('cash-stats');
const tbody = document.getElementById('cash-tbody');
const errorBox = document.getElementById('cash-error');
const errorText = document.getElementById('cash-error-text');

const btnAddThu = document.getElementById('btn-add-thu');
const btnAddChi = document.getElementById('btn-add-chi');
const btnEditOpening = document.getElementById('btn-edit-opening');

const detailModal = document.getElementById('cash-detail-modal');
const detailInfoEl = document.getElementById('cash-detail-info');
const btnCloseDetail = document.getElementById('btn-close-cash-detail');

const voucherModal = document.getElementById('voucher-modal');
const voucherModalTitle = document.getElementById('voucher-modal-title');
const voucherForm = document.getElementById('voucher-form');
const voucherFormErrorBox = document.getElementById('voucher-form-error');
const voucherFormErrorText = document.getElementById('voucher-form-error-text');
const btnCancelVoucher = document.getElementById('btn-cancel-voucher');
const btnSubmitVoucher = document.getElementById('btn-submit-voucher');
const categorySelect = document.getElementById('voucher-category');
const categoryLabel = document.getElementById('voucher-category-label');
const dateInput = document.getElementById('voucher-date');
const handlerSelect = document.getElementById('voucher-handler');
const handlerLabel = document.getElementById('voucher-handler-label');
const counterpartInput = document.getElementById('voucher-counterpart');
const counterpartLabel = document.getElementById('voucher-counterpart-label');
const btnToggleNewCategory = document.getElementById('btn-toggle-new-category');
const newCategoryFields = document.getElementById('new-category-fields');
const newCategoryLabel = document.getElementById('new-category-label');
const newCategoryNameInput = document.getElementById('new-category-name');
const amountInput = document.getElementById('voucher-amount');
const noteInput = document.getElementById('voucher-note');
const businessToggle = document.getElementById('voucher-business-toggle');

const openingModal = document.getElementById('opening-modal');
const openingForm = document.getElementById('opening-form');
const openingFormErrorBox = document.getElementById('opening-form-error');
const openingFormErrorText = document.getElementById('opening-form-error-text');
const btnCancelOpening = document.getElementById('btn-cancel-opening');
const btnSubmitOpening = document.getElementById('btn-submit-opening');
const openingInput = document.getElementById('opening-balance');

function formatMoney(value) {
  return Number(value).toLocaleString('vi-VN');
}

function formatDateTime(sqliteDateTime) {
  const iso = sqliteDateTime.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 'YYYY-MM-DDTHH:MM' theo gio dia phuong trinh duyet - dung y het stock-receipts.js.
function nowForDatetimeLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toSqliteDatetime(localValue) {
  const d = new Date(localValue);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// <input type="month"> hien thi theo locale trinh duyet (vd "August 2026"), khong ep duoc tieng
// Viet - thay bang 2 <select> "Thang"/"Nam" tu viet nhan, ghep lai thanh 'YYYY-MM' khi goi API.
function populateMonthYearSelects() {
  monthSelect.innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">Tháng ${i + 1}</option>`).join('');

  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 2; y <= currentYear + 1; y++) years.push(y);
  yearSelect.innerHTML = years.map((y) => `<option value="${y}">Năm ${y}</option>`).join('');
}

// Mac dinh ve dung thang/nam hien tai theo gio trinh duyet moi lan tai trang (khong luu
// localStorage) - thoa dung yeu cau "thang moi tu lam moi", khong can code rieng xu ly.
function setSelectsToCurrentMonth() {
  const d = new Date();
  monthSelect.value = String(d.getMonth() + 1);
  yearSelect.value = String(d.getFullYear());
}

function selectedMonthStr() {
  return `${yearSelect.value}-${String(monthSelect.value).padStart(2, '0')}`;
}

function renderError(message) {
  errorText.textContent = message;
  errorBox.hidden = false;
}

function statCard(label, value, colorModifier) {
  return `
    <div class="stat-card">
      <p class="stat-card-label">${label}</p>
      <p class="stat-card-value${colorModifier ? ` stat-card-value--${colorModifier}` : ''}">${value}</p>
    </div>
  `;
}

// Mau theo yeu cau nguoi dung 2026-08-02: Quy dau ky xanh duong, Tong thu xanh la, Tong chi do
// (kem dau "-" truoc so de the hien giam), Ton quy mau mac dinh (khong to mau) - am se tu nhien
// co dau "-" qua toLocaleString(), khong can them logic rieng. Cong thuc: Ton quy = Quy dau ky +
// Tong thu - Tong chi (tinh o backend, xem cashVoucher.service.js#getCashBookSummary).
function renderStats(summary) {
  statsEl.innerHTML = [
    statCard('Quỹ đầu kỳ', formatMoney(summary.opening_balance), 'primary'),
    statCard('Tổng thu', formatMoney(summary.total_in), 'accent'),
    statCard('Tổng chi', `-${formatMoney(summary.total_out)}`, 'destructive'),
    statCard('Tồn quỹ', formatMoney(summary.closing_balance)),
  ].join('');
}

function renderRow(voucher) {
  const typeBadgeClass = voucher.type === 'thu' ? 'badge-active' : 'badge-down';
  const amountClass = voucher.type === 'thu' ? 'text-accent' : 'text-destructive';
  const amountSign = voucher.type === 'thu' ? '+' : '-';

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><button type="button" class="table-link-btn" data-action="view" data-id="${voucher.id}">${voucher.code}</button></td>
    <td>${formatDateTime(voucher.created_at)}</td>
    <td><span class="badge ${typeBadgeClass}">${voucher.category_name}</span></td>
    <td>${voucher.counterpart_name || '-'}</td>
    <td><span class="${amountClass}">${amountSign}${formatMoney(voucher.amount)}</span></td>
    <td><button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${voucher.id}" title="Xóa phiếu">${icon('trash', 14)}</button></td>
  `;
  return tr;
}

function renderVouchers() {
  tbody.innerHTML = '';
  vouchersCache.forEach((v) => tbody.appendChild(renderRow(v)));
}

async function loadCashBook() {
  try {
    const { vouchers, summary } = await apiFetch(`/cash-vouchers?month=${selectedMonthStr()}`);
    vouchersCache = vouchers;
    renderVouchers();
    renderStats(summary);
  } catch (err) {
    renderError(err.message);
  }
}

async function loadCategories() {
  const { categories } = await apiFetch('/cash-categories');
  categoriesCache = categories;
}

async function loadStaff() {
  const { staff } = await apiFetch('/cash-vouchers/staff');
  staffCache = staff;
}

monthSelect.addEventListener('change', loadCashBook);
yearSelect.addEventListener('change', loadCashBook);

// ----- Modal xem chi tiet (chi doc) -----

function detailInfoItem(label, value, fullWidth) {
  return `<div class="detail-info-item${fullWidth ? ' full-width' : ''}"><p class="detail-label">${label}</p><p class="detail-value">${value}</p></div>`;
}

function openDetailModal(voucher) {
  detailInfoEl.innerHTML = [
    detailInfoItem('Mã phiếu', voucher.code),
    detailInfoItem('Loại phiếu', voucher.type === 'thu' ? 'Phiếu thu' : 'Phiếu chi'),
    detailInfoItem('Loại thu chi', voucher.category_name),
    detailInfoItem('Thời gian', formatDateTime(voucher.created_at)),
    detailInfoItem(voucher.type === 'thu' ? 'Người nộp' : 'Người nhận', voucher.counterpart_name || '-'),
    detailInfoItem(voucher.type === 'thu' ? 'Người thu' : 'Người chi', voucher.handled_by_name || '-'),
    detailInfoItem('Số tiền', formatMoney(voucher.amount)),
    detailInfoItem('Hạch toán KQKD', voucher.record_business_result ? 'Có' : 'Không'),
    detailInfoItem('Người tạo', voucher.created_by_name),
    detailInfoItem('Ghi chú', voucher.note || '-', true),
  ].join('');
  detailModal.hidden = false;
}

btnCloseDetail.addEventListener('click', () => { detailModal.hidden = true; });
detailModal.addEventListener('click', (event) => {
  if (event.target === detailModal) detailModal.hidden = true;
});

tbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;

  if (action === 'view') {
    const voucher = vouchersCache.find((v) => String(v.id) === id);
    if (voucher) openDetailModal(voucher);
    return;
  }

  if (action === 'delete') {
    if (!confirm('Xóa phiếu này? Không thể hoàn tác.')) return;
    button.disabled = true;
    try {
      await apiFetch(`/cash-vouchers/${id}`, { method: 'DELETE' });
      await loadCashBook();
    } catch (err) {
      renderError(err.message);
      button.disabled = false;
    }
  }
});

// ----- Modal tao phieu thu/chi (dung chung, doi nhan theo currentVoucherType) -----

function renderCategoryOptions(type) {
  const options = categoriesCache.filter((c) => c.type === type);
  categorySelect.innerHTML = options.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
}

function renderStaffOptions() {
  handlerSelect.innerHTML = '<option value="">-- Không chọn --</option>' +
    staffCache.map((s) => `<option value="${s.id}">${s.full_name}</option>`).join('');
}

// Tao nhanh "Loai thu chi" ngay tren modal lap phieu (theo yeu cau nguoi dung 2026-08-02) - khong
// bat nguoi dung phai roi sang trang "Loai thu chi" rieng chi de tao 1 loai con thieu. Toggle
// bang nut (khac sentinel "__new__" trong select cua stock-receipts.js) vi chi can 1 truong ten,
// khong can khoi nhieu truong nhu "them nhanh doi tac".
let creatingNewCategory = false;

function toggleNewCategoryFields(show) {
  creatingNewCategory = show;
  newCategoryFields.hidden = !show;
  categorySelect.disabled = show;
  btnToggleNewCategory.textContent = show ? 'Hủy tạo loại mới' : '+ Tạo loại mới';
  if (show) {
    newCategoryNameInput.value = '';
    newCategoryNameInput.focus();
  }
}

btnToggleNewCategory.addEventListener('click', () => toggleNewCategoryFields(!creatingNewCategory));

function openVoucherModal(type) {
  currentVoucherType = type;
  const isThu = type === 'thu';
  voucherModalTitle.textContent = isThu ? 'Tạo phiếu thu' : 'Tạo phiếu chi';
  categoryLabel.textContent = isThu ? 'Loại thu' : 'Loại chi';
  newCategoryLabel.textContent = isThu ? 'Tên loại thu mới' : 'Tên loại chi mới';
  handlerLabel.textContent = isThu ? 'Người thu' : 'Người chi';
  counterpartLabel.textContent = isThu ? 'Tên người nộp' : 'Tên người nhận';

  voucherForm.reset();
  voucherFormErrorBox.hidden = true;
  renderCategoryOptions(type);
  renderStaffOptions();
  toggleNewCategoryFields(false);
  dateInput.value = nowForDatetimeLocal();
  if (currentUser) handlerSelect.value = String(currentUser.id);
  businessToggle.checked = true;
  voucherModal.hidden = false;
}

btnAddThu.addEventListener('click', () => openVoucherModal('thu'));
btnAddChi.addEventListener('click', () => openVoucherModal('chi'));
btnCancelVoucher.addEventListener('click', () => { voucherModal.hidden = true; });
voucherModal.addEventListener('click', (event) => {
  if (event.target === voucherModal) voucherModal.hidden = true;
});

voucherForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  voucherFormErrorBox.hidden = true;

  if (!creatingNewCategory && !categorySelect.value) {
    voucherFormErrorText.textContent = 'Vui lòng chọn loại thu/chi, hoặc bấm "+ Tạo loại mới"';
    voucherFormErrorBox.hidden = false;
    return;
  }
  if (creatingNewCategory && !newCategoryNameInput.value.trim()) {
    voucherFormErrorText.textContent = 'Vui lòng nhập tên loại thu/chi mới';
    voucherFormErrorBox.hidden = false;
    return;
  }

  btnSubmitVoucher.disabled = true;
  btnSubmitVoucher.textContent = 'Đang lưu...';

  try {
    let categoryId;
    if (creatingNewCategory) {
      const { category } = await apiFetch('/cash-categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategoryNameInput.value.trim(), type: currentVoucherType }),
      });
      categoriesCache.push(category);
      categoryId = category.id;
    } else {
      categoryId = Number(categorySelect.value);
    }

    const body = {
      type: currentVoucherType,
      category_id: categoryId,
      handled_by: handlerSelect.value ? Number(handlerSelect.value) : null,
      counterpart_name: counterpartInput.value.trim(),
      amount: getMoneyValue(amountInput),
      note: noteInput.value.trim(),
      record_business_result: businessToggle.checked,
      voucher_date: dateInput.value ? toSqliteDatetime(dateInput.value) : null,
    };
    await apiFetch('/cash-vouchers', { method: 'POST', body: JSON.stringify(body) });
    voucherModal.hidden = true;
    await loadCashBook();
  } catch (err) {
    voucherFormErrorText.textContent = err.message;
    voucherFormErrorBox.hidden = false;
  } finally {
    btnSubmitVoucher.disabled = false;
    btnSubmitVoucher.textContent = 'Lưu';
  }
});

// ----- Modal sua Quy dau ky -----

btnEditOpening.addEventListener('click', async () => {
  openingFormErrorBox.hidden = true;
  openingModal.hidden = false;
  try {
    const { settings } = await apiFetch('/cash-book-settings');
    setMoneyValue(openingInput, settings.opening_balance);
  } catch (err) {
    openingFormErrorText.textContent = err.message;
    openingFormErrorBox.hidden = false;
  }
});

btnCancelOpening.addEventListener('click', () => { openingModal.hidden = true; });
openingModal.addEventListener('click', (event) => {
  if (event.target === openingModal) openingModal.hidden = true;
});

openingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  openingFormErrorBox.hidden = true;
  btnSubmitOpening.disabled = true;
  btnSubmitOpening.textContent = 'Đang lưu...';

  try {
    await apiFetch('/cash-book-settings', {
      method: 'PUT',
      body: JSON.stringify({ opening_balance: getMoneyValue(openingInput) }),
    });
    openingModal.hidden = true;
    await loadCashBook();
  } catch (err) {
    openingFormErrorText.textContent = err.message;
    openingFormErrorBox.hidden = false;
  } finally {
    btnSubmitOpening.disabled = false;
    btnSubmitOpening.textContent = 'Lưu';
  }
});

(async function init() {
  currentUser = await initLayout('cash-book');
  if (!currentUser) return;

  btnAddThu.innerHTML = `${icon('arrowDownTray', 16)} Tạo phiếu thu`;
  btnAddChi.innerHTML = `${icon('arrowUpTray', 16)} Tạo phiếu chi`;
  btnEditOpening.innerHTML = `${icon('wallet', 16)} Quỹ đầu kỳ`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  populateMonthYearSelects();
  setSelectsToCurrentMonth();

  await Promise.all([loadCategories(), loadStaff()]);
  await loadCashBook();
})();
