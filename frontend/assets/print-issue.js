// Trang in phieu xuat kho (chi doc, khong dung layout.js/sidebar - day la ban in doc lap,
// xem docs/PRD.md muc 4.5). Chi can GET /api/stock-issues/:id (da co du lieu day du: items,
// total_amount, thong tin khach hang) + GET /api/company-settings (thong tin cong ty hien tren
// dau phieu) - khong can them API rieng "/print" nhu du dinh ban dau trong docs/Plan.md.

function formatMoney(value) {
  return Number(value).toLocaleString('vi-VN');
}

function formatDate(sqliteDateTime) {
  const iso = sqliteDateTime.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const issueId = new URLSearchParams(window.location.search).get('id');
const errorBox = document.getElementById('print-error');
const errorText = document.getElementById('print-error-text');
const sheet = document.getElementById('print-sheet');

function renderError(message) {
  errorText.textContent = message;
  errorBox.hidden = false;
}

// Dien 1 dong thong tin cong ty, tu an dong neu khong co du lieu (khong de trong khung gay
// khoang trang thua) - dung chung cho tung dong rieng biet trong .print-company.
function renderCompanyLine(elementId, text) {
  const el = document.getElementById(elementId);
  el.textContent = text;
  el.hidden = !text;
}

function renderCompany(company) {
  document.getElementById('print-company-name').textContent = company.company_name || '(Chưa cấu hình tên công ty)';
  renderCompanyLine('print-company-address', company.address ? `Địa chỉ: ${company.address}` : '');

  const phones = Array.isArray(company.phones) ? company.phones : [];
  renderCompanyLine('print-company-phones', phones.length > 0 ? `Điện thoại: ${phones.join(' - ')}` : '');

  renderCompanyLine('print-company-tax-code', company.tax_code ? `MST: ${company.tax_code}` : '');

  const contactParts = [];
  if (company.email) contactParts.push(`Email: ${company.email}`);
  if (company.website) contactParts.push(`Web: ${company.website}`);
  renderCompanyLine('print-company-contact', contactParts.join(' - '));

  const bankParts = [];
  if (company.bank_account_number) {
    let bankLine = `STK: ${company.bank_account_number}`;
    if (company.bank_name) bankLine += ` - ${company.bank_name}`;
    if (company.bank_branch) bankLine += ` (${company.bank_branch})`;
    bankParts.push(bankLine);
  }
  if (company.bank_account_holder) bankParts.push(`Chủ TK: ${company.bank_account_holder}`);
  renderCompanyLine('print-company-bank', bankParts.join(' - '));

  const noteRow = document.getElementById('print-company-note-row');
  if (company.print_note && company.print_note.trim()) {
    document.getElementById('print-company-note-text').textContent = company.print_note;
    noteRow.hidden = false;
  } else {
    noteRow.hidden = true;
  }
}

function renderIssue(issue) {
  document.getElementById('print-code').textContent = issue.code;
  document.getElementById('print-date').textContent = formatDate(issue.created_at);
  document.getElementById('print-customer-name').textContent = issue.partner_name || 'Khách lẻ';
  document.getElementById('print-customer-address').textContent = issue.partner_address || '-';
  document.getElementById('print-customer-phone').textContent = issue.partner_phone || '-';

  const noteRow = document.getElementById('print-note-row');
  if (issue.note) {
    document.getElementById('print-note').textContent = issue.note;
    noteRow.hidden = false;
  } else {
    noteRow.hidden = true;
  }

  const itemsTbody = document.getElementById('print-items');
  itemsTbody.innerHTML = issue.items
    .map((item, index) => {
      const lineTotal = item.quantity * item.unit_price * (1 - item.discount_percent / 100);
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${item.product_code}</td>
          <td>${item.product_name}</td>
          <td>${item.unit}</td>
          <td class="print-num">${formatMoney(item.quantity)}</td>
          <td class="print-num">${formatMoney(item.unit_price)}</td>
          <td class="print-num">${item.discount_percent ? `${item.discount_percent}%` : '-'}</td>
          <td class="print-num">${formatMoney(Math.round(lineTotal))}</td>
        </tr>
      `;
    })
    .join('');

  document.getElementById('print-total').textContent = `${formatMoney(Math.round(issue.total_amount))} đ`;
  document.getElementById('print-created-by').textContent = issue.created_by_name;
}

(async function init() {
  document.getElementById('btn-back').innerHTML = `${icon('arrowLeft', 16)} Quay lại`;
  document.getElementById('btn-print').innerHTML = `${icon('printer', 16)} In phiếu`;
  document.getElementById('btn-print').addEventListener('click', () => window.print());
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  if (!issueId) {
    renderError('Thiếu id phiếu xuất trên đường dẫn');
    return;
  }

  try {
    const [{ issue }, { settings }] = await Promise.all([
      apiFetch(`/stock-issues/${issueId}`),
      apiFetch('/company-settings'),
    ]);
    renderCompany(settings);
    renderIssue(issue);
    sheet.hidden = false;
  } catch (err) {
    if (err.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    renderError(err.message);
  }
})();
