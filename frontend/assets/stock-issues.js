// Logic trang phieu xuat kho: danh sach phieu da lap + modal lap phieu moi.
// Giong het pattern stock-receipts.js (combobox tim san pham, doi tac dropdown + them nhanh,
// chiet khau tung dong - migration 013, thoi gian xuat tuy chinh), khac o cho co them toggle
// payment_status ("Chua thu tien ngay" - xem docs/DECISIONS.md muc "Cong no phat sinh tu phieu
// xuat") va khong co ma don hang (stock_issues khong co cot nay, khac stock_receipts).

let currentUser = null;
let productsCache = [];
let partnersCache = [];
let rowCounter = 0;

const issuesTbody = document.getElementById('issues-tbody');
const issuesErrorBox = document.getElementById('issues-error');
const issuesErrorText = document.getElementById('issues-error-text');

const btnAddIssue = document.getElementById('btn-add-issue');
const issueModal = document.getElementById('issue-modal');
const issueForm = document.getElementById('issue-form');
const issueFormErrorBox = document.getElementById('issue-form-error');
const issueFormErrorText = document.getElementById('issue-form-error-text');
const btnCancelIssue = document.getElementById('btn-cancel-issue');
const btnSubmitIssue = document.getElementById('btn-submit-issue');

const partnerSelect = document.getElementById('issue-partner');
const newPartnerFields = document.getElementById('new-partner-fields');
const newPartnerNameInput = document.getElementById('new-partner-name');
const newPartnerPhoneInput = document.getElementById('new-partner-phone');
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

function renderIssueRow(issue) {
  const paymentBadge = issue.payment_status === 'cong_no'
    ? '<span class="badge badge-inactive">Công nợ</span>'
    : '<span class="badge badge-active">Đã thu tiền</span>';

  const noteHtml = issue.adjusts_code
    ? `<span class="badge badge-inactive" title="Điều chỉnh cho phiếu ${issue.adjusts_code}">Điều chỉnh ${issue.adjusts_code}</span> ${issue.note || ''}`
    : (issue.note || '-');

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${issue.code}</td>
    <td>${issue.partner_name || '-'}</td>
    <td>${issue.created_by_name}</td>
    <td>${paymentBadge}</td>
    <td>${noteHtml}</td>
    <td>${formatDate(issue.created_at)}</td>
    <td>
      <button type="button" class="icon-btn" data-action="view" data-id="${issue.id}" title="Xem chi tiết">${icon('eye', 14)}</button>
    </td>
  `;
  return tr;
}

async function loadIssues() {
  try {
    const { issues } = await apiFetch('/stock-issues');
    issuesTbody.innerHTML = '';
    issues.forEach((i) => issuesTbody.appendChild(renderIssueRow(i)));
  } catch (err) {
    renderIssuesError(err.message);
  }
}

issuesTbody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action="view"]');
  if (!button) return;
  openIssueDetailModal(button.dataset.id);
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

// Chon khach hang co san -> dien thong tin lien he ra 2 o chi-doc de nguoi lap phieu tien
// tham khao (vd giao hang), khong phai truong nhap - xem yeu cau nguoi dung 2026-07-31.
function updateCustomerInfoDisplay() {
  const partnerId = partnerSelect.value;
  const partner = partnersCache.find((p) => String(p.id) === partnerId);
  customerPhoneDisplay.value = partner && partner.phone ? partner.phone : '';
  customerAddressDisplay.value = partner && partner.address ? partner.address : '';
}

partnerSelect.addEventListener('change', () => {
  newPartnerFields.hidden = partnerSelect.value !== '__new__';
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
    <input type="number" class="item-unit-price" min="0" step="1000" placeholder="Đơn giá" />
    <input type="number" class="item-discount" min="0" max="100" step="1" placeholder="0" />
    <div class="item-line-total">0</div>
    <button type="button" class="icon-btn icon-btn-danger item-row-remove" title="Xóa dòng">${icon('trash', 14)}</button>
  `;
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

function rowLineTotal(row) {
  const quantity = Number(row.querySelector('.item-quantity').value) || 0;
  const unitPrice = Number(row.querySelector('.item-unit-price').value) || 0;
  const discountPercent = Number(row.querySelector('.item-discount').value) || 0;
  return quantity * unitPrice * (1 - discountPercent / 100);
}

function updateTotalAmount() {
  const rows = Array.from(itemRowsContainer.querySelectorAll('.item-row'));
  let total = 0;

  rows.forEach((row) => {
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

function selectProduct(row, productId, label) {
  row.querySelector('.item-product-id').value = productId;
  row.querySelector('.item-product-search').value = label;
  row.querySelector('.combobox-suggestions').innerHTML = '';

  const product = productsCache.find((p) => String(p.id) === String(productId));
  row.querySelector('.item-unit-display').textContent = product ? product.unit : '';
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
  issueDateInput.value = nowForDatetimeLocal();
  updateCustomerInfoDisplay();
  itemRowsContainer.innerHTML = '';
  addItemRow();
  updateTotalAmount();
  resetAdjustmentField();
}

function openCreateModal() {
  resetIssueForm();
  issueFormErrorBox.hidden = true;
  issueModal.hidden = false;
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
    const unitPrice = row.querySelector('.item-unit-price').value;
    const discountPercent = row.querySelector('.item-discount').value;

    if (!productId && !quantity && unitPrice === '' && discountPercent === '') continue;

    if (!productId || !quantity || unitPrice === '') {
      return { error: 'Mỗi dòng sản phẩm phải chọn sản phẩm, nhập số lượng và đơn giá' };
    }

    items.push({
      product_id: Number(productId),
      quantity: Number(quantity),
      unit_price: Number(unitPrice),
      discount_percent: discountPercent === '' ? 0 : Number(discountPercent),
    });
  }

  if (items.length === 0) {
    return { error: 'Phiếu xuất phải có ít nhất 1 dòng sản phẩm' };
  }

  return { items };
}

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
  btnSubmitIssue.textContent = 'Đang lưu...';

  try {
    let partnerId = partnerSelect.value || null;

    if (partnerId === '__new__') {
      const name = newPartnerNameInput.value.trim();
      if (!name) {
        throw new Error('Thiếu tên khách hàng mới');
      }
      const { partner } = await apiFetch('/partners', {
        method: 'POST',
        body: JSON.stringify({ type: 'khach_hang', name, phone: newPartnerPhoneInput.value.trim() }),
      });
      partnerId = partner.id;
    }

    await apiFetch('/stock-issues', {
      method: 'POST',
      body: JSON.stringify({
        partner_id: partnerId || null,
        note: noteInput.value.trim(),
        payment_status: paymentToggle.checked ? 'cong_no' : 'da_thu_tien',
        issue_date: issueDateInput.value ? toSqliteDatetime(issueDateInput.value) : null,
        items,
        ...getAdjustmentPayload(),
      }),
    });

    closeIssueModal();
    await Promise.all([loadIssues(), loadPartners()]);
    renderPartnerOptions();
  } catch (err) {
    issueFormErrorText.textContent = err.message;
    issueFormErrorBox.hidden = false;
  } finally {
    btnSubmitIssue.disabled = false;
    btnSubmitIssue.textContent = 'Lưu phiếu';
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

  await Promise.all([loadProducts(), loadPartners(), loadIssues(), loadAdjustableDocs()]);
  renderPartnerOptions();
  resetIssueForm();
})();
