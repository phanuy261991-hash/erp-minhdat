// Trang rieng "Lap phieu tra hang nha cung cap" (2026-09-28, thay the 1 trong 2 modal tren
// stock-returns.html) - bo cuc 2 cot giong cac trang lap phieu khac. KHAC "Tra hang xuat": Nha
// cung cap van BAT BUOC chon (khong co khai niem "NCC le"), khong co Cong trinh, o "Gia nhap" tu
// tra cuu lich su mua (1 gia tu dien, >=2 gia hien chip chon).

let productsCache = [];
let partnersCache = [];
let rowCounter = 0;
let editingReturnId = null;
let formDirty = false;

const returnForm = document.getElementById('return-form');
const returnFormErrorBox = document.getElementById('return-form-error');
const returnFormErrorText = document.getElementById('return-form-error-text');
const btnCancelReturn = document.getElementById('btn-cancel-return');
const btnSaveDraft = document.getElementById('btn-save-draft');
const btnProcessReturn = document.getElementById('btn-process-return');
const backLink = document.getElementById('back-link');
const pageTitle = document.getElementById('page-title');

const partnerSelect = document.getElementById('return-partner');
const newPartnerFields = document.getElementById('new-partner-fields');
const newPartnerNameInput = document.getElementById('new-partner-name');
const newPartnerPhoneInput = document.getElementById('new-partner-phone');
const newPartnerAddressInput = document.getElementById('new-partner-address');
const noteInput = document.getElementById('return-note');
const returnDateInput = document.getElementById('return-date');
const itemRowsContainer = document.getElementById('item-rows');
const totalAmountEl = document.getElementById('return-total-amount');
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
  window.location.href = 'stock-returns.html';
}

// ----- Doi tac -----

async function loadProducts() {
  const { products } = await apiFetch('/products');
  productsCache = products.filter((p) => p.is_active);
}

async function loadPartners() {
  const { partners } = await apiFetch('/partners?type=nha_cung_cap');
  partnersCache = partners;
}

function renderPartnerOptions() {
  const options = partnersCache.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  partnerSelect.innerHTML = `<option value="">-- Không chọn --</option>${options}<option value="__new__">+ Thêm nhà cung cấp mới</option>`;
}

partnerSelect.addEventListener('change', async () => {
  newPartnerFields.hidden = partnerSelect.value !== '__new__';
  markDirty();
  await refreshAllRowReferences();
  await refreshAllRowPrices();
});

// ----- San pham dong (chon 1 lan qua o tim kiem dau cot) -----

function createItemRow(product) {
  rowCounter += 1;
  const row = document.createElement('div');
  row.className = 'item-row';
  row.dataset.rowId = String(rowCounter);
  row.dataset.productId = String(product.id);
  row.dataset.remaining = '';
  row.innerHTML = `
    <div class="item-row-product">
      <span class="item-row-product-code">${product.code}</span>
      <span class="item-row-product-name">${product.name}</span>
    </div>
    <div class="item-unit-display">${product.unit}</div>
    <div class="item-unit-display item-issued-display" title="Số lượng còn có thể trả (đã trừ các lần trả trước)">-</div>
    <input type="number" class="item-quantity" min="0" step="1" placeholder="SL trả" value="1" />
    <div class="price-picker">
      <input type="text" class="item-purchase-price money-input" placeholder="Giá nhập" />
      <div class="price-picker-hint" hidden></div>
    </div>
    <div class="item-line-total">0</div>
    <button type="button" class="icon-btn icon-btn-danger item-row-remove" title="Xóa dòng">${icon('trash', 14)}</button>
  `;
  bindMoneyInputs(row);
  return row;
}

async function refreshRowReference(row) {
  const productId = row.dataset.productId;
  const display = row.querySelector('.item-issued-display');
  const partnerId = partnerSelect.value;

  if (!partnerId || partnerId === '__new__') {
    display.textContent = '-';
    row.dataset.remaining = '';
    return;
  }

  const params = new URLSearchParams({ partner_id: partnerId, product_id: productId });
  try {
    const { received_quantity: received, remaining_returnable: remaining } = await apiFetch(`/supplier-returns/reference?${params}`);
    display.textContent = formatMoney(received);
    display.title = `Số lượng còn có thể trả: ${formatMoney(remaining)}`;
    row.dataset.remaining = String(remaining);
  } catch (err) {
    display.textContent = '-';
    row.dataset.remaining = '';
  }
}

