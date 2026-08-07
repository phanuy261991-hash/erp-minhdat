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

const btnExportProducts = document.getElementById('btn-export-products');
const btnImportProducts = document.getElementById('btn-import-products');
const importModal = document.getElementById('import-modal');
const btnCancelImport = document.getElementById('btn-cancel-import');
const btnSubmitImport = document.getElementById('btn-submit-import');
const importFileInput = document.getElementById('import-file-input');
const importGeneralErrorBox = document.getElementById('import-general-error');
const importGeneralErrorText = document.getElementById('import-general-error-text');
const importSuccessBox = document.getElementById('import-success');
const importSuccessText = document.getElementById('import-success-text');
const importErrorsSection = document.getElementById('import-errors-section');
const importErrorsCount = document.getElementById('import-errors-count');
const importErrorsTbody = document.getElementById('import-errors-tbody');

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
    <td>${formatMoney(product.current_cost)}</td>
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
  setMoneyValue(salePriceInput, product.sale_price);
  setMoneyValue(costPriceInput, product.cost_price);
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
    sale_price: getMoneyValue(salePriceInput),
    cost_price: getMoneyValue(costPriceInput),
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

// Xuat Excel: luon xuat DUNG danh sach dang hien thi (co ap dung o tim kiem), khong phai toan
// bo danh muc - theo yeu cau nguoi dung. Dung fetch rieng (khong qua apiFetch) vi phan hoi la
// file nhi phan (blob), khong phai JSON.
btnExportProducts.addEventListener('click', async () => {
  const ids = getVisibleProducts().map((p) => p.id);
  if (ids.length === 0) {
    renderProductsError('Không có sản phẩm nào để xuất');
    return;
  }

  btnExportProducts.disabled = true;
  try {
    const response = await fetch('/api/products/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Xuất file thất bại');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `san-pham-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    renderProductsError(err.message);
  } finally {
    btnExportProducts.disabled = false;
  }
});

function resetImportModal() {
  importFileInput.value = '';
  importGeneralErrorBox.hidden = true;
  importSuccessBox.hidden = true;
  importErrorsSection.hidden = true;
  importErrorsTbody.innerHTML = '';
  btnSubmitImport.disabled = false;
  btnSubmitImport.textContent = 'Nhập dữ liệu';
}

function openImportModal() {
  resetImportModal();
  importModal.hidden = false;
}

function closeImportModal() {
  importModal.hidden = true;
}

btnImportProducts.addEventListener('click', openImportModal);
btnCancelImport.addEventListener('click', closeImportModal);
importModal.addEventListener('click', (event) => {
  if (event.target === importModal) closeImportModal();
});

btnSubmitImport.addEventListener('click', async () => {
  importGeneralErrorBox.hidden = true;
  importSuccessBox.hidden = true;
  importErrorsSection.hidden = true;

  const file = importFileInput.files[0];
  if (!file) {
    importGeneralErrorText.textContent = 'Chưa chọn file để nhập';
    importGeneralErrorBox.hidden = false;
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  btnSubmitImport.disabled = true;
  btnSubmitImport.textContent = 'Đang nhập...';

  try {
    // Khong dung apiFetch: no luon gan Content-Type: application/json, se pha hong boundary
    // cua multipart/form-data ma trinh duyet tu sinh khi gui FormData.
    const response = await fetch('/api/products/import', {
      method: 'POST',
      credentials: 'same-origin',
      body: formData,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        importErrorsCount.textContent = data.errors.length;
        importErrorsTbody.innerHTML = '';
        data.errors.forEach((e) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${e.row}</td><td>${e.message}</td>`;
          importErrorsTbody.appendChild(tr);
        });
        importErrorsSection.hidden = false;
      }
      throw new Error(data.error || 'Nhập dữ liệu thất bại');
    }

    importSuccessText.textContent = `Đã nhập thành công ${data.imported} sản phẩm`;
    importSuccessBox.hidden = false;
    importFileInput.value = '';
    await loadProducts();
  } catch (err) {
    importGeneralErrorText.textContent = err.message;
    importGeneralErrorBox.hidden = false;
  } finally {
    btnSubmitImport.disabled = false;
    btnSubmitImport.textContent = 'Nhập dữ liệu';
  }
});

(async function init() {
  currentUser = await initLayout('products');
  if (!currentUser) return;

  btnAddProduct.innerHTML = `${icon('plus', 16)} Thêm sản phẩm`;
  btnImportProducts.innerHTML = `${icon('arrowUpTray', 16)} Nhập Excel`;
  btnExportProducts.innerHTML = `${icon('arrowDownTray', 16)} Xuất Excel`;
  document.querySelector('.search-box .input-icon').innerHTML = icon('search', 16);
  updateSortIconUi();
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await loadProducts();
})();
