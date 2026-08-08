// Logic trang "Loai thu chi" (danh muc cho module So quy, migration 019) - danh sach, them/sua/xoa.
// Rap khuon dung pattern customer-categories.js, chi khac truong "Loai" (thu/chi) thay debt_limit.

let currentUser = null;
let categoriesCache = [];
let editingCategoryId = null;

const categoriesTbody = document.getElementById('categories-tbody');
const categoriesErrorBox = document.getElementById('categories-error');
const categoriesErrorText = document.getElementById('categories-error-text');

const btnAddCategory = document.getElementById('btn-add-category');
const categoryModal = document.getElementById('category-modal');
const categoryModalTitle = document.getElementById('category-modal-title');
const categoryForm = document.getElementById('category-form');
const categoryFormErrorBox = document.getElementById('category-form-error');
const categoryFormErrorText = document.getElementById('category-form-error-text');
const btnCancelCategory = document.getElementById('btn-cancel-category');
const btnSubmitCategory = document.getElementById('btn-submit-category');

const nameInput = document.getElementById('category-name');
const typeSelect = document.getElementById('category-type');

function renderCategoriesError(message) {
  categoriesErrorText.textContent = message;
  categoriesErrorBox.hidden = false;
}

// Danh muc he thong (system_key, migration 035 - phieu tu dong tu Cong no/Kho luon gan dung 1
// trong 5 danh muc nay) khoa Sua/Xoa tuyet doi ca backend lan giao dien - khoa nut thay vi de
// bam roi nhan loi 400, dung pattern is_protected cua roles.html/js.
function renderRow(category) {
  const tr = document.createElement('tr');
  const typeBadgeClass = category.type === 'thu' ? 'badge-active' : 'badge-down';
  const typeLabel = category.type === 'thu' ? 'Thu' : 'Chi';
  const isSystem = Boolean(category.system_key);
  const systemBadge = isSystem ? ' <span class="badge badge-inactive">Hệ thống</span>' : '';
  const actions = isSystem
    ? ''
    : `
      <button type="button" class="icon-btn" data-action="edit" data-id="${category.id}" title="Sửa loại thu chi">${icon('pencil', 14)}</button>
      <button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${category.id}" title="Xóa loại thu chi">${icon('trash', 14)}</button>
    `;
  tr.innerHTML = `
    <td>${category.name}${systemBadge}</td>
    <td><span class="badge ${typeBadgeClass}">${typeLabel}</span></td>
    <td>${actions}</td>
  `;
  return tr;
}

function renderCategories() {
  categoriesTbody.innerHTML = '';
  categoriesCache.forEach((c) => categoriesTbody.appendChild(renderRow(c)));
}

async function loadCategories() {
  try {
    const { categories } = await apiFetch('/cash-categories');
    categoriesCache = categories;
    renderCategories();
  } catch (err) {
    renderCategoriesError(err.message);
  }
}

function openCreateModal() {
  editingCategoryId = null;
  categoryModalTitle.textContent = 'Thêm loại thu chi';
  categoryForm.reset();
  categoryFormErrorBox.hidden = true;
  categoryModal.hidden = false;
  nameInput.focus();
}

function openEditModal(category) {
  editingCategoryId = category.id;
  categoryModalTitle.textContent = 'Sửa loại thu chi';
  nameInput.value = category.name;
  typeSelect.value = category.type;
  categoryFormErrorBox.hidden = true;
  categoryModal.hidden = false;
  nameInput.focus();
}

function closeCategoryModal() {
  categoryModal.hidden = true;
}

btnAddCategory.addEventListener('click', openCreateModal);
btnCancelCategory.addEventListener('click', closeCategoryModal);
categoryModal.addEventListener('click', (event) => {
  if (event.target === categoryModal) closeCategoryModal();
});

categoriesTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === 'edit') {
    const category = categoriesCache.find((c) => String(c.id) === id);
    if (category) openEditModal(category);
    return;
  }

  if (action === 'delete') {
    if (!confirm('Xóa loại thu chi này? Chỉ xóa được khi chưa có phiếu nào dùng loại này.')) return;

    button.disabled = true;
    try {
      await apiFetch(`/cash-categories/${id}`, { method: 'DELETE' });
      await loadCategories();
    } catch (err) {
      renderCategoriesError(err.message);
      button.disabled = false;
    }
  }
});

categoryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  categoryFormErrorBox.hidden = true;
  btnSubmitCategory.disabled = true;
  btnSubmitCategory.textContent = 'Đang lưu...';

  const body = {
    name: nameInput.value.trim(),
    type: typeSelect.value,
  };

  try {
    if (editingCategoryId === null) {
      await apiFetch('/cash-categories', { method: 'POST', body: JSON.stringify(body) });
    } else {
      await apiFetch(`/cash-categories/${editingCategoryId}`, { method: 'PUT', body: JSON.stringify(body) });
    }
    closeCategoryModal();
    await loadCategories();
  } catch (err) {
    categoryFormErrorText.textContent = err.message;
    categoryFormErrorBox.hidden = false;
  } finally {
    btnSubmitCategory.disabled = false;
    btnSubmitCategory.textContent = 'Lưu';
  }
});

(async function init() {
  currentUser = await initLayout('cash-categories');
  if (!currentUser) return;

  btnAddCategory.innerHTML = `${icon('plus', 16)} Thêm loại`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await loadCategories();
})();
