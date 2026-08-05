// Trang in phieu xuat kho (chi doc, khong dung layout.js/sidebar - day la ban in doc lap, xem
// docs/PRD.md muc 4.5). Tu migration 028 (theo yeu cau nguoi dung 2026-08-05), noi dung dau
// trang/chan trang/cot bang san pham KHONG con hardcode cung trong file nay - doc tu mau da luu
// qua GET /api/print-templates/stock_issue (cau hinh duoc o trang "Mau in", menu Cau hinh). Logic
// tinh gia tri token + dung bang dung CHUNG voi khung xem truoc cua trang chinh sua mau in, xem
// frontend/assets/print-template-render.js.

const issueId = new URLSearchParams(window.location.search).get('id');
const errorBox = document.getElementById('print-error');
const errorText = document.getElementById('print-error-text');
const sheet = document.getElementById('print-sheet');

function renderError(message) {
  errorText.textContent = message;
  errorBox.hidden = false;
}

// Kho ngang: CSS lop .print-sheet--landscape chi doi hien thi tren man hinh - luc in that phai
// tu chen 1 <style> rieng dat @page size, vi @page khong the dieu kien hoa theo class trong CSS
// thuan (xem chu thich trong style.css).
function applyPrintOrientation(orientation) {
  sheet.classList.toggle('print-sheet--landscape', orientation === 'landscape');
  if (orientation === 'landscape') {
    const style = document.createElement('style');
    style.textContent = '@page { size: A4 landscape; }';
    document.head.appendChild(style);
  }
}

function renderIssue(issue, company, template, tableColumnsMeta) {
  const tokenValues = buildStockIssueTokenValues(issue, company);

  const headerMount = document.getElementById('print-header-mount');
  const footerMount = document.getElementById('print-footer-mount');
  const tableMount = document.getElementById('print-table-mount');

  headerMount.innerHTML = template.header_html;
  footerMount.innerHTML = template.footer_html;
  applyPrintTemplateTokens(headerMount, tokenValues);
  applyPrintTemplateTokens(footerMount, tokenValues);

  tableMount.innerHTML = renderPrintTable({
    columns: template.table_columns,
    columnsMeta: tableColumnsMeta,
    items: issue.items,
    totalAmount: issue.total_amount,
    showAmountInWords: template.show_amount_in_words,
  });

  applyPrintOrientation(template.orientation);
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
    const [{ issue }, { settings }, { template }, { tableColumns }] = await Promise.all([
      apiFetch(`/stock-issues/${issueId}`),
      apiFetch('/company-settings'),
      apiFetch('/print-templates/stock_issue'),
      apiFetch('/print-templates/stock_issue/tokens'),
    ]);
    renderIssue(issue, settings, template, tableColumns);
    sheet.hidden = false;
  } catch (err) {
    if (err.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    renderError(err.message);
  }
})();
