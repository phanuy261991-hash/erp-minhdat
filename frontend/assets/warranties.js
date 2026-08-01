// Logic trang danh sach Bao hanh (migration 017, menu Khach hang): danh sach, tim kiem theo
// ten khach hang, them moi/sua qua MODAL (dung pattern chung voi moi trang khac trong he thong -
// doi tu 1 trang rieng warranty-detail.html sang popup theo phan hoi nguoi dung 2026-08-01),
// vo hieu hoa/kich hoat lai, xoa (chi Admin).
//
// Ho tro mo san modal tu URL query (dung khi dieu huong tu customer-detail.html):
// ?customer_id=X -> mo modal THEM MOI, chon san khach hang X.
// ?edit=Y -> mo modal SUA ban ghi bao hanh id=Y.

let currentUser = null;
let warrantiesCache = [];
let partnersCache = [];
let searchKeyword = '';
let editingWarrantyId = null;
// true = dang set gia tri bang code (vd khi mo modal sua) - tranh tinh di tinh lai khong can
// thiet giua Thoi gian bao hanh va Ngay het han (xem warranty-calc.js).
let suppressCalc = false;

const warrantiesTbody = document.getElementById('warranties-tbody');
const warrantiesErrorBox = document.getElementById('warranties-error');
const warrantiesErrorText = document.getElementById('warranties-error-text');
const searchInput = document.getElementById('warranty-search');

const btnAddWarranty = document.getElementById('btn-add-warranty');
const warrantyModal = document.getElementById('warranty-modal');
const warrantyModalTitle = document.getElementById('warranty-modal-title');
const warrantyForm = document.getElementById('warranty-form');
const warrantyFormErrorBox = document.getElementById('warranty-form-error');
const warrantyFormErrorText = document.getElementById('warranty-form-error-text');
const btnCancelWarranty = document.getElementById('btn-cancel-warranty');
const btnSubmitWarranty = document.getElementById('btn-submit-warranty');

const partnerSelect = document.getElementById('warranty-partner');
const phoneInput = document.getElementById('warranty-phone');
const addressInput = document.getElementById('warranty-address');
const acceptanceDateInput = document.getElementById('warranty-acceptance-date');
const expiryDateInput = document.getElementById('warranty-expiry-date');
const durationValueInput = document.getElementById('warranty-duration-value');
const durationUnitSelect = document.getElementById('warranty-duration-unit');
const noteInput = document.getElementById('warranty-note');

function renderWarrantiesError(message) {
  warrantiesErrorText.textContent = message;
  warrantiesErrorBox.hidden = false;
}

function getVisibleWarranties() {
  const keyword = searchKeyword.trim().toLowerCase();
  if (!keyword) return warrantiesCache;
  return warrantiesCache.filter((w) => w.partner_name.toLowerCase().includes(keyword));
}

// Trang thai: vo hieu hoa (xam) > het han (do) > sap het han <=30 ngay (cam, dung chung
// .stock-low da co) > con han (xanh).
function statusBadge(warranty) {
  if (!warranty.is_active) {
    return '<span class="badge badge-inactive">Đã vô hiệu hóa</span>';
  }
  const daysRemaining = warrantyDaysRemaining(warranty.expiry_date);
  if (daysRemaining < 0) {
    return '<span class="badge badge-down">Hết hạn</span>';
  }
  if (daysRemaining <= 30) {
    return `<span class="stock-low">${icon('warningTriangle', 12)} Còn ${daysRemaining} ngày</span>`;
  }
  return '<span class="badge badge-active">Còn hạn</span>';
}

