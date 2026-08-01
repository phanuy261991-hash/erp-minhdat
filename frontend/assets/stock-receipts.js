// Logic trang phieu nhap kho: danh sach phieu da lap + modal lap phieu moi.
// Chon san pham tung dong bang o tim kiem goi y (combobox tu viet, khong dung <select> thuong
// vi danh muc san pham co the nhieu - xem yeu cau nguoi dung khi thiet ke form trang nay).
// Nha cung cap: dropdown lay tu GET /api/partners?type=nha_cung_cap, kem "them nhanh" ngay
// trong form (POST /api/partners) - quan ly doi tac day du van o Phase 3.

let currentUser = null;
let productsCache = [];
let partnersCache = [];
let rowCounter = 0;

const receiptsTbody = document.getElementById('receipts-tbody');
const receiptsErrorBox = document.getElementById('receipts-error');
const receiptsErrorText = document.getElementById('receipts-error-text');

const btnAddReceipt = document.getElementById('btn-add-receipt');
const receiptModal = document.getElementById('receipt-modal');
const receiptForm = document.getElementById('receipt-form');
const receiptFormErrorBox = document.getElementById('receipt-form-error');
const receiptFormErrorText = document.getElementById('receipt-form-error-text');
const btnCancelReceipt = document.getElementById('btn-cancel-receipt');
const btnSubmitReceipt = document.getElementById('btn-submit-receipt');

const partnerSelect = document.getElementById('receipt-partner');
const newPartnerFields = document.getElementById('new-partner-fields');
const newPartnerNameInput = document.getElementById('new-partner-name');
const newPartnerPhoneInput = document.getElementById('new-partner-phone');
const newPartnerAddressInput = document.getElementById('new-partner-address');
const noteInput = document.getElementById('receipt-note');
const receiptDateInput = document.getElementById('receipt-date');
const orderCodeInput = document.getElementById('receipt-order-code');
const paymentToggle = document.getElementById('receipt-payment-toggle');
const itemRowsContainer = document.getElementById('item-rows');
const btnAddItemRow = document.getElementById('btn-add-item-row');
const totalAmountEl = document.getElementById('receipt-total-amount');

// 'YYYY-MM-DDTHH:MM' theo gio dia phuong trinh duyet, dung de dien san gio hien tai vao o
// chon thoi gian nhap khi mo modal.
function nowForDatetimeLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Quy doi gia tri <input type="datetime-local"> (gio dia phuong) sang 'YYYY-MM-DD HH:MM:SS'
// UTC - dung dinh dang voi datetime('now') cua SQLite ma toan bo du lieu dang luu.
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

function renderReceiptsError(message) {
  receiptsErrorText.textContent = message;
  receiptsErrorBox.hidden = false;
}

function renderReceiptRow(receipt) {
  const noteHtml = receipt.adjusts_code
    ? `<span class="badge badge-inactive" title="Điều chỉnh cho phiếu ${receipt.adjusts_code}">Điều chỉnh ${receipt.adjusts_code}</span> ${receipt.note || ''}`
    : (receipt.note || '-');

  const paymentBadge = receipt.payment_status === 'cong_no'
    ? '<span class="badge badge-inactive">Công nợ</span>'
    : '<span class="badge badge-active">Đã thanh toán</span>';

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${receipt.code}</td>
    <td>${receipt.partner_name || '-'}</td>
    <td>${receipt.created_by_name}</td>
    <td>${paymentBadge}</td>
    <td>${noteHtml}</td>
    <td>${formatDate(receipt.created_at)}</td>
    <td>
      <button type="button" class="icon-btn" data-action="view" data-id="${receipt.id}" title="Xem chi tiết">${icon('eye', 14)}</button>
    </td>
  `;
  return tr;
}

async function loadReceipts() {
  try {
    const { receipts } = await apiFetch('/stock-receipts');
    receiptsTbody.innerHTML = '';
    receipts.forEach((r) => receiptsTbody.appendChild(renderReceiptRow(r)));
  } catch (err) {
    renderReceiptsError(err.message);
  }
}

receiptsTbody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action="view"]');
  if (!button) return;
  openReceiptDetailModal(button.dataset.id);
});

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

partnerSelect.addEventListener('change', () => {
  newPartnerFields.hidden = partnerSelect.value !== '__new__';
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

// Cap nhat "Thanh tien" tung dong (gia sau chiet khau) va "Tong thanh tien" toan phieu - goi
// lai moi khi nguoi dung go so luong/don gia/chiet khau, hoac them/xoa dong.
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

function resetReceiptForm() {
  receiptForm.reset();
  newPartnerFields.hidden = true;
  receiptDateInput.value = nowForDatetimeLocal();
  itemRowsContainer.innerHTML = '';
  addItemRow();
  updateTotalAmount();
  resetAdjustmentField();
}

function openCreateModal() {
  resetReceiptForm();
  receiptFormErrorBox.hidden = true;
  receiptModal.hidden = false;
}

function closeReceiptModal() {
  receiptModal.hidden = true;
}

btnAddReceipt.addEventListener('click', openCreateModal);
btnCancelReceipt.addEventListener('click', closeReceiptModal);

receiptModal.addEventListener('click', (event) => {
  if (event.target === receiptModal) closeReceiptModal();
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
    return { error: 'Phiếu nhập phải có ít nhất 1 dòng sản phẩm' };
  }

  return { items };
}

receiptForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  receiptFormErrorBox.hidden = true;

  const { items, error } = collectItems();
  if (error) {
    receiptFormErrorText.textContent = error;
    receiptFormErrorBox.hidden = false;
    return;
  }

  btnSubmitReceipt.disabled = true;
  btnSubmitReceipt.textContent = 'Đang lưu...';

  try {
    let partnerId = partnerSelect.value || null;

    if (partnerId === '__new__') {
      const name = newPartnerNameInput.value.trim();
      if (!name) {
        throw new Error('Thiếu tên nhà cung cấp mới');
      }
      const { partner } = await apiFetch('/partners', {
        method: 'POST',
        body: JSON.stringify({
          type: 'nha_cung_cap',
          name,
          phone: newPartnerPhoneInput.value.trim(),
          address: newPartnerAddressInput.value.trim(),
        }),
      });
      partnerId = partner.id;
    }

    await apiFetch('/stock-receipts', {
      method: 'POST',
      body: JSON.stringify({
        partner_id: partnerId || null,
        note: noteInput.value.trim(),
        order_code: orderCodeInput.value.trim(),
        receipt_date: receiptDateInput.value ? toSqliteDatetime(receiptDateInput.value) : null,
        payment_status: paymentToggle.checked ? 'cong_no' : 'da_thanh_toan',
        items,
        ...getAdjustmentPayload(),
      }),
    });

    closeReceiptModal();
    await Promise.all([loadReceipts(), loadPartners()]);
    renderPartnerOptions();
  } catch (err) {
    receiptFormErrorText.textContent = err.message;
    receiptFormErrorBox.hidden = false;
  } finally {
    btnSubmitReceipt.disabled = false;
    btnSubmitReceipt.textContent = 'Lưu phiếu';
  }
});

(async function init() {
  currentUser = await initLayout('stock-receipts');
  if (!currentUser) return;

  btnAddReceipt.innerHTML = `${icon('plus', 16)} Lập phiếu nhập`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });
  initReceiptDetailModal();
  initAdjustmentField();

  await Promise.all([loadProducts(), loadPartners(), loadReceipts(), loadAdjustableDocs()]);
  renderPartnerOptions();
  resetReceiptForm();
})();
