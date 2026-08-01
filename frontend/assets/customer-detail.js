// Trang "Chi tiet khach hang" (moi, 2026-08-01 - truoc day customers.html chi co danh sach,
// chua co trang chi tiet rieng). Hien thi thong tin co ban + The "Bao hanh" (migration 017),
// moi the la 1 dong warranties cua khach hang nay, hien So ngay con lai + Ngay het han (tinh tu
// warranty-calc.js) - xem yeu cau nguoi dung 2026-08-01.

const customerId = new URLSearchParams(window.location.search).get('id');

const customerNameHeading = document.getElementById('customer-name');
const infoGrid = document.getElementById('customer-info-grid');
const warrantyCardsEl = document.getElementById('warranty-cards');
const warrantyEmptyEl = document.getElementById('warranty-empty');
const btnAddWarranty = document.getElementById('btn-add-warranty');
const detailErrorBox = document.getElementById('detail-error');
const detailErrorText = document.getElementById('detail-error-text');

function renderDetailError(message) {
  detailErrorText.textContent = message;
  detailErrorBox.hidden = false;
}

function detailInfoItem(label, value) {
  return `<div class="detail-info-item"><p class="detail-label">${label}</p><p class="detail-value">${value}</p></div>`;
}

function renderCustomerInfo(customer) {
  customerNameHeading.textContent = customer.name;
  infoGrid.innerHTML = [
    detailInfoItem('Loại khách hàng', customer.category_name || 'Không phân loại'),
    detailInfoItem('Số điện thoại', customer.phone || '-'),
    detailInfoItem('Địa chỉ', customer.address || '-', true),
  ].join('');
}

// Mau + nhan theo do khan cap: am (da het han) -> do; <=30 ngay -> cam; con lai -> xanh.
function daysRemainingClass(daysRemaining) {
  if (daysRemaining < 0) return 'warranty-card-days--expired';
  if (daysRemaining <= 30) return 'warranty-card-days--warning';
  return '';
}

function daysRemainingLabel(daysRemaining) {
  if (daysRemaining < 0) return `đã hết hạn ${Math.abs(daysRemaining)} ngày trước`;
  if (daysRemaining === 0) return 'hết hạn hôm nay';
  return 'ngày còn lại';
}

function statusBadge(warranty, daysRemaining) {
  if (!warranty.is_active) return '<span class="badge badge-inactive">Đã vô hiệu hóa</span>';
  if (daysRemaining < 0) return '<span class="badge badge-down">Hết hạn</span>';
  if (daysRemaining <= 30) return '<span class="badge badge-active">Sắp hết hạn</span>';
  return '<span class="badge badge-active">Còn hạn</span>';
}

function renderWarrantyCard(warranty) {
  const daysRemaining = warrantyDaysRemaining(warranty.expiry_date);
  const daysDisplay = daysRemaining < 0 ? Math.abs(daysRemaining) : daysRemaining;

  return `
    <div class="warranty-card">
      <div class="warranty-card-header">
        ${statusBadge(warranty, daysRemaining)}
        <a href="warranty-detail.html?id=${warranty.id}" class="table-link-btn">Xem chi tiết</a>
      </div>
      <p class="warranty-card-days ${daysRemainingClass(daysRemaining)}">${daysDisplay}</p>
      <p class="warranty-card-days-label">${daysRemainingLabel(daysRemaining)}</p>
      <div class="detail-info-grid">
        ${detailInfoItem('Ngày hết hạn', formatWarrantyDateVN(warranty.expiry_date))}
        ${detailInfoItem('Ngày nghiệm thu', formatWarrantyDateVN(warranty.acceptance_date))}
        ${detailInfoItem('Thời gian bảo hành', formatWarrantyDuration(warranty.duration_value, warranty.duration_unit))}
      </div>
    </div>
  `;
}

function renderWarranties(warranties) {
  if (warranties.length === 0) {
    warrantyEmptyEl.hidden = false;
    warrantyCardsEl.innerHTML = '';
    return;
  }
  warrantyEmptyEl.hidden = true;
  warrantyCardsEl.innerHTML = warranties.map(renderWarrantyCard).join('');
}

(async function init() {
  const currentUser = await initLayout('customers');
  if (!currentUser) return;

  document.getElementById('btn-back').innerHTML = icon('arrowLeft', 16);
  btnAddWarranty.innerHTML = `${icon('plus', 16)} Thêm bảo hành`;
  btnAddWarranty.href = `warranty-detail.html?customer_id=${customerId}`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  if (!customerId) {
    renderDetailError('Thiếu id khách hàng trên đường dẫn');
    return;
  }

  try {
    const [{ partners }, { warranties }] = await Promise.all([
      apiFetch('/partners?type=khach_hang'),
      apiFetch(`/warranties?partner_id=${customerId}`),
    ]);

    const customer = partners.find((p) => String(p.id) === String(customerId));
    if (!customer) {
      renderDetailError('Không tìm thấy khách hàng');
      return;
    }

    renderCustomerInfo(customer);
    renderWarranties(warranties);
  } catch (err) {
    renderDetailError(err.message);
  }
})();
