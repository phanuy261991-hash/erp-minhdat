// Logic trang quan ly doi tac day du (Phase 3): danh sach, tim kiem theo ten, them/sua/xoa.
// Khac voi "them nhanh" luc lap phieu nhap/xuat (stock-receipts.js/stock-issues.js) - trang nay
// la quan ly day du, gan voi module Cong no (xem backend/routes/partners.routes.js).
// Khong cho doi "Loai doi tac" sau khi tao (dropdown bi khoa khi sua) - dung nguyen tac backend.

let currentUser = null;
let partnersCache = [];
let editingPartnerId = null;
let searchKeyword = '';

const partnersTbody = document.getElementById('partners-tbody');
const partnersErrorBox = document.getElementById('partners-error');
const partnersErrorText = document.getElementById('partners-error-text');
const searchInput = document.getElementById('partner-search');

const btnAddPartner = document.getElementById('btn-add-partner');
const partnerModal = document.getElementById('partner-modal');
const partnerModalTitle = document.getElementById('partner-modal-title');
const partnerForm = document.getElementById('partner-form');
const partnerFormErrorBox = document.getElementById('partner-form-error');
const partnerFormErrorText = document.getElementById('partner-form-error-text');
const btnCancelPartner = document.getElementById('btn-cancel-partner');
const btnSubmitPartner = document.getElementById('btn-submit-partner');

const typeSelect = document.getElementById('partner-type');
const nameInput = document.getElementById('partner-name');
const phoneInput = document.getElementById('partner-phone');
const addressInput = document.getElementById('partner-address');

const TYPE_LABELS = { nha_cung_cap: 'Nhà cung cấp', khach_hang: 'Khách hàng' };

function renderPartnersError(message) {
  partnersErrorText.textContent = message;
  partnersErrorBox.hidden = false;
}

function getVisiblePartners() {
  const keyword = searchKeyword.trim().toLowerCase();
  if (!keyword) return partnersCache;
  return partnersCache.filter((p) => p.name.toLowerCase().includes(keyword));
}

function renderRow(partner) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${partner.name}</td>
    <td>${TYPE_LABELS[partner.type] || partner.type}</td>
    <td>${partner.phone || '-'}</td>
    <td>${partner.address || '-'}</td>
    <td>
      <button type="button" class="icon-btn" data-action="edit" data-id="${partner.id}" title="Sửa đối tác">${icon('pencil', 14)}</button>
      <button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${partner.id}" title="Xóa đối tác">${icon('trash', 14)}</button>
    </td>
  `;
  return tr;
}

function renderPartners() {
  partnersTbody.innerHTML = '';
  getVisiblePartners().forEach((p) => partnersTbody.appendChild(renderRow(p)));
}

async function loadPartners() {
  try {
    const { partners } = await apiFetch('/partners');
    partnersCache = partners;
    renderPartners();
  } catch (err) {
    renderPartnersError(err.message);
  }
}

searchInput.addEventListener('input', (event) => {
  searchKeyword = event.target.value;
  renderPartners();
});

function openCreateModal() {
  editingPartnerId = null;
  partnerModalTitle.textContent = 'Thêm đối tác mới';
  partnerForm.reset();
  typeSelect.disabled = false;
  partnerFormErrorBox.hidden = true;
  partnerModal.hidden = false;
  nameInput.focus();
}

function openEditModal(partner) {
  editingPartnerId = partner.id;
  partnerModalTitle.textContent = 'Sửa đối tác';
  typeSelect.value = partner.type;
  typeSelect.disabled = true;
  nameInput.value = partner.name;
  phoneInput.value = partner.phone || '';
  addressInput.value = partner.address || '';
  partnerFormErrorBox.hidden = true;
  partnerModal.hidden = false;
  nameInput.focus();
}

function closePartnerModal() {
  partnerModal.hidden = true;
}

btnAddPartner.addEventListener('click', openCreateModal);
btnCancelPartner.addEventListener('click', closePartnerModal);

partnerModal.addEventListener('click', (event) => {
  if (event.target === partnerModal) closePartnerModal();
});

partnersTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === 'edit') {
    const partner = partnersCache.find((p) => String(p.id) === id);
    if (partner) openEditModal(partner);
    return;
  }

  if (action === 'delete') {
    if (!confirm('Xóa đối tác này? Chỉ xóa được khi chưa từng có phiếu nhập/xuất hoặc công nợ nào.')) return;
  }

  button.disabled = true;
  try {
    if (action === 'delete') {
      await apiFetch(`/partners/${id}`, { method: 'DELETE' });
      await loadPartners();
    }
  } catch (err) {
    renderPartnersError(err.message);
    button.disabled = false;
  }
});

partnerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  partnerFormErrorBox.hidden = true;
  btnSubmitPartner.disabled = true;
  btnSubmitPartner.textContent = 'Đang lưu...';

  const body = {
    name: nameInput.value.trim(),
    phone: phoneInput.value.trim(),
    address: addressInput.value.trim(),
  };

  try {
    if (editingPartnerId === null) {
      await apiFetch('/partners', { method: 'POST', body: JSON.stringify({ ...body, type: typeSelect.value }) });
    } else {
      await apiFetch(`/partners/${editingPartnerId}`, { method: 'PUT', body: JSON.stringify(body) });
    }
    closePartnerModal();
    await loadPartners();
  } catch (err) {
    partnerFormErrorText.textContent = err.message;
    partnerFormErrorBox.hidden = false;
  } finally {
    btnSubmitPartner.disabled = false;
    btnSubmitPartner.textContent = 'Lưu';
  }
});

(async function init() {
  currentUser = await initLayout('partners');
  if (!currentUser) return;

  btnAddPartner.innerHTML = `${icon('plus', 16)} Thêm đối tác`;
  document.querySelector('.search-box .input-icon').innerHTML = icon('search', 16);
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await loadPartners();
})();
