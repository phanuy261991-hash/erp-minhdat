// Logic trang phieu xuat kho: danh sach phieu da lap + modal lap phieu moi.
// Giong het pattern stock-receipts.js (combobox tim san pham, doi tac dropdown + them nhanh,
// chiet khau tung dong - migration 013, thoi gian xuat tuy chinh), khac o cho co them toggle
// payment_status ("Chua thu tien ngay" - xem docs/DECISIONS.md muc "Cong no phat sinh tu phieu
// xuat") va khong co ma don hang (stock_issues khong co cot nay, khac stock_receipts).
//
// Quy trinh 2 buoc (2026-08-20, theo yeu cau nguoi dung - dung nguyen pattern stock-returns.js):
// nut "Luu tam" chi ghi thong tin (POST/PUT khong xu ly), nut "Xuat kho" moi thuc su tru kho +
// ghi cong no/so quy (tao moi: POST voi is_draft:false; phieu da luu: PUT luu lai sua doi truoc
// roi goi POST /:id/process). Phieu 'cho_tru_kho' con sua duoc, phieu 'da_tru_kho' khoa vinh vien.

let currentUser = null;
let productsCache = [];
let partnersCache = [];
let projectsCache = [];
let rowCounter = 0;
let editingIssueId = null; // null = tao moi

const issuesTbody = document.getElementById('issues-tbody');
const issuesErrorBox = document.getElementById('issues-error');
const issuesErrorText = document.getElementById('issues-error-text');

const btnAddIssue = document.getElementById('btn-add-issue');
const issueModal = document.getElementById('issue-modal');
const issueModalTitle = document.getElementById('issue-modal-title');
const issueForm = document.getElementById('issue-form');
const issueFormErrorBox = document.getElementById('issue-form-error');
const issueFormErrorText = document.getElementById('issue-form-error-text');
const btnCancelIssue = document.getElementById('btn-cancel-issue');
const btnSaveDraftIssue = document.getElementById('btn-save-draft-issue');
const btnSubmitIssue = document.getElementById('btn-submit-issue');

const partnerSelect = document.getElementById('issue-partner');
const projectSelect = document.getElementById('issue-project');
const newPartnerFields = document.getElementById('new-partner-fields');
const newPartnerNameInput = document.getElementById('new-partner-name');
const newPartnerPhoneInput = document.getElementById('new-partner-phone');
const newPartnerAddressInput = document.getElementById('new-partner-address');
const existingCustomerInfoRow = document.getElementById('existing-customer-info-row');
const customerPhoneDisplay = document.getElementById('issue-customer-phone');
const customerAddressDisplay = document.getElementById('issue-customer-address');
const noteInput = document.getElementById('issue-note');
const issueDateInput = document.getElementById('issue-date');
const paymentToggle = document.getElementById('issue-payment-toggle');
const itemRowsContainer = document.getElementById('item-rows');
const btnAddItemRow = document.getElementById('btn-add-item-row');
const totalAmountEl = document.getElementById('issue-total-amount');

