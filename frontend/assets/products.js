// Logic trang danh muc san pham: tai danh sach (kem ton kho tinh tu SUM(stock_movements)),
// tim kiem theo ma/ten, sap xep theo ton kho, them/sua, vo hieu hoa/mo lai, xoa cung (Admin).
// Vo hieu hoa danh cho ai co quyen module 'kho' (moi nguoi vao duoc trang nay deu co quyen do -
// xem NAV_GROUPS trong layout.js), xoa cung chi hien cho is_protected (Admin).

let currentUser = null;
let productsCache = [];
let editingProductId = null; // null = dang tao moi
let searchKeyword = '';
let stockSortDir = null; // null | 'asc' | 'desc'

const productsTbody = document.getElementById('products-tbody');
const productsErrorBox = document.getElementById('products-error');
const productsErrorText = document.getElementById('products-error-text');
const searchInput = document.getElementById('product-search');
const thStock = document.getElementById('th-stock');

const btnAddProduct = document.getElementById('btn-add-product');
const productModal = document.getElementById('product-modal');
const productModalTitle = document.getElementById('product-modal-title');
const productForm = document.getElementById('product-form');
const productFormErrorBox = document.getElementById('product-form-error');
const productFormErrorText = document.getElementById('product-form-error-text');
const btnCancelProduct = document.getElementById('btn-cancel-product');
const btnSubmitProduct = document.getElementById('btn-submit-product');

const codeInput = document.getElementById('product-code');
const nameInput = document.getElementById('product-name');
const unitInput = document.getElementById('product-unit');
const salePriceInput = document.getElementById('product-sale-price');
const costPriceInput = document.getElementById('product-cost-price');
const lowStockInput = document.getElementById('product-low-stock-threshold');

function formatMoney(value) {
  return Number(value).toLocaleString('vi-VN');
}

function renderProductsError(message) {
  productsErrorText.textContent = message;
  productsErrorBox.hidden = false;
}

function getVisibleProducts() {
  const keyword = searchKeyword.trim().toLowerCase();
  let list = productsCache;

  if (keyword) {
    list = list.filter(
      (p) => p.code.toLowerCase().includes(keyword) || p.name.toLowerCase().includes(keyword)
    );
  }

  if (stockSortDir) {
    list = [...list].sort((a, b) => (stockSortDir === 'asc' ? a.stock - b.stock : b.stock - a.stock));
  }

  return list;
}

