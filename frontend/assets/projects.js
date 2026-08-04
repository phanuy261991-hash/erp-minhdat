// Logic trang "Du an" (migration 021, module 'du_an'): danh sach + modal them/sua kem danh sach
// nguoi tham gia. Xem docs/PRD.md muc 4.12, docs/DECISIONS.md muc 2026-08-04 - so cai cong no
// VAN thuoc khach hang, trang nay khong dung toi debt_ledger.

let currentUser = null;
let projectsCache = [];
let customersCache = []; // partners type=khach_hang, dung cho select "Khach hang"
let staffCache = []; // {id, full_name}, dung cho select "Nguoi phu trach" + picker nguoi tham gia
let editingProjectId = null;
let pickedMembers = []; // [{userId, fullName, roleInProject}]
let searchKeyword = '';
let statusFilter = '';

const STATUS_LABELS = {
  chuan_bi: 'Chuẩn bị',
  dang_thuc_hien: 'Đang thực hiện',
  tam_dung: 'Tạm dừng',
  hoan_thanh: 'Hoàn thành',
  huy: 'Hủy',
};

const projectsTbody = document.getElementById('projects-tbody');
const projectsErrorBox = document.getElementById('projects-error');
const projectsErrorText = document.getElementById('projects-error-text');
const searchInput = document.getElementById('project-search');
const statusFilterSelect = document.getElementById('project-status-filter');

const btnAddProject = document.getElementById('btn-add-project');
const projectModal = document.getElementById('project-modal');
const projectModalTitle = document.getElementById('project-modal-title');
const projectForm = document.getElementById('project-form');
const projectFormErrorBox = document.getElementById('project-form-error');
const projectFormErrorText = document.getElementById('project-form-error-text');
const btnCancelProject = document.getElementById('btn-cancel-project');
const btnSubmitProject = document.getElementById('btn-submit-project');

const nameInput = document.getElementById('project-name');
const partnerSelect = document.getElementById('project-partner');
const contractNoInput = document.getElementById('project-contract-no');
const contractDateInput = document.getElementById('project-contract-date');
const contractValueInput = document.getElementById('project-contract-value');
const startDateInput = document.getElementById('project-start-date');
const plannedEndDateInput = document.getElementById('project-planned-end-date');
const managerSelect = document.getElementById('project-manager');
const statusSelect = document.getElementById('project-status');
const siteAddressInput = document.getElementById('project-site-address');
const noteInput = document.getElementById('project-note');

const memberPickerUser = document.getElementById('member-picker-user');
const memberPickerRole = document.getElementById('member-picker-role');
const btnAddMember = document.getElementById('btn-add-member');
const memberListEl = document.getElementById('member-list');

function renderProjectsError(message) {
  projectsErrorText.textContent = message;
  projectsErrorBox.hidden = false;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function formatDateVN(value) {
  if (!value) return '-';
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

function getVisibleProjects() {
  const keyword = searchKeyword.trim().toLowerCase();
  return projectsCache.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (!keyword) return true;
    return (
      p.name.toLowerCase().includes(keyword) ||
      p.code.toLowerCase().includes(keyword) ||
      p.partner_name.toLowerCase().includes(keyword)
    );
  });
}

function renderRow(project) {
  const tr = document.createElement('tr');
  const progressText = project.progress_percent === null || project.progress_percent === undefined
    ? '-'
    : `${project.progress_percent}%`;

  tr.innerHTML = `
    <td>${project.code}</td>
    <td>${project.name}</td>
    <td>${project.partner_name}</td>
    <td>${project.manager_name || '-'}</td>
    <td>${formatDateVN(project.planned_end_date)}</td>
    <td>${progressText}</td>
    <td><span class="project-status-badge project-status-badge--${project.status}">${STATUS_LABELS[project.status]}</span></td>
    <td>
      <a href="project-detail.html?id=${project.id}" class="icon-btn" title="Xem chi tiết">${icon('eye', 14)}</a>
      <button type="button" class="icon-btn" data-action="edit" data-id="${project.id}" title="Sửa dự án">${icon('pencil', 14)}</button>
      <button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${project.id}" title="Xóa dự án">${icon('trash', 14)}</button>
    </td>
  `;
  return tr;
}

function renderProjects() {
  projectsTbody.innerHTML = '';
  getVisibleProjects().forEach((p) => projectsTbody.appendChild(renderRow(p)));
}

async function loadProjects() {
  try {
    const { projects } = await apiFetch('/projects');
    projectsCache = projects;
    renderProjects();
  } catch (err) {
    renderProjectsError(err.message);
  }
}

async function loadCustomers() {
  try {
    const { partners } = await apiFetch('/partners?type=khach_hang');
    customersCache = partners;
    partnerSelect.innerHTML = '<option value="">-- Chọn khách hàng --</option>' +
      partners.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  } catch (err) {
    renderProjectsError(err.message);
  }
}

async function loadStaff() {
  try {
    const { staff } = await apiFetch('/partners/staff');
    staffCache = staff;
    const managerOptions = '<option value="">-- Không chọn --</option>' +
      staff.map((u) => `<option value="${u.id}">${u.full_name}</option>`).join('');
    managerSelect.innerHTML = managerOptions;
    memberPickerUser.innerHTML = staff.map((u) => `<option value="${u.id}">${u.full_name}</option>`).join('');
  } catch (err) {
    renderProjectsError(err.message);
  }
}

// ----- Danh sach nguoi tham gia (member picker) trong modal -----

