// Logic trang danh sach Bao hanh (migration 017, menu Khach hang): danh sach, tim kiem theo
// ten khach hang, them moi/sua qua MODAL (dung pattern chung voi moi trang khac trong he thong -
// doi tu 1 trang rieng warranty-detail.html sang popup theo phan hoi nguoi dung 2026-08-01),
// vo hieu hoa/kich hoat lai, xoa (chi Admin).
//
// Ho tro mo san modal tu URL query (dung khi dieu huong tu customer-detail.html/project-detail.html):
// ?customer_id=X -> mo modal THEM MOI, chon san khach hang X.
// ?project_id=Y -> di kem ?customer_id=, chon san du an Y (sau khi da nap xong danh sach du an
// cua khach hang do).
// ?edit=Y -> mo modal SUA ban ghi bao hanh id=Y.
//
// Migration 038 ("quy bao hanh ve theo du an"): them select "Du an" (tuy chon - da chot qua
// AskUserQuestion) loc theo dung khach hang dang chon. GET /api/projects doi hoi quyen 'du_an'
// rieng voi 'bao_hanh' (2 module da tach tu 2026-08-08) - neu tai khoan khong co 'du_an' thi AN
// HAN truong nay (khong goi API se 403), van tao/sua bao hanh binh thuong khong gan du an.

let currentUser = null;
let warrantiesCache = [];
let partnersCache = [];
let projectsCache = []; // du an CUA KHACH HANG dang chon trong modal (nap lai moi khi doi khach hang)
let canUseProjects = false; // co quyen 'du_an' khong - quyet dinh co hien truong "Du an" hay khong
let searchKeyword = '';
let editingWarrantyId = null;
// true = dang set gia tri bang code (vd khi mo modal sua) - tranh tinh di tinh lai khong can
// thiet giua Thoi gian bao hanh va Ngay het han (xem warranty-calc.js).
let suppressCalc = false;
let acceptanceSortDir = null; // null | 'asc' | 'desc'

// ----- Modal "Chi tiet bao hanh" + Lich su bao hanh (migration 038) -----
// Cung 1 CRUD warranty_visits nhu tab "Bao hanh" o project-detail.js, nhung o day xem duoc CHO
// MOI ban ghi warranties (khong chi ban da gan du an) - vi trang nay la trang quan ly bao hanh
// chinh, khong phu thuoc quyen 'du_an'.
let staffCache = [];
let currentDetailWarranty = null;
let currentDetailVisits = [];
let editingWarrantyVisit = null; // { visitId } | null (null = tao moi)

const warrantiesTbody = document.getElementById('warranties-tbody');
const warrantiesErrorBox = document.getElementById('warranties-error');
const warrantiesErrorText = document.getElementById('warranties-error-text');
const searchInput = document.getElementById('warranty-search');
const thAcceptanceDate = document.getElementById('th-acceptance-date');

const btnAddWarranty = document.getElementById('btn-add-warranty');
const warrantyModal = document.getElementById('warranty-modal');
const warrantyModalTitle = document.getElementById('warranty-modal-title');
const warrantyForm = document.getElementById('warranty-form');
const warrantyFormErrorBox = document.getElementById('warranty-form-error');
const warrantyFormErrorText = document.getElementById('warranty-form-error-text');
const btnCancelWarranty = document.getElementById('btn-cancel-warranty');
const btnSubmitWarranty = document.getElementById('btn-submit-warranty');

const partnerSelect = document.getElementById('warranty-partner');
const projectField = document.getElementById('warranty-project-field');
const projectSelect = document.getElementById('warranty-project');
const phoneInput = document.getElementById('warranty-phone');
const addressInput = document.getElementById('warranty-address');
const acceptanceDateInput = document.getElementById('warranty-acceptance-date');
const expiryDateInput = document.getElementById('warranty-expiry-date');
const durationValueInput = document.getElementById('warranty-duration-value');
const durationUnitSelect = document.getElementById('warranty-duration-unit');
const noteInput = document.getElementById('warranty-note');

