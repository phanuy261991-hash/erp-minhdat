// Modal xem chi tiet phieu xuat kho (chi doc) - dung chung cho stock-issues.html (bam icon
// "mat" tren tung dong) va product-detail.html (bam vao ma phieu xuat trong lich su nhap/xuat).
// Ca 2 trang phai co san markup #issue-detail-modal (xem stock-issues.html) va nap script nay
// sau icons.js + api.js. Cau truc giong het receipt-detail.js (phieu nhap) nhung khac cot du
// lieu: co payment_status, khong co chiet khau/ma don hang.

function formatMoneyIssueDetail(value) {
  return Number(value).toLocaleString('vi-VN');
}

function formatDateIssueDetail(sqliteDateTime) {
  const iso = sqliteDateTime.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function issueDetailInfoItem(label, value, fullWidth) {
  return `
    <div class="detail-info-item${fullWidth ? ' full-width' : ''}">
      <p class="detail-label">${label}</p>
      <p class="detail-value">${value}</p>
    </div>
  `;
}

function renderIssueDetail(issue) {
  const infoEl = document.getElementById('issue-detail-info');
  const itemsTbody = document.getElementById('issue-detail-items');
  const totalEl = document.getElementById('issue-detail-total');

  const paymentBadge = issue.payment_status === 'cong_no'
    ? '<span class="badge badge-inactive">Công nợ</span>'
    : '<span class="badge badge-active">Đã thu tiền</span>';

  const infoItems = [
    issueDetailInfoItem('Mã phiếu', issue.code),
    issueDetailInfoItem('Ngày lập', formatDateIssueDetail(issue.created_at)),
    issueDetailInfoItem('Khách hàng', issue.partner_name || '-'),
    issueDetailInfoItem('Người lập', issue.created_by_name),
    issueDetailInfoItem('Thanh toán', paymentBadge),
    issueDetailInfoItem('Ghi chú', issue.note || '-', true),
  ];

  // Lien ket phieu dieu chinh bu tru (xem migration 010) - chi hien khi co du lieu.
  if (issue.adjusts_code) {
    infoItems.push(issueDetailInfoItem('Điều chỉnh cho phiếu', issue.adjusts_code, true));
  }
  if (Array.isArray(issue.adjusted_by) && issue.adjusted_by.length > 0) {
    infoItems.push(issueDetailInfoItem('Được điều chỉnh bởi', issue.adjusted_by.map((d) => d.code).join(', '), true));
  }

  infoEl.innerHTML = infoItems.join('');

  itemsTbody.innerHTML = issue.items
    .map((item) => {
      const lineTotal = item.quantity * item.unit_price * (1 - item.discount_percent / 100);
      return `
        <tr>
          <td>${item.product_code} - ${item.product_name}</td>
          <td>${item.unit}</td>
          <td>${formatMoneyIssueDetail(item.quantity)}</td>
          <td>${formatMoneyIssueDetail(item.unit_price)}</td>
          <td>${item.discount_percent ? `${formatMoneyIssueDetail(item.discount_percent)}%` : '-'}</td>
          <td>${formatMoneyIssueDetail(Math.round(lineTotal))}</td>
        </tr>
      `;
    })
    .join('');

  totalEl.textContent = formatMoneyIssueDetail(Math.round(issue.total_amount));
}

async function openIssueDetailModal(issueId) {
  const modal = document.getElementById('issue-detail-modal');
  const errorBox = document.getElementById('issue-detail-error');
  const errorText = document.getElementById('issue-detail-error-text');

  errorBox.hidden = true;
  modal.hidden = false;

  try {
    const { issue } = await apiFetch(`/stock-issues/${issueId}`);
    renderIssueDetail(issue);
  } catch (err) {
    errorText.textContent = err.message;
    errorBox.hidden = false;
  }
}

function closeIssueDetailModal() {
  document.getElementById('issue-detail-modal').hidden = true;
}

// Goi 1 lan trong init() cua moi trang co dung modal nay.
function initIssueDetailModal() {
  const modal = document.getElementById('issue-detail-modal');
  if (!modal) return;

  document.getElementById('btn-close-issue-detail').addEventListener('click', closeIssueDetailModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeIssueDetailModal();
  });
  modal.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });
}
