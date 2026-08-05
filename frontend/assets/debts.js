// Logic trang Cong no Nha cung cap (truoc day gop chung ca KH+NCC - tach rieng theo yeu cau
// nguoi dung 2026-08-01, xem frontend/customer-debts.js cho Khach hang). Danh sach so du tung
// NCC (tinh tu SUM debt_ledger, khong luu so co dinh - xem GET /api/debts/summary?type=nha_cung_cap),
// xem lich su giao dich 1 NCC, ghi nhan thanh toan (tung phan, khong can khop dung 1 khoan no).

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

const btnAddAdjustment = document.getElementById('btn-add-adjustment');
const adjustmentModal = document.getElementById('adjustment-modal');
const adjustmentForm = document.getElementById('adjustment-form');
const adjustmentFormErrorBox = document.getElementById('adjustment-form-error');
const adjustmentFormErrorText = document.getElementById('adjustment-form-error-text');
const btnCancelAdjustment = document.getElementById('btn-cancel-adjustment');
const btnSubmitAdjustment = document.getElementById('btn-submit-adjustment');
const adjustmentPartnerSelect = document.getElementById('adjustment-partner');
const adjustmentTypeSelect = document.getElementById('adjustment-type');
const adjustmentAmountInput = document.getElementById('adjustment-amount');
const adjustmentNoteInput = document.getElementById('adjustment-note');
const adjustmentDocSearchInput = document.getElementById('adjustment-doc-search');
const adjustmentDocTypeInput = document.getElementById('adjustment-doc-type');
const adjustmentDocIdInput = document.getElementById('adjustment-doc-id');
const adjustmentDocSuggestions = document.getElementById('adjustment-doc-suggestions');
let adjustableDocsCache = [];

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
  return summaryCache.filter((s) => s.name.toLowerCase().includes(keyword) || (s.phone || '').toLowerCase().includes(keyword));
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
    <td>${item.phone || '-'}</td>
    <td>${balanceHtml}</td>
    <td>
      <button type="button" class="icon-btn" data-action="history" data-id="${item.partner_id}" title="Xem lịch sử">${icon('eye', 14)}</button>
      <button type="button" class="icon-btn" data-action="pay" data-id="${item.partner_id}" title="Ghi nhận thanh toán">${icon('check', 14)}</button>
      <button type="button" class="icon-btn" data-action="adjust" data-id="${item.partner_id}" title="Điều chỉnh công nợ">${icon('sliders', 14)}</button>
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
    const { summary } = await apiFetch('/debts/summary?type=nha_cung_cap');
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

  historyInfoEl.innerHTML = [
    detailInfoItem('Nhà cung cấp', partner ? partner.name : '-'),
  ].join('');
  // So du la con so quan trong nhat tren man hinh nay - dung .stat-card (chu lon) thay vi
  // detail-info-item thuong, kem canh bao mau khi con no (xem yeu cau nguoi dung 2026-07-31).
  historyStatsEl.innerHTML = partner
    ? statCard('Cần thanh toán', formatMoney(partner.balance), partner.balance > 0)
    : '';
  historyTbody.innerHTML = '';
  historyModal.hidden = false;

  try {
    const { entries, total_transacted: totalTransacted } = await apiFetch(`/debts?partner_id=${partnerId}`);

    if (partner) {
      historyStatsEl.innerHTML = [
        statCard('Cần thanh toán', formatMoney(partner.balance), partner.balance > 0),
        statCard('Tổng tiền hàng đã mua', formatMoney(totalTransacted)),
      ].join('');
    }

    historyTbody.innerHTML = entries
      .map((e) => {
        // Dieu chinh cong no (migration 016) co badge rieng, khac voi dong tu dong khi tao
        // phieu ("Phat sinh no") va thanh toan that ("Thanh toan") - tranh nham la giao dich
        // that. Mau phan biet ro chieu tang (xanh)/giam (do), khong chi ghi chung chung
        // "Dieu chinh" (xem phan hoi nguoi dung 2026-08-01).
        let typeBadge;
        if (e.is_adjustment) {
          typeBadge = e.type === 'no'
            ? '<span class="badge badge-active">Điều chỉnh: Tăng</span>'
            : '<span class="badge badge-down">Điều chỉnh: Giảm</span>';
        } else if (e.type === 'no') {
          typeBadge = '<span class="badge badge-inactive">Phát sinh nợ</span>';
        } else {
          typeBadge = '<span class="badge badge-active">Thanh toán</span>';
        }
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
        amount: getMoneyValue(paymentAmountInput),
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

// ----- Dieu chinh cong no (migration 016, khac "Ghi nhan thanh toan") -----

function renderAdjustmentPartnerOptions() {
  adjustmentPartnerSelect.innerHTML = summaryCache
    .map((s) => `<option value="${s.partner_id}">${s.name} - còn ${formatMoney(s.balance)}</option>`)
    .join('');
}

// Danh sach phieu goc de chon ("phieu bi sai") chi tai LAI theo doi tac dang chon trong modal -
// khac adjustment.js (dung o form lap phieu) vi o day can loc theo dung 1 doi tac, va API rieng
// (/debts/documents) khong doi hoi quyen 'kho' nhu /stock-receipts (tranh 403 voi tai khoan chi
// co quyen 'cong_no', vd vai tro Ke toan - xem docs/DECISIONS.md).
async function loadAdjustableDocs(partnerId) {
  adjustableDocsCache = [];
  if (!partnerId) return;
  try {
    const { documents } = await apiFetch(`/debts/documents?partner_id=${partnerId}`);
    adjustableDocsCache = documents.map((d) => ({
      ...d,
      label: `${d.code} (${d.type === 'receipt' ? 'Phiếu nhập' : 'Phiếu xuất'})`,
    }));
  } catch (err) {
    renderDebtsError(err.message);
  }
}

function renderAdjustmentDocSuggestions(keyword) {
  const kw = keyword.trim().toLowerCase();
  if (!kw) {
    adjustmentDocSuggestions.innerHTML = '';
    return;
  }

  const matches = adjustableDocsCache.filter((d) => d.code.toLowerCase().includes(kw)).slice(0, 8);
  if (matches.length === 0) {
    adjustmentDocSuggestions.innerHTML = '<div class="combobox-empty">Không tìm thấy phiếu công nợ nào của đối tác này</div>';
    return;
  }

  adjustmentDocSuggestions.innerHTML = matches
    .map((d) => `<div class="combobox-option" data-type="${d.type}" data-id="${d.id}" data-label="${d.label}">${d.label}</div>`)
    .join('');
}

function resetAdjustmentDocField() {
  adjustmentDocSearchInput.value = '';
  adjustmentDocTypeInput.value = '';
  adjustmentDocIdInput.value = '';
  adjustmentDocSuggestions.innerHTML = '';
}

adjustmentDocSearchInput.addEventListener('input', (event) => {
  adjustmentDocTypeInput.value = '';
  adjustmentDocIdInput.value = '';
  renderAdjustmentDocSuggestions(event.target.value);
});

adjustmentDocSuggestions.addEventListener('click', (event) => {
  const option = event.target.closest('.combobox-option');
  if (!option) return;
  adjustmentDocTypeInput.value = option.dataset.type;
  adjustmentDocIdInput.value = option.dataset.id;
  adjustmentDocSearchInput.value = option.dataset.label;
  adjustmentDocSuggestions.innerHTML = '';
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('#adjustment-doc-search') && !event.target.closest('#adjustment-doc-suggestions')) {
    adjustmentDocSuggestions.innerHTML = '';
  }
});

async function openAdjustmentModal(partnerId) {
  renderAdjustmentPartnerOptions();
  adjustmentForm.reset();
  resetAdjustmentDocField();
  adjustmentFormErrorBox.hidden = true;
  if (partnerId) adjustmentPartnerSelect.value = partnerId;
  adjustmentModal.hidden = false;
  await loadAdjustableDocs(adjustmentPartnerSelect.value);
}

function closeAdjustmentModal() {
  adjustmentModal.hidden = true;
}

btnAddAdjustment.addEventListener('click', () => openAdjustmentModal(null));
btnCancelAdjustment.addEventListener('click', closeAdjustmentModal);
adjustmentModal.addEventListener('click', (event) => {
  if (event.target === adjustmentModal) closeAdjustmentModal();
});

// Doi doi tac trong modal -> nap lai danh sach phieu cua DUNG doi tac do, xoa lua chon phieu cu.
adjustmentPartnerSelect.addEventListener('change', () => {
  resetAdjustmentDocField();
  loadAdjustableDocs(adjustmentPartnerSelect.value);
});

adjustmentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  adjustmentFormErrorBox.hidden = true;
  btnSubmitAdjustment.disabled = true;
  btnSubmitAdjustment.textContent = 'Đang ghi...';

  try {
    const body = {
      partner_id: Number(adjustmentPartnerSelect.value),
      type: adjustmentTypeSelect.value,
      amount: getMoneyValue(adjustmentAmountInput),
      note: adjustmentNoteInput.value.trim(),
    };
    if (adjustmentDocTypeInput.value && adjustmentDocIdInput.value) {
      body.reference_type = adjustmentDocTypeInput.value;
      body.reference_id = Number(adjustmentDocIdInput.value);
    }

    await apiFetch('/debts/adjustment', { method: 'POST', body: JSON.stringify(body) });
    closeAdjustmentModal();
    await loadSummary();
  } catch (err) {
    adjustmentFormErrorText.textContent = err.message;
    adjustmentFormErrorBox.hidden = false;
  } finally {
    btnSubmitAdjustment.disabled = false;
    btnSubmitAdjustment.textContent = 'Ghi điều chỉnh';
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
  } else if (action === 'adjust') {
    openAdjustmentModal(id);
  }
});

(async function init() {
  currentUser = await initLayout('debts');
  if (!currentUser) return;

  btnAddPayment.innerHTML = `${icon('plus', 16)} Ghi nhận thanh toán`;
  btnAddAdjustment.innerHTML = `${icon('sliders', 16)} Điều chỉnh công nợ`;
  document.querySelector('.search-box .input-icon').innerHTML = icon('search', 16);
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await loadSummary();
})();
