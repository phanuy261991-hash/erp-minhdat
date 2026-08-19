// Logic trang "Khach hang" (tach rieng khoi "Doi tac" theo yeu cau nguoi dung 2026-08-01 -
// "Doi tac" tu day chi con quan ly Nha cung cap). Dung chung API /api/partners nhung LUON gui
// type='khach_hang' co dinh (khong cho chon loai doi tac nhu partners.js truoc day). Them
// "Loai khach hang" (category_id, migration 015) de phan loai, khong bat buoc.

let currentUser = null;
let customersCache = [];
let categoriesCache = [];
let staffCache = []; // [{id, full_name}] - dung cho combobox "Nguoi phu trach"
let editingCustomerId = null;
let searchKeyword = '';

const customersTbody = document.getElementById('customers-tbody');
const customersErrorBox = document.getElementById('customers-error');
const customersErrorText = document.getElementById('customers-error-text');
const searchInput = document.getElementById('customer-search');

const btnAddCustomer = document.getElementById('btn-add-customer');
const customerModal = document.getElementById('customer-modal');
const customerModalTitle = document.getElementById('customer-modal-title');
const customerForm = document.getElementById('customer-form');
const customerFormErrorBox = document.getElementById('customer-form-error');
const customerFormErrorText = document.getElementById('customer-form-error-text');
const btnCancelCustomer = document.getElementById('btn-cancel-customer');
const btnSubmitCustomer = document.getElementById('btn-submit-customer');

const categorySelect = document.getElementById('customer-category');
const nameInput = document.getElementById('customer-name');
const phoneInput = document.getElementById('customer-phone');
const addressInput = document.getElementById('customer-address');

const assignedSearchInput = document.getElementById('customer-assigned-search');
const assignedIdInput = document.getElementById('customer-assigned-id');
const assignedSuggestionsBox = document.getElementById('customer-assigned-suggestions');

function renderCustomersError(message) {
  customersErrorText.textContent = message;
  customersErrorBox.hidden = false;
}

function getVisibleCustomers() {
  const keyword = searchKeyword.trim().toLowerCase();
  if (!keyword) return customersCache;
  return customersCache.filter((c) => c.name.toLowerCase().includes(keyword) || (c.phone || '').toLowerCase().includes(keyword));
}