const warrantyDetailModal = document.getElementById('warranty-detail-modal');
const warrantyDetailTitle = document.getElementById('warranty-detail-title');
const warrantyDetailInfo = document.getElementById('warranty-detail-info');
const btnCloseWarrantyDetail = document.getElementById('btn-close-warranty-detail');
const btnAddWarrantyVisit = document.getElementById('btn-add-warranty-visit');
const warrantyVisitsEmpty = document.getElementById('warranty-visits-empty');
const warrantyVisitsTbody = document.getElementById('warranty-visits-tbody');

const warrantyVisitModal = document.getElementById('warranty-visit-modal');
const warrantyVisitModalTitle = document.getElementById('warranty-visit-modal-title');
const warrantyVisitForm = document.getElementById('warranty-visit-form');
const warrantyVisitFormErrorBox = document.getElementById('warranty-visit-form-error');
const warrantyVisitFormErrorText = document.getElementById('warranty-visit-form-error-text');
const btnCancelWarrantyVisit = document.getElementById('btn-cancel-warranty-visit');
const btnSubmitWarrantyVisit = document.getElementById('btn-submit-warranty-visit');
const warrantyVisitNumberInput = document.getElementById('warranty-visit-number');
const warrantyVisitDateInput = document.getElementById('warranty-visit-date');
const warrantyVisitContentInput = document.getElementById('warranty-visit-content');
const warrantyVisitPerformedBySelect = document.getElementById('warranty-visit-performed-by');
const warrantyVisitResultSelect = document.getElementById('warranty-visit-result');
const warrantyVisitNoteInput = document.getElementById('warranty-visit-note');

const VISIT_RESULT_LABELS = { hoan_thanh: 'Hoàn thành', chua_hoan_thanh: 'Chưa hoàn thành', tam_dung: 'Tạm dừng' };
const VISIT_RESULT_BADGE_CLASS = { hoan_thanh: 'badge-active', chua_hoan_thanh: 'badge-inactive', tam_dung: 'badge-down' };

function renderWarrantiesError(message) {
  warrantiesErrorText.textContent = message;
  warrantiesErrorBox.hidden = false;
}

