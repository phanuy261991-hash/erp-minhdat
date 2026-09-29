// Trang rieng "Lap phieu xuat kho" (2026-09-28, thay the popup cu tren stock-issues.html) - bo
// cuc 2 cot giong stock-receipt-form.js, nhung them: doi tac khong bat buoc + o SDT/dia chi chi
// doc, Du an, toggle "Chua thu tien ngay", cot "Don gia sau CK", va CHE DO SUA (query ?id=,
// phieu dang 'cho_tru_kho') dung chung 1 form voi tao moi - dung nguyen quy trinh 2 buoc "Luu
// tam"/"Xuat kho" da co (xem stockIssue.service.js).

let currentUser = null;
let productsCache = [];
let partnersCache = [];
let projectsCache = [];
let rowCounter = 0;
let editingIssueId = null;
let formDirty = false;

const issueForm = document.getElementById('issue-form');
const issueFormErrorBox = document.getElementById('issue-form-error');
const issueFormErrorText = document.getElementById('issue-form-error-text');
const btnCancelIssue = document.getElementById('btn-cancel-issue');
const btnSaveDraftIssue = document.getElementById('btn-save-draft-issue');
const btnSubmitIssue = document.getElementById('btn-submit-issue');
const backLink = document.getElementById('back-link');
const pageTitle = document.getElementById('page-title');

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
const totalAmountEl = document.getElementById('issue-total-amount');
const quickAddSearch = document.getElementById('quick-add-search');
const quickAddSuggestions = document.getElementById('quick-add-suggestions');

function nowForDatetimeLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toSqliteDatetime(localValue) {
  const d = new Date(localValue);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function toDatetimeLocalValue(sqliteDateTime) {
  const iso = sqliteDateTime.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatMoney(value) {
  return Number(value).toLocaleString('vi-VN');
}

function markDirty() {
  formDirty = true;
}

window.addEventListener('beforeunload', (event) => {
  if (!formDirty) return;
  event.preventDefault();
  event.returnValue = '';
});

function confirmLeaveIfDirty() {
  if (!formDirty) return true;
  return confirm('Phiếu chưa lưu sẽ bị mất nếu rời trang. Tiếp tục?');
}

function goToList() {
  formDirty = false;
  window.location.href = 'stock-issues.html';
}

// ----- San pham dong (chon 1 lan qua o tim kiem dau cot, dong chi con sua so lieu) -----

function createItemRow(product) {
  rowCounter += 1;
  const row = document.createElement('div');
  row.className = 'item-row';
  row.dataset.rowId = String(rowCounter);
  row.dataset.productId = String(product.id);
  row.innerHTML = `
    <div class="item-row-product">
      <span class="item-row-product-code">${product.code}</span>
      <span class="item-row-product-name">${product.name}</span>
    </div>
    <div class="item-unit-display">${product.unit}</div>
    <input type="number" class="item-quantity" min="0" step="1" placeholder="SL" value="1" />
    <input type="text" class="item-unit-price money-input" placeholder="Đơn giá" />
    <input type="number" class="item-discount" min="0" max="100" step="1" placeholder="0" />
    <div class="item-net-price">0</div>
    <div class="item-line-total">0</div>
    <button type="button" class="icon-btn icon-btn-danger item-row-remove" title="Xóa dòng">${icon('trash', 14)}</button>
  `;
  bindMoneyInputs(row);
  return row;
}

// Them dong moi cho san pham vua chon (tu dien gia ban lam gia tri goi y, van sua tay duoc -
// theo dung hanh vi cu selectProduct()). Neu san pham da co san trong danh sach, focus lai vao
// dong do thay vi tao trung.
function addProductRow(productId) {
  const existing = itemRowsContainer.querySelector(`.item-row[data-product-id="${productId}"]`);
  if (existing) {
    existing.querySelector('.item-quantity').focus();
    existing.querySelector('.item-quantity').select();
    return;
  }

  const product = productsCache.find((p) => String(p.id) === String(productId));
  if (!product) return;

  const row = createItemRow(product);
  itemRowsContainer.appendChild(row);
  setMoneyValue(row.querySelector('.item-unit-price'), product.sale_price);
  markDirty();
  updateTotalAmount();
  row.querySelector('.item-quantity').focus();
  row.querySelector('.item-quantity').select();
}

// Dien lai 1 dong san pham co san (mo Sua phieu) - KHONG ghi de don gia bang gia ban mac dinh,
// giu dung don gia/chiet khau da luu tren phieu (khac addProductRow()).
function addExistingItemRow(item) {
  const row = createItemRow({ id: item.product_id, code: item.product_code, name: item.product_name, unit: item.unit });
  itemRowsContainer.appendChild(row);
  row.querySelector('.item-quantity').value = item.quantity;
  setMoneyValue(row.querySelector('.item-unit-price'), item.unit_price);
  row.querySelector('.item-discount').value = item.discount_percent || 0;
}

function removeItemRow(row) {
  row.remove();
  markDirty();
  updateTotalAmount();
}

// Don gia sau chiet khau (net) - hien thi tham khao truoc cot Thanh tien (yeu cau nguoi dung
// 2026-08-01). unit_price luu trong DB van la gia GOC, khong doi cach luu.
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

itemRowsContainer.addEventListener('input', (event) => {
  if (
    event.target.classList.contains('item-quantity') ||
    event.target.classList.contains('item-unit-price') ||
    event.target.classList.contains('item-discount')
  ) {
    markDirty();
    updateTotalAmount();
  }
});

itemRowsContainer.addEventListener('click', (event) => {
  const removeBtn = event.target.closest('.item-row-remove');
  if (removeBtn) {
    removeItemRow(removeBtn.closest('.item-row'));
  }
});

// ----- O tim kiem nhanh dau cot -----

function renderQuickAddSuggestions(keyword) {
  const kw = keyword.trim().toLowerCase();
  if (!kw) {
    quickAddSuggestions.innerHTML = '';
    return;
  }

  const matches = productsCache
    .filter((p) => p.code.toLowerCase().includes(kw) || p.name.toLowerCase().includes(kw))
    .slice(0, 8);

  if (matches.length === 0) {
    quickAddSuggestions.innerHTML = '<div class="combobox-empty">Không tìm thấy sản phẩm</div>';
    return;
  }

  quickAddSuggestions.innerHTML = matches
    .map((p) => `<div class="combobox-option" data-product-id="${p.id}">${p.code} - ${p.name} <span class="combobox-option-unit">(${p.unit})</span></div>`)
    .join('');
}

quickAddSearch.addEventListener('input', (event) => {
  renderQuickAddSuggestions(event.target.value);
});

quickAddSuggestions.addEventListener('click', (event) => {
  const option = event.target.closest('.combobox-option');
  if (!option) return;
  addProductRow(option.dataset.productId);
  quickAddSearch.value = '';
  quickAddSuggestions.innerHTML = '';
  quickAddSearch.focus();
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('#quick-add-search') && !event.target.closest('#quick-add-suggestions')) {
    quickAddSuggestions.innerHTML = '';
  }
});

// ----- Doi tac / cac truong khac -----

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

async function loadProjects() {
  const { projects } = await apiFetch('/projects');
  projectsCache = projects.filter((p) => p.status !== 'huy');
}

function renderProjectOptions() {
  const options = projectsCache.map((p) => `<option value="${p.id}">${p.code} - ${p.name}</option>`).join('');
  projectSelect.innerHTML = `<option value="">-- Không gắn dự án --</option>${options}`;
}

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
  markDirty();
});

issueForm.addEventListener('change', markDirty);

// ----- Huy / Quay lai -----

btnCancelIssue.addEventListener('click', () => {
  if (confirmLeaveIfDirty()) goToList();
});

backLink.addEventListener('click', (event) => {
  if (!confirmLeaveIfDirty()) {
    event.preventDefault();
  } else {
    formDirty = false;
  }
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    issueForm.requestSubmit();
  }
});

// ----- Nop phieu -----