// 'YYYY-MM-DDTHH:MM' theo gio dia phuong trinh duyet - dung de dien san gio hien tai vao o
// chon thoi gian xuat khi mo modal (giong het pattern o stock-receipts.js).
function nowForDatetimeLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Quy doi gia tri <input type="datetime-local"> (gio dia phuong) sang 'YYYY-MM-DD HH:MM:SS' UTC.
function toSqliteDatetime(localValue) {
  const d = new Date(localValue);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// Chieu nguoc lai toSqliteDatetime() - dung khi mo Sua phieu nhap de dien lai dung gio dia phuong
// da luu tren phieu (khong phai gio hien tai) vao o chon thoi gian xuat.
function toDatetimeLocalValue(sqliteDateTime) {
  const iso = sqliteDateTime.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatMoney(value) {
  return Number(value).toLocaleString('vi-VN');
}

function formatDate(sqliteDateTime) {
  const iso = sqliteDateTime.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderIssuesError(message) {
  issuesErrorText.textContent = message;
  issuesErrorBox.hidden = false;
}

let currentIssues = [];

function renderIssueRow(issue) {
  const paymentBadge = issue.payment_status === 'cong_no'
    ? '<span class="badge badge-inactive">Công nợ</span>'
    : '<span class="badge badge-active">Đã thu tiền</span>';

  const isDraft = issue.status === 'cho_tru_kho';
  const statusBadge = isDraft
    ? '<span class="badge badge-inactive">Nháp</span>'
    : '<span class="badge badge-active">Đã xuất kho</span>';

  const noteHtml = issue.adjusts_code
    ? `<span class="badge badge-inactive" title="Điều chỉnh cho phiếu ${issue.adjusts_code}">Điều chỉnh ${issue.adjusts_code}</span> ${issue.note || ''}`
    : (issue.note || '-');

  // Phieu 'cho_tru_kho' (nhap): cho sua + xuat kho nhanh tren danh sach + in "Phieu xac nhan don
  // hang" de xem/chot truoc; phieu 'da_tru_kho' da khoa, chi con Xem chi tiet + In phieu (mau
  // stock_issue) - dung dung pattern stock-returns.js.
  const actions = isDraft
    ? `
      <button type="button" class="icon-btn" data-action="edit" data-id="${issue.id}" title="Sửa phiếu">${icon('pencil', 14)}</button>
      <button type="button" class="icon-btn" data-action="process" data-id="${issue.id}" title="Xuất kho">${icon('check', 14)}</button>
      <button type="button" class="icon-btn" data-action="print-confirmation" data-id="${issue.id}" title="In phiếu xác nhận đơn hàng">${icon('printer', 14)}</button>
      <button type="button" class="icon-btn" data-action="view" data-id="${issue.id}" title="Xem chi tiết">${icon('eye', 14)}</button>
    `
    : `
      <button type="button" class="icon-btn" data-action="view" data-id="${issue.id}" title="Xem chi tiết">${icon('eye', 14)}</button>
      <button type="button" class="icon-btn" data-action="print" data-id="${issue.id}" title="In phiếu">${icon('printer', 14)}</button>
    `;

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${issue.code}</td>
    <td>${issue.partner_name || '-'}</td>
    <td>${issue.created_by_name}</td>
    <td>${paymentBadge}</td>
    <td>${statusBadge}</td>
    <td class="note-cell-truncate">${noteHtml}</td>
    <td>${formatDate(issue.created_at)}</td>
    <td>${actions}</td>
  `;
  // title gan qua DOM property (khong noi chuoi vao HTML) de tranh loi escape neu ghi chu co
  // dau nhay/ky tu dac biet - hien du noi dung khi re chuot vao o da bi cat bot bang CSS.
  if (issue.note) {
    tr.querySelector('.note-cell-truncate').title = issue.note;
  }
  return tr;
}

async function loadIssues() {
  try {
    const { issues } = await apiFetch('/stock-issues');
    currentIssues = issues;
    issuesTbody.innerHTML = '';
    issues.forEach((i) => issuesTbody.appendChild(renderIssueRow(i)));
  } catch (err) {
    renderIssuesError(err.message);
  }
}

issuesTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;

  if (action === 'view') {
    openIssueDetailModal(id);
    return;
  }
  if (action === 'print') {
    openPrintPreview(`print-issue.html?id=${id}`);
    return;
  }
  if (action === 'print-confirmation') {
    openPrintPreview(`print-order-confirmation.html?id=${id}`);
    return;
  }
  if (action === 'edit') {
    const issue = currentIssues.find((i) => String(i.id) === id);
    if (issue) await openEditModal(issue);
    return;
  }
  if (action === 'process') {
    if (!confirm('Xác nhận xuất kho cho phiếu này? Sau khi xuất kho sẽ không sửa được nữa.')) return;
    button.disabled = true;
    issuesErrorBox.hidden = true;
    try {
      await apiFetch(`/stock-issues/${id}/process`, { method: 'POST' });
      await loadIssues();
    } catch (err) {
      renderIssuesError(err.message);
      button.disabled = false;
    }
  }
});

async function loadProducts() {
  const { products } = await apiFetch('/products');
  productsCache = products.filter((p) => p.is_active);
}

async function loadPartners() {
  const { partners } = await apiFetch('/partners?type=khach_hang');
  partnersCache = partners;
}

function renderPartnerOptions() {
  const options = partnersCache.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  partnerSelect.innerHTML = `<option value="">-- Không chọn --</option>${options}<option value="__new__">+ Thêm khách hàng mới</option>`;
}

// Du an (khong bat buoc, migration 024, Dot 3 module "Quan ly du an") - giong het pattern
// stock-receipts.js, loai bo du an da 'huy' khoi danh sach chon.
async function loadProjects() {
  const { projects } = await apiFetch('/projects');
  projectsCache = projects.filter((p) => p.status !== 'huy');
}

function renderProjectOptions() {
  const options = projectsCache.map((p) => `<option value="${p.id}">${p.code} - ${p.name}</option>`).join('');
  projectSelect.innerHTML = `<option value="">-- Không gắn dự án --</option>${options}`;
}

// Chon khach hang co san -> dien thong tin lien he ra 2 o chi-doc de nguoi lap phieu tien
// tham khao (vd giao hang), khong phai truong nhap - xem yeu cau nguoi dung 2026-07-31.
// An hang nay khi dang them khach hang MOI (thay bang o nhap that trong new-partner-fields) -
// truoc day ca 2 cung hien cung luc, o dia chi chi-doc trong nhom "Khach hang moi" bi nham la
// truong nhap khong go duoc (xem phan hoi nguoi dung 2026-08-01).
function updateCustomerInfoDisplay() {
  const partnerId = partnerSelect.value;
  const partner = partnersCache.find((p) => String(p.id) === partnerId);
  customerPhoneDisplay.value = partner && partner.phone ? partner.phone : '';
  customerAddressDisplay.value = partner && partner.address ? partner.address : '';
}

partnerSelect.addEventListener('change', () => {
  const isNew = partnerSelect.value === '__new__';
  newPartnerFields.hidden = !isNew;
  existingCustomerInfoRow.hidden = isNew;
  updateCustomerInfoDisplay();
});

// ----- Dong san pham dong (combobox tim theo ma/ten) -----

function createItemRow() {
  rowCounter += 1;
  const row = document.createElement('div');
  row.className = 'item-row';
  row.dataset.rowId = String(rowCounter);
  row.innerHTML = `
    <div class="combobox">
      <input type="text" class="item-product-search" placeholder="Tìm theo mã hoặc tên..." autocomplete="off" />
      <input type="hidden" class="item-product-id" />
      <div class="combobox-suggestions"></div>
    </div>
    <div class="item-unit-display"></div>
    <input type="number" class="item-quantity" min="0" step="1" placeholder="SL" />
    <input type="text" class="item-unit-price money-input" placeholder="Đơn giá" />
    <input type="number" class="item-discount" min="0" max="100" step="1" placeholder="0" />
    <div class="item-net-price">0</div>
    <div class="item-line-total">0</div>
    <button type="button" class="icon-btn icon-btn-danger item-row-remove" title="Xóa dòng">${icon('trash', 14)}</button>
  `;
  bindMoneyInputs(row);
  return row;
}

function addItemRow() {
  itemRowsContainer.appendChild(createItemRow());
}

function removeItemRow(row) {
  if (itemRowsContainer.children.length > 1) {
    row.remove();
    updateTotalAmount();
  }
}

// Don gia sau chiet khau (net) - hien thi tham khao truoc cot Thanh tien, Thanh tien = don gia
// sau CK * so luong (xem yeu cau nguoi dung 2026-08-01). unit_price luu trong DB van la gia GOC
// (truoc chiet khau, xem stock_issue_items.discount_percent) - khong doi cach luu, chi them 1
// o hien thi tinh toan o tang frontend.
function rowNetUnitPrice(row) {
  const unitPrice = getMoneyValue(row.querySelector('.item-unit-price'));
  const discountPercent = Number(row.querySelector('.item-discount').value) || 0;
  return unitPrice * (1 - discountPercent / 100);
}

function rowLineTotal(row) {
  const quantity = Number(row.querySelector('.item-quantity').value) || 0;
  return quantity * rowNetUnitPrice(row);
}

function updateTotalAmount() {
  const rows = Array.from(itemRowsContainer.querySelectorAll('.item-row'));
  let total = 0;

  rows.forEach((row) => {
    row.querySelector('.item-net-price').textContent = formatMoney(Math.round(rowNetUnitPrice(row)));
    const lineTotal = rowLineTotal(row);
    row.querySelector('.item-line-total').textContent = formatMoney(Math.round(lineTotal));
    total += lineTotal;
  });

  totalAmountEl.textContent = formatMoney(Math.round(total));
}

function renderSuggestions(row, keyword) {
  const box = row.querySelector('.combobox-suggestions');
  const kw = keyword.trim().toLowerCase();

  if (!kw) {
    box.innerHTML = '';
    return;
  }

  const matches = productsCache
    .filter((p) => p.code.toLowerCase().includes(kw) || p.name.toLowerCase().includes(kw))
    .slice(0, 8);

  if (matches.length === 0) {
    box.innerHTML = '<div class="combobox-empty">Không tìm thấy sản phẩm</div>';
    return;
  }

  box.innerHTML = matches
    .map(
      (p) => `
        <div class="combobox-option" data-product-id="${p.id}" data-product-label="${p.code} - ${p.name}">
          ${p.code} - ${p.name} <span class="combobox-option-unit">(${p.unit})</span>
        </div>
      `
    )
    .join('');
}

// Tu dien Don gia theo gia ban cua san pham (theo yeu cau nguoi dung 2026-08-05) - van cho sua
// tay sau do (vd thuong luong gia khac tung giao dich), chi la gia tri goi y ban dau. CHI ap
// dung cho phieu XUAT (gia ban co dinh theo san pham) - phieu NHAP van de trong nhu cu, vi gia
// mua tu NCC thuong thay doi moi lan nhap hang, khong giong gia ban.
function selectProduct(row, productId, label) {
  row.querySelector('.item-product-id').value = productId;
  row.querySelector('.item-product-search').value = label;
  row.querySelector('.combobox-suggestions').innerHTML = '';

  const product = productsCache.find((p) => String(p.id) === String(productId));
  row.querySelector('.item-unit-display').textContent = product ? product.unit : '';
  setMoneyValue(row.querySelector('.item-unit-price'), product ? product.sale_price : '');
  updateTotalAmount();
}

// Dien lai 1 dong san pham co san (mo Sua phieu nhap) - khac selectProduct() o cho khong ghi de
// don gia bang gia ban mac dinh cua san pham, giu dung don gia/chiet khau da luu tren phieu.
function populateItemRow(row, item) {
  row.querySelector('.item-product-id').value = item.product_id;
  row.querySelector('.item-product-search').value = `${item.product_code} - ${item.product_name}`;
  row.querySelector('.item-unit-display').textContent = item.unit;
  row.querySelector('.item-quantity').value = item.quantity;
  setMoneyValue(row.querySelector('.item-unit-price'), item.unit_price);
  row.querySelector('.item-discount').value = item.discount_percent || 0;
}

itemRowsContainer.addEventListener('input', (event) => {
  if (event.target.classList.contains('item-product-search')) {
    const row = event.target.closest('.item-row');
    row.querySelector('.item-product-id').value = '';
    renderSuggestions(row, event.target.value);
    return;
  }

  if (
    event.target.classList.contains('item-quantity') ||
    event.target.classList.contains('item-unit-price') ||
    event.target.classList.contains('item-discount')
  ) {
    updateTotalAmount();
  }
});

itemRowsContainer.addEventListener('click', (event) => {
  const option = event.target.closest('.combobox-option');
  if (option) {
    const row = option.closest('.item-row');
    selectProduct(row, option.dataset.productId, option.dataset.productLabel);
    return;
  }

  const removeBtn = event.target.closest('.item-row-remove');
  if (removeBtn) {
    removeItemRow(removeBtn.closest('.item-row'));
  }
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.combobox')) {
    document.querySelectorAll('.combobox-suggestions').forEach((box) => {
      box.innerHTML = '';
    });
  }
});

btnAddItemRow.addEventListener('click', addItemRow);

// ----- Mo/dong modal -----

function resetIssueForm() {
  issueForm.reset();
  newPartnerFields.hidden = true;
  existingCustomerInfoRow.hidden = false;
  issueDateInput.value = nowForDatetimeLocal();
  updateCustomerInfoDisplay();
  itemRowsContainer.innerHTML = '';
  addItemRow();
  updateTotalAmount();
  resetAdjustmentField();
}

function openCreateModal() {
  editingIssueId = null;
  issueModalTitle.textContent = 'Lập phiếu xuất kho';
  resetIssueForm();
  issueFormErrorBox.hidden = true;
  issueModal.hidden = false;
}

// Sua 1 phieu dang 'cho_tru_kho' (nhap) - nap lai TOAN BO du lieu (goi GET /:id de co du items,
// khac ban tom tat currentIssues khong co items) vao dung form Them/Sua dung chung.
async function openEditModal(issueSummary) {
  issuesErrorBox.hidden = true;
  try {
    const { issue } = await apiFetch(`/stock-issues/${issueSummary.id}`);

    editingIssueId = issue.id;
    issueModalTitle.textContent = 'Sửa phiếu xuất kho (nháp)';
    issueForm.reset();
    resetAdjustmentField();

    partnerSelect.value = issue.partner_id ? String(issue.partner_id) : '';
    newPartnerFields.hidden = true;
    existingCustomerInfoRow.hidden = false;
    updateCustomerInfoDisplay();

    projectSelect.value = issue.project_id ? String(issue.project_id) : '';
    noteInput.value = issue.note || '';
    issueDateInput.value = toDatetimeLocalValue(issue.created_at);
    paymentToggle.checked = issue.payment_status === 'cong_no';

    itemRowsContainer.innerHTML = '';
    issue.items.forEach((item) => {
      const row = createItemRow();
      itemRowsContainer.appendChild(row);
      populateItemRow(row, item);
    });
    updateTotalAmount();

    issueFormErrorBox.hidden = true;
    issueModal.hidden = false;
  } catch (err) {
    renderIssuesError(err.message);
  }
}

function closeIssueModal() {
  issueModal.hidden = true;
}

btnAddIssue.addEventListener('click', openCreateModal);
btnCancelIssue.addEventListener('click', closeIssueModal);

issueModal.addEventListener('click', (event) => {
  if (event.target === issueModal) closeIssueModal();
});

// ----- Nop phieu -----

function collectItems() {
  const rows = Array.from(itemRowsContainer.querySelectorAll('.item-row'));
  const items = [];

  for (const row of rows) {
    const productId = row.querySelector('.item-product-id').value;
    const quantity = row.querySelector('.item-quantity').value;
    const unitPriceInput = row.querySelector('.item-unit-price');
    const unitPriceRaw = unitPriceInput.value;
    const discountPercent = row.querySelector('.item-discount').value;

    if (!productId && !quantity && unitPriceRaw === '' && discountPercent === '') continue;

    if (!productId || !quantity || unitPriceRaw === '') {
      return { error: 'Mỗi dòng sản phẩm phải chọn sản phẩm, nhập số lượng và đơn giá' };
    }

    items.push({
      product_id: Number(productId),
      quantity: Number(quantity),
      unit_price: getMoneyValue(unitPriceInput),
      discount_percent: discountPercent === '' ? 0 : Number(discountPercent),
    });
  }

  if (items.length === 0) {
    return { error: 'Phiếu xuất phải có ít nhất 1 dòng sản phẩm' };
  }

  return { items };
}

// Doi tac dang chon co the la "__new__" (them nhanh khach hang moi ngay tren form) - tach rieng
// vi ca 2 nut Luu tam/Xuat kho deu can goi lai y het logic nay.
async function resolvePartnerId() {
  let partnerId = partnerSelect.value || null;

  if (partnerId === '__new__') {
    const name = newPartnerNameInput.value.trim();
    if (!name) {
      throw new Error('Thiếu tên khách hàng mới');
    }
    const { partner } = await apiFetch('/partners', {
      method: 'POST',
      body: JSON.stringify({
        type: 'khach_hang',
        name,
        phone: newPartnerPhoneInput.value.trim(),
        address: newPartnerAddressInput.value.trim(),
      }),
    });
    partnerId = partner.id;
  }

  return partnerId;
}

function buildIssueBody(partnerId, items) {
  return {
    partner_id: partnerId || null,
    note: noteInput.value.trim(),
    payment_status: paymentToggle.checked ? 'cong_no' : 'da_thu_tien',
    issue_date: issueDateInput.value ? toSqliteDatetime(issueDateInput.value) : null,
    project_id: projectSelect.value || null,
    items,
    ...getAdjustmentPayload(),
  };
}

async function afterIssueSaveSuccess() {
  closeIssueModal();
  await Promise.all([loadIssues(), loadPartners()]);
  renderPartnerOptions();
}

// Nut "Luu tam" (type="button", khong submit form) - chi ghi lai thong tin da nhap (tao moi hoac
// cap nhat phieu dang cho_tru_kho), CHUA xuat kho/ghi cong no/so quy (xem stockIssue.service.js).
btnSaveDraftIssue.addEventListener('click', async () => {
  issueFormErrorBox.hidden = true;
  const { items, error } = collectItems();
  if (error) {
    issueFormErrorText.textContent = error;
    issueFormErrorBox.hidden = false;
    return;
  }

  btnSaveDraftIssue.disabled = true;
  btnSubmitIssue.disabled = true;
  btnSaveDraftIssue.textContent = 'Đang lưu...';

  try {
    const partnerId = await resolvePartnerId();
    const body = buildIssueBody(partnerId, items);

    if (editingIssueId) {
      await apiFetch(`/stock-issues/${editingIssueId}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await apiFetch('/stock-issues', { method: 'POST', body: JSON.stringify({ ...body, is_draft: true }) });
    }

    await afterIssueSaveSuccess();
  } catch (err) {
    issueFormErrorText.textContent = err.message;
    issueFormErrorBox.hidden = false;
  } finally {
    btnSaveDraftIssue.disabled = false;
    btnSubmitIssue.disabled = false;
    btnSaveDraftIssue.textContent = 'Lưu tạm';
  }
});

