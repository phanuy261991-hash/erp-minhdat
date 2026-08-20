// Trang in "Phieu xac nhan don hang" cho 1 phieu xuat kho dang o trang thai NHAP (2026-08-20,
// theo yeu cau nguoi dung) - dung DUNG API GET /stock-issues/:id nhu print-issue.js (tra ve day
// du items du phieu con nhap hay da xuat kho), chi khac mau in dang doc (/print-templates/
// order_confirmation thay vi stock_issue). Chi doc, khong dung layout.js/sidebar.

const issueId = new URLSearchParams(window.location.search).get('id');
const errorBox = document.getElementById('print-error');
const errorText = document.getElementById('print-error-text');
const sheet = document.getElementById('print-sheet');

function renderError(message) {
  errorText.textContent = message;
  errorBox.hidden = false;
}

function applyPrintOrientation(orientation) {
  if (orientation === 'landscape') {
    const style = document.createElement('style');
    style.textContent = '@page { size: A4 landscape; }';
    document.head.appendChild(style);
  }
}

function renderOrderConfirmation(issue, company, template) {
  const tokenValues = buildStockIssueTokenValues(issue, company);
  const rendered = renderPrintTemplate({
    templateHtml: template.template_html,
    tokenValues,
    items: issue.items,
    itemTokenBuilder: buildStockIssueItemTokenValues,
  });
  // Bat buoc Shadow DOM (khong innerHTML truc tiep) - xem chu thich print-issue.js: mau in mang
  // theo <style> rieng cua nguoi dung, phai co lap de khong ro ri ra .print-toolbar.
  const shadow = sheet.shadowRoot || sheet.attachShadow({ mode: 'open' });
  shadow.innerHTML = rendered;

  applyPrintOrientation(template.orientation);
}

(async function init() {
  document.getElementById('btn-back').innerHTML = `${icon('arrowLeft', 16)} Quay lại`;
  document.getElementById('btn-back').addEventListener('click', () => goBackFromPrintPage('stock-issues.html'));
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
    const [{ issue }, { settings }, { template }] = await Promise.all([
      apiFetch(`/stock-issues/${issueId}`),
      apiFetch('/company-settings'),
      apiFetch('/print-templates/order_confirmation'),
    ]);
    renderOrderConfirmation(issue, settings, template);
    sheet.hidden = false;
  } catch (err) {
    if (err.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    renderError(err.message);
  }
})();
