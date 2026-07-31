// Logic trang chi tiet san pham: thong tin co ban + gia von tinh theo costing_method dang
// chon (backend/services/costing.service.js), lich su nhap/xuat kho, lich su chinh sua thong
// tin san pham (product_change_log). Chi doc du lieu, khong co thao tac sua/xoa tren trang nay.

const FIELD_LABELS = {
  code: 'Mã sản phẩm',
  name: 'Tên sản phẩm',
  unit: 'Đơn vị tính',
  cost_price: 'Giá vốn (nhập tay)',
  sale_price: 'Giá bán',
  low_stock_threshold: 'Ngưỡng cảnh báo tồn kho thấp',
};

const COSTING_METHOD_LABELS = {
  binh_quan_gia_quyen: 'Bình quân gia quyền',
  fifo: 'FIFO (nhập trước, xuất trước)',
};

const productId = new URLSearchParams(window.location.search).get('id');

const statGrid = document.getElementById('stat-grid');
const productNameHeading = document.getElementById('product-name');
const movementsTbody = document.getElementById('movements-tbody');
const historyTbody = document.getElementById('history-tbody');
const detailErrorBox = document.getElementById('detail-error');
const detailErrorText = document.getElementById('detail-error-text');

function formatMoney(value) {
  return Number(value).toLocaleString('vi-VN');
}

function formatDate(sqliteDateTime) {
  const iso = sqliteDateTime.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderDetailError(message) {
  detailErrorText.textContent = message;
  detailErrorBox.hidden = false;
}

function statCard(label, value) {
  return `
    <div class="stat-card">
      <p class="stat-card-label">${label}</p>
      <p class="stat-card-value">${value}</p>
    </div>
  `;
}

function renderInfo(product, costingMethod, currentCost) {
  productNameHeading.textContent = `${product.name} (${product.code})`;

  const statusHtml = product.is_active
    ? '<span class="badge badge-active">Đang kinh doanh</span>'
    : '<span class="badge badge-inactive">Ngừng kinh doanh</span>';

  statGrid.innerHTML = [
    statCard('Mã sản phẩm', product.code),
    statCard('Đơn vị tính', product.unit),
    statCard('Trạng thái', statusHtml),
    statCard('Tồn kho hiện tại', formatMoney(product.stock)),
    statCard('Giá bán', formatMoney(product.sale_price)),
    statCard(`Giá vốn hiện tại (${COSTING_METHOD_LABELS[costingMethod] || costingMethod})`, formatMoney(currentCost)),
    statCard('Ngưỡng cảnh báo tồn kho thấp', formatMoney(product.low_stock_threshold)),
  ].join('');
}

// Ma phieu chi bam mo xem chi tiet duoc voi phieu NHAP (reference_type === 'receipt') - phieu
// xuat chua co giao dien xem chi tiet (stock-issues.html chua lam, xem docs/CURRENT.md), nen
// giu nguyen dang text thuong de khong dan link hong.
function renderMovements(movements) {
  movementsTbody.innerHTML = movements
    .map((m) => {
      const typeBadge = m.movement_type === 'in'
        ? '<span class="badge badge-active">Nhập</span>'
        : '<span class="badge badge-inactive">Xuất</span>';
      const documentCodeHtml = m.reference_type === 'receipt' && m.document_code
        ? `<button type="button" class="table-link-btn" data-receipt-id="${m.reference_id}">${m.document_code}</button>`
        : (m.document_code || '-');
      return `
        <tr>
          <td>${formatDate(m.created_at)}</td>
          <td>${typeBadge}</td>
          <td>${formatMoney(m.quantity)}</td>
          <td>${m.unit_cost === null ? '-' : formatMoney(m.unit_cost)}</td>
          <td>${documentCodeHtml}</td>
        </tr>
      `;
    })
    .join('');
}

movementsTbody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-receipt-id]');
  if (!button) return;
  openReceiptDetailModal(button.dataset.receiptId);
});

function renderHistory(history) {
  historyTbody.innerHTML = history
    .map(
      (h) => `
        <tr>
          <td>${formatDate(h.created_at)}</td>
          <td>${h.changed_by_name}</td>
          <td>${FIELD_LABELS[h.field_name] || h.field_name}</td>
          <td>${h.old_value}</td>
          <td>${h.new_value}</td>
        </tr>
      `
    )
    .join('');
}

(async function init() {
  const currentUser = await initLayout('products');
  if (!currentUser) return;

  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });
  document.getElementById('btn-back').innerHTML = icon('arrowLeft', 16);
  initReceiptDetailModal();

  if (!productId) {
    renderDetailError('Thiếu id sản phẩm trên đường dẫn');
    return;
  }

  try {
    const [detail, { movements }, { history }] = await Promise.all([
      apiFetch(`/products/${productId}`),
      apiFetch(`/products/${productId}/movements`),
      apiFetch(`/products/${productId}/history`),
    ]);
    renderInfo(detail.product, detail.costing_method, detail.current_cost);
    renderMovements(movements);
    renderHistory(history);
  } catch (err) {
    renderDetailError(err.message);
  }
})();