// Nut "Xuat kho" (submit form) - thuc su xuat kho + ghi cong no/so quy theo dung quy trinh
// nghiep vu cu, khong doi. Tao moi: POST voi is_draft:false (1 buoc, dung y het hanh vi cu). Dang
// sua 1 phieu da luu: luu lai sua doi truoc (PUT) roi moi goi POST /:id/process, tranh mat du
// lieu vua sua neu nguoi dung bam thang "Xuat kho" ma chua bam "Luu tam".
issueForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  issueFormErrorBox.hidden = true;

  const { items, error } = collectItems();
  if (error) {
    issueFormErrorText.textContent = error;
    issueFormErrorBox.hidden = false;
    return;
  }

  btnSubmitIssue.disabled = true;
  btnSaveDraftIssue.disabled = true;
  btnSubmitIssue.textContent = 'Đang xuất kho...';

  try {
    const partnerId = await resolvePartnerId();
    const body = buildIssueBody(partnerId, items);

    if (editingIssueId) {
      await apiFetch(`/stock-issues/${editingIssueId}`, { method: 'PUT', body: JSON.stringify(body) });
      await apiFetch(`/stock-issues/${editingIssueId}/process`, { method: 'POST' });
    } else {
      await apiFetch('/stock-issues', { method: 'POST', body: JSON.stringify({ ...body, is_draft: false }) });
    }

    await afterIssueSaveSuccess();
  } catch (err) {
    issueFormErrorText.textContent = err.message;
    issueFormErrorBox.hidden = false;
  } finally {
    btnSubmitIssue.disabled = false;
    btnSaveDraftIssue.disabled = false;
    btnSubmitIssue.textContent = 'Xuất kho';
  }
});

(async function init() {
  currentUser = await initLayout('stock-issues');
  if (!currentUser) return;

  btnAddIssue.innerHTML = `${icon('plus', 16)} Lập phiếu xuất`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });
  initAdjustmentField();
  initIssueDetailModal();

  await Promise.all([loadProducts(), loadPartners(), loadProjects(), loadIssues(), loadAdjustableDocs()]);
  renderPartnerOptions();
  renderProjectOptions();
  resetIssueForm();
})();