function renderRow(customer) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${customer.name}</td>
    <td>${customer.phone || '-'}</td>
    <td>${customer.address || '-'}</td>
    <td>
      <a href="customer-detail.html?id=${customer.id}" class="icon-btn" title="Xem chi tiết">${icon('eye', 14)}</a>
      <button type="button" class="icon-btn" data-action="edit" data-id="${customer.id}" title="Sửa khách hàng">${icon('pencil', 14)}</button>
      <button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${customer.id}" title="Xóa khách hàng">${icon('trash', 14)}</button>
    </td>
  `;
  return tr;
}

function renderGroupRow(name, count) {
  const tr = document.createElement('tr');
  tr.className = 'table-group-row';
  tr.innerHTML = `
    <td colspan="4">
      <span class="table-group-row-name">${name}</span>
      <span class="table-group-row-count">${count} khách hàng</span>
    </td>
  `;
  return tr;
}

// Gom nhom hien thi theo "Loai khach hang" (theo yeu cau nguoi dung 2026-08-19) - thu tu nhom
// theo dung thu tu categoriesCache tra ve tu GET /customer-categories, nhom "Khong phan loai"
// luon xep CUOI CUNG. Loc theo tu khoa tim kiem TRUOC roi moi gom nhom, dung nguyen tac da ap
// dung cho sap xep cong no (chi gom/sap xep tren tap da loc, khong doi hanh vi tim kiem).
function renderCustomers() {
  customersTbody.innerHTML = '';
  const visible = getVisibleCustomers();

  const groups = categoriesCache.map((cat) => ({
    name: cat.name,
    customers: visible.filter((c) => c.category_id === cat.id),
  }));
  const uncategorized = visible.filter((c) => !categoriesCache.some((cat) => cat.id === c.category_id));
  if (uncategorized.length > 0) {
    groups.push({ name: 'Không phân loại', customers: uncategorized });
  }

  groups
    .filter((g) => g.customers.length > 0)
    .forEach((g) => {
      customersTbody.appendChild(renderGroupRow(g.name, g.customers.length));
      g.customers.forEach((c) => customersTbody.appendChild(renderRow(c)));
    });
}

async function loadCustomers() {
  try {
    const { partners } = await apiFetch('/partners?type=khach_hang');
    customersCache = partners;
    renderCustomers();
  } catch (err) {
    renderCustomersError(err.message);
  }
}

async function loadCategories() {
  try {
    const { categories } = await apiFetch('/customer-categories');
    categoriesCache = categories;
    categorySelect.innerHTML = '<option value="">-- Không phân loại --</option>' +
      categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
    // loadCustomers()/loadCategories() chay song song (Promise.all o init) - ve lai danh sach
    // gom nhom phong truong hop categoriesCache nap xong SAU khi renderCustomers() da chay 1 lan
    // (luc do se chua co du lieu de nhom dung).
    renderCustomers();
  } catch (err) {
    renderCustomersError(err.message);
  }
}

async function loadStaff() {
  try {
    const { staff } = await apiFetch('/partners/staff');
    staffCache = staff;
  } catch (err) {
    renderCustomersError(err.message);
  }
}

// Combobox "Nguoi phu trach" - tim theo ten, chon 1 tai khoan (giong cach lam cua
// assets/adjustment.js: input go chu -> loc goi y -> bam chon moi ghi vao o hidden).
function renderAssignedSuggestions(keyword) {
  const kw = keyword.trim().toLowerCase();

  if (!kw) {
    assignedSuggestionsBox.innerHTML = '';
    return;
  }

  const matches = staffCache.filter((u) => u.full_name.toLowerCase().includes(kw)).slice(0, 8);

  if (matches.length === 0) {
    assignedSuggestionsBox.innerHTML = '<div class="combobox-empty">Không tìm thấy người dùng</div>';
    return;
  }

  assignedSuggestionsBox.innerHTML = matches
    .map((u) => `<div class="combobox-option" data-id="${u.id}" data-name="${u.full_name}">${u.full_name}</div>`)
    .join('');
}

function selectAssignedUser(id, name) {
  assignedIdInput.value = id;
  assignedSearchInput.value = name;
  assignedSuggestionsBox.innerHTML = '';
}

function resetAssignedField() {
  assignedSearchInput.value = '';
  assignedIdInput.value = '';
  assignedSuggestionsBox.innerHTML = '';
}

assignedSearchInput.addEventListener('input', (event) => {
  assignedIdInput.value = '';
  renderAssignedSuggestions(event.target.value);
});

assignedSuggestionsBox.addEventListener('click', (event) => {
  const option = event.target.closest('.combobox-option');
  if (!option) return;
  selectAssignedUser(option.dataset.id, option.dataset.name);
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('#customer-assigned-search') && !event.target.closest('#customer-assigned-suggestions')) {
    assignedSuggestionsBox.innerHTML = '';
  }
});

searchInput.addEventListener('input', (event) => {
  searchKeyword = event.target.value;
  renderCustomers();
});

function openCreateModal() {
  editingCustomerId = null;
  customerModalTitle.textContent = 'Thêm khách hàng mới';
  customerForm.reset();
  resetAssignedField();
  customerFormErrorBox.hidden = true;
  customerModal.hidden = false;
  nameInput.focus();
}

function openEditModal(customer) {
  editingCustomerId = customer.id;
  customerModalTitle.textContent = 'Sửa khách hàng';
  nameInput.value = customer.name;
  categorySelect.value = customer.category_id || '';
  phoneInput.value = customer.phone || '';
  addressInput.value = customer.address || '';
  if (customer.assigned_user_id) {
    selectAssignedUser(customer.assigned_user_id, customer.assigned_user_name || '');
  } else {
    resetAssignedField();
  }
  customerFormErrorBox.hidden = true;
  customerModal.hidden = false;
  nameInput.focus();
}

function closeCustomerModal() {
  customerModal.hidden = true;
}

btnAddCustomer.addEventListener('click', openCreateModal);
btnCancelCustomer.addEventListener('click', closeCustomerModal);

customerModal.addEventListener('click', (event) => {
  if (event.target === customerModal) closeCustomerModal();
});

customersTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === 'edit') {
    const customer = customersCache.find((c) => String(c.id) === id);
    if (customer) openEditModal(customer);
    return;
  }

  if (action === 'delete') {
    if (!confirm('Xóa khách hàng này? Chỉ xóa được khi chưa từng có phiếu xuất hoặc công nợ nào.')) return;

    button.disabled = true;
    try {
      await apiFetch(`/partners/${id}`, { method: 'DELETE' });
      await loadCustomers();
    } catch (err) {
      renderCustomersError(err.message);
      button.disabled = false;
    }
  }
});

customerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  customerFormErrorBox.hidden = true;
  btnSubmitCustomer.disabled = true;
  btnSubmitCustomer.textContent = 'Đang lưu...';

  const body = {
    type: 'khach_hang',
    name: nameInput.value.trim(),
    category_id: categorySelect.value ? Number(categorySelect.value) : null,
    phone: phoneInput.value.trim(),
    address: addressInput.value.trim(),
    assigned_user_id: assignedIdInput.value ? Number(assignedIdInput.value) : null,
  };

  try {
    if (editingCustomerId === null) {
      await apiFetch('/partners', { method: 'POST', body: JSON.stringify(body) });
    } else {
      await apiFetch(`/partners/${editingCustomerId}`, { method: 'PUT', body: JSON.stringify(body) });
    }
    closeCustomerModal();
    await loadCustomers();
  } catch (err) {
    customerFormErrorText.textContent = err.message;
    customerFormErrorBox.hidden = false;
  } finally {
    btnSubmitCustomer.disabled = false;
    btnSubmitCustomer.textContent = 'Lưu';
  }
});

(async function init() {
  currentUser = await initLayout('customers');
  if (!currentUser) return;

  btnAddCustomer.innerHTML = `${icon('plus', 16)} Thêm khách hàng`;
  document.querySelector('.search-box .input-icon').innerHTML = icon('search', 16);
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await Promise.all([loadCustomers(), loadCategories(), loadStaff()]);
})();