function renderMemberList() {
  if (pickedMembers.length === 0) {
    memberListEl.innerHTML = '<p class="member-list-empty">Chưa có người tham gia nào.</p>';
    return;
  }
  memberListEl.innerHTML = pickedMembers
    .map((m, index) => `
      <div class="member-row">
        <span class="member-row-name">${m.fullName}</span>
        <span class="member-row-role">${m.roleInProject || 'Chưa có vai trò'}</span>
        <button type="button" class="icon-btn icon-btn-danger" data-action="remove-member" data-index="${index}" title="Bỏ khỏi danh sách">${icon('trash', 14)}</button>
      </div>
    `)
    .join('');
}

btnAddMember.addEventListener('click', () => {
  const userId = Number(memberPickerUser.value);
  if (!userId) return;

  if (pickedMembers.some((m) => m.userId === userId)) {
    alert('Tài khoản này đã có trong danh sách tham gia.');
    return;
  }

  const staffMember = staffCache.find((u) => u.id === userId);
  pickedMembers.push({
    userId,
    fullName: staffMember ? staffMember.full_name : '',
    roleInProject: memberPickerRole.value.trim(),
  });
  memberPickerRole.value = '';
  renderMemberList();
});

memberListEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action="remove-member"]');
  if (!button) return;
  const index = Number(button.dataset.index);
  pickedMembers.splice(index, 1);
  renderMemberList();
});

// ----- Tim kiem / loc -----

searchInput.addEventListener('input', (event) => {
  searchKeyword = event.target.value;
  renderProjects();
});

statusFilterSelect.addEventListener('change', (event) => {
  statusFilter = event.target.value;
  renderProjects();
});

// ----- Modal them/sua -----

function openCreateModal() {
  editingProjectId = null;
  projectModalTitle.textContent = 'Thêm dự án mới';
  projectForm.reset();
  statusSelect.value = 'chuan_bi';
  pickedMembers = [];
  renderMemberList();
  projectFormErrorBox.hidden = true;
  projectModal.hidden = false;
  nameInput.focus();
}

async function openEditModal(projectSummary) {
  try {
    const { project, members } = await apiFetch(`/projects/${projectSummary.id}`);

    editingProjectId = project.id;
    projectModalTitle.textContent = 'Sửa dự án';
    nameInput.value = project.name;
    partnerSelect.value = project.partner_id;
    contractNoInput.value = project.contract_no || '';
    contractDateInput.value = project.contract_date || '';
    contractValueInput.value = project.contract_value || '';
    startDateInput.value = project.start_date || '';
    plannedEndDateInput.value = project.planned_end_date || '';
    managerSelect.value = project.manager_id || '';
    statusSelect.value = project.status;
    siteAddressInput.value = project.site_address || '';
    noteInput.value = project.note || '';

    pickedMembers = members.map((m) => ({ userId: m.user_id, fullName: m.full_name, roleInProject: m.role_in_project }));
    renderMemberList();

    projectFormErrorBox.hidden = true;
    projectModal.hidden = false;
  } catch (err) {
    renderProjectsError(err.message);
  }
}

function closeProjectModal() {
  projectModal.hidden = true;
}

btnAddProject.addEventListener('click', openCreateModal);
btnCancelProject.addEventListener('click', closeProjectModal);
projectModal.addEventListener('click', (event) => {
  if (event.target === projectModal) closeProjectModal();
});

projectsTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === 'edit') {
    const project = projectsCache.find((p) => String(p.id) === id);
    if (project) await openEditModal(project);
    return;
  }

  if (action === 'delete') {
    if (!confirm('Xóa dự án này? Chỉ xóa được khi chưa có giai đoạn nào đang làm hoặc hoàn thành.')) return;

    button.disabled = true;
    try {
      await apiFetch(`/projects/${id}`, { method: 'DELETE' });
      await loadProjects();
    } catch (err) {
      renderProjectsError(err.message);
      button.disabled = false;
    }
  }
});

projectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  projectFormErrorBox.hidden = true;
  btnSubmitProject.disabled = true;
  btnSubmitProject.textContent = 'Đang lưu...';

  const body = {
    name: nameInput.value.trim(),
    partner_id: partnerSelect.value ? Number(partnerSelect.value) : null,
    contract_no: contractNoInput.value.trim(),
    contract_date: contractDateInput.value || null,
    contract_value: contractValueInput.value === '' ? 0 : Number(contractValueInput.value),
    start_date: startDateInput.value || null,
    planned_end_date: plannedEndDateInput.value || null,
    manager_id: managerSelect.value ? Number(managerSelect.value) : null,
    status: statusSelect.value,
    site_address: siteAddressInput.value.trim(),
    note: noteInput.value.trim(),
    members: pickedMembers.map((m) => ({ user_id: m.userId, role_in_project: m.roleInProject })),
  };

  try {
    if (editingProjectId === null) {
      await apiFetch('/projects', { method: 'POST', body: JSON.stringify(body) });
    } else {
      await apiFetch(`/projects/${editingProjectId}`, { method: 'PUT', body: JSON.stringify(body) });
    }
    closeProjectModal();
    await loadProjects();
  } catch (err) {
    projectFormErrorText.textContent = err.message;
    projectFormErrorBox.hidden = false;
  } finally {
    btnSubmitProject.disabled = false;
    btnSubmitProject.textContent = 'Lưu';
  }
});

(async function init() {
  currentUser = await initLayout('projects');
  if (!currentUser) return;

  btnAddProject.innerHTML = `${icon('plus', 16)} Thêm dự án`;
  document.querySelector('.search-box .input-icon').innerHTML = icon('search', 16);
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await Promise.all([loadProjects(), loadCustomers(), loadStaff()]);

  // Mo san modal sua khi dieu huong tu project-detail.html?edit= (giong pattern
  // customer-detail.html -> warranties.html?edit= da co san trong du an).
  const editId = new URLSearchParams(window.location.search).get('edit');
  if (editId) {
    const project = projectsCache.find((p) => String(p.id) === editId);
    if (project) await openEditModal(project);
  }
})();
