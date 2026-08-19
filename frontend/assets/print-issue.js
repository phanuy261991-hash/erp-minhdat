// Trang in phieu xuat kho (chi doc, khong dung layout.js/sidebar - day la ban in doc lap, xem
// docs/PRD.md muc 4.5). Noi dung mau in KHONG hardcode trong file nay - doc tu mau da luu qua GET
// /api/print-templates/stock_issue (cau hinh duoc o trang "Mau in", menu Cau hinh; tu migration
// 040 la 1 khung HTML/CSS that duy nhat, khong con tach header/footer/table_columns). Logic tinh
// gia tri token + lap dong bang san pham dung CHUNG voi khung xem truoc cua trang chinh sua mau
// in, xem frontend/assets/print-template-render.js.

const issueId = new URLSearchParams(window.location.search).get('id');
const errorBox = document.getElementById('print-error');
const errorText = document.getElementById('print-error-text');
const sheet = document.getElementById('print-sheet');

function renderError(message) {
  errorText.textContent = message;
  errorBox.hidden = false;
}

// Kho ngang: kich thuoc hien thi tren man hinh gio do chinh <style> cua mau quyet dinh (xem
// print-sheet trong style.css) - o day chi con lo phan THAT SU anh huong luc in: chen 1 <style>
// rieng dat @page size (khong the dieu kien hoa @page theo class trong CSS thuan).
function applyPrintOrientation(orientation) {
  if (orientation === 'landscape') {
    const style = document.createElement('style');
    style.textContent = '@page { size: A4 landscape; }';
    document.head.appendChild(style);
  }
}

function renderIssue(issue, company, template) {
  const tokenValues = buildStockIssueTokenValues(issue, company);
  const rendered = renderPrintTemplate({
    templateHtml: template.template_html,
    tokenValues,
    items: issue.items,
    itemTokenBuilder: buildStockIssueItemTokenValues,
  });
  // Mau in mang theo <style> CSS rieng cua nguoi dung (bat buoc tu migration 040) - PHAI render
  // trong Shadow DOM (attachShadow tren chinh #print-sheet) de CSS do khong ro ri ra ngoai anh
  // huong .print-toolbar/nut "Quay lai"/"In phieu" (da xay ra that: 1 mau nguoi dung tu viet co
  // `* { margin:0 }` + `body { display:flex }` day lech het toolbar - phat hien qua phan hoi
  // nguoi dung 2026-08-19). Cung 1 nguyen tac co lap da ap dung cho khung xem truoc o
  // print-template-edit.js (o do dung iframe vi la trang khac; o day dung Shadow DOM vi van la
  // cung 1 trang, can window.print() in dung ca noi dung ben trong).
  const shadow = sheet.shadowRoot || sheet.attachShadow({ mode: 'open' });
  shadow.innerHTML = rendered;

  applyPrintOrientation(template.orientation);
}

(async function init() {
  document.getElementById('btn-back').innerHTML = `${icon('arrowLeft', 16)} Quay lại`;
  // Dang chay trong popup (iframe, xem print-preview.js) thi dong popup cua trang cha; neu duoc
  // mo truc tiep qua URL (vd debug) thi dieu huong ve danh sach nhu truoc.
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
      apiFetch('/print-templates/stock_issue'),
    ]);
    renderIssue(issue, settings, template);
    sheet.hidden = false;
  } catch (err) {
    if (err.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    renderError(err.message);
  }
})();
