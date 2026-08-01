// Logic trang danh sach Bao hanh (migration 017, menu Khach hang): danh sach, tim kiem theo
// ten khach hang, vo hieu hoa/kich hoat lai, xoa (chi Admin). Them moi/sua dieu huong sang
// warranty-detail.html (khong dung modal - luu thay doi ngay tren giao dien xem chi tiet,
// xem yeu cau nguoi dung 2026-08-01).

let currentUser = null;
let warrantiesCache = [];
let searchKeyword = '';

const warrantiesTbody = document.getElementById('warranties-tbody');
const warrantiesErrorBox = document.getElementById('warranties-error');
const warrantiesErrorText = document.getElementById('warranties-error-text');
const searchInput = document.getElementById('warranty-search');

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
// .stock-low da co) > con han (xanh) - uu tien hien thi theo do quan trong khi nhieu dieu
// kien cung dung (xem yeu cau nguoi dung 2026-08-01).
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
      <a href="warranty-detail.html?id=${warranty.id}" class="icon-btn" title="Xem/sửa chi tiết">${icon('eye', 14)}</a>
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

searchInput.addEventListener('input', (event) => {
  searchKeyword = event.target.value;
  renderWarranties();
});

warrantiesTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;

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

  document.getElementById('btn-add-warranty').innerHTML = `${icon('plus', 16)} Thêm bảo hành mới`;
  document.querySelector('.search-box .input-icon').innerHTML = icon('search', 16);
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await loadWarranties();
})();
