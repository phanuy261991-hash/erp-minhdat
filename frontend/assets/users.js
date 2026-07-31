// Logic trang quan ly nguoi dung: tai danh sach, tao tai khoan moi, sua, khoa/mo, xoa tai
// khoan. Danh sach vai tro (cho dropdown tao/sua) lay dong tu GET /api/roles - khong hardcode,
// vi tu Phase 1.6 vai tro la du lieu dong (Admin co the tao/xoa vai tro tuy y).

let currentUser = null;
let usersCache = [];
let rolesCache = [];

const usersTbody = document.getElementById('users-tbody');
const usersErrorBox = document.getElementById('users-error');
const usersErrorText = document.getElementById('users-error-text');

const btnAddUser = document.getElementById('btn-add-user');
const createModal = document.getElementById('create-modal');
const createForm = document.getElementById('create-form');
const createErrorBox = document.getElementById('create-error');
const createErrorText = document.getElementById('create-error-text');
const btnCancelCreate = document.getElementById('btn-cancel-create');
const btnSubmitCreate = document.getElementById('btn-submit-create');

const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editErrorBox = document.getElementById('edit-error');
const editErrorText = document.getElementById('edit-error-text');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const btnSubmitEdit = document.getElementById('btn-submit-edit');
const editUsernameInput = document.getElementById('edit-username');
const editFullnameInput = document.getElementById('edit-fullname');
const editRoleSelect = document.getElementById('edit-role');
const editPasswordInput = document.getElementById('edit-password');
let editingUserId = null;