async function refreshRowPrice(row) {
  const productId = row.dataset.productId;
  const partnerId = partnerSelect.value;
  const hint = row.querySelector('.price-picker-hint');
  hint.hidden = true;
  hint.innerHTML = '';

  if (!partnerId || partnerId === '__new__') return;

  const params = new URLSearchParams({ partner_id: partnerId, product_id: productId });
  try {
    const { prices } = await apiFetch(`/supplier-returns/prices?${params}`);
    const priceInput = row.querySelector('.item-purchase-price');
    if (prices.length === 1) {
      setMoneyValue(priceInput, prices[0]);
      updateTotalAmount();
    } else if (prices.length >= 2) {
      hint.innerHTML = `
        <span class="price-picker-icon">${icon('info', 12)}</span>
        <span class="price-picker-hint-label">Từng mua nhiều giá, chọn 1:</span>
        ${prices.map((p) => `<button type="button" class="price-chip" data-price="${p}">${formatMoney(p)}</button>`).join('')}
      `;
      hint.hidden = false;
    }
  } catch (err) {
    // Tra cuu loi thi thoi, khong chan nguoi dung tu nhap tay gia.
  }
}

function refreshAllRowReferences() {
  const rows = Array.from(itemRowsContainer.querySelectorAll('.item-row'));
  return Promise.all(rows.map((row) => refreshRowReference(row)));
}

function refreshAllRowPrices() {
  const rows = Array.from(itemRowsContainer.querySelectorAll('.item-row'));
  return Promise.all(rows.map((row) => refreshRowPrice(row)));
}

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
  markDirty();
  updateTotalAmount();
  refreshRowReference(row);
  refreshRowPrice(row);
  row.querySelector('.item-quantity').focus();
  row.querySelector('.item-quantity').select();
}

function addExistingItemRow(item) {
  const row = createItemRow({ id: item.product_id, code: item.product_code, name: item.product_name, unit: item.unit });
  itemRowsContainer.appendChild(row);
  row.querySelector('.item-quantity').value = item.quantity;
  setMoneyValue(row.querySelector('.item-purchase-price'), item.unit_price);
  refreshRowReference(row);
}

function removeItemRow(row) {
  row.remove();
  markDirty();
  updateTotalAmount();
}

