// Logic trang Cong no (Phase 3): danh sach so du tung doi tac (tinh tu SUM debt_ledger, khong
// luu so co dinh - xem GET /api/debts/summary), xem lich su giao dich 1 doi tac, ghi nhan
// thanh toan (tung phan, khong can khop dung 1 khoan no).

let currentUser = null;
let summaryCache = [];
let searchKeyword = '';

const debtsTbody = document.getElementById('debts-tbody');
const debtsErrorBox = document.getElementById('debts-error');
const debtsErrorText = document.getElementById('debts-error-text');
const searchInput = document.getElementById('debt-search');

const historyModal = document.getElementById('debt-history-modal');
const historyInfoEl = document.getElementById('debt-history-info');
const historyStatsEl = document.getElementById('debt-history-stats');
const historyTbody = document.getElementById('debt-history-tbody');
const btnCloseHistory = document.getElementById('btn-close-debt-history');

const btnAddPayment = document.getElementById('btn-add-payment');
const paymentModal = document.getElementById('payment-modal');
const paymentForm = document.getElementById('payment-form');
const paymentFormErrorBox = document.getElementById('payment-form-error');
const paymentFormErrorText = document.getElementById('payment-form-error-text');
const btnCancelPayment = document.getElementById('btn-cancel-payment');
const btnSubmitPayment = document.getElementById('btn-submit-payment');
const paymentPartnerSelect = document.getElementById('payment-partner');
const paymentAmountInput = document.getElementById('payment-amount');
const paymentNoteInput = document.getElementById('payment-note');

const TYPE_LABELS = { nha_cung_cap: 'Nhà cung cấp', khach_hang: 'Khách hàng' };

function formatMoney(value) {
  return Number(value).toLocaleString('vi-VN');
}

function formatDate(sqliteDateTime) {
  const iso = sqliteDateTime.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderDebtsError(message) {
  debtsErrorText.textContent = message;
  debtsErrorBox.hidden = false;
}

function getVisibleSummary() {
  const keyword = searchKeyword.trim().toLowerCase();
  if (!keyword) return summaryCache;
  return summaryCache.filter((s) => s.name.toLowerCase().includes(keyword));
}

// So du > 0 nghia la con no (voi NCC: minh con phai tra ho; voi khach hang: ho con phai tra
// minh) - dung mau canh bao rieng, khac han mau xam khi da het no, khong chi dua vao mau (kem chu).
function renderRow(item) {
  const balanceHtml = item.balance > 0
    ? `<span class="stock-low">${formatMoney(item.balance)}</span>`
    : formatMoney(item.balance);

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${item.name}</td>
    <td>${TYPE_LABELS[item.type] || item.type}</td>
    <td>${item.phone || '-'}</td>
    <td>${balanceHtml}</td>
    <td>
      <button type="button" class="icon-btn" data-action="history" data-id="${item.partner_id}" title="Xem lịch sử">${icon('eye', 14)}</button>
      <button type="button" class="icon-btn" data-action="pay" data-id="${item.partner_id}" title="Ghi nhận thanh toán">${icon('check', 14)}</button>
    </td>
  `;
  return tr;
}

function renderSummary() {
  debtsTbody.innerHTML = '';
  getVisibleSummary().forEach((item) => debtsTbody.appendChild(renderRow(item)));
}

async function loadSummary() {
  try {
    const { summary } = await apiFetch('/debts/summary');
    summaryCache = summary;
    renderSummary();
  } catch (err) {
    renderDebtsError(err.message);
  }
}

searchInput.addEventListener('input', (event) => {
  searchKeyword = event.target.value;
  renderSummary();
});

// ----- Lich su cong no 1 doi tac -----

function detailInfoItem(label, value) {
  return `<div class="detail-info-item"><p class="detail-label">${label}</p><p class="detail-value">${value}</p></div>`;
}

function statCard(label, value, warning) {
  return `
    <div class="stat-card">
      <p class="stat-card-label">${label}</p>
      <p class="stat-card-value${warning ? ' stat-card-value--warning' : ''}">${value}</p>
    </div>
  `;
}

async function openHistoryModal(partnerId) {
  const partner = summaryCache.find((s) => String(s.partner_id) === String(partnerId));
  const isSupplier = partner && partner.type === 'nha_cung_cap';

  historyInfoEl.innerHTML = [
    detailInfoItem('Đối tác', partner ? partner.name : '-'),
    detailInfoItem('Loại', partner ? (TYPE_LABELS[partner.type] || partner.type) : '-'),
  ].join('');
  // So du la con so quan trong nhat tren man hinh nay - dung .stat-card (chu lon) thay vi
  // detail-info-item thuong, kem canh bao mau khi con no (xem yeu cau nguoi dung 2026-07-31).
  historyStatsEl.innerHTML = partner
    ? statCard(isSupplier ? 'Cần thanh toán' : 'Cần thu', formatMoney(partner.balance), partner.balance > 0)
    : '';
  historyTbody.innerHTML = '';
  historyModal.hidden = false;

  try {
    const { entries, total_transacted: totalTransacted } = await apiFetch(`/debts?partner_id=${partnerId}`);

    if (partner) {
      historyStatsEl.innerHTML = [
        statCard(isSupplier ? 'Cần thanh toán' : 'Cần thu', formatMoney(partner.balance), partner.balance > 0),
        statCard(isSupplier ? 'Tổng tiền hàng đã mua' : 'Tổng tiền hàng đã bán', formatMoney(totalTransacted)),
      ].join('');
    }

    historyTbody.innerHTML = entries
      .map((e) => {
        const typeBadge = e.type === 'no'
          ? '<span class="badge badge-inactive">Phát sinh nợ</span>'
          : '<span class="badge badge-active">Thanh toán</span>';
        return `
          <tr>
            <td>${formatDate(e.created_at)}</td>
            <td>${typeBadge}</td>
            <td>${formatMoney(e.amount)}</td>
            <td>${e.document_code || '-'}</td>
            <td>${e.note || '-'}</td>
            <td>${e.created_by_name}</td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    renderDebtsError(err.message);
  }
}

