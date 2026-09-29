// Logic trang danh sach Phieu xuat kho. Lap phieu moi/sua nhap da chuyen sang trang rieng
// stock-issue-form.html (2026-09-28, thay the popup cu) - trang nay chi con: danh sach, xem chi
// tiet, in phieu, xuat kho nhanh (process), xoa nhap, gan bo sung khach hang.

let currentUser = null;
let partnersCache = [];
let currentIssues = [];

const issuesTbody = document.getElementById('issues-tbody');
const issuesErrorBox = document.getElementById('issues-error');
const issuesErrorText = document.getElementById('issues-error-text');

const btnAddIssue = document.getElementById('btn-add-issue');

function formatMoney(value) {
  return Number(value).toLocaleString('vi-VN');
}

function formatDate(sqliteDateTime) {
  const iso = sqliteDateTime.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderIssuesError(message) {
  issuesErrorText.textContent = message;
  issuesErrorBox.hidden = false;
}

function renderIssueRow(issue) {
  const paymentBadge = issue.payment_status === 'cong_no'
    ? '<span class="badge badge-inactive">Công nợ</span>'
    : '<span class="badge badge-active">Đã thu tiền</span>';

  const isDraft = issue.status === 'cho_tru_kho';
  const statusBadge = isDraft
    ? '<span class="badge badge-inactive">Nháp</span>'
    : '<span class="badge badge-active">Đã xuất kho</span>';

  const noteHtml = issue.adjusts_code
    ? `<span class="badge badge-inactive" title="Điều chỉnh cho phiếu ${issue.adjusts_code}">Điều chỉnh ${issue.adjusts_code}</span> ${issue.note || ''}`
    : (issue.note || '-');

  // Phieu 'cho_tru_kho' (nhap) co toi 5 hanh dong - gom vao 1 menu "..." (dropdown, xem style.css
  // .row-actions-menu) de tranh tran/che khuat nhu khi xep rieng tung icon-btn (phan hoi nguoi
  // dung 2026-09-02). Phieu 'da_tru_kho' chi con 2 hanh dong (Xem/In), van vua du cho ca vo dong
  // nen giu nguyen dang icon-btn rieng le, khong can gom.
  const actions = isDraft
    ? `
      <div class="action-dropdown row-actions">
        <button type="button" class="icon-btn" data-action="toggle-menu" title="Thao tác">${icon('moreHorizontal', 16)}</button>
        <div class="action-dropdown-menu row-actions-menu" hidden>
          <button type="button" class="action-dropdown-item" data-action="edit" data-id="${issue.id}">${icon('pencil', 16)} Sửa phiếu</button>
          <button type="button" class="action-dropdown-item" data-action="process" data-id="${issue.id}">${icon('check', 16)} Xuất kho</button>
          <button type="button" class="action-dropdown-item" data-action="print-confirmation" data-id="${issue.id}">${icon('printer', 16)} In phiếu xác nhận đơn hàng</button>
          <button type="button" class="action-dropdown-item" data-action="view" data-id="${issue.id}">${icon('eye', 16)} Xem chi tiết</button>
          <button type="button" class="action-dropdown-item action-dropdown-item-danger" data-action="delete" data-id="${issue.id}">${icon('trash', 16)} Xóa phiếu nháp</button>
        </div>
      </div>
    `
    : `
      <button type="button" class="icon-btn" data-action="view" data-id="${issue.id}" title="Xem chi tiết">${icon('eye', 14)}</button>
      <button type="button" class="icon-btn" data-action="print" data-id="${issue.id}" title="In phiếu">${icon('printer', 14)}</button>
      ${issue.partner_id ? '' : `<button type="button" class="icon-btn" data-action="assign-partner" data-id="${issue.id}" title="Gán khách hàng">${icon('users', 14)}</button>`}
    `;

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${issue.code}</td>
    <td>${issue.partner_name || '-'}</td>
    <td>${issue.created_by_name}</td>
    <td>${paymentBadge}</td>
    <td>${statusBadge}</td>
    <td class="note-cell-truncate">${noteHtml}</td>
    <td>${formatDate(issue.created_at)}</td>
    <td>${actions}</td>
  `;
  // title gan qua DOM property (khong noi chuoi vao HTML) de tranh loi escape neu ghi chu co
  // dau nhay/ky tu dac biet - hien du noi dung khi re chuot vao o da bi cat bot bang CSS.
  if (issue.note) {
    tr.querySelector('.note-cell-truncate').title = issue.note;
  }
  return tr;
}

async function loadIssues() {
  try {
    const { issues } = await apiFetch('/stock-issues');
    currentIssues = issues;
    issuesTbody.innerHTML = '';
    issues.forEach((i) => issuesTbody.appendChild(renderIssueRow(i)));
  } catch (err) {
    renderIssuesError(err.message);
  }
}

// Menu "..." gom hanh dong o dong 'cho_tru_kho' (xem renderIssueRow) - dong tat ca menu dang mo
// truoc khi mo 1 menu khac/khi click ra ngoai, dinh vi mo len tren neu mo xuong se tran khoi
// vung nhin thay (hang gan cuoi bang, xem .row-actions-menu.dropdown-open-up trong style.css).
function closeAllRowMenus() {
  issuesTbody.querySelectorAll('.row-actions-menu').forEach((menu) => {
    menu.hidden = true;
    menu.classList.remove('dropdown-open-up');
  });
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('.row-actions')) closeAllRowMenus();
});

issuesTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;

  if (action === 'toggle-menu') {
    event.stopPropagation();
    const menu = button.nextElementSibling;
    const wasHidden = menu.hidden;
    closeAllRowMenus();
    if (wasHidden) {
      menu.hidden = false;
      const triggerRect = button.getBoundingClientRect();
      const menuHeight = menu.offsetHeight;
      menu.classList.toggle('dropdown-open-up', triggerRect.bottom + menuHeight > window.innerHeight);
    }
    return;
  }

  closeAllRowMenus();

  if (action === 'view') {
    openIssueDetailModal(id);
    return;
  }
  if (action === 'print') {
    openPrintPreview(`print-issue.html?id=${id}`);
    return;
  }
  if (action === 'print-confirmation') {
    openPrintPreview(`print-order-confirmation.html?id=${id}`);
    return;
  }
  if (action === 'edit') {
    window.location.href = `stock-issue-form.html?id=${id}`;
    return;
  }
  if (action === 'process') {
    if (!confirm('Xác nhận xuất kho cho phiếu này? Sau khi xuất kho sẽ không sửa được nữa.')) return;
    button.disabled = true;
    issuesErrorBox.hidden = true;
    try {
      await apiFetch(`/stock-issues/${id}/process`, { method: 'POST' });
      await loadIssues();
    } catch (err) {
      renderIssuesError(err.message);
      button.disabled = false;
    }
  }
  if (action === 'delete') {
    if (!confirm('Xóa phiếu nháp này? Phiếu chưa xuất kho nên không ảnh hưởng tồn kho/công nợ.')) return;
    button.disabled = true;
    issuesErrorBox.hidden = true;
    try {
      await apiFetch(`/stock-issues/${id}`, { method: 'DELETE' });
      await loadIssues();
    } catch (err) {
      renderIssuesError(err.message);
      button.disabled = false;
    }
  }
  if (action === 'assign-partner') {
    openAssignIssuePartnerModal(id);
  }
});

// ----- Gan bo sung khach hang cho phieu dang trong partner_id ("khach le", xem docs/DECISIONS.md
// 2026-09-28) -----

const assignIssuePartnerModal = document.getElementById('assign-issue-partner-modal');
const assignIssuePartnerForm = document.getElementById('assign-issue-partner-form');
const assignIssuePartnerErrorBox = document.getElementById('assign-issue-partner-error');
const assignIssuePartnerErrorText = document.getElementById('assign-issue-partner-error-text');
const assignIssuePartnerSelect = document.getElementById('assign-issue-partner-select');
const btnCancelAssignIssuePartner = document.getElementById('btn-cancel-assign-issue-partner');
const btnSubmitAssignIssuePartner = document.getElementById('btn-submit-assign-issue-partner');
let assigningIssueId = null;

function openAssignIssuePartnerModal(id) {
  assigningIssueId = id;
  const options = partnersCache.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  assignIssuePartnerSelect.innerHTML = options || '<option value="">-- Chưa có khách hàng nào --</option>';
  assignIssuePartnerErrorBox.hidden = true;
  assignIssuePartnerModal.hidden = false;
}

function closeAssignIssuePartnerModal() {
  assignIssuePartnerModal.hidden = true;
  assigningIssueId = null;
}

btnCancelAssignIssuePartner.addEventListener('click', closeAssignIssuePartnerModal);
assignIssuePartnerModal.addEventListener('click', (event) => {
  if (event.target === assignIssuePartnerModal) closeAssignIssuePartnerModal();
});

assignIssuePartnerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  assignIssuePartnerErrorBox.hidden = true;

  if (!assignIssuePartnerSelect.value) {
    assignIssuePartnerErrorText.textContent = 'Vui lòng chọn khách hàng';
    assignIssuePartnerErrorBox.hidden = false;
    return;
  }

  btnSubmitAssignIssuePartner.disabled = true;
  btnSubmitAssignIssuePartner.textContent = 'Đang lưu...';

  try {
    await apiFetch(`/stock-issues/${assigningIssueId}/partner`, {
      method: 'PATCH',
      body: JSON.stringify({ partner_id: Number(assignIssuePartnerSelect.value) }),
    });
    closeAssignIssuePartnerModal();
    await loadIssues();
  } catch (err) {
    assignIssuePartnerErrorText.textContent = err.message;
    assignIssuePartnerErrorBox.hidden = false;
  } finally {
    btnSubmitAssignIssuePartner.disabled = false;
    btnSubmitAssignIssuePartner.textContent = 'Gán';
  }
});

async function loadPartners() {
  const { partners } = await apiFetch('/partners?type=khach_hang');
  partnersCache = partners;
}

btnAddIssue.addEventListener('click', () => {
  window.location.href = 'stock-issue-form.html';
});

(async function init() {
  currentUser = await initLayout('stock-issues');
  if (!currentUser) return;

  btnAddIssue.innerHTML = `${icon('plus', 16)} Lập phiếu xuất`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });
  initIssueDetailModal();

  await Promise.all([loadPartners(), loadIssues()]);
})();
