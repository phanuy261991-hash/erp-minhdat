// Trang "Mau in" (migration 028, menu Cau hinh): danh sach cac LOAI phieu da co mau in trong he
// thong. Khong co nut "Them mau moi" - moi loai phieu can co san 1 trang in tuong ung (vd
// print-issue.html) moi dung duoc, khong phai mau nguoi dung tu dat ten tu do (da chot voi nguoi
// dung, xem docs/DECISIONS.md). Bam icon "Sua" dieu huong sang print-template-edit.html?type=...

// Nhan hien thi cho tung loai phieu - chi 1 dong hien tai (Phieu xuat kho), them mau in moi thi
// bo sung them 1 dong o day.
const TEMPLATE_TYPE_LABELS = {
  stock_issue: 'Phiếu xuất kho',
  project_payment_advance: 'Đợt thanh toán dự án',
  acceptance_solution: 'Nghiệm thu theo giải pháp',
};

const templatesTbody = document.getElementById('templates-tbody');
const templatesErrorBox = document.getElementById('templates-error');
const templatesErrorText = document.getElementById('templates-error-text');

function renderTemplatesError(message) {
  templatesErrorText.textContent = message;
  templatesErrorBox.hidden = false;
}

function formatDateTime(sqliteDateTime) {
  const iso = sqliteDateTime.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderRow(template) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${template.name}</td>
    <td>${TEMPLATE_TYPE_LABELS[template.type] || template.type}</td>
    <td>${template.orientation === 'landscape' ? 'A4 ngang' : 'A4 dọc'}</td>
    <td>${formatDateTime(template.updated_at)}</td>
    <td>
      <a href="print-template-edit.html?type=${encodeURIComponent(template.type)}" class="icon-btn" title="Sửa mẫu in">${icon('pencil', 14)}</a>
    </td>
  `;
  return tr;
}

async function loadTemplates() {
  try {
    const { templates } = await apiFetch('/print-templates');
    templatesTbody.innerHTML = '';
    templates.forEach((t) => templatesTbody.appendChild(renderRow(t)));
  } catch (err) {
    renderTemplatesError(err.message);
  }
}

(async function init() {
  const currentUser = await initLayout('print-templates');
  if (!currentUser) return;

  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await loadTemplates();
})();