function collectItems() {
  const rows = Array.from(itemRowsContainer.querySelectorAll('.item-row'));
  const items = [];

  for (const row of rows) {
    const productId = row.dataset.productId;
    const quantity = row.querySelector('.item-quantity').value;
    const unitPriceInput = row.querySelector('.item-unit-price');
    const unitPriceRaw = unitPriceInput.value;
    const discountPercent = row.querySelector('.item-discount').value;

    if (!quantity || !(Number(quantity) > 0) || unitPriceRaw === '') {
      return { error: 'Mỗi dòng sản phẩm phải nhập số lượng và đơn giá' };
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
  btnCancelIssue.disabled = true;
  btnSaveDraftIssue.textContent = 'Đang lưu...';

  try {
    const partnerId = await resolvePartnerId();
    const body = buildIssueBody(partnerId, items);

    if (editingIssueId) {
      await apiFetch(`/stock-issues/${editingIssueId}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await apiFetch('/stock-issues', { method: 'POST', body: JSON.stringify({ ...body, is_draft: true }) });
    }

    formDirty = false;
    goToList();
  } catch (err) {
    issueFormErrorText.textContent = err.message;
    issueFormErrorBox.hidden = false;
    btnSaveDraftIssue.disabled = false;
    btnSubmitIssue.disabled = false;
    btnCancelIssue.disabled = false;
    btnSaveDraftIssue.textContent = 'Lưu tạm';
  }
});

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
  btnCancelIssue.disabled = true;
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

    formDirty = false;
    goToList();
  } catch (err) {
    issueFormErrorText.textContent = err.message;
    issueFormErrorBox.hidden = false;
    btnSubmitIssue.disabled = false;
    btnSaveDraftIssue.disabled = false;
    btnCancelIssue.disabled = false;
    btnSubmitIssue.textContent = 'Xuất kho';
  }
});

// ----- Che do sua (query ?id=) -----

function getEditIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  return id ? Number(id) : null;
}

async function loadForEdit(id) {
  const { issue } = await apiFetch(`/stock-issues/${id}`);
  if (issue.status !== 'cho_tru_kho') {
    throw new Error('Phiếu đã xuất kho, không thể sửa');
  }

  editingIssueId = issue.id;
  pageTitle.textContent = 'Sửa phiếu xuất kho (nháp)';

  partnerSelect.value = issue.partner_id ? String(issue.partner_id) : '';
  newPartnerFields.hidden = true;
  existingCustomerInfoRow.hidden = false;
  updateCustomerInfoDisplay();

  projectSelect.value = issue.project_id ? String(issue.project_id) : '';
  noteInput.value = issue.note || '';
  issueDateInput.value = toDatetimeLocalValue(issue.created_at);
  paymentToggle.checked = issue.payment_status === 'cong_no';

  itemRowsContainer.innerHTML = '';
  issue.items.forEach((item) => addExistingItemRow(item));
  updateTotalAmount();
}

(async function init() {
  currentUser = await initLayout('stock-issues');
  if (!currentUser) return;

  backLink.innerHTML = `${icon('arrowLeft', 16)} Quay lại danh sách`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });
  initAdjustmentField();

  const btnToggleAdjustment = document.getElementById('btn-toggle-adjustment');
  const adjustmentFieldWrap = document.getElementById('adjustment-field-wrap');
  btnToggleAdjustment.addEventListener('click', () => {
    adjustmentFieldWrap.hidden = !adjustmentFieldWrap.hidden;
    btnToggleAdjustment.hidden = !adjustmentFieldWrap.hidden;
    if (!adjustmentFieldWrap.hidden) document.getElementById('adjusts-search').focus();
  });

  await Promise.all([loadProducts(), loadPartners(), loadProjects(), loadAdjustableDocs()]);
  renderPartnerOptions();
  renderProjectOptions();

  const editId = getEditIdFromQuery();
  if (editId) {
    try {
      await loadForEdit(editId);
    } catch (err) {
      issueFormErrorText.textContent = err.message;
      issueFormErrorBox.hidden = false;
    }
  } else {
    issueDateInput.value = nowForDatetimeLocal();
  }

  updateTotalAmount();
  formDirty = false;
  quickAddSearch.focus();
})();