function rowLineTotal(row) {
  const quantity = Number(row.querySelector('.item-quantity').value) || 0;
  const purchasePrice = getMoneyValue(row.querySelector('.item-purchase-price'));
  return quantity * purchasePrice;
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

itemRowsContainer.addEventListener('input', (event) => {
  if (event.target.classList.contains('item-quantity') || event.target.classList.contains('item-purchase-price')) {
    markDirty();
    updateTotalAmount();
  }
});

itemRowsContainer.addEventListener('click', (event) => {
  const chip = event.target.closest('.price-chip');
  if (chip) {
    const row = chip.closest('.item-row');
    setMoneyValue(row.querySelector('.item-purchase-price'), Number(chip.dataset.price));
    row.querySelector('.price-picker-hint').hidden = true;
    markDirty();
    updateTotalAmount();
    return;
  }

  const removeBtn = event.target.closest('.item-row-remove');
  if (removeBtn) removeItemRow(removeBtn.closest('.item-row'));
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.price-picker')) {
    document.querySelectorAll('.price-picker-hint').forEach((hint) => {
      hint.hidden = true;
    });
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

quickAddSearch.addEventListener('input', (event) => renderQuickAddSuggestions(event.target.value));
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

returnForm.addEventListener('change', markDirty);

// ----- Huy / Quay lai -----

btnCancelReturn.addEventListener('click', () => {
  if (confirmLeaveIfDirty()) goToList();
});
backLink.addEventListener('click', (event) => {
  if (!confirmLeaveIfDirty()) event.preventDefault();
  else formDirty = false;
});
returnForm.addEventListener('submit', (event) => event.preventDefault());

// ----- Nop phieu -----

function collectItems() {
  const rows = Array.from(itemRowsContainer.querySelectorAll('.item-row'));
  const items = [];

  for (const row of rows) {
    const productId = row.dataset.productId;
    const quantity = row.querySelector('.item-quantity').value;
    const priceInput = row.querySelector('.item-purchase-price');
    const priceRaw = priceInput.value;

    if (!quantity || !(Number(quantity) > 0) || priceRaw === '') {
      return { error: 'Mỗi dòng phải nhập số lượng trả lại và giá nhập' };
    }

    const remaining = row.dataset.remaining === '' ? null : Number(row.dataset.remaining);
    if (remaining !== null && Number(quantity) > remaining) {
      return { error: `Số lượng trả lại vượt quá số còn có thể trả (còn lại: ${formatMoney(remaining)})` };
    }

    items.push({
      product_id: Number(productId),
      quantity: Number(quantity),
      unit_price: getMoneyValue(priceInput),
    });
  }

  if (items.length === 0) {
    return { error: 'Phiếu trả hàng phải có ít nhất 1 dòng sản phẩm' };
  }

  return { items };
}

async function resolvePartnerId() {
  let partnerId = partnerSelect.value;
  if (partnerId !== '__new__') return partnerId;

  const name = newPartnerNameInput.value.trim();
  if (!name) throw new Error('Thiếu tên nhà cung cấp mới');

  const { partner } = await apiFetch('/partners', {
    method: 'POST',
    body: JSON.stringify({
      type: 'nha_cung_cap',
      name,
      phone: newPartnerPhoneInput.value.trim(),
      address: newPartnerAddressInput.value.trim(),
    }),
  });
  return partner.id;
}

function buildReturnBody(partnerId, items) {
  return {
    partner_id: partnerId,
    note: noteInput.value.trim(),
    return_date: returnDateInput.value ? toSqliteDatetime(returnDateInput.value) : null,
    items,
  };
}

function validateFormBeforeSubmit() {
  returnFormErrorBox.hidden = true;
  if (!partnerSelect.value) {
    return { error: 'Vui lòng chọn nhà cung cấp' };
  }
  return collectItems();
}

function setSubmitButtonsBusy(busy) {
  btnSaveDraft.disabled = busy;
  btnProcessReturn.disabled = busy;
  btnCancelReturn.disabled = busy;
}

function showFormError(message) {
  returnFormErrorText.textContent = message;
  returnFormErrorBox.hidden = false;
}

btnSaveDraft.addEventListener('click', async () => {
  const { items, error } = validateFormBeforeSubmit();
  if (error) {
    showFormError(error);
    return;
  }

  setSubmitButtonsBusy(true);
  btnSaveDraft.textContent = 'Đang lưu...';

  try {
    const partnerId = await resolvePartnerId();
    const body = buildReturnBody(partnerId, items);

    if (editingReturnId) {
      await apiFetch(`/supplier-returns/${editingReturnId}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await apiFetch('/supplier-returns', { method: 'POST', body: JSON.stringify(body) });
    }

    formDirty = false;
    goToList();
  } catch (err) {
    showFormError(err.message);
    setSubmitButtonsBusy(false);
    btnSaveDraft.textContent = 'Lưu';
  }
});

btnProcessReturn.addEventListener('click', async () => {
  const { items, error } = validateFormBeforeSubmit();
  if (error) {
    showFormError(error);
    return;
  }

  setSubmitButtonsBusy(true);
  btnProcessReturn.textContent = 'Đang trừ kho...';

  try {
    const partnerId = await resolvePartnerId();
    const body = buildReturnBody(partnerId, items);

    if (editingReturnId) {
      await apiFetch(`/supplier-returns/${editingReturnId}`, { method: 'PUT', body: JSON.stringify(body) });
      await apiFetch(`/supplier-returns/${editingReturnId}/process`, { method: 'POST' });
    } else {
      await apiFetch('/supplier-returns', { method: 'POST', body: JSON.stringify({ ...body, process: true }) });
    }

    formDirty = false;
    goToList();
  } catch (err) {
    showFormError(err.message);
    setSubmitButtonsBusy(false);
    btnProcessReturn.textContent = 'Trừ kho';
  }
});

// ----- Che do sua (query ?id=) -----

function getEditIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  return id ? Number(id) : null;
}

async function loadForEdit(id) {
  const { return: r } = await apiFetch(`/supplier-returns/${id}`);
  if (r.status !== 'cho_tru_kho') {
    throw new Error('Phiếu đã trừ kho, không thể sửa');
  }

  editingReturnId = id;
  pageTitle.textContent = 'Sửa phiếu trả hàng nhà cung cấp';

  partnerSelect.value = String(r.partner_id);
  newPartnerFields.hidden = true;

  returnDateInput.value = toDatetimeLocalValue(r.created_at);
  noteInput.value = r.note || '';

  itemRowsContainer.innerHTML = '';
  r.items.forEach((item) => addExistingItemRow(item));
  updateTotalAmount();
}

(async function init() {
  const currentUser = await initLayout('stock-returns');
  if (!currentUser) return;

  backLink.innerHTML = `${icon('arrowLeft', 16)} Quay lại danh sách`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await Promise.all([loadProducts(), loadPartners()]);
  renderPartnerOptions();

  const editId = getEditIdFromQuery();
  if (editId) {
    try {
      await loadForEdit(editId);
    } catch (err) {
      returnFormErrorText.textContent = err.message;
      returnFormErrorBox.hidden = false;
    }
  } else {
    returnDateInput.value = nowForDatetimeLocal();
  }

  updateTotalAmount();
  formDirty = false;
  quickAddSearch.focus();
})();
