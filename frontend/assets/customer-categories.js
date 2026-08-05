// Logic trang "Loai khach hang" (migration 015, thuoc menu Cau hinh): danh sach, them/sua/xoa.
// Han muc cong no (debt_limit) chi dung de CANH BAO tren trang Cong no khach hang (khong chan
// cung lap phieu - xem yeu cau nguoi dung 2026-08-01 va docs/DECISIONS.md).

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
const debtLimitInput = document.getElementById('category-debt-limit');

function formatMoney(value) {
  return Number(value).toLocaleString('vi-VN');
}

function renderCategoriesError(message) {
  categoriesErrorText.textContent = message;
  categoriesErrorBox.hidden = false;
}

function renderRow(category) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${category.name}</td>
    <td>${category.debt_limit === null ? 'Không giới hạn' : `${formatMoney(category.debt_limit)} đ`}</td>
    <td>
      <button type="button" class="icon-btn" data-action="edit" data-id="${category.id}" title="Sửa loại khách hàng">${icon('pencil', 14)}</button>
      <button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${category.id}" title="Xóa loại khách hàng">${icon('trash', 14)}</button>
    </td>
  `;
  return tr;
}

function renderCategories() {
  categoriesTbody.innerHTML = '';
  categoriesCache.forEach((c) => categoriesTbody.appendChild(renderRow(c)));
}

async function loadCategories() {
  try {
    const { categories } = await apiFetch('/customer-categories');
    categoriesCache = categories;
    renderCategories();
  } catch (err) {
    renderCategoriesError(err.message);
  }
}

function openCreateModal() {
  editingCategoryId = null;
  categoryModalTitle.textContent = 'Thêm loại khách hàng';
  categoryForm.reset();
  categoryFormErrorBox.hidden = true;
  categoryModal.hidden = false;
  nameInput.focus();
}

function openEditModal(category) {
  editingCategoryId = category.id;
  categoryModalTitle.textContent = 'Sửa loại khách hàng';
  nameInput.value = category.name;
  setMoneyValue(debtLimitInput, category.debt_limit);
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
    if (!confirm('Xóa loại khách hàng này? Chỉ xóa được khi chưa có khách hàng nào thuộc loại này.')) return;

    button.disabled = true;
    try {
      await apiFetch(`/customer-categories/${id}`, { method: 'DELETE' });
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
    debt_limit: debtLimitInput.value === '' ? null : getMoneyValue(debtLimitInput),
  };

  try {
    if (editingCategoryId === null) {
      await apiFetch('/customer-categories', { method: 'POST', body: JSON.stringify(body) });
    } else {
      await apiFetch(`/customer-categories/${editingCategoryId}`, { method: 'PUT', body: JSON.stringify(body) });
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
  currentUser = await initLayout('customer-categories');
  if (!currentUser) return;

  btnAddCategory.innerHTML = `${icon('plus', 16)} Thêm loại`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await loadCategories();
})();
