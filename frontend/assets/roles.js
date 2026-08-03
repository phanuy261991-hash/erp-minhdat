// Logic trang quan ly vai tro: danh sach, tao/sua (kem chon module), xoa.
// Vai tro is_protected (Admin) khong cho sua/xoa qua giao dien nay - khop voi chan o backend
// (backend/routes/roles.routes.js), day chi la an nut de tranh nguoi dung bam roi bi loi.

// Danh sach module + nhan tieng Viet lay dong tu GET /api/roles/modules (2026-08-03) - truoc day
// hardcode rieng 1 ban o day, bi quen cap nhat khi them module 'so_quy' (Sổ quỹ) nen checkbox
// khong hien duoc, dan toi mat quyen 'so_quy' khoi vai tro khi luu. Nguon duy nhat gio la
// backend/config/modules.js, frontend luon hien DU moi module hien co, khong con lech.
let moduleList = []; // [{key, label}], nap 1 lan luc init()

let currentUser = null;
let editingRoleId = null; // null = dang tao moi, khac null = dang sua vai tro co id nay
let rolesCache = []; // luu lai danh sach vua tai de mo modal sua khong can goi lai API

const rolesTbody = document.getElementById('roles-tbody');
const rolesErrorBox = document.getElementById('roles-error');
const rolesErrorText = document.getElementById('roles-error-text');

const btnAddRole = document.getElementById('btn-add-role');
const roleModal = document.getElementById('role-modal');
const roleModalTitle = document.getElementById('role-modal-title');
const roleForm = document.getElementById('role-form');
const roleFormErrorBox = document.getElementById('role-form-error');
const roleFormErrorText = document.getElementById('role-form-error-text');
const btnCancelRole = document.getElementById('btn-cancel-role');
const btnSubmitRole = document.getElementById('btn-submit-role');
const roleNameInput = document.getElementById('role-name');
const roleModuleGrid = document.getElementById('role-module-grid');

function renderRolesError(message) {
  rolesErrorText.textContent = message;
  rolesErrorBox.hidden = false;
}

function moduleLabel(key) {
  const found = moduleList.find((m) => m.key === key);
  return found ? found.label : key;
}

function renderRow(role) {
  const permissionsHtml = role.permissions.length
    ? `<div class="chip-row">${role.permissions.map((key) => `<span class="chip">${moduleLabel(key)}</span>`).join('')}</div>`
    : '<span class="chip-empty">Chưa cấp quyền</span>';

  const typeHtml = role.is_protected
    ? '<span class="badge badge-protected">Mặc định hệ thống</span>'
    : '';

  let actionHtml;
  if (role.is_protected) {
    actionHtml = `<button type="button" class="icon-btn" disabled title="Không thể sửa vai trò Admin">${icon('pencil', 14)}</button>
      <button type="button" class="icon-btn" disabled title="Không thể xóa vai trò Admin">${icon('trash', 14)}</button>`;
  } else {
    actionHtml = `<button type="button" class="icon-btn" data-action="edit" data-id="${role.id}" title="Sửa vai trò">${icon('pencil', 14)}</button>
      <button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${role.id}" title="Xóa vai trò">${icon('trash', 14)}</button>`;
  }

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${role.name}</td>
    <td>${permissionsHtml}</td>
    <td>${typeHtml}</td>
    <td>${actionHtml}</td>
  `;
  return tr;
}

async function loadRoles() {
  try {
    const { roles } = await apiFetch('/roles');
    rolesCache = roles;
    rolesTbody.innerHTML = '';
    roles.forEach((role) => rolesTbody.appendChild(renderRow(role)));
  } catch (err) {
    renderRolesError(err.message);
  }
}

function buildModuleGrid(checkedKeys) {
  const checked = new Set(checkedKeys || []);
  roleModuleGrid.innerHTML = moduleList.map(({ key, label }) => `
    <label class="module-option">
      <input type="checkbox" class="module-option-input" value="${key}" ${checked.has(key) ? 'checked' : ''} />
      <span class="module-option-box">${icon('check', 13)}</span>
      <span class="module-option-label">${label}</span>
    </label>
  `).join('');
}

function getCheckedModules() {
  return Array.from(roleModuleGrid.querySelectorAll('.module-option-input:checked')).map((el) => el.value);
}

function openCreateModal() {
  editingRoleId = null;
  roleModalTitle.textContent = 'Thêm vai trò mới';
  roleForm.reset();
  buildModuleGrid([]);
  roleFormErrorBox.hidden = true;
  roleModal.hidden = false;
  roleNameInput.focus();
}

function openEditModal(role) {
  editingRoleId = role.id;
  roleModalTitle.textContent = 'Sửa vai trò';
  roleNameInput.value = role.name;
  buildModuleGrid(role.permissions);
  roleFormErrorBox.hidden = true;
  roleModal.hidden = false;
  roleNameInput.focus();
}

function closeRoleModal() {
  roleModal.hidden = true;
}

btnAddRole.addEventListener('click', openCreateModal);
btnCancelRole.addEventListener('click', closeRoleModal);

roleModal.addEventListener('click', (event) => {
  if (event.target === roleModal) closeRoleModal();
});

rolesTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === 'edit') {
    const role = rolesCache.find((r) => String(r.id) === id);
    if (role) openEditModal(role);
    return;
  }

  if (action === 'delete') {
    if (!confirm('Xóa vai trò này? Chỉ xóa được khi không còn tài khoản nào đang dùng.')) return;
    button.disabled = true;
    try {
      await apiFetch(`/roles/${id}`, { method: 'DELETE' });
      await loadRoles();
    } catch (err) {
      renderRolesError(err.message);
      button.disabled = false;
    }
  }
});

roleForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  roleFormErrorBox.hidden = true;
  btnSubmitRole.disabled = true;
  btnSubmitRole.textContent = 'Đang lưu...';

  const body = {
    name: roleNameInput.value.trim(),
    permissions: getCheckedModules(),
  };

  try {
    if (editingRoleId === null) {
      await apiFetch('/roles', { method: 'POST', body: JSON.stringify(body) });
    } else {
      await apiFetch(`/roles/${editingRoleId}`, { method: 'PUT', body: JSON.stringify(body) });
    }
    closeRoleModal();
    await loadRoles();
  } catch (err) {
    roleFormErrorText.textContent = err.message;
    roleFormErrorBox.hidden = false;
  } finally {
    btnSubmitRole.disabled = false;
    btnSubmitRole.textContent = 'Lưu';
  }
});

(async function init() {
  currentUser = await initLayout('roles');
  if (!currentUser) return;

  btnAddRole.innerHTML = `${icon('plus', 16)} Thêm vai trò`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  try {
    const { modules } = await apiFetch('/roles/modules');
    moduleList = modules;
  } catch (err) {
    renderRolesError(err.message);
    return;
  }

  await loadRoles();
})();