function closeHistoryModal() {
  historyModal.hidden = true;
}

btnCloseHistory.addEventListener('click', closeHistoryModal);
historyModal.addEventListener('click', (event) => {
  if (event.target === historyModal) closeHistoryModal();
});

// ----- Ghi nhan thanh toan -----

function renderPartnerOptions() {
  paymentPartnerSelect.innerHTML = summaryCache
    .map((s) => `<option value="${s.partner_id}">${s.name} (${TYPE_LABELS[s.type] || s.type}) - còn ${formatMoney(s.balance)}</option>`)
    .join('');
}

function openPaymentModal(partnerId) {
  renderPartnerOptions();
  paymentForm.reset();
  if (partnerId) paymentPartnerSelect.value = partnerId;
  paymentFormErrorBox.hidden = true;
  paymentModal.hidden = false;
}

function closePaymentModal() {
  paymentModal.hidden = true;
}

btnAddPayment.addEventListener('click', () => openPaymentModal(null));
btnCancelPayment.addEventListener('click', closePaymentModal);
paymentModal.addEventListener('click', (event) => {
  if (event.target === paymentModal) closePaymentModal();
});

paymentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  paymentFormErrorBox.hidden = true;
  btnSubmitPayment.disabled = true;
  btnSubmitPayment.textContent = 'Đang ghi nhận...';

  try {
    await apiFetch('/debts/payment', {
      method: 'POST',
      body: JSON.stringify({
        partner_id: Number(paymentPartnerSelect.value),
        amount: Number(paymentAmountInput.value),
        note: paymentNoteInput.value.trim(),
      }),
    });
    closePaymentModal();
    await loadSummary();
  } catch (err) {
    paymentFormErrorText.textContent = err.message;
    paymentFormErrorBox.hidden = false;
  } finally {
    btnSubmitPayment.disabled = false;
    btnSubmitPayment.textContent = 'Ghi nhận';
  }
});

debtsTbody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;
  if (action === 'history') {
    openHistoryModal(id);
  } else if (action === 'pay') {
    openPaymentModal(id);
  }
});

(async function init() {
  currentUser = await initLayout('debts');
  if (!currentUser) return;

  btnAddPayment.innerHTML = `${icon('plus', 16)} Ghi nhận thanh toán`;
  document.querySelector('.search-box .input-icon').innerHTML = icon('search', 16);
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await loadSummary();
})();
