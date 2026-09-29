// Logic trang danh sach Phieu nhap kho. Lap phieu moi/sua da chuyen sang trang rieng
// stock-receipt-form.html (2026-09-28, thay the popup cu) - trang nay chi con: danh sach, xem
// chi tiet, sua ngay nhap, sua don gia/chiet khau, gan bo sung NCC.

let currentUser = null;
let partnersCache = [];

const receiptsTbody = document.getElementById('receipts-tbody');
const receiptsErrorBox = document.getElementById('receipts-error');
const receiptsErrorText = document.getElementById('receipts-error-text');

const btnAddReceipt = document.getElementById('btn-add-receipt');

function formatMoney(value) {
  return Number(value).toLocaleString('vi-VN');
}

function formatDate(sqliteDateTime) {
  const iso = sqliteDateTime.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Chieu nguoc lai toSqliteDatetime() cu - dung de dien san gia tri hien tai (UTC, luu trong DB)
// vao o <input type="datetime-local"> (gio dia phuong) khi mo modal sua ngay.
function toDatetimeLocalValue(sqliteDateTime) {
  const iso = sqliteDateTime.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toSqliteDatetime(localValue) {
  const d = new Date(localValue);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function renderReceiptsError(message) {
  receiptsErrorText.textContent = message;
  receiptsErrorBox.hidden = false;
}

function renderReceiptRow(receipt) {
  const noteHtml = receipt.adjusts_code
    ? `<span class="badge badge-inactive" title="Điều chỉnh cho phiếu ${receipt.adjusts_code}">Điều chỉnh ${receipt.adjusts_code}</span> ${receipt.note || ''}`
    : (receipt.note || '-');

  const paymentBadge = receipt.is_opening_balance
    ? '<span class="badge badge-inactive" title="Chỉ đổi số lượng tồn, không phát sinh công nợ/phiếu chi">Tồn đầu kỳ</span>'
    : receipt.payment_status === 'cong_no'
      ? '<span class="badge badge-inactive">Công nợ</span>'
      : '<span class="badge badge-active">Đã thanh toán</span>';

  // Nut "Gan nha cung cap" - chi hien khi phieu dang trong (thuong la Nhap ton dau ky lap luc
  // khong chon NCC), de sau nay lap duoc "Tra hang NCC" cho san pham trong phieu (xem
  // stockReceipt.service.js#assignStockReceiptPartner(), docs/DECISIONS.md 2026-09-28).
  const assignPartnerItem = receipt.partner_id
    ? ''
    : `<button type="button" class="action-dropdown-item" data-action="assign-partner" data-id="${receipt.id}">${icon('truck', 16)} Gán nhà cung cấp</button>`;

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${receipt.code}</td>
    <td>${receipt.partner_name || '-'}</td>
    <td>${receipt.created_by_name}</td>
    <td>${paymentBadge}</td>
    <td class="note-cell-truncate">${noteHtml}</td>
    <td>${formatDate(receipt.created_at)}</td>
    <td>
      <div class="action-dropdown row-actions">
        <button type="button" class="icon-btn" data-action="toggle-menu" title="Thao tác">${icon('moreHorizontal', 16)}</button>
        <div class="action-dropdown-menu row-actions-menu" hidden>
          <button type="button" class="action-dropdown-item" data-action="view" data-id="${receipt.id}">${icon('eye', 16)} Xem chi tiết</button>
          <button type="button" class="action-dropdown-item" data-action="edit-date" data-id="${receipt.id}" data-created-at="${receipt.created_at}">${icon('pencil', 16)} Sửa ngày nhập</button>
          <button type="button" class="action-dropdown-item" data-action="edit-pricing" data-id="${receipt.id}">${icon('sliders', 16)} Sửa đơn giá/chiết khấu</button>
          ${assignPartnerItem}
        </div>
      </div>
    </td>
  `;
  // title gan qua DOM property (khong noi chuoi vao HTML) de tranh loi escape neu ghi chu co
  // dau nhay/ky tu dac biet - hien du noi dung khi re chuot vao o da bi cat bot bang CSS (dung
  // pattern da ap dung o stock-issues.js 2026-08-20).
  if (receipt.note) {
    tr.querySelector('.note-cell-truncate').title = receipt.note;
  }
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

document.addEventListener('click', (event) => {
  if (!event.target.closest('.row-actions')) closeAllRowActionMenus(receiptsTbody);
});

receiptsTbody.addEventListener('click', (event) => {
  const toggleButton = event.target.closest('button[data-action="toggle-menu"]');
  if (toggleButton) {
    event.stopPropagation();
    toggleRowActionsMenu(toggleButton, receiptsTbody);
    return;
  }
  closeAllRowActionMenus(receiptsTbody);

  const viewButton = event.target.closest('button[data-action="view"]');
  if (viewButton) {
    openReceiptDetailModal(viewButton.dataset.id);
    return;
  }

  const editDateButton = event.target.closest('button[data-action="edit-date"]');
  if (editDateButton) {
    openEditReceiptDateModal(editDateButton.dataset.id, editDateButton.dataset.createdAt);
    return;
  }

  const assignPartnerButton = event.target.closest('button[data-action="assign-partner"]');
  if (assignPartnerButton) {
    openAssignReceiptPartnerModal(assignPartnerButton.dataset.id);
    return;
  }

  const editPricingButton = event.target.closest('button[data-action="edit-pricing"]');
  if (editPricingButton) {
    openEditReceiptPricingModal(editPricingButton.dataset.id);
  }
});

// ----- Sua ngay nhap phieu (chi truong ngay, cac truong khac khoa - xem docs/DECISIONS.md) -----

const editReceiptDateModal = document.getElementById('edit-receipt-date-modal');
const editReceiptDateForm = document.getElementById('edit-receipt-date-form');
const editReceiptDateErrorBox = document.getElementById('edit-receipt-date-error');
const editReceiptDateErrorText = document.getElementById('edit-receipt-date-error-text');
const editReceiptDateInput = document.getElementById('edit-receipt-date-input');
const btnCancelEditReceiptDate = document.getElementById('btn-cancel-edit-receipt-date');
const btnSubmitEditReceiptDate = document.getElementById('btn-submit-edit-receipt-date');
let editingReceiptId = null;

function openEditReceiptDateModal(id, createdAt) {
  editingReceiptId = id;
  editReceiptDateInput.value = toDatetimeLocalValue(createdAt);
  editReceiptDateErrorBox.hidden = true;
  editReceiptDateModal.hidden = false;
}

function closeEditReceiptDateModal() {
  editReceiptDateModal.hidden = true;
  editingReceiptId = null;
}

btnCancelEditReceiptDate.addEventListener('click', closeEditReceiptDateModal);
editReceiptDateModal.addEventListener('click', (event) => {
  if (event.target === editReceiptDateModal) closeEditReceiptDateModal();
});

editReceiptDateForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  editReceiptDateErrorBox.hidden = true;

  if (!editReceiptDateInput.value) {
    editReceiptDateErrorText.textContent = 'Vui lòng chọn thời gian nhập';
    editReceiptDateErrorBox.hidden = false;
    return;
  }

  btnSubmitEditReceiptDate.disabled = true;
  btnSubmitEditReceiptDate.textContent = 'Đang lưu...';

  try {
    await apiFetch(`/stock-receipts/${editingReceiptId}/date`, {
      method: 'PATCH',
      body: JSON.stringify({ receipt_date: toSqliteDatetime(editReceiptDateInput.value) }),
    });
    closeEditReceiptDateModal();
    await loadReceipts();
  } catch (err) {
    editReceiptDateErrorText.textContent = err.message;
    editReceiptDateErrorBox.hidden = false;
  } finally {
    btnSubmitEditReceiptDate.disabled = false;
    btnSubmitEditReceiptDate.textContent = 'Lưu';
  }
});

// ----- Sua don gia/chiet khau tung dong (chi khi lo hang chua bi xuat dung - xem
// docs/DECISIONS.md 2026-09-28, stockReceipt.service.js#updateStockReceiptPricing()) -----

const editReceiptPricingModal = document.getElementById('edit-receipt-pricing-modal');
const editReceiptPricingForm = document.getElementById('edit-receipt-pricing-form');
const editReceiptPricingErrorBox = document.getElementById('edit-receipt-pricing-error');
const editReceiptPricingErrorText = document.getElementById('edit-receipt-pricing-error-text');
const editReceiptPricingItemsContainer = document.getElementById('edit-receipt-pricing-items');
const btnCancelEditReceiptPricing = document.getElementById('btn-cancel-edit-receipt-pricing');
const btnSubmitEditReceiptPricing = document.getElementById('btn-submit-edit-receipt-pricing');
let editingPricingReceiptId = null;

function pricingItemRowHtml(item) {
  return `
    <div class="pricing-item-block" data-item-id="${item.id}" style="margin-bottom: 16px;">
      <div class="form-field">
        <label>${item.product_code} - ${item.product_name} (SL: ${formatMoney(item.quantity)} ${item.unit})</label>
      </div>
      <div class="form-row">
        <div class="form-field">
          <label>Đơn giá</label>
          <input type="text" class="pricing-item-unit-price money-input" value="${item.unit_price}" />
        </div>
        <div class="form-field">
          <label>Chiết khấu (%)</label>
          <input type="number" class="pricing-item-discount" min="0" max="100" step="1" value="${item.discount_percent}" />
        </div>
      </div>
    </div>
  `;
}

async function openEditReceiptPricingModal(id) {
  editingPricingReceiptId = id;
  editReceiptPricingErrorBox.hidden = true;
  editReceiptPricingItemsContainer.innerHTML = 'Đang tải...';
  editReceiptPricingModal.hidden = false;

  try {
    const { receipt } = await apiFetch(`/stock-receipts/${id}`);
    editReceiptPricingItemsContainer.innerHTML = receipt.items.map((item) => pricingItemRowHtml(item)).join('');
    bindMoneyInputs(editReceiptPricingItemsContainer);
  } catch (err) {
    editReceiptPricingErrorText.textContent = err.message;
    editReceiptPricingErrorBox.hidden = false;
  }
}

function closeEditReceiptPricingModal() {
  editReceiptPricingModal.hidden = true;
  editingPricingReceiptId = null;
}

btnCancelEditReceiptPricing.addEventListener('click', closeEditReceiptPricingModal);
editReceiptPricingModal.addEventListener('click', (event) => {
  if (event.target === editReceiptPricingModal) closeEditReceiptPricingModal();
});

editReceiptPricingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  editReceiptPricingErrorBox.hidden = true;

  const rows = Array.from(editReceiptPricingItemsContainer.querySelectorAll('[data-item-id]'));
  const items = rows.map((row) => ({
    item_id: Number(row.dataset.itemId),
    unit_price: getMoneyValue(row.querySelector('.pricing-item-unit-price')),
    discount_percent: Number(row.querySelector('.pricing-item-discount').value) || 0,
  }));

  btnSubmitEditReceiptPricing.disabled = true;
  btnSubmitEditReceiptPricing.textContent = 'Đang lưu...';

  try {
    await apiFetch(`/stock-receipts/${editingPricingReceiptId}/pricing`, {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    });
    closeEditReceiptPricingModal();
    await loadReceipts();
  } catch (err) {
    editReceiptPricingErrorText.textContent = err.message;
    editReceiptPricingErrorBox.hidden = false;
  } finally {
    btnSubmitEditReceiptPricing.disabled = false;
    btnSubmitEditReceiptPricing.textContent = 'Lưu';
  }
});

// ----- Gan bo sung NCC cho phieu dang trong partner_id (xem docs/DECISIONS.md 2026-09-28) -----

const assignReceiptPartnerModal = document.getElementById('assign-receipt-partner-modal');
const assignReceiptPartnerForm = document.getElementById('assign-receipt-partner-form');
const assignReceiptPartnerErrorBox = document.getElementById('assign-receipt-partner-error');
const assignReceiptPartnerErrorText = document.getElementById('assign-receipt-partner-error-text');
const assignReceiptPartnerSelect = document.getElementById('assign-receipt-partner-select');
const btnCancelAssignReceiptPartner = document.getElementById('btn-cancel-assign-receipt-partner');
const btnSubmitAssignReceiptPartner = document.getElementById('btn-submit-assign-receipt-partner');
let assigningReceiptId = null;

function openAssignReceiptPartnerModal(id) {
  assigningReceiptId = id;
  const options = partnersCache.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  assignReceiptPartnerSelect.innerHTML = options || '<option value="">-- Chưa có nhà cung cấp nào --</option>';
  assignReceiptPartnerErrorBox.hidden = true;
  assignReceiptPartnerModal.hidden = false;
}

function closeAssignReceiptPartnerModal() {
  assignReceiptPartnerModal.hidden = true;
  assigningReceiptId = null;
}

btnCancelAssignReceiptPartner.addEventListener('click', closeAssignReceiptPartnerModal);
assignReceiptPartnerModal.addEventListener('click', (event) => {
  if (event.target === assignReceiptPartnerModal) closeAssignReceiptPartnerModal();
});

assignReceiptPartnerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  assignReceiptPartnerErrorBox.hidden = true;

  if (!assignReceiptPartnerSelect.value) {
    assignReceiptPartnerErrorText.textContent = 'Vui lòng chọn nhà cung cấp';
    assignReceiptPartnerErrorBox.hidden = false;
    return;
  }

  btnSubmitAssignReceiptPartner.disabled = true;
  btnSubmitAssignReceiptPartner.textContent = 'Đang lưu...';

  try {
    await apiFetch(`/stock-receipts/${assigningReceiptId}/partner`, {
      method: 'PATCH',
      body: JSON.stringify({ partner_id: Number(assignReceiptPartnerSelect.value) }),
    });
    closeAssignReceiptPartnerModal();
    await loadReceipts();
  } catch (err) {
    assignReceiptPartnerErrorText.textContent = err.message;
    assignReceiptPartnerErrorBox.hidden = false;
  } finally {
    btnSubmitAssignReceiptPartner.disabled = false;
    btnSubmitAssignReceiptPartner.textContent = 'Gán';
  }
});

async function loadPartners() {
  const { partners } = await apiFetch('/partners?type=nha_cung_cap');
  partnersCache = partners;
}

btnAddReceipt.addEventListener('click', () => {
  window.location.href = 'stock-receipt-form.html';
});

(async function init() {
  currentUser = await initLayout('stock-receipts');
  if (!currentUser) return;

  btnAddReceipt.innerHTML = `${icon('plus', 16)} Lập phiếu nhập`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });
  initReceiptDetailModal();

  await Promise.all([loadPartners(), loadReceipts()]);
})();