function renderRow(warranty) {
  const tr = document.createElement('tr');
  const deleteActionHtml = currentUser.is_protected
    ? `<button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${warranty.id}" title="Xóa thông tin bảo hành">${icon('trash', 14)}</button>`
    : '';
  const toggleActionHtml = warranty.is_active
    ? `<button type="button" class="icon-btn" data-action="deactivate" data-id="${warranty.id}" title="Vô hiệu hóa">${icon('lock', 14)}</button>`
    : `<button type="button" class="icon-btn" data-action="activate" data-id="${warranty.id}" title="Kích hoạt lại">${icon('lockOpen', 14)}</button>`;

  tr.innerHTML = `
    <td>${warranty.partner_name}</td>
    <td>${warranty.phone || '-'}</td>
    <td>${formatWarrantyDateVN(warranty.acceptance_date)}</td>
    <td>${formatWarrantyDateVN(warranty.expiry_date)}</td>
    <td>${formatWarrantyDuration(warranty.duration_value, warranty.duration_unit)}</td>
    <td>${statusBadge(warranty)}</td>
    <td>
      <button type="button" class="icon-btn" data-action="edit" data-id="${warranty.id}" title="Xem/sửa chi tiết">${icon('pencil', 14)}</button>
      ${toggleActionHtml}
      ${deleteActionHtml}
    </td>
  `;
  return tr;
}

function renderWarranties() {
  warrantiesTbody.innerHTML = '';
  getVisibleWarranties().forEach((w) => warrantiesTbody.appendChild(renderRow(w)));
}

async function loadWarranties() {
  try {
    const { warranties } = await apiFetch('/warranties');
    warrantiesCache = warranties;
    renderWarranties();
  } catch (err) {
    renderWarrantiesError(err.message);
  }
}

async function loadPartners() {
  const { partners } = await apiFetch('/partners?type=khach_hang');
  partnersCache = partners;
  partnerSelect.innerHTML = '<option value="">-- Chọn khách hàng --</option>' +
    partners.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
}

searchInput.addEventListener('input', (event) => {
  searchKeyword = event.target.value;
  renderWarranties();
});

// ----- Tinh 2 chieu Thoi gian bao hanh <-> Ngay het han (warranty-calc.js) -----

function recomputeExpiryFromDuration() {
  if (suppressCalc || !acceptanceDateInput.value || !durationValueInput.value) return;
  expiryDateInput.value = computeExpiryFromDuration(acceptanceDateInput.value, durationValueInput.value, durationUnitSelect.value);
}

function recomputeDurationFromExpiry() {
  if (suppressCalc || !acceptanceDateInput.value || !expiryDateInput.value) return;
  if (expiryDateInput.value <= acceptanceDateInput.value) return;
  const { value, unit } = computeDurationFromExpiry(acceptanceDateInput.value, expiryDateInput.value);
  suppressCalc = true;
  durationValueInput.value = value;
  durationUnitSelect.value = unit;
  suppressCalc = false;
}

durationValueInput.addEventListener('input', recomputeExpiryFromDuration);
durationUnitSelect.addEventListener('change', recomputeExpiryFromDuration);
expiryDateInput.addEventListener('input', recomputeDurationFromExpiry);
expiryDateInput.addEventListener('change', recomputeDurationFromExpiry);
// Doi ngay nghiem thu -> giu nguyen thoi gian bao hanh da chon, tinh lai ngay het han theo do.
acceptanceDateInput.addEventListener('change', recomputeExpiryFromDuration);

function fillContactFromPartner(partnerId) {
  const partner = partnersCache.find((p) => String(p.id) === String(partnerId));
  phoneInput.value = partner ? partner.phone || '' : '';
  addressInput.value = partner ? partner.address || '' : '';
}

partnerSelect.addEventListener('change', () => fillContactFromPartner(partnerSelect.value));

// ----- Mo/dong modal them moi/sua -----

function todayDateStr() {
  return formatWarrantyDate(new Date());
}

function openCreateModal(prefillCustomerId) {
  editingWarrantyId = null;
  warrantyModalTitle.textContent = 'Thêm bảo hành mới';
  btnSubmitWarranty.textContent = 'Tạo bảo hành';
  warrantyForm.reset();
  warrantyFormErrorBox.hidden = true;

  suppressCalc = true;
  acceptanceDateInput.value = todayDateStr();
  durationValueInput.value = 1;
  durationUnitSelect.value = 'nam';
  suppressCalc = false;
  recomputeExpiryFromDuration();

  if (prefillCustomerId) {
    partnerSelect.value = prefillCustomerId;
    fillContactFromPartner(prefillCustomerId);
  }

  warrantyModal.hidden = false;
}

