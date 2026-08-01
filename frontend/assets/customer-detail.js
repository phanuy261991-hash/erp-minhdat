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

// Mau theo do khan cap: vo hieu hoa -> xam; da het han -> do; <=30 ngay -> cam; con lai -> xanh.
// Dung 1 "muc" (ok/warning/expired/inactive) cho ca icon/nhan trang thai/so lon, dam bao dong
// bo mau theo mau tham khao nguoi dung cung cap (2026-08-01).
function warrantyUrgencyLevel(warranty, daysRemaining) {
  if (!warranty.is_active) return 'inactive';
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 30) return 'warning';
  return 'ok';
}

const URGENCY_TAG_LABEL = {
  ok: 'Còn hạn',
  warning: 'Sắp hết hạn',
  expired: 'Hết hạn',
  inactive: 'Đã vô hiệu hóa',
};

function renderWarrantyCard(warranty) {
  const daysRemaining = warrantyDaysRemaining(warranty.expiry_date);
  const level = warrantyUrgencyLevel(warranty, daysRemaining);
  const valueDisplay = daysRemaining < 0 ? Math.abs(daysRemaining) : daysRemaining;
  const valueUnit = daysRemaining < 0 ? 'ngày trước' : 'ngày';
  const title = warranty.note ? warranty.note : 'Thông tin bảo hành';

  return `
    <div class="warranty-card">
      <div class="warranty-card-top">
        <div class="warranty-card-icon warranty-card-icon--${level}">${icon('shield', 20)}</div>
        <div class="warranty-card-heading">
          <p class="warranty-card-title" title="${title}">${title}</p>
          <p class="warranty-card-subtitle">Nghiệm thu ${formatWarrantyDateVN(warranty.acceptance_date)}</p>
        </div>
        <a href="warranties.html?edit=${warranty.id}" class="icon-btn warranty-card-edit" title="Xem/sửa chi tiết">${icon('pencil', 14)}</a>
      </div>
      <p class="warranty-card-meta">
        Ngày hết hạn: ${formatWarrantyDateVN(warranty.expiry_date)}<br />
        Thời gian bảo hành: ${formatWarrantyDuration(warranty.duration_value, warranty.duration_unit)}
      </p>
      <div class="warranty-card-footer">
        <span class="warranty-card-tag warranty-card-tag--${level}">${URGENCY_TAG_LABEL[level]}</span>
        <span class="warranty-card-value warranty-card-value--${level}">${valueDisplay} <span class="warranty-card-value-unit">${valueUnit}</span></span>
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
  btnAddWarranty.href = `warranties.html?customer_id=${customerId}`;
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
