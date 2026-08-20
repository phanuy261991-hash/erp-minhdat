// Trang in "Bien ban nghiem thu" cho 1 giai phap nghiem thu du an (migration 041, theo yeu cau
// nguoi dung 2026-08-19 - xem docs/handoff/HANDOFF-NghiemThu-2026-08-19-v2.md). Chi doc, khong
// dung layout.js/sidebar - giong het pattern print-issue.html/print-project-advance.html.

const params = new URLSearchParams(window.location.search);
const projectId = params.get('project_id');
const solutionId = params.get('solution_id');
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

function renderAcceptance(project, solution, company, template) {
  const tokenValues = buildAcceptanceSolutionTokenValues(project, solution, company);
  const rendered = renderPrintTemplate({
    templateHtml: template.template_html,
    tokenValues,
    items: solution.items,
    itemTokenBuilder: buildAcceptanceSolutionItemTokenValues,
  });
  // Bat buoc Shadow DOM (khong innerHTML truc tiep) - xem chu thich print-issue.js: mau in mang
  // theo <style> rieng cua nguoi dung, phai co lap de khong ro ri ra .print-toolbar/nut "Quay
  // lai"/"In phieu" (su co that da xay ra 2026-08-19, xem docs/DECISIONS.md muc "Mau in").
  const shadow = sheet.shadowRoot || sheet.attachShadow({ mode: 'open' });
  shadow.innerHTML = rendered;

  applyPrintOrientation(template.orientation);
}

(async function init() {
  document.getElementById('btn-back').innerHTML = `${icon('arrowLeft', 16)} Quay lại`;
  // Dang chay trong popup (iframe, xem print-preview.js) thi dong popup cua trang cha; neu duoc
  // mo truc tiep qua URL (vd debug) thi dung history.back() nhu truoc.
  document.getElementById('btn-back').addEventListener('click', () => goBackFromPrintPage());
  document.getElementById('btn-print').innerHTML = `${icon('printer', 16)} In phiếu`;
  document.getElementById('btn-print').addEventListener('click', () => window.print());
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  if (!projectId || !solutionId) {
    renderError('Thiếu thông tin dự án hoặc giải pháp trên đường dẫn');
    return;
  }

  try {
    const [{ project }, { solution }, { settings }, { template }] = await Promise.all([
      apiFetch(`/projects/${projectId}`),
      apiFetch(`/projects/${projectId}/acceptance-solutions/${solutionId}`),
      apiFetch('/company-settings'),
      apiFetch('/print-templates/acceptance_solution'),
    ]);

    renderAcceptance(project, solution, settings, template);
    sheet.hidden = false;
  } catch (err) {
    if (err.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    renderError(err.message);
  }
})();