function formatDate(sqliteDateTime) {
  // Bang du lieu luu dang 'YYYY-MM-DD HH:MM:SS' (UTC) - doi sang dd/mm/yyyy hh:mm cho de doc.
  const iso = sqliteDateTime.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderUsersError(message) {
  usersErrorText.textContent = message;
  usersErrorBox.hidden = false;
}

function renderRow(user) {
  const isSelf = currentUser && user.id === currentUser.id;
  const isActive = Boolean(user.is_active);

  const badge = isActive
    ? '<span class="badge badge-active">Đang hoạt động</span>'
    : '<span class="badge badge-inactive">Đã khóa</span>';

  let lockActionHtml;
  if (isSelf) {
    lockActionHtml = `<button type="button" class="icon-btn" disabled title="Không thể tự khóa tài khoản đang đăng nhập">${icon('lock', 14)} Khóa</button>`;
  } else if (isActive) {
    lockActionHtml = `<button type="button" class="icon-btn icon-btn-danger" data-action="deactivate" data-id="${user.id}">${icon('lock', 14)} Khóa</button>`;
  } else {
    lockActionHtml = `<button type="button" class="icon-btn" data-action="activate" data-id="${user.id}">${icon('lockOpen', 14)} Mở</button>`;
  }

  const editActionHtml = `<button type="button" class="icon-btn" data-action="edit" data-id="${user.id}" title="Sửa tài khoản">${icon('pencil', 14)}</button>`;

  // Xoa cung chi Admin (is_protected) moi thay nut, va khong the tu xoa chinh minh - giong het
  // dieu kien o backend (xem users.routes.js).
  const deleteActionHtml = currentUser.is_protected && !isSelf
    ? `<button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${user.id}" title="Xóa tài khoản">${icon('trash', 14)}</button>`
    : '';

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${user.username}</td>
    <td>${user.full_name}</td>
    <td>${user.role_name}</td>
    <td>${badge}</td>
    <td>${formatDate(user.created_at)}</td>
    <td>${editActionHtml} ${lockActionHtml} ${deleteActionHtml}</td>
  `;
  return tr;
}

async function loadUsers() {
  try {
    const { users } = await apiFetch('/users');
    usersCache = users;
    usersTbody.innerHTML = '';
    users.forEach((user) => usersTbody.appendChild(renderRow(user)));
  } catch (err) {
    renderUsersError(err.message);
  }
}

usersTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === 'edit') {
    const user = usersCache.find((u) => String(u.id) === id);
    if (user) openEditModal(user);
    return;
  }

  if (action === 'delete') {
    if (!confirm('Xóa tài khoản này? Chỉ xóa được khi chưa từng tạo/sửa dữ liệu nào (nếu không, chỉ khóa được).')) return;
  }

  button.disabled = true;
  try {
    if (action === 'delete') {
      await apiFetch(`/users/${id}`, { method: 'DELETE' });
    } else {
      await apiFetch(`/users/${id}/${action}`, { method: 'PATCH' });
    }
    await loadUsers();
  } catch (err) {
    renderUsersError(err.message);
    button.disabled = false;
  }
});

function renderRoleOptions(select) {
  select.innerHTML = rolesCache.map((role) => `<option value="${role.id}">${role.name}</option>`).join('');
}

async function loadRoles() {
  const { roles } = await apiFetch('/roles');
  rolesCache = roles;
  renderRoleOptions(document.getElementById('new-role'));
}

// ----- Sua tai khoan -----

function openEditModal(user) {
  editingUserId = user.id;
  editErrorBox.hidden = true;
  editForm.reset();
  editUsernameInput.value = user.username;
  editFullnameInput.value = user.full_name;
  renderRoleOptions(editRoleSelect);
  editRoleSelect.value = user.role_id;
  // Chan doi vai tro cua chinh minh tren giao dien (backend cung chan) - tranh tu khoa quyen
  // quan tri cua chinh tai khoan dang dung.
  editRoleSelect.disabled = Boolean(currentUser && user.id === currentUser.id);
  editModal.hidden = false;
  editFullnameInput.focus();
}

function closeEditModal() {
  editModal.hidden = true;
}

btnCancelEdit.addEventListener('click', closeEditModal);

editModal.addEventListener('click', (event) => {
  if (event.target === editModal) closeEditModal();
});

editForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  editErrorBox.hidden = true;
  btnSubmitEdit.disabled = true;
  btnSubmitEdit.textContent = 'Đang lưu...';

  const body = {
    full_name: editFullnameInput.value.trim(),
    role_id: Number(editRoleSelect.value),
  };
  if (editPasswordInput.value) {
    body.password = editPasswordInput.value;
  }

  try {
    await apiFetch(`/users/${editingUserId}`, { method: 'PUT', body: JSON.stringify(body) });
    closeEditModal();
    await loadUsers();
  } catch (err) {
    editErrorText.textContent = err.message;
    editErrorBox.hidden = false;
  } finally {
    btnSubmitEdit.disabled = false;
    btnSubmitEdit.textContent = 'Lưu';
  }
});

function openCreateModal() {
  createForm.reset();
  createErrorBox.hidden = true;
  createModal.hidden = false;
  document.getElementById('new-username').focus();
}

function closeCreateModal() {
  createModal.hidden = true;
}

btnAddUser.addEventListener('click', openCreateModal);
btnCancelCreate.addEventListener('click', closeCreateModal);

// Bam ra ngoai modal de dong, giong hanh vi sheet/dialog thong thuong.
createModal.addEventListener('click', (event) => {
  if (event.target === createModal) closeCreateModal();
});

createForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  createErrorBox.hidden = true;
  btnSubmitCreate.disabled = true;
  btnSubmitCreate.textContent = 'Đang tạo...';

  const body = {
    username: document.getElementById('new-username').value.trim(),
    password: document.getElementById('new-password').value,
    full_name: document.getElementById('new-fullname').value.trim(),
    role_id: Number(document.getElementById('new-role').value),
  };

  try {
    await apiFetch('/users', { method: 'POST', body: JSON.stringify(body) });
    closeCreateModal();
    await loadUsers();
  } catch (err) {
    createErrorText.textContent = err.message;
    createErrorBox.hidden = false;
  } finally {
    btnSubmitCreate.disabled = false;
    btnSubmitCreate.textContent = 'Tạo tài khoản';
  }
});

(async function init() {
  currentUser = await initLayout('users');
  if (!currentUser) return;

  btnAddUser.innerHTML = `${icon('plus', 16)} Thêm tài khoản`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await Promise.all([loadUsers(), loadRoles()]);
})();
