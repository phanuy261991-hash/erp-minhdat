// Modal xem chi tiet phieu nhap kho (chi doc) - dung chung cho stock-receipts.html (bam icon
// "mat" tren tung dong) va product-detail.html (bam vao ma phieu trong lich su nhap/xuat).
// Ca 2 trang phai co san markup #receipt-detail-modal (xem stock-receipts.html) va nap script
// nay sau icons.js + api.js.

function formatMoneyReceiptDetail(value) {
  return Number(value).toLocaleString('vi-VN');
}

function formatDateReceiptDetail(sqliteDateTime) {
  const iso = sqliteDateTime.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function detailInfoItem(label, value, fullWidth) {
  return `
    <div class="detail-info-item${fullWidth ? ' full-width' : ''}">
      <p class="detail-label">${label}</p>
      <p class="detail-value">${value}</p>
    </div>
  `;
}

function renderReceiptDetail(receipt) {
  const infoEl = document.getElementById('receipt-detail-info');
  const itemsTbody = document.getElementById('receipt-detail-items');
  const totalEl = document.getElementById('receipt-detail-total');

  infoEl.innerHTML = [
    detailInfoItem('Mã phiếu', receipt.code),
    detailInfoItem('Ngày lập', formatDateReceiptDetail(receipt.created_at)),
    detailInfoItem('Nhà cung cấp', receipt.partner_name || '-'),
    detailInfoItem('Người lập', receipt.created_by_name),
    detailInfoItem('Mã đơn hàng', receipt.order_code || '-'),
    detailInfoItem('Ghi chú', receipt.note || '-', true),
  ].join('');

  itemsTbody.innerHTML = receipt.items
    .map((item) => {
      const lineTotal = item.quantity * item.unit_price * (1 - item.discount_percent / 100);
      return `
        <tr>
          <td>${item.product_code} - ${item.product_name}</td>
          <td>${item.unit}</td>
          <td>${formatMoneyReceiptDetail(item.quantity)}</td>
          <td>${formatMoneyReceiptDetail(item.unit_price)}</td>
          <td>${item.discount_percent ? `${formatMoneyReceiptDetail(item.discount_percent)}%` : '-'}</td>
          <td>${formatMoneyReceiptDetail(Math.round(lineTotal))}</td>
        </tr>
      `;
    })
    .join('');

  totalEl.textContent = formatMoneyReceiptDetail(Math.round(receipt.total_amount));
}

async function openReceiptDetailModal(receiptId) {
  const modal = document.getElementById('receipt-detail-modal');
  const errorBox = document.getElementById('receipt-detail-error');
  const errorText = document.getElementById('receipt-detail-error-text');

  errorBox.hidden = true;
  modal.hidden = false;

  try {
    const { receipt } = await apiFetch(`/stock-receipts/${receiptId}`);
    renderReceiptDetail(receipt);
  } catch (err) {
    errorText.textContent = err.message;
    errorBox.hidden = false;
  }
}

function closeReceiptDetailModal() {
  document.getElementById('receipt-detail-modal').hidden = true;
}

// Goi 1 lan trong init() cua moi trang co dung modal nay.
function initReceiptDetailModal() {
  const modal = document.getElementById('receipt-detail-modal');
  if (!modal) return;

  document.getElementById('btn-close-receipt-detail').addEventListener('click', closeReceiptDetailModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeReceiptDetailModal();
  });
  modal.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });
}
