// Trang "Chi tiet bao hanh" (migration 017) - dung chung cho CA them moi LAN sua, luu thay doi
// truc tiep tren giao dien nay (khong dung modal rieng - xem yeu cau nguoi dung 2026-08-01).
// - Khong co ?id tren URL: che do THEM MOI. Neu co ?customer_id, tu chon san khach hang do
//   (mo tu trang Chi tiet khach hang, xem customer-detail.js).
// - Co ?id: che do XEM/SUA, hien them khu vuc trang thai (vo hieu hoa/kich hoat, xoa - chi Admin).

const warrantyId = new URLSearchParams(window.location.search).get('id');
const prefillCustomerId = new URLSearchParams(window.location.search).get('customer_id');

let currentUser = null;
let partnersCache = [];
let currentWarranty = null;
// true = dang cap nhat form do NGUOI DUNG go (can tinh lai truong con lai); false = dang set
// gia tri bang code (vd khi load du lieu tu API) - tranh vong lap tinh di tinh lai khong can thiet.
let suppressCalc = false;

const pageTitle = document.getElementById('warranty-page-title');
const errorBox = document.getElementById('warranty-error');
const errorText = document.getElementById('warranty-error-text');
const form = document.getElementById('warranty-form');
const btnSubmit = document.getElementById('btn-submit-warranty');

const statusActionsEl = document.getElementById('warranty-status-actions');
const statusBadgeEl = document.getElementById('warranty-status-badge');
const btnToggleActive = document.getElementById('btn-toggle-active');
const btnDelete = document.getElementById('btn-delete-warranty');

const partnerSelect = document.getElementById('warranty-partner');
const phoneInput = document.getElementById('warranty-phone');
const addressInput = document.getElementById('warranty-address');
const acceptanceDateInput = document.getElementById('warranty-acceptance-date');
const expiryDateInput = document.getElementById('warranty-expiry-date');
const durationValueInput = document.getElementById('warranty-duration-value');
const durationUnitSelect = document.getElementById('warranty-duration-unit');
const noteInput = document.getElementById('warranty-note');

function renderError(message) {
  errorText.textContent = message;
  errorBox.hidden = false;
}

function todayDateStr() {
  return formatWarrantyDate(new Date());
}

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
expiryDateInput.addEventListener('change', recomputeDurationFromExpiry);
// Doi ngay nghiem thu -> giu nguyen thoi gian bao hanh da chon, tinh lai ngay het han theo do.
acceptanceDateInput.addEventListener('change', recomputeExpiryFromDuration);

function fillContactFromPartner(partnerId) {
  const partner = partnersCache.find((p) => String(p.id) === String(partnerId));
  phoneInput.value = partner ? partner.phone || '' : '';
  addressInput.value = partner ? partner.address || '' : '';
}

partnerSelect.addEventListener('change', () => fillContactFromPartner(partnerSelect.value));

async function loadPartners() {
  const { partners } = await apiFetch('/partners?type=khach_hang');
  partnersCache = partners;
  partnerSelect.innerHTML = '<option value="">-- Chọn khách hàng --</option>' +
    partners.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
}

function renderStatusActions() {
  if (!currentWarranty) {
    statusActionsEl.hidden = true;
    return;
  }

  statusActionsEl.hidden = false;
  statusBadgeEl.innerHTML = currentWarranty.is_active
    ? '<span class="badge badge-active">Đang hoạt động</span>'
    : '<span class="badge badge-inactive">Đã vô hiệu hóa</span>';

  btnToggleActive.innerHTML = currentWarranty.is_active
    ? `${icon('lock', 14)} Vô hiệu hóa`
    : `${icon('lockOpen', 14)} Kích hoạt lại`;

  btnDelete.hidden = !currentUser.is_protected;
  btnDelete.innerHTML = `${icon('trash', 14)} Xóa`;
}

btnToggleActive.addEventListener('click', async () => {
  if (!currentWarranty) return;
  const action = currentWarranty.is_active ? 'deactivate' : 'activate';
  btnToggleActive.disabled = true;
  try {
    const { warranty } = await apiFetch(`/warranties/${currentWarranty.id}/${action}`, { method: 'PATCH' });
    currentWarranty = warranty;
    renderStatusActions();
  } catch (err) {
    renderError(err.message);
  } finally {
    btnToggleActive.disabled = false;
  }
});

btnDelete.addEventListener('click', async () => {
  if (!currentWarranty) return;
  if (!confirm('Xóa thông tin bảo hành này? Không thể hoàn tác.')) return;

  btnDelete.disabled = true;
  try {
    await apiFetch(`/warranties/${currentWarranty.id}`, { method: 'DELETE' });
    window.location.href = 'warranties.html';
  } catch (err) {
    renderError(err.message);
    btnDelete.disabled = false;
  }
});

function fillFormFromWarranty(warranty) {
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
}

function initCreateDefaults() {
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
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.hidden = true;

  if (!partnerSelect.value) {
    renderError('Vui lòng chọn khách hàng');
    return;
  }
  if (expiryDateInput.value <= acceptanceDateInput.value) {
    renderError('Ngày hết hạn phải sau ngày nghiệm thu');
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Đang lưu...';

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
    if (warrantyId) {
      const { warranty } = await apiFetch(`/warranties/${warrantyId}`, { method: 'PUT', body: JSON.stringify(body) });
      currentWarranty = warranty;
      renderStatusActions();
    } else {
      const { warranty } = await apiFetch('/warranties', { method: 'POST', body: JSON.stringify(body) });
      window.location.href = `warranty-detail.html?id=${warranty.id}`;
      return;
    }
  } catch (err) {
    renderError(err.message);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = warrantyId ? 'Lưu thay đổi' : 'Tạo bảo hành';
  }
});

(async function init() {
  currentUser = await initLayout('warranties');
  if (!currentUser) return;

  document.getElementById('btn-back').innerHTML = icon('arrowLeft', 16);
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  try {
    await loadPartners();

    if (warrantyId) {
      pageTitle.textContent = 'Chi tiết bảo hành';
      btnSubmit.textContent = 'Lưu thay đổi';
      const { warranty } = await apiFetch(`/warranties/${warrantyId}`);
      currentWarranty = warranty;
      fillFormFromWarranty(warranty);
      renderStatusActions();
    } else {
      initCreateDefaults();
    }
  } catch (err) {
    renderError(err.message);
  }
})();