function openEditModal(warranty) {
  editingWarrantyId = warranty.id;
  warrantyModalTitle.textContent = 'Sửa thông tin bảo hành';
  btnSubmitWarranty.textContent = 'Lưu thay đổi';
  warrantyFormErrorBox.hidden = true;

  suppressCalc = true;
  partnerSelect.value = warranty.partner_id;
  phoneInput.value = warranty.phone || '';
  addressInput.value = warranty.address || '';
  acceptanceDateInput.value = warranty.acceptance_date;
  expiryDateInput.value = warranty.expiry_date;
  durationValueInput.value = warranty.duration_value;
  durationUnitSelect.value = warranty.duration_unit;
  noteInput.value = warranty.note || '';
  suppressCalc = false;

  warrantyModal.hidden = false;
}

function closeWarrantyModal() {
  warrantyModal.hidden = true;
}

btnAddWarranty.addEventListener('click', () => openCreateModal(null));
btnCancelWarranty.addEventListener('click', closeWarrantyModal);
warrantyModal.addEventListener('click', (event) => {
  if (event.target === warrantyModal) closeWarrantyModal();
});

warrantyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  warrantyFormErrorBox.hidden = true;

  if (!partnerSelect.value) {
    warrantyFormErrorText.textContent = 'Vui lòng chọn khách hàng';
    warrantyFormErrorBox.hidden = false;
    return;
  }
  if (expiryDateInput.value <= acceptanceDateInput.value) {
    warrantyFormErrorText.textContent = 'Ngày hết hạn phải sau ngày nghiệm thu';
    warrantyFormErrorBox.hidden = false;
    return;
  }

  btnSubmitWarranty.disabled = true;
  btnSubmitWarranty.textContent = 'Đang lưu...';

  const body = {
    partner_id: Number(partnerSelect.value),
    phone: phoneInput.value.trim(),
    address: addressInput.value.trim(),
    acceptance_date: acceptanceDateInput.value,
    expiry_date: expiryDateInput.value,
    duration_value: Number(durationValueInput.value),
    duration_unit: durationUnitSelect.value,
    note: noteInput.value.trim(),
  };

  try {
    if (editingWarrantyId === null) {
      await apiFetch('/warranties', { method: 'POST', body: JSON.stringify(body) });
    } else {
      await apiFetch(`/warranties/${editingWarrantyId}`, { method: 'PUT', body: JSON.stringify(body) });
    }
    closeWarrantyModal();
    await loadWarranties();
  } catch (err) {
    warrantyFormErrorText.textContent = err.message;
    warrantyFormErrorBox.hidden = false;
  } finally {
    btnSubmitWarranty.disabled = false;
    btnSubmitWarranty.textContent = editingWarrantyId === null ? 'Tạo bảo hành' : 'Lưu thay đổi';
  }
});

warrantiesTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === 'edit') {
    const warranty = warrantiesCache.find((w) => String(w.id) === id);
    if (warranty) openEditModal(warranty);
    return;
  }

  if (action === 'delete' && !confirm('Xóa thông tin bảo hành này? Không thể hoàn tác.')) {
    return;
  }

  button.disabled = true;
  try {
    if (action === 'delete') {
      await apiFetch(`/warranties/${id}`, { method: 'DELETE' });
    } else if (action === 'deactivate') {
      await apiFetch(`/warranties/${id}/deactivate`, { method: 'PATCH' });
    } else if (action === 'activate') {
      await apiFetch(`/warranties/${id}/activate`, { method: 'PATCH' });
    }
    await loadWarranties();
  } catch (err) {
    renderWarrantiesError(err.message);
    button.disabled = false;
  }
});

(async function init() {
  currentUser = await initLayout('warranties');
  if (!currentUser) return;

  btnAddWarranty.innerHTML = `${icon('plus', 16)} Thêm bảo hành mới`;
  document.querySelector('.search-box .input-icon').innerHTML = icon('search', 16);
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await Promise.all([loadWarranties(), loadPartners()]);

  // Mo san modal neu dieu huong tu customer-detail.html (?customer_id= them moi, ?edit= sua).
  const params = new URLSearchParams(window.location.search);
  const prefillCustomerId = params.get('customer_id');
  const editId = params.get('edit');
  if (editId) {
    const warranty = warrantiesCache.find((w) => String(w.id) === editId);
    if (warranty) openEditModal(warranty);
  } else if (prefillCustomerId) {
    openCreateModal(prefillCustomerId);
  }
})();
