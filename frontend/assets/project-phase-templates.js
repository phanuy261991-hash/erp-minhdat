// Logic trang "Giai doan mau" (migration 021, thuoc menu Cau hinh): danh sach, them/sua/xoa.
// Danh muc nay chi dung de copy vao du an moi tao (xem backend project.service.js
// copyPhaseTemplatesIntoProject) - sua/xoa o day KHONG anh huong du an da tao truoc do.

let currentUser = null;
let templatesCache = [];
let editingTemplateId = null;

const templatesTbody = document.getElementById('templates-tbody');
const templatesErrorBox = document.getElementById('templates-error');
const templatesErrorText = document.getElementById('templates-error-text');

const btnAddTemplate = document.getElementById('btn-add-template');
const templateModal = document.getElementById('template-modal');
const templateModalTitle = document.getElementById('template-modal-title');
const templateForm = document.getElementById('template-form');
const templateFormErrorBox = document.getElementById('template-form-error');
const templateFormErrorText = document.getElementById('template-form-error-text');
const btnCancelTemplate = document.getElementById('btn-cancel-template');
const btnSubmitTemplate = document.getElementById('btn-submit-template');

const nameInput = document.getElementById('template-name');
const sortOrderInput = document.getElementById('template-sort-order');

function renderTemplatesError(message) {
  templatesErrorText.textContent = message;
  templatesErrorBox.hidden = false;
}

function renderRow(template) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${template.sort_order}</td>
    <td>${template.name}</td>
    <td>
      <button type="button" class="icon-btn" data-action="edit" data-id="${template.id}" title="Sửa giai đoạn mẫu">${icon('pencil', 14)}</button>
      <button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${template.id}" title="Xóa giai đoạn mẫu">${icon('trash', 14)}</button>
    </td>
  `;
  return tr;
}

function renderTemplates() {
  templatesTbody.innerHTML = '';
  templatesCache.forEach((t) => templatesTbody.appendChild(renderRow(t)));
}

async function loadTemplates() {
  try {
    const { templates } = await apiFetch('/project-phase-templates');
    templatesCache = templates;
    renderTemplates();
  } catch (err) {
    renderTemplatesError(err.message);
  }
}

function openCreateModal() {
  editingTemplateId = null;
  templateModalTitle.textContent = 'Thêm giai đoạn mẫu';
  templateForm.reset();
  sortOrderInput.value = templatesCache.length > 0 ? Math.max(...templatesCache.map((t) => t.sort_order)) + 1 : 1;
  templateFormErrorBox.hidden = true;
  templateModal.hidden = false;
  nameInput.focus();
}

function openEditModal(template) {
  editingTemplateId = template.id;
  templateModalTitle.textContent = 'Sửa giai đoạn mẫu';
  nameInput.value = template.name;
  sortOrderInput.value = template.sort_order;
  templateFormErrorBox.hidden = true;
  templateModal.hidden = false;
  nameInput.focus();
}

function closeTemplateModal() {
  templateModal.hidden = true;
}

btnAddTemplate.addEventListener('click', openCreateModal);
btnCancelTemplate.addEventListener('click', closeTemplateModal);
templateModal.addEventListener('click', (event) => {
  if (event.target === templateModal) closeTemplateModal();
});

templatesTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === 'edit') {
    const template = templatesCache.find((t) => String(t.id) === id);
    if (template) openEditModal(template);
    return;
  }

  if (action === 'delete') {
    if (!confirm('Xóa giai đoạn mẫu này? Không ảnh hưởng các dự án đã tạo trước đó.')) return;

    button.disabled = true;
    try {
      await apiFetch(`/project-phase-templates/${id}`, { method: 'DELETE' });
      await loadTemplates();
    } catch (err) {
      renderTemplatesError(err.message);
      button.disabled = false;
    }
  }
});

templateForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  templateFormErrorBox.hidden = true;
  btnSubmitTemplate.disabled = true;
  btnSubmitTemplate.textContent = 'Đang lưu...';

  const body = {
    name: nameInput.value.trim(),
    sort_order: sortOrderInput.value === '' ? 0 : Number(sortOrderInput.value),
  };

  try {
    if (editingTemplateId === null) {
      await apiFetch('/project-phase-templates', { method: 'POST', body: JSON.stringify(body) });
    } else {
      await apiFetch(`/project-phase-templates/${editingTemplateId}`, { method: 'PUT', body: JSON.stringify(body) });
    }
    closeTemplateModal();
    await loadTemplates();
  } catch (err) {
    templateFormErrorText.textContent = err.message;
    templateFormErrorBox.hidden = false;
  } finally {
    btnSubmitTemplate.disabled = false;
    btnSubmitTemplate.textContent = 'Lưu';
  }
});

(async function init() {
  currentUser = await initLayout('project-phase-templates');
  if (!currentUser) return;

  btnAddTemplate.innerHTML = `${icon('plus', 16)} Thêm giai đoạn`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await loadTemplates();
})();
