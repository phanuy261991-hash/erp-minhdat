// Trang in "Giay de nghi tam ung" cho 1 dot thanh toan du an (migration 030, theo yeu cau
// nguoi dung 2026-08-05, kem mau PDF that tham khao). Chi doc, khong dung layout.js/sidebar -
// giong het pattern print-issue.html. Loai phieu nay KHONG co bang san pham (hasTable=false) -
// chi 2 mount dau/chan trang, khong co #print-table-mount.

const params = new URLSearchParams(window.location.search);
const projectId = params.get('project_id');
const milestoneId = params.get('milestone_id');
const errorBox = document.getElementById('print-error');
const errorText = document.getElementById('print-error-text');
const sheet = document.getElementById('print-sheet');

function renderError(message) {
  errorText.textContent = message;
  errorBox.hidden = false;
}

function applyPrintOrientation(orientation) {
  sheet.classList.toggle('print-sheet--landscape', orientation === 'landscape');
  if (orientation === 'landscape') {
    const style = document.createElement('style');
    style.textContent = '@page { size: A4 landscape; }';
    document.head.appendChild(style);
  }
}

function renderAdvance(project, milestone, company, template) {
  const tokenValues = buildProjectAdvanceTokenValues(project, milestone, company);

  const headerMount = document.getElementById('print-header-mount');
  const footerMount = document.getElementById('print-footer-mount');

  headerMount.innerHTML = template.header_html;
  footerMount.innerHTML = template.footer_html;
  applyPrintTemplateTokens(headerMount, tokenValues);
  applyPrintTemplateTokens(footerMount, tokenValues);

  applyPrintOrientation(template.orientation);
}

(async function init() {
  document.getElementById('btn-back').innerHTML = `${icon('arrowLeft', 16)} Quay lại`;
  document.getElementById('btn-back').addEventListener('click', () => window.history.back());
  document.getElementById('btn-print').innerHTML = `${icon('printer', 16)} In phiếu`;
  document.getElementById('btn-print').addEventListener('click', () => window.print());
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  if (!projectId || !milestoneId) {
    renderError('Thiếu thông tin dự án hoặc đợt thanh toán trên đường dẫn');
    return;
  }

  try {
    const [{ project }, { milestones }, { settings }, { template }] = await Promise.all([
      apiFetch(`/projects/${projectId}`),
      apiFetch(`/projects/${projectId}/milestones`),
      apiFetch('/company-settings'),
      apiFetch('/print-templates/project_payment_advance'),
    ]);

    const milestone = milestones.find((m) => String(m.id) === milestoneId);
    if (!milestone) {
      renderError('Không tìm thấy đợt thanh toán');
      return;
    }

    renderAdvance(project, milestone, settings, template);
    sheet.hidden = false;
  } catch (err) {
    if (err.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    renderError(err.message);
  }
})();
