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
const paymentProjectField = document.getElementById('payment-project-field');
const paymentProjectSelect = document.getElementById('payment-project');
const paymentMilestoneField = document.getElementById('payment-milestone-field');
const paymentMilestoneSelect = document.getElementById('payment-milestone');
let paymentProjectsCache = [];

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
const adjustmentProjectField = document.getElementById('adjustment-project-field');
const adjustmentProjectSelect = document.getElementById('adjustment-project');
let adjustmentProjectsCache = [];

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
        // Mau phan biet ro chieu tang (xanh)/giam (do) cho dong dieu chinh, khong chi ghi
        // chung chung "Dieu chinh" (xem phan hoi nguoi dung 2026-08-01).
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

// O "Du an"/"Dot thanh toan" (Dot 4, migration 025) - chi hien khi khach hang dang chon CO du
// an, dung API moi `GET /projects?partner_id=` (loc dung khach hang, khong phai toan bo du an
// he thong). Loai bo du an da "huy" giong pattern da dung o stock-receipts.js/stock-issues.js.
async function loadProjectsForPartner(partnerId) {
  if (!partnerId) return [];
  const { projects } = await apiFetch(`/projects?partner_id=${partnerId}`);
  return projects.filter((p) => p.status !== 'huy');
}

async function updatePaymentMilestoneField() {
  const projectId = paymentProjectSelect.value;
  if (!projectId) {
    paymentMilestoneField.hidden = true;
    paymentMilestoneSelect.innerHTML = '<option value="">-- Không gắn đợt --</option>';
    return;
  }

  const { milestones } = await apiFetch(`/projects/${projectId}/milestones`);
  if (milestones.length === 0) {
    paymentMilestoneField.hidden = true;
    paymentMilestoneSelect.innerHTML = '<option value="">-- Không gắn đợt --</option>';
    return;
  }
  paymentMilestoneField.hidden = false;
  paymentMilestoneSelect.innerHTML = '<option value="">-- Không gắn đợt --</option>' +
    milestones.map((m) => `<option value="${m.id}">${m.name} - còn ${formatMoney(m.remaining_amount)}</option>`).join('');
}

async function updatePaymentProjectField() {
  paymentProjectsCache = await loadProjectsForPartner(paymentPartnerSelect.value);
  if (paymentProjectsCache.length === 0) {
    paymentProjectField.hidden = true;
    paymentProjectSelect.innerHTML = '<option value="">-- Không gắn dự án --</option>';
  } else {
    paymentProjectField.hidden = false;
    paymentProjectSelect.innerHTML = '<option value="">-- Không gắn dự án --</option>' +
      paymentProjectsCache.map((p) => `<option value="${p.id}">${p.code} - ${p.name}</option>`).join('');
  }
  await updatePaymentMilestoneField();
}

paymentPartnerSelect.addEventListener('change', updatePaymentProjectField);
paymentProjectSelect.addEventListener('change', updatePaymentMilestoneField);

async function openPaymentModal(partnerId) {
  renderPartnerOptions();
  paymentForm.reset();
  paymentPartnerSelect.disabled = false;
  paymentProjectSelect.disabled = false;
  paymentMilestoneSelect.disabled = false;
  if (partnerId) paymentPartnerSelect.value = partnerId;
  paymentFormErrorBox.hidden = true;
  paymentModal.hidden = false;
  await updatePaymentProjectField();
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
        project_id: paymentProjectSelect.value || null,
        milestone_id: paymentMilestoneSelect.value || null,
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

// O "Du an" cho form Dieu chinh cong no (Dot 4) - khong co "Dot thanh toan" o day, chi form
// Ghi nhan thanh toan moi co (dung PRD 4.12).
async function updateAdjustmentProjectField() {
  adjustmentProjectsCache = await loadProjectsForPartner(adjustmentPartnerSelect.value);
  if (adjustmentProjectsCache.length === 0) {
    adjustmentProjectField.hidden = true;
    adjustmentProjectSelect.innerHTML = '<option value="">-- Không gắn dự án --</option>';
  } else {
    adjustmentProjectField.hidden = false;
    adjustmentProjectSelect.innerHTML = '<option value="">-- Không gắn dự án --</option>' +
      adjustmentProjectsCache.map((p) => `<option value="${p.id}">${p.code} - ${p.name}</option>`).join('');
  }
}

adjustmentPartnerSelect.addEventListener('change', updateAdjustmentProjectField);

async function openAdjustmentModal(partnerId) {
  renderAdjustmentPartnerOptions();
  adjustmentForm.reset();
  resetAdjustmentDocField();
  adjustmentFormErrorBox.hidden = true;
  if (partnerId) adjustmentPartnerSelect.value = partnerId;
  adjustmentModal.hidden = false;
  await Promise.all([loadAdjustableDocs(adjustmentPartnerSelect.value), updateAdjustmentProjectField()]);
}

function closeAdjustmentModal() {
  adjustmentModal.hidden = true;
}

btnAddAdjustment.addEventListener('click', () => openAdjustmentModal(null));
btnCancelAdjustment.addEventListener('click', closeAdjustmentModal);
adjustmentModal.addEventListener('click', (event) => {
  if (event.target === adjustmentModal) closeAdjustmentModal();
});

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
      project_id: adjustmentProjectSelect.value || null,
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

// Mo san modal Ghi nhan thanh toan tu trang chi tiet du an (nut "Ghi nhan da thu" tren 1 dot
// thanh toan, xem project-detail.js) - dung pattern dieu huong qua URL da co o Bao hanh
// (customer_id=/edit= tu customer-detail.html). Khoa ca 3 o (Khach hang/Du an/Dot thanh toan)
// khong cho doi vi nguoi dung dang thao tac dung tu ngu canh 1 dot thanh toan cu the.
async function applyPaymentPresetFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('open_payment') !== '1') return;

  const partnerId = params.get('partner_id');
  const projectId = params.get('project_id');
  const milestoneId = params.get('milestone_id');
  if (!partnerId) return;

  await openPaymentModal(partnerId);
  if (projectId) {
    paymentProjectSelect.value = projectId;
    await updatePaymentMilestoneField();
    if (milestoneId) paymentMilestoneSelect.value = milestoneId;
  }
  paymentPartnerSelect.disabled = true;
  paymentProjectSelect.disabled = true;
  paymentMilestoneSelect.disabled = true;
}

(async function init() {
  currentUser = await initLayout('customer-debts');
  if (!currentUser) return;

  btnAddPayment.innerHTML = `${icon('plus', 16)} Ghi nhận thanh toán`;
  btnAddAdjustment.innerHTML = `${icon('sliders', 16)} Điều chỉnh công nợ`;
  document.querySelector('.search-box .input-icon').innerHTML = icon('search', 16);
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await loadSummary();
  await applyPaymentPresetFromUrl();
})();