function getVisibleWarranties() {
  const keyword = searchKeyword.trim().toLowerCase();
  let list = warrantiesCache;

  if (keyword) {
    list = list.filter((w) => w.partner_name.toLowerCase().includes(keyword) || (w.phone || '').toLowerCase().includes(keyword));
  }

  if (acceptanceSortDir) {
    list = [...list].sort((a, b) => {
      const cmp = a.acceptance_date.localeCompare(b.acceptance_date);
      return acceptanceSortDir === 'asc' ? cmp : -cmp;
    });
  }

  return list;
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

  const projectCellHtml = warranty.project_id
    ? `${warranty.project_code} - ${warranty.project_name}`
    : '-';

  tr.innerHTML = `
    <td>${warranty.partner_name}</td>
    <td>${projectCellHtml}</td>
    <td>${warranty.phone || '-'}</td>
    <td>${formatWarrantyDateVN(warranty.acceptance_date)}</td>
    <td>${formatWarrantyDateVN(warranty.expiry_date)}</td>
    <td>${formatWarrantyDuration(warranty.duration_value, warranty.duration_unit)}</td>
    <td>${statusBadge(warranty)}</td>
    <td>
      <button type="button" class="icon-btn" data-action="view" data-id="${warranty.id}" title="Xem chi tiết + lịch sử bảo hành">${icon('eye', 14)}</button>
      <button type="button" class="icon-btn" data-action="edit" data-id="${warranty.id}" title="Sửa thông tin bảo hành">${icon('pencil', 14)}</button>
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

function updateSortIconUi() {
  const iconSlot = thAcceptanceDate.querySelector('.sort-icon');
  thAcceptanceDate.classList.toggle('sort-active', Boolean(acceptanceSortDir));
  iconSlot.innerHTML = icon(acceptanceSortDir === 'asc' ? 'chevronUp' : 'chevronDown', 14);
}

thAcceptanceDate.addEventListener('click', () => {
  acceptanceSortDir = acceptanceSortDir === 'asc' ? 'desc' : 'asc';
  updateSortIconUi();
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

// Nap danh sach du an CUA DUNG khach hang dang chon vao select "Du an" - chi goi khi tai khoan
// co quyen 'du_an' (canUseProjects), vi GET /api/projects doi hoi quyen do rieng voi 'bao_hanh'
// (2 module da tach tu 2026-08-08). Loi tai du an (vd mat quyen giua chung) khong chan duoc luong
// tao/sua bao hanh - chi de select rong, van tao/sua binh thuong khong gan du an.
async function loadProjectsForPartner(partnerId, preselectProjectId) {
  if (!canUseProjects) return;

  if (!partnerId) {
    projectsCache = [];
    projectSelect.innerHTML = '<option value="">-- Không gắn dự án --</option>';
    projectSelect.disabled = true;
    return;
  }

  projectSelect.disabled = false;
  try {
    const { projects } = await apiFetch(`/projects?partner_id=${partnerId}`);
    projectsCache = projects;
    projectSelect.innerHTML = '<option value="">-- Không gắn dự án --</option>' +
      projects.map((p) => `<option value="${p.id}">${p.code} - ${p.name}</option>`).join('');
    if (preselectProjectId) {
      projectSelect.value = preselectProjectId;
    }
  } catch (err) {
    projectsCache = [];
    projectSelect.innerHTML = '<option value="">-- Không gắn dự án --</option>';
  }
}

partnerSelect.addEventListener('change', () => {
  fillContactFromPartner(partnerSelect.value);
  loadProjectsForPartner(partnerSelect.value);
});

// ----- Mo/dong modal them moi/sua -----

function todayDateStr() {
  return formatWarrantyDate(new Date());
}

function openCreateModal(prefillCustomerId, prefillProjectId) {
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

  loadProjectsForPartner(null);
  if (prefillCustomerId) {
    partnerSelect.value = prefillCustomerId;
    fillContactFromPartner(prefillCustomerId);
    loadProjectsForPartner(prefillCustomerId, prefillProjectId);
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

  loadProjectsForPartner(warranty.partner_id, warranty.project_id);

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
    project_id: canUseProjects && projectSelect.value ? Number(projectSelect.value) : null,
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

// ----- Modal "Chi tiet bao hanh" + Lich su bao hanh -----

function warrantyDetailInfoItem(label, value) {
  return `<div class="detail-info-item"><p class="detail-label">${label}</p><p class="detail-value">${value}</p></div>`;
}

function renderWarrantyDetailInfo(warranty) {
  const projectValue = warranty.project_id ? `${warranty.project_code} - ${warranty.project_name}` : '-';
  warrantyDetailInfo.innerHTML = [
    warrantyDetailInfoItem('Khách hàng', warranty.partner_name),
    warrantyDetailInfoItem('Dự án', projectValue),
    warrantyDetailInfoItem('Số điện thoại', warranty.phone || '-'),
    warrantyDetailInfoItem('Địa chỉ', warranty.address || '-'),
    warrantyDetailInfoItem('Ngày nghiệm thu', formatWarrantyDateVN(warranty.acceptance_date)),
    warrantyDetailInfoItem('Ngày hết hạn', formatWarrantyDateVN(warranty.expiry_date)),
    warrantyDetailInfoItem('Thời gian bảo hành', formatWarrantyDuration(warranty.duration_value, warranty.duration_unit)),
    warrantyDetailInfoItem('Trạng thái', statusBadge(warranty)),
  ].join('');
}

function renderVisitRow(visit) {
  return `
    <tr>
      <td>${visit.visit_number}</td>
      <td>${formatWarrantyDateVN(visit.performed_date)}</td>
      <td>${visit.content}</td>
      <td>${visit.performed_by_name || '-'}</td>
      <td><span class="badge ${VISIT_RESULT_BADGE_CLASS[visit.result]}">${VISIT_RESULT_LABELS[visit.result]}</span></td>
      <td>${visit.note || '-'}</td>
      <td>
        <button type="button" class="icon-btn" data-action="edit-visit" data-visit-id="${visit.id}" title="Sửa lần bảo hành">${icon('pencil', 14)}</button>
        <button type="button" class="icon-btn icon-btn-danger" data-action="delete-visit" data-visit-id="${visit.id}" title="Xóa lần bảo hành">${icon('trash', 14)}</button>
      </td>
    </tr>
  `;
}

function renderVisitsTable() {
  if (currentDetailVisits.length === 0) {
    warrantyVisitsEmpty.hidden = false;
    warrantyVisitsTbody.innerHTML = '';
    return;
  }
  warrantyVisitsEmpty.hidden = true;
  warrantyVisitsTbody.innerHTML = currentDetailVisits.map(renderVisitRow).join('');
}

async function loadVisitsForDetail() {
  const { visits } = await apiFetch(`/warranties/${currentDetailWarranty.id}/visits`);
  currentDetailVisits = visits;
  renderVisitsTable();
}

async function openDetailModal(warranty) {
  currentDetailWarranty = warranty;
  warrantyDetailTitle.textContent = warranty.note ? warranty.note : 'Chi tiết bảo hành';
  renderWarrantyDetailInfo(warranty);
  warrantyDetailModal.hidden = false;
  try {
    await loadVisitsForDetail();
  } catch (err) {
    renderWarrantiesError(err.message);
  }
}

function closeWarrantyDetailModal() {
  warrantyDetailModal.hidden = true;
  currentDetailWarranty = null;
  currentDetailVisits = [];
}

btnCloseWarrantyDetail.addEventListener('click', closeWarrantyDetailModal);
warrantyDetailModal.addEventListener('click', (event) => {
  if (event.target === warrantyDetailModal) closeWarrantyDetailModal();
});

async function loadStaff() {
  const { staff } = await apiFetch('/partners/staff');
  staffCache = staff;
  warrantyVisitPerformedBySelect.innerHTML = '<option value="">-- Chọn nhân viên --</option>' +
    staff.map((s) => `<option value="${s.id}">${s.full_name}</option>`).join('');
}

function openCreateVisitModal() {
  editingWarrantyVisit = { visitId: null };
  warrantyVisitModalTitle.textContent = 'Thêm lần bảo hành';
  warrantyVisitForm.reset();
  warrantyVisitFormErrorBox.hidden = true;
  warrantyVisitNumberInput.value = `Lần thứ ${currentDetailVisits.length + 1}`;
  warrantyVisitResultSelect.value = 'hoan_thanh';
  warrantyVisitModal.hidden = false;
}

function openEditVisitModal(visitId) {
  const visit = currentDetailVisits.find((v) => String(v.id) === String(visitId));
  if (!visit) return;

  editingWarrantyVisit = { visitId: Number(visitId) };
  warrantyVisitModalTitle.textContent = 'Sửa lần bảo hành';
  warrantyVisitFormErrorBox.hidden = true;
  warrantyVisitNumberInput.value = `Lần thứ ${visit.visit_number}`;
  warrantyVisitDateInput.value = visit.performed_date;
  warrantyVisitContentInput.value = visit.content;
  warrantyVisitPerformedBySelect.value = visit.performed_by_user_id || '';
  warrantyVisitResultSelect.value = visit.result;
  warrantyVisitNoteInput.value = visit.note || '';
  warrantyVisitModal.hidden = false;
}

function closeWarrantyVisitModal() {
  warrantyVisitModal.hidden = true;
  editingWarrantyVisit = null;
}

btnAddWarrantyVisit.addEventListener('click', openCreateVisitModal);
btnCancelWarrantyVisit.addEventListener('click', closeWarrantyVisitModal);
warrantyVisitModal.addEventListener('click', (event) => {
  if (event.target === warrantyVisitModal) closeWarrantyVisitModal();
});

warrantyVisitsTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, visitId } = button.dataset;

  if (action === 'edit-visit') {
    openEditVisitModal(visitId);
    return;
  }
  if (action === 'delete-visit') {
    if (!confirm('Xóa lần bảo hành này?')) return;
    button.disabled = true;
    try {
      await apiFetch(`/warranties/${currentDetailWarranty.id}/visits/${visitId}`, { method: 'DELETE' });
      await loadVisitsForDetail();
    } catch (err) {
      renderWarrantiesError(err.message);
      button.disabled = false;
    }
  }
});

warrantyVisitForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  warrantyVisitFormErrorBox.hidden = true;
  btnSubmitWarrantyVisit.disabled = true;
  btnSubmitWarrantyVisit.textContent = 'Đang lưu...';

  const body = {
    performed_date: warrantyVisitDateInput.value,
    content: warrantyVisitContentInput.value.trim(),
    performed_by_user_id: Number(warrantyVisitPerformedBySelect.value) || null,
    result: warrantyVisitResultSelect.value,
    note: warrantyVisitNoteInput.value.trim(),
  };

  try {
    const { visitId } = editingWarrantyVisit;
    if (visitId === null) {
      await apiFetch(`/warranties/${currentDetailWarranty.id}/visits`, { method: 'POST', body: JSON.stringify(body) });
    } else {
      await apiFetch(`/warranties/${currentDetailWarranty.id}/visits/${visitId}`, { method: 'PUT', body: JSON.stringify(body) });
    }
    closeWarrantyVisitModal();
    await loadVisitsForDetail();
  } catch (err) {
    warrantyVisitFormErrorText.textContent = err.message;
    warrantyVisitFormErrorBox.hidden = false;
  } finally {
    btnSubmitWarrantyVisit.disabled = false;
    btnSubmitWarrantyVisit.textContent = 'Lưu';
  }
});

warrantiesTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === 'view') {
    const warranty = warrantiesCache.find((w) => String(w.id) === id);
    if (warranty) openDetailModal(warranty);
    return;
  }

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
  btnAddWarrantyVisit.innerHTML = `${icon('plus', 16)} Thêm lần bảo hành`;
  document.querySelector('.search-box .input-icon').innerHTML = icon('search', 16);
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  // Module 'du_an' tach rieng khoi 'bao_hanh' (2026-08-08) - tai khoan co 'bao_hanh' nhung khong
  // co 'du_an' van tao/sua bao hanh binh thuong, chi khong thay/chon duoc truong "Du an" (an het
  // ca khoi thay vi de loi 403 khi goi GET /api/projects).
  canUseProjects = currentUser.permissions.includes('du_an');
  projectField.hidden = !canUseProjects;

  await Promise.all([loadWarranties(), loadPartners(), loadStaff()]);

  // Mo san modal neu dieu huong tu customer-detail.html/project-detail.html (?customer_id= them
  // moi kem tuy chon ?project_id=, ?edit= sua).
  const params = new URLSearchParams(window.location.search);
  const prefillCustomerId = params.get('customer_id');
  const prefillProjectId = params.get('project_id');
  const editId = params.get('edit');
  if (editId) {
    const warranty = warrantiesCache.find((w) => String(w.id) === editId);
    if (warranty) openEditModal(warranty);
  } else if (prefillCustomerId) {
    openCreateModal(prefillCustomerId, prefillProjectId);
  }
})();
