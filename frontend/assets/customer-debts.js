// Logic trang "Cong no khach hang" (tach rieng khoi trang Cong no chung theo yeu cau nguoi dung
// 2026-08-01 - trang Cong no cu tu day chi con Nha cung cap). Dung lai nguyen API /api/debts
// (chi loc type=khach_hang), them canh bao khi so du vuot han muc cong no cua Loai khach hang
// (category_debt_limit tra ve tu GET /debts/summary va /debts?partner_id=) - CHI canh bao,
// khong chan lap phieu (xem yeu cau nguoi dung 2026-08-01).

let currentUser = null;
let summaryCache = [];
let searchKeyword = '';

const debtsTbody = document.getElementById('debts-tbody');
const debtsErrorBox = document.getElementById('debts-error');
const debtsErrorText = document.getElementById('debts-error-text');
const searchInput = document.getElementById('debt-search');

const historyModal = document.getElementById('debt-history-modal');
const historyInfoEl = document.getElementById('debt-history-info');
const historyWarningBox = document.getElementById('debt-history-warning');
const historyWarningText = document.getElementById('debt-history-warning-text');
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

function isOverLimit(item) {
  return item.category_debt_limit !== null && item.category_debt_limit !== undefined && item.balance > item.category_debt_limit;
}

function renderRow(item) {
  const overLimit = isOverLimit(item);
  const balanceHtml = item.balance > 0
    ? `<span class="stock-low">${formatMoney(item.balance)}</span>`
    : formatMoney(item.balance);
  const warningIcon = overLimit ? `<span class="stock-low" title="Vượt hạn mức công nợ (${formatMoney(item.category_debt_limit)} đ)">${icon('warningTriangle', 14)}</span>` : '';

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${item.name}</td>
    <td>${item.category_name || '-'}</td>
    <td>${item.phone || '-'}</td>
    <td>${balanceHtml} ${warningIcon}</td>
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
    const { summary } = await apiFetch('/debts/summary?type=khach_hang');
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

// ----- Lich su cong no 1 khach hang -----

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

function renderHistoryWarning(partner) {
  if (partner && isOverLimit(partner)) {
    historyWarningText.textContent = `Khách hàng đã vượt hạn mức công nợ của loại "${partner.category_name}" (${formatMoney(partner.category_debt_limit)} đ) - chỉ là cảnh báo, không chặn lập phiếu.`;
    historyWarningBox.hidden = false;
  } else {
    historyWarningBox.hidden = true;
  }
}

async function openHistoryModal(partnerId) {
  const partner = summaryCache.find((s) => String(s.partner_id) === String(partnerId));

  historyInfoEl.innerHTML = [
    detailInfoItem('Khách hàng', partner ? partner.name : '-'),
    detailInfoItem('Loại khách hàng', partner ? (partner.category_name || 'Không phân loại') : '-'),
  ].join('');
  renderHistoryWarning(partner);
  historyStatsEl.innerHTML = partner
    ? statCard('Cần thu', formatMoney(partner.balance), partner.balance > 0)
    : '';
  historyTbody.innerHTML = '';
  historyModal.hidden = false;

  try {
    const { entries, total_transacted: totalTransacted } = await apiFetch(`/debts?partner_id=${partnerId}`);

    if (partner) {
      historyStatsEl.innerHTML = [
        statCard('Cần thu', formatMoney(partner.balance), partner.balance > 0),
        statCard('Tổng tiền hàng đã bán', formatMoney(totalTransacted)),
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
    .map((s) => `<option value="${s.partner_id}">${s.name} - còn ${formatMoney(s.balance)}</option>`)
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
  currentUser = await initLayout('customer-debts');
  if (!currentUser) return;

  btnAddPayment.innerHTML = `${icon('plus', 16)} Ghi nhận thanh toán`;
  document.querySelector('.search-box .input-icon').innerHTML = icon('search', 16);
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await loadSummary();
})();