function renderRow(product) {
  const isLow = product.stock <= product.low_stock_threshold;
  const stockHtml = isLow
    ? `<span class="stock-low">${icon('warningTriangle', 14)} ${formatMoney(product.stock)}</span>`
    : formatMoney(product.stock);

  const statusBadge = product.is_active
    ? '<span class="badge badge-active">Đang kinh doanh</span>'
    : '<span class="badge badge-inactive">Ngừng kinh doanh</span>';

  const toggleAction = product.is_active
    ? `<button type="button" class="icon-btn" data-action="deactivate" data-id="${product.id}" title="Ngừng kinh doanh">${icon('lock', 14)}</button>`
    : `<button type="button" class="icon-btn" data-action="activate" data-id="${product.id}" title="Mở lại">${icon('lockOpen', 14)}</button>`;

  const deleteAction = currentUser.is_protected
    ? `<button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${product.id}" title="Xóa sản phẩm">${icon('trash', 14)}</button>`
    : '';

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${product.code}</td>
    <td>${product.name}</td>
    <td>${product.unit}</td>
    <td>${formatMoney(product.cost_price)}</td>
    <td>${formatMoney(product.sale_price)}</td>
    <td>${stockHtml}</td>
    <td>${statusBadge}</td>
    <td>
      <a class="icon-btn" href="product-detail.html?id=${product.id}" title="Xem chi tiết">${icon('eye', 14)}</a>
      <button type="button" class="icon-btn" data-action="edit" data-id="${product.id}" title="Sửa sản phẩm">${icon('pencil', 14)}</button>
      ${toggleAction}
      ${deleteAction}
    </td>
  `;
  return tr;
}

function renderProducts() {
  productsTbody.innerHTML = '';
  getVisibleProducts().forEach((p) => productsTbody.appendChild(renderRow(p)));
}

async function loadProducts() {
  try {
    const { products } = await apiFetch('/products');
    productsCache = products;
    renderProducts();
  } catch (err) {
    renderProductsError(err.message);
  }
}

searchInput.addEventListener('input', (event) => {
  searchKeyword = event.target.value;
  renderProducts();
});

function updateSortIconUi() {
  const iconSlot = thStock.querySelector('.sort-icon');
  thStock.classList.toggle('sort-active', Boolean(stockSortDir));
  iconSlot.innerHTML = icon(stockSortDir === 'asc' ? 'chevronUp' : 'chevronDown', 14);
}

thStock.addEventListener('click', () => {
  stockSortDir = stockSortDir === 'asc' ? 'desc' : 'asc';
  updateSortIconUi();
  renderProducts();
});

function openCreateModal() {
  editingProductId = null;
  productModalTitle.textContent = 'Thêm sản phẩm mới';
  productForm.reset();
  productFormErrorBox.hidden = true;
  productModal.hidden = false;
  codeInput.focus();
}

function openEditModal(product) {
  editingProductId = product.id;
  productModalTitle.textContent = 'Sửa sản phẩm';
  codeInput.value = product.code;
  nameInput.value = product.name;
  unitInput.value = product.unit;
  salePriceInput.value = product.sale_price;
  costPriceInput.value = product.cost_price;
  lowStockInput.value = product.low_stock_threshold;
  productFormErrorBox.hidden = true;
  productModal.hidden = false;
  codeInput.focus();
}

function closeProductModal() {
  productModal.hidden = true;
}

btnAddProduct.addEventListener('click', openCreateModal);
btnCancelProduct.addEventListener('click', closeProductModal);

productModal.addEventListener('click', (event) => {
  if (event.target === productModal) closeProductModal();
});

productsTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === 'edit') {
    const product = productsCache.find((p) => String(p.id) === id);
    if (product) openEditModal(product);
    return;
  }

  if (action === 'delete') {
    if (!confirm('Xóa sản phẩm này? Chỉ xóa được khi chưa từng có trong phiếu nhập/xuất nào.')) return;
  }

  button.disabled = true;
  try {
    if (action === 'delete') {
      await apiFetch(`/products/${id}`, { method: 'DELETE' });
    } else {
      await apiFetch(`/products/${id}/${action}`, { method: 'PATCH' });
    }
    await loadProducts();
  } catch (err) {
    renderProductsError(err.message);
    button.disabled = false;
  }
});

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  productFormErrorBox.hidden = true;
  btnSubmitProduct.disabled = true;
  btnSubmitProduct.textContent = 'Đang lưu...';

  const body = {
    code: codeInput.value.trim(),
    name: nameInput.value.trim(),
    unit: unitInput.value.trim(),
    sale_price: Number(salePriceInput.value),
    cost_price: costPriceInput.value ? Number(costPriceInput.value) : 0,
    low_stock_threshold: lowStockInput.value ? Number(lowStockInput.value) : 0,
  };

  try {
    if (editingProductId === null) {
      await apiFetch('/products', { method: 'POST', body: JSON.stringify(body) });
    } else {
      await apiFetch(`/products/${editingProductId}`, { method: 'PUT', body: JSON.stringify(body) });
    }
    closeProductModal();
    await loadProducts();
  } catch (err) {
    productFormErrorText.textContent = err.message;
    productFormErrorBox.hidden = false;
  } finally {
    btnSubmitProduct.disabled = false;
    btnSubmitProduct.textContent = 'Lưu';
  }
});

(async function init() {
  currentUser = await initLayout('products');
  if (!currentUser) return;

  btnAddProduct.innerHTML = `${icon('plus', 16)} Thêm sản phẩm`;
  document.querySelector('.search-box .input-icon').innerHTML = icon('search', 16);
  updateSortIconUi();
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await loadProducts();
})();
