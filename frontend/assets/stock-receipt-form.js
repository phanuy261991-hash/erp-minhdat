// Trang rieng "Lap phieu nhap kho" (2026-09-28, thay the popup cu tren stock-receipts.html) -
// bo cuc 2 cot: cot trai tim/them san pham, cot phai (sticky) doi tac/thanh toan/tong tien.
// Khac voi form cu: chon san pham chi lam 1 LAN duy nhat o o tim kiem dau cot trai
// (#quick-add-search) - moi lan chon se THEM 1 dong moi da dien san ten san pham (khong con
// combobox rieng trong tung dong), dong da them chi con sua so luong/don gia/chiet khau.

let currentUser = null;
let productsCache = [];
let partnersCache = [];
let rowCounter = 0;
let formDirty = false;

const receiptForm = document.getElementById('receipt-form');
const receiptFormErrorBox = document.getElementById('receipt-form-error');
const receiptFormErrorText = document.getElementById('receipt-form-error-text');
const btnCancelReceipt = document.getElementById('btn-cancel-receipt');
const btnSubmitReceipt = document.getElementById('btn-submit-receipt');
const backLink = document.getElementById('back-link');

const partnerSelect = document.getElementById('receipt-partner');
const newPartnerFields = document.getElementById('new-partner-fields');
const newPartnerNameInput = document.getElementById('new-partner-name');
const newPartnerPhoneInput = document.getElementById('new-partner-phone');
const newPartnerAddressInput = document.getElementById('new-partner-address');
const noteInput = document.getElementById('receipt-note');
const receiptDateInput = document.getElementById('receipt-date');
const orderCodeInput = document.getElementById('receipt-order-code');
const paymentToggle = document.getElementById('receipt-payment-toggle');
const paymentRow = document.getElementById('receipt-payment-row');
const openingBalanceToggle = document.getElementById('receipt-opening-balance-toggle');
const itemRowsContainer = document.getElementById('item-rows');
const totalAmountEl = document.getElementById('receipt-total-amount');
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

function formatMoney(value) {
  return Number(value).toLocaleString('vi-VN');
}

function markDirty() {
  formDirty = true;
}

// Xac nhan truoc khi roi trang neu dang co thay doi chua luu (form-autosave/sheet-dismiss-confirm)
// - ap dung ca khi dong/lam moi trinh duyet (beforeunload, hop thoai mac dinh cua trinh duyet)
// lan khi bam link "Quay lai danh sach"/"Huy" trong chinh trang (confirm() tu viet).
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
  window.location.href = 'stock-receipts.html';
}

// ----- San pham dong (chon 1 lan duy nhat qua o tim kiem dau cot, dong chi con sua so lieu) -----

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
    <div class="item-line-total">0</div>
    <button type="button" class="icon-btn icon-btn-danger item-row-remove" title="Xóa dòng">${icon('trash', 14)}</button>
  `;
  bindMoneyInputs(row);
  return row;
}

// Them 1 dong moi cho san pham vua chon o o tim kiem dau cot - neu san pham da co san trong
// danh sach, focus lai vao o so luong dong do thay vi tao dong trung lap.
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
  row.querySelector('.item-quantity').focus();
  row.querySelector('.item-quantity').select();
}

function removeItemRow(row) {
  row.remove();
  markDirty();
  updateTotalAmount();
}

function rowLineTotal(row) {
  const quantity = Number(row.querySelector('.item-quantity').value) || 0;
  const unitPrice = getMoneyValue(row.querySelector('.item-unit-price'));
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

// ----- O tim kiem nhanh dau cot (them dong ngay khi chon, khong can bam "+ Them dong" truoc) -----

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
    .map(
      (p) => `
        <div class="combobox-option" data-product-id="${p.id}">
          ${p.code} - ${p.name} <span class="combobox-option-unit">(${p.unit})</span>
        </div>
      `
    )
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
  const { partners } = await apiFetch('/partners?type=nha_cung_cap');
  partnersCache = partners;
}

function renderPartnerOptions() {
  const options = partnersCache.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  partnerSelect.innerHTML = `<option value="">-- Không chọn --</option>${options}<option value="__new__">+ Thêm nhà cung cấp mới</option>`;
}

partnerSelect.addEventListener('change', () => {
  newPartnerFields.hidden = partnerSelect.value !== '__new__';
  markDirty();
});

openingBalanceToggle.addEventListener('change', () => {
  paymentRow.hidden = openingBalanceToggle.checked;
  if (openingBalanceToggle.checked) {
    paymentToggle.checked = false;
  }
  markDirty();
});

receiptForm.addEventListener('change', markDirty);

// ----- Huy / Quay lai -----

btnCancelReceipt.addEventListener('click', () => {
  if (confirmLeaveIfDirty()) goToList();
});

backLink.addEventListener('click', (event) => {
  if (!confirmLeaveIfDirty()) {
    event.preventDefault();
  } else {
    formDirty = false;
  }
});

// Phim tat Ctrl+Enter = Luu phieu nhanh, khong can voi chuot xuong nut cuoi cot phai.
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    receiptForm.requestSubmit();
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
  btnCancelReceipt.disabled = true;
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
        is_opening_balance: openingBalanceToggle.checked,
        items,
        ...getAdjustmentPayload(),
      }),
    });

    formDirty = false;
    goToList();
  } catch (err) {
    receiptFormErrorText.textContent = err.message;
    receiptFormErrorBox.hidden = false;
    btnSubmitReceipt.disabled = false;
    btnCancelReceipt.disabled = false;
    btnSubmitReceipt.textContent = 'Lưu phiếu';
  }
});

(async function init() {
  currentUser = await initLayout('stock-receipts');
  if (!currentUser) return;

  backLink.innerHTML = `${icon('arrowLeft', 16)} Quay lại danh sách`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });
  initAdjustmentField();

  // Truong "Dieu chinh cho phieu" it dung - thu gon mac dinh sau 1 nut disclosure, bam ra moi
  // hien (tiet kiem chieu cao panel ben phai, xem docs/DECISIONS.md 2026-09-28).
  const btnToggleAdjustment = document.getElementById('btn-toggle-adjustment');
  const adjustmentFieldWrap = document.getElementById('adjustment-field-wrap');
  btnToggleAdjustment.addEventListener('click', () => {
    adjustmentFieldWrap.hidden = !adjustmentFieldWrap.hidden;
    btnToggleAdjustment.hidden = !adjustmentFieldWrap.hidden;
    if (!adjustmentFieldWrap.hidden) document.getElementById('adjusts-search').focus();
  });

  await Promise.all([loadProducts(), loadPartners(), loadAdjustableDocs()]);
  renderPartnerOptions();
  receiptDateInput.value = nowForDatetimeLocal();
  updateTotalAmount();
  formDirty = false;
  quickAddSearch.focus();
})();
