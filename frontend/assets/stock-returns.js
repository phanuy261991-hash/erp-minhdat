// Logic trang "Tra hang" (migration 032/033/034, xem docs/DECISIONS.md). Gom 2 loai phieu tra
// dung chung 1 danh sach: "Tra hang xuat" (khach hang tra lai hang da mua - API /stock-returns,
// tai dung stock_receipts) va "Tra hang nha cung cap" (tra hang ve NCC - API /supplier-returns,
// tai dung stock_issues, CHIEU NGUOC LAI: giam ton kho + giam cong no phai tra NCC). Moi dong
// trong returnsCache co them field return_type ('khach_hang'/'nha_cung_cap') tu gan luc tai de
// biet goi API nao. 2 form lap phieu hoan toan tach biet (rap khuon dung pattern combobox san
// pham + "them nhanh" doi tac cua stock-receipts.js/stock-issues.js, giong cach 2 file do da tu
// tach rieng thay vi dung chung).
//
// Quy trinh 2 buoc (migration 033, ap dung ca 2 loai): nut "Luu" chi ghi thong tin (POST/PUT
// khong xu ly), nut "Tru kho" moi thuc su tru/cong kho + tru cong no (tao moi: POST voi
// process:true; phieu da luu: PUT luu lai sua doi truoc roi goi POST /:id/process). Phieu
// 'cho_tru_kho' con sua duoc (icon but), phieu 'da_tru_kho' khoa vinh vien (chi con xem chi tiet).

let currentUser = null;
let productsCache = [];
let partnersCache = [];
let projectsCache = [];
let returnsCache = [];
let rowCounter = 0;
let searchKeyword = '';
let editingReturnId = null;

let supplierPartnersCache = [];
let supplierRowCounter = 0;
let editingSupplierReturnId = null;

// return_type -> tien to API tuong ung, dung chung cho render danh sach + cac thao tac.
function apiPrefixFor(returnType) {
  return returnType === 'nha_cung_cap' ? '/supplier-returns' : '/stock-returns';
}

const returnsTbody = document.getElementById('returns-tbody');
const returnsErrorBox = document.getElementById('returns-error');
const returnsErrorText = document.getElementById('returns-error-text');
const searchInput = document.getElementById('return-search');

const btnAddReturn = document.getElementById('btn-add-return');
const returnModal = document.getElementById('return-modal');
const returnModalTitle = document.getElementById('return-modal-title');
const returnForm = document.getElementById('return-form');
const returnFormErrorBox = document.getElementById('return-form-error');
const returnFormErrorText = document.getElementById('return-form-error-text');
const btnCancelReturn = document.getElementById('btn-cancel-return');
const btnSaveDraft = document.getElementById('btn-save-draft');
const btnProcessReturn = document.getElementById('btn-process-return');

const partnerSelect = document.getElementById('return-partner');
const projectSelect = document.getElementById('return-project');
const newPartnerFields = document.getElementById('new-partner-fields');
const newPartnerNameInput = document.getElementById('new-partner-name');
const newPartnerPhoneInput = document.getElementById('new-partner-phone');
const newPartnerAddressInput = document.getElementById('new-partner-address');
const noteInput = document.getElementById('return-note');
const returnDateInput = document.getElementById('return-date');
const itemRowsContainer = document.getElementById('item-rows');
const btnAddItemRow = document.getElementById('btn-add-item-row');
const totalAmountEl = document.getElementById('return-total-amount');

const detailModal = document.getElementById('return-detail-modal');
const detailErrorBox = document.getElementById('return-detail-error');
const detailErrorText = document.getElementById('return-detail-error-text');
const detailInfoEl = document.getElementById('return-detail-info');
const detailItemsEl = document.getElementById('return-detail-items');
const detailTotalEl = document.getElementById('return-detail-total');
const btnCloseDetail = document.getElementById('btn-close-return-detail');

// ----- Nut dropdown "+ Lap phieu tra hang" (2 lua chon) -----

const returnTypeDropdown = document.getElementById('return-type-dropdown');
const returnTypeMenu = document.getElementById('return-type-menu');
const btnChooseCustomerReturn = document.getElementById('btn-choose-customer-return');
const btnChooseSupplierReturn = document.getElementById('btn-choose-supplier-return');

// ----- Form "Tra hang nha cung cap" (migration 034) -----

const supplierReturnModal = document.getElementById('supplier-return-modal');
const supplierReturnModalTitle = document.getElementById('supplier-return-modal-title');
const supplierReturnForm = document.getElementById('supplier-return-form');
const supplierReturnFormErrorBox = document.getElementById('supplier-return-form-error');
const supplierReturnFormErrorText = document.getElementById('supplier-return-form-error-text');
const btnCancelSupplierReturn = document.getElementById('btn-cancel-supplier-return');
const btnSaveSupplierDraft = document.getElementById('btn-save-supplier-draft');
const btnProcessSupplierReturn = document.getElementById('btn-process-supplier-return');

const supplierPartnerSelect = document.getElementById('supplier-return-partner');
const supplierNewPartnerFields = document.getElementById('supplier-new-partner-fields');
const supplierNewPartnerNameInput = document.getElementById('supplier-new-partner-name');
const supplierNewPartnerPhoneInput = document.getElementById('supplier-new-partner-phone');
const supplierNewPartnerAddressInput = document.getElementById('supplier-new-partner-address');
const supplierNoteInput = document.getElementById('supplier-return-note');
const supplierReturnDateInput = document.getElementById('supplier-return-date');
const supplierItemRowsContainer = document.getElementById('supplier-item-rows');
const btnAddSupplierItemRow = document.getElementById('btn-add-supplier-item-row');
const supplierTotalAmountEl = document.getElementById('supplier-return-total-amount');

function nowForDatetimeLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toSqliteDatetime(localValue) {
  const d = new Date(localValue);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function formatMoney(value) {
  return Number(value).toLocaleString('vi-VN');
}

function formatDate(sqliteDateTime) {
  const iso = sqliteDateTime.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderReturnsError(message) {
  returnsErrorText.textContent = message;
  returnsErrorBox.hidden = false;
}

// ----- Danh sach + tim kiem (client-side, giong pattern customers.js/debts.html) -----

function getVisibleReturns() {
  const keyword = searchKeyword.trim().toLowerCase();
  if (!keyword) return returnsCache;
  return returnsCache.filter(
    (r) =>
      r.code.toLowerCase().includes(keyword) ||
      (r.partner_name || '').toLowerCase().includes(keyword) ||
      (r.partner_phone || '').toLowerCase().includes(keyword)
  );
}

const RETURN_TYPE_LABELS = {
  khach_hang: '<span class="badge badge-inactive">Trả hàng xuất</span>',
  nha_cung_cap: '<span class="badge badge-inactive">Trả hàng NCC</span>',
};

function renderReturnRow(r) {
  const isDraft = r.status === 'cho_tru_kho';
  const statusBadge = isDraft
    ? '<span class="badge badge-inactive">Chờ trừ kho</span>'
    : '<span class="badge badge-active">Đã trừ kho</span>';
  // Phieu con 'cho_tru_kho' (chua tru kho) - cho sua + tru kho nhanh ngay tren danh sach; phieu
  // 'da_tru_kho' da khoa, chi con xem chi tiet (xem docs/DECISIONS.md). data-type gan kem de
  // click handler biet goi API /stock-returns hay /supplier-returns.
  const actions = isDraft
    ? `
      <button type="button" class="icon-btn" data-action="edit" data-id="${r.id}" data-type="${r.return_type}" title="Sửa phiếu">${icon('pencil', 14)}</button>
      <button type="button" class="icon-btn" data-action="process" data-id="${r.id}" data-type="${r.return_type}" title="Trừ kho">${icon('check', 14)}</button>
      <button type="button" class="icon-btn" data-action="view" data-id="${r.id}" data-type="${r.return_type}" title="Xem chi tiết">${icon('eye', 14)}</button>
    `
    : `<button type="button" class="icon-btn" data-action="view" data-id="${r.id}" data-type="${r.return_type}" title="Xem chi tiết">${icon('eye', 14)}</button>`;

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${r.code}</td>
    <td>${RETURN_TYPE_LABELS[r.return_type]}</td>
    <td>${r.partner_name || '-'}</td>
    <td>${r.partner_phone || '-'}</td>
    <td>${r.project_name || '-'}</td>
    <td>${r.created_by_name}</td>
    <td>${formatDate(r.created_at)}</td>
    <td>${formatMoney(r.total_credit)}</td>
    <td>${statusBadge}</td>
    <td>${actions}</td>
  `;
  return tr;
}

function renderReturns() {
  returnsTbody.innerHTML = '';
  getVisibleReturns().forEach((r) => returnsTbody.appendChild(renderReturnRow(r)));
}

// Gop 2 danh sach (khach hang tra hang xuat + tra hang NCC) thanh 1, gan return_type de phan
// biet, sap xep chung theo ngay lap moi nhat truoc - dung chung 1 giao dien quan ly theo dung
// yeu cau nguoi dung.
async function loadReturns() {
  try {
    const [customerRes, supplierRes] = await Promise.all([apiFetch('/stock-returns'), apiFetch('/supplier-returns')]);
    const customerReturns = customerRes.returns.map((r) => ({ ...r, return_type: 'khach_hang' }));
    const supplierReturns = supplierRes.returns.map((r) => ({ ...r, return_type: 'nha_cung_cap' }));
    returnsCache = [...customerReturns, ...supplierReturns].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    renderReturns();
  } catch (err) {
    renderReturnsError(err.message);
  }
}

searchInput.addEventListener('input', (event) => {
  searchKeyword = event.target.value;
  renderReturns();
});

returnsTbody.addEventListener('click', async (event) => {
  const viewBtn = event.target.closest('button[data-action="view"]');
  if (viewBtn) {
    openDetailModal(viewBtn.dataset.id, viewBtn.dataset.type);
    return;
  }

  const editBtn = event.target.closest('button[data-action="edit"]');
  if (editBtn) {
    if (editBtn.dataset.type === 'nha_cung_cap') {
      openSupplierEditModal(editBtn.dataset.id);
    } else {
      openEditModal(editBtn.dataset.id);
    }
    return;
  }

  const processBtn = event.target.closest('button[data-action="process"]');
  if (processBtn) {
    if (!confirm('Xác nhận trừ kho cho phiếu này? Sau khi trừ kho sẽ không sửa được nữa.')) return;
    processBtn.disabled = true;
    returnsErrorBox.hidden = true;
    try {
      await apiFetch(`${apiPrefixFor(processBtn.dataset.type)}/${processBtn.dataset.id}/process`, { method: 'POST' });
      await loadReturns();
    } catch (err) {
      renderReturnsError(err.message);
      processBtn.disabled = false;
    }
  }
});

// ----- Modal xem chi tiet -----

async function openDetailModal(id, returnType) {
  detailErrorBox.hidden = true;
  detailModal.hidden = false;
  const isSupplier = returnType === 'nha_cung_cap';
  try {
    const { return: r } = await apiFetch(`${apiPrefixFor(returnType)}/${id}`);
    const infoItem = (label, value, fullWidth) => `
      <div class="detail-info-item${fullWidth ? ' full-width' : ''}">
        <p class="detail-label">${label}</p>
        <p class="detail-value">${value}</p>
      </div>
    `;
    const statusText = r.status === 'cho_tru_kho' ? 'Chờ trừ kho' : 'Đã trừ kho';
    detailInfoEl.innerHTML = [
      infoItem('Mã phiếu', r.code),
      infoItem('Loại phiếu', isSupplier ? 'Trả hàng nhà cung cấp' : 'Trả hàng xuất'),
      infoItem('Trạng thái', statusText),
      infoItem(isSupplier ? 'Nhà cung cấp' : 'Khách hàng', r.partner_name || '-'),
      infoItem('Số điện thoại', r.partner_phone || '-'),
      infoItem('Công trình', r.project_name || '-'),
      infoItem('Người lập', r.created_by_name),
      infoItem('Ngày lập', formatDate(r.created_at)),
      infoItem('Ghi chú', r.note || '-', true),
    ].join('');
    // Khach hang: gia luu o cot sale_price. Nha cung cap: gia luu o cot unit_price (xem
    // supplierReturn.service.js, khong can cot rieng). Chuan hoa ve 1 bien de dung chung markup.
    detailItemsEl.innerHTML = r.items
      .map((item) => {
        const price = isSupplier ? item.unit_price : item.sale_price;
        return `
          <tr>
            <td>${item.product_code} - ${item.product_name}</td>
            <td>${item.unit}</td>
            <td>${formatMoney(item.quantity)}</td>
            <td>${formatMoney(price)}</td>
            <td>${formatMoney(item.quantity * price)}</td>
          </tr>
        `;
      })
      .join('');
    detailTotalEl.textContent = formatMoney(r.total_credit);
  } catch (err) {
    detailErrorText.textContent = err.message;
    detailErrorBox.hidden = false;
  }
}

btnCloseDetail.addEventListener('click', () => {
  detailModal.hidden = true;
});
detailModal.addEventListener('click', (event) => {
  if (event.target === detailModal) detailModal.hidden = true;
});

// ----- Du lieu chon: san pham / khach hang / cong trinh -----

async function loadProducts() {
  const { products } = await apiFetch('/products');
  productsCache = products.filter((p) => p.is_active);
}

async function loadPartners() {
  const { partners } = await apiFetch('/partners?type=khach_hang');
  partnersCache = partners;
}

function renderPartnerOptions() {
  const options = partnersCache.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  partnerSelect.innerHTML = `<option value="">-- Không chọn --</option>${options}<option value="__new__">+ Thêm khách hàng mới</option>`;
}

// Cong trinh: chi hien cac du an CUA DUNG khach hang dang chon (khong phai toan bo he thong) -
// dung API GET /projects?partner_id= da co san, giong het pattern loadProjectsForPartner() o
// customer-debts.js. Khong an ca truong khi khach hang khong co cong trinh nao - de nguyen
// select chi con 1 lua chon "-- Khong gan cong trinh --", don gian hon la an/hien ca form-row.
async function loadProjectsForPartner(partnerId) {
  if (!partnerId || partnerId === '__new__') return [];
  const { projects } = await apiFetch(`/projects?partner_id=${partnerId}`);
  return projects.filter((p) => p.status !== 'huy');
}

function renderProjectOptions() {
  const options = projectsCache.map((p) => `<option value="${p.id}">${p.code} - ${p.name}</option>`).join('');
  projectSelect.innerHTML = `<option value="">-- Không gắn công trình --</option>${options}`;
}

async function refreshProjectsForSelectedPartner() {
  projectsCache = await loadProjectsForPartner(partnerSelect.value);
  renderProjectOptions();
}

partnerSelect.addEventListener('change', async () => {
  newPartnerFields.hidden = partnerSelect.value !== '__new__';
  await refreshProjectsForSelectedPartner();
  await refreshAllRowReferences();
});

projectSelect.addEventListener('change', refreshAllRowReferences);

// ----- Dong san pham dong (combobox tim theo ma/ten) -----

function createItemRow() {
  rowCounter += 1;
  const row = document.createElement('div');
  row.className = 'item-row';
  row.dataset.rowId = String(rowCounter);
  row.dataset.remaining = '';
  row.innerHTML = `
    <div class="combobox">
      <input type="text" class="item-product-search" placeholder="Tìm theo mã hoặc tên..." autocomplete="off" />
      <input type="hidden" class="item-product-id" />
      <div class="combobox-suggestions"></div>
    </div>
    <div class="item-unit-display"></div>
    <div class="item-unit-display item-issued-display" title="Số lượng còn có thể trả (đã trừ các lần trả trước)">-</div>
    <input type="number" class="item-quantity" min="0" step="1" placeholder="SL trả" />
    <input type="text" class="item-sale-price money-input" placeholder="Giá bán" />
    <div class="item-line-total">0</div>
    <button type="button" class="icon-btn icon-btn-danger item-row-remove" title="Xóa dòng">${icon('trash', 14)}</button>
  `;
  bindMoneyInputs(row);
  return row;
}

function addItemRow() {
  itemRowsContainer.appendChild(createItemRow());
}

function removeItemRow(row) {
  if (itemRowsContainer.children.length > 1) {
    row.remove();
    updateTotalAmount();
  }
}

function rowLineTotal(row) {
  const quantity = Number(row.querySelector('.item-quantity').value) || 0;
  const salePrice = getMoneyValue(row.querySelector('.item-sale-price'));
  return quantity * salePrice;
}

function updateTotalAmount() {
  const rows = Array.from(itemRowsContainer.querySelectorAll('.item-row'));
  let total = 0;

  rows.forEach((row) => {
    const lineTotal = rowLineTotal(row);
    row.querySelector('.item-line-total').textContent = formatMoney(Math.round(lineTotal));
    total += lineTotal;
  });

  totalAmountEl.textContent = formatMoney(Math.round(total));
}

function renderSuggestions(row, keyword) {
  const box = row.querySelector('.combobox-suggestions');
  const kw = keyword.trim().toLowerCase();

  if (!kw) {
    box.innerHTML = '';
    return;
  }

  const matches = productsCache
    .filter((p) => p.code.toLowerCase().includes(kw) || p.name.toLowerCase().includes(kw))
    .slice(0, 8);

  if (matches.length === 0) {
    box.innerHTML = '<div class="combobox-empty">Không tìm thấy sản phẩm</div>';
    return;
  }

  box.innerHTML = matches
    .map(
      (p) => `
        <div class="combobox-option" data-product-id="${p.id}" data-product-label="${p.code} - ${p.name}">
          ${p.code} - ${p.name} <span class="combobox-option-unit">(${p.unit})</span>
        </div>
      `
    )
    .join('');
}

// So luong da xuat con lai co the tra cho dung khach hang (+ cong trinh neu co chon) dang dung
// tren form - goi API GET /stock-returns/reference (tinh on-the-fly o backend, khong luu, xem
// stockReturn.service.js#getReturnReference()). Bo qua neu chua chon khach hang.
async function refreshRowReference(row) {
  const productId = row.querySelector('.item-product-id').value;
  const display = row.querySelector('.item-issued-display');
  const partnerId = partnerSelect.value;

  if (!productId || !partnerId || partnerId === '__new__') {
    display.textContent = '-';
    row.dataset.remaining = '';
    return;
  }

  const projectId = projectSelect.value;
  const params = new URLSearchParams({ partner_id: partnerId, product_id: productId });
  if (projectId) params.set('project_id', projectId);

  try {
    const { issued_quantity: issued, remaining_returnable: remaining } = await apiFetch(`/stock-returns/reference?${params}`);
    display.textContent = formatMoney(issued);
    display.title = `Số lượng còn có thể trả: ${formatMoney(remaining)}`;
    row.dataset.remaining = String(remaining);
  } catch (err) {
    display.textContent = '-';
    row.dataset.remaining = '';
  }
}

async function refreshAllRowReferences() {
  const rows = Array.from(itemRowsContainer.querySelectorAll('.item-row'));
  await Promise.all(rows.map((row) => refreshRowReference(row)));
}

function selectProduct(row, productId, label) {
  row.querySelector('.item-product-id').value = productId;
  row.querySelector('.item-product-search').value = label;
  row.querySelector('.combobox-suggestions').innerHTML = '';

  const product = productsCache.find((p) => String(p.id) === String(productId));
  row.querySelector('.item-unit-display').textContent = product ? product.unit : '';
  // Tu dien Gia ban theo gia ban san pham (giong pattern selectProduct() o stock-issues.js) -
  // van sua tay duoc sau do.
  if (product) {
    setMoneyValue(row.querySelector('.item-sale-price'), product.sale_price);
    updateTotalAmount();
  }
  refreshRowReference(row);
}

itemRowsContainer.addEventListener('input', (event) => {
  if (event.target.classList.contains('item-product-search')) {
    const row = event.target.closest('.item-row');
    row.querySelector('.item-product-id').value = '';
    renderSuggestions(row, event.target.value);
    return;
  }

  if (event.target.classList.contains('item-quantity') || event.target.classList.contains('item-sale-price')) {
    updateTotalAmount();
  }
});

itemRowsContainer.addEventListener('click', (event) => {
  const option = event.target.closest('.combobox-option');
  if (option) {
    const row = option.closest('.item-row');
    selectProduct(row, option.dataset.productId, option.dataset.productLabel);
    return;
  }

  const removeBtn = event.target.closest('.item-row-remove');
  if (removeBtn) {
    removeItemRow(removeBtn.closest('.item-row'));
  }
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.combobox')) {
    document.querySelectorAll('.combobox-suggestions').forEach((box) => {
      box.innerHTML = '';
    });
  }
});

btnAddItemRow.addEventListener('click', addItemRow);

// ----- Mo/dong modal lap phieu -----

function resetReturnForm() {
  returnForm.reset();
  newPartnerFields.hidden = true;
  returnDateInput.value = nowForDatetimeLocal();
  projectsCache = [];
  renderProjectOptions();
  itemRowsContainer.innerHTML = '';
  addItemRow();
  updateTotalAmount();
}

function openCreateModal() {
  editingReturnId = null;
  returnModalTitle.textContent = 'Lập phiếu trả hàng';
  resetReturnForm();
  returnFormErrorBox.hidden = true;
  returnModal.hidden = false;
}

// Chi mo duoc voi phieu dang 'cho_tru_kho' (icon "Sua" chi hien voi phieu do trong danh sach,
// nhung van kiem tra lai o day cho chac - tranh truong hop danh sach chua kip lam moi).
async function openEditModal(id) {
  returnFormErrorBox.hidden = true;
  try {
    const { return: r } = await apiFetch(`/stock-returns/${id}`);
    if (r.status !== 'cho_tru_kho') {
      renderReturnsError('Phiếu đã trừ kho, không thể sửa');
      await loadReturns();
      return;
    }

    editingReturnId = id;
    returnModalTitle.textContent = 'Sửa phiếu trả hàng';
    returnForm.reset();
    newPartnerFields.hidden = true;

    partnerSelect.value = String(r.partner_id);
    projectsCache = await loadProjectsForPartner(partnerSelect.value);
    renderProjectOptions();
    projectSelect.value = r.project_id ? String(r.project_id) : '';

    const iso = r.created_at.replace(' ', 'T') + 'Z';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    returnDateInput.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    noteInput.value = r.note || '';

    itemRowsContainer.innerHTML = '';
    r.items.forEach((item) => {
      const row = createItemRow();
      itemRowsContainer.appendChild(row);
      const product = productsCache.find((p) => p.id === item.product_id);
      const label = product ? `${product.code} - ${product.name}` : '';
      selectProduct(row, item.product_id, label);
      row.querySelector('.item-quantity').value = item.quantity;
      setMoneyValue(row.querySelector('.item-sale-price'), item.sale_price);
    });
    updateTotalAmount();

    returnModal.hidden = false;
  } catch (err) {
    renderReturnsError(err.message);
  }
}

function closeReturnModal() {
  returnModal.hidden = true;
}

// Nut "+ Lap phieu tra hang" xo ra dropdown 2 lua chon (giong pattern .pt-token-dropdown da co
// o trang chinh sua mau in) - chon 1 trong 2 se dong menu va mo dung modal tuong ung.
btnAddReturn.addEventListener('click', (event) => {
  event.stopPropagation();
  returnTypeMenu.hidden = !returnTypeMenu.hidden;
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('#return-type-dropdown')) {
    returnTypeMenu.hidden = true;
  }
});
btnChooseCustomerReturn.addEventListener('click', () => {
  returnTypeMenu.hidden = true;
  openCreateModal();
});
btnChooseSupplierReturn.addEventListener('click', () => {
  returnTypeMenu.hidden = true;
  openSupplierCreateModal();
});

btnCancelReturn.addEventListener('click', closeReturnModal);
returnModal.addEventListener('click', (event) => {
  if (event.target === returnModal) closeReturnModal();
});

// ----- Nop phieu -----

function collectItems() {
  const rows = Array.from(itemRowsContainer.querySelectorAll('.item-row'));
  const items = [];

  for (const row of rows) {
    const productId = row.querySelector('.item-product-id').value;
    const quantity = row.querySelector('.item-quantity').value;
    const salePriceInput = row.querySelector('.item-sale-price');
    const salePriceRaw = salePriceInput.value;

    if (!productId && !quantity && salePriceRaw === '') continue;

    if (!productId || !quantity || salePriceRaw === '') {
      return { error: 'Mỗi dòng phải chọn sản phẩm, nhập số lượng trả lại và giá bán' };
    }

    // Chan som phia client theo dung so con lai da tai (server van chan lai that su trong
    // transaction - day chi la canh bao som cho nguoi dung, khong thay the validate backend).
    const remaining = row.dataset.remaining === '' ? null : Number(row.dataset.remaining);
    if (remaining !== null && Number(quantity) > remaining) {
      return { error: `Số lượng trả lại vượt quá số còn có thể trả (còn lại: ${formatMoney(remaining)})` };
    }

    items.push({
      product_id: Number(productId),
      quantity: Number(quantity),
      sale_price: getMoneyValue(salePriceInput),
    });
  }

  if (items.length === 0) {
    return { error: 'Phiếu trả hàng phải có ít nhất 1 dòng sản phẩm' };
  }

  return { items };
}

// Ngan submit mac dinh (vd bam Enter trong 1 o input) - ca 2 nut hanh dong deu la type="button",
// tu goi ham rieng, khong dua qua su kien 'submit' cua form nay.
returnForm.addEventListener('submit', (event) => event.preventDefault());

// Tao nhanh khach hang moi neu dang chon "+ Them khach hang moi" - dung chung cho ca Luu lan
// Tru kho.
async function resolvePartnerId() {
  let partnerId = partnerSelect.value;
  if (partnerId !== '__new__') return partnerId;

  const name = newPartnerNameInput.value.trim();
  if (!name) {
    throw new Error('Thiếu tên khách hàng mới');
  }
  const { partner } = await apiFetch('/partners', {
    method: 'POST',
    body: JSON.stringify({
      type: 'khach_hang',
      name,
      phone: newPartnerPhoneInput.value.trim(),
      address: newPartnerAddressInput.value.trim(),
    }),
  });
  return partner.id;
}

function buildReturnBody(partnerId, items) {
  return {
    partner_id: partnerId,
    project_id: projectSelect.value || null,
    note: noteInput.value.trim(),
    return_date: returnDateInput.value ? toSqliteDatetime(returnDateInput.value) : null,
    items,
  };
}

function validateFormBeforeSubmit() {
  returnFormErrorBox.hidden = true;
  if (!partnerSelect.value) {
    return { error: 'Vui lòng chọn khách hàng' };
  }
  return collectItems();
}

function setSubmitButtonsBusy(busy) {
  btnSaveDraft.disabled = busy;
  btnProcessReturn.disabled = busy;
}

function showFormError(message) {
  returnFormErrorText.textContent = message;
  returnFormErrorBox.hidden = false;
}

// Nut "Luu" - chi ghi lai thong tin da nhap (tao moi hoac cap nhat phieu dang cho_tru_kho),
// CHUA tru kho/tru cong no (xem stockReturn.service.js).
btnSaveDraft.addEventListener('click', async () => {
  const { items, error } = validateFormBeforeSubmit();
  if (error) {
    showFormError(error);
    return;
  }

  setSubmitButtonsBusy(true);
  btnSaveDraft.textContent = 'Đang lưu...';

  try {
    const partnerId = await resolvePartnerId();
    const body = buildReturnBody(partnerId, items);

    if (editingReturnId) {
      await apiFetch(`/stock-returns/${editingReturnId}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await apiFetch('/stock-returns', { method: 'POST', body: JSON.stringify(body) });
    }

    closeReturnModal();
    await loadReturns();
  } catch (err) {
    showFormError(err.message);
  } finally {
    setSubmitButtonsBusy(false);
    btnSaveDraft.textContent = 'Lưu';
  }
});

// Nut "Tru kho" - thuc su tru kho + tru cong no theo dung quy trinh nghiep vu cu, khong doi.
// Tao moi: goi POST voi process:true (1 buoc, dung y het hanh vi truoc migration 033). Dang sua
// 1 phieu da luu: luu lai sua doi truoc (PUT) roi moi goi POST /:id/process, tranh mat du lieu
// vua sua neu nguoi dung bam thang "Tru kho" ma chua bam "Luu".
btnProcessReturn.addEventListener('click', async () => {
  const { items, error } = validateFormBeforeSubmit();
  if (error) {
    showFormError(error);
    return;
  }

  setSubmitButtonsBusy(true);
  btnProcessReturn.textContent = 'Đang trừ kho...';

  try {
    const partnerId = await resolvePartnerId();
    const body = buildReturnBody(partnerId, items);

    if (editingReturnId) {
      await apiFetch(`/stock-returns/${editingReturnId}`, { method: 'PUT', body: JSON.stringify(body) });
      await apiFetch(`/stock-returns/${editingReturnId}/process`, { method: 'POST' });
    } else {
      await apiFetch('/stock-returns', { method: 'POST', body: JSON.stringify({ ...body, process: true }) });
    }

    closeReturnModal();
    await loadReturns();
  } catch (err) {
    showFormError(err.message);
  } finally {
    setSubmitButtonsBusy(false);
    btnProcessReturn.textContent = 'Trừ kho';
  }
});

// ================== "Tra hang nha cung cap" (migration 034) ==================
// Rap khuon dung cau truc voi phan "Tra hang xuat" o tren (combobox san pham, "them nhanh" doi
// tac, quy trinh Luu/Tru kho) nhung khong co Cong trinh, va o gia nhap co them "chon gia" khi
// NCC tung ban nhieu gia khac nhau cho cung 1 san pham (refreshSupplierRowPrice).

async function loadSupplierPartners() {
  const { partners } = await apiFetch('/partners?type=nha_cung_cap');
  supplierPartnersCache = partners;
}

function renderSupplierPartnerOptions() {
  const options = supplierPartnersCache.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  supplierPartnerSelect.innerHTML = `<option value="">-- Không chọn --</option>${options}<option value="__new__">+ Thêm nhà cung cấp mới</option>`;
}

supplierPartnerSelect.addEventListener('change', async () => {
  supplierNewPartnerFields.hidden = supplierPartnerSelect.value !== '__new__';
  await refreshAllSupplierRowReferences();
  await refreshAllSupplierRowPrices();
});

function createSupplierItemRow() {
  supplierRowCounter += 1;
  const row = document.createElement('div');
  row.className = 'item-row';
  row.dataset.rowId = String(supplierRowCounter);
  row.dataset.remaining = '';
  row.innerHTML = `
    <div class="combobox">
      <input type="text" class="item-product-search" placeholder="Tìm theo mã hoặc tên..." autocomplete="off" />
      <input type="hidden" class="item-product-id" />
      <div class="combobox-suggestions"></div>
    </div>
    <div class="item-unit-display"></div>
    <div class="item-unit-display item-issued-display" title="Số lượng còn có thể trả (đã trừ các lần trả trước)">-</div>
    <input type="number" class="item-quantity" min="0" step="1" placeholder="SL trả" />
    <div class="price-picker">
      <input type="text" class="item-purchase-price money-input" placeholder="Giá nhập" />
      <div class="price-picker-hint" hidden></div>
    </div>
    <div class="item-line-total">0</div>
    <button type="button" class="icon-btn icon-btn-danger item-row-remove" title="Xóa dòng">${icon('trash', 14)}</button>
  `;
  bindMoneyInputs(row);
  return row;
}

function addSupplierItemRow() {
  supplierItemRowsContainer.appendChild(createSupplierItemRow());
}

function removeSupplierItemRow(row) {
  if (supplierItemRowsContainer.children.length > 1) {
    row.remove();
    updateSupplierTotalAmount();
  }
}

function supplierRowLineTotal(row) {
  const quantity = Number(row.querySelector('.item-quantity').value) || 0;
  const purchasePrice = getMoneyValue(row.querySelector('.item-purchase-price'));
  return quantity * purchasePrice;
}

function updateSupplierTotalAmount() {
  const rows = Array.from(supplierItemRowsContainer.querySelectorAll('.item-row'));
  let total = 0;

  rows.forEach((row) => {
    const lineTotal = supplierRowLineTotal(row);
    row.querySelector('.item-line-total').textContent = formatMoney(Math.round(lineTotal));
    total += lineTotal;
  });

  supplierTotalAmountEl.textContent = formatMoney(Math.round(total));
}

// "Da nhap" con lai co the tra cho dung NCC + san pham dang chon - doi xung refreshRowReference()
// o tren nhung goi API /supplier-returns/reference.
async function refreshSupplierRowReference(row) {
  const productId = row.querySelector('.item-product-id').value;
  const display = row.querySelector('.item-issued-display');
  const partnerId = supplierPartnerSelect.value;

  if (!productId || !partnerId || partnerId === '__new__') {
    display.textContent = '-';
    row.dataset.remaining = '';
    return;
  }

  const params = new URLSearchParams({ partner_id: partnerId, product_id: productId });
  try {
    const { received_quantity: received, remaining_returnable: remaining } = await apiFetch(`/supplier-returns/reference?${params}`);
    display.textContent = formatMoney(received);
    display.title = `Số lượng còn có thể trả: ${formatMoney(remaining)}`;
    row.dataset.remaining = String(remaining);
  } catch (err) {
    display.textContent = '-';
    row.dataset.remaining = '';
  }
}

// Tra cuu lich su gia nhap tu dung NCC cho dung san pham (theo yeu cau nguoi dung): 1 gia thi
// tu dien luon vao o "Gia nhap"; >=2 gia (tung mua khac gia o cac lan nhap khac nhau) thi hien
// khung goi y ngay duoi o (dinh vi tuyet doi, khong day layout dong) liet ke tung gia dang chip
// bam duoc - chon chip nao dien gia do. Khong co lich su thi de trong, khong bao loi.
async function refreshSupplierRowPrice(row) {
  const productId = row.querySelector('.item-product-id').value;
  const partnerId = supplierPartnerSelect.value;
  const hint = row.querySelector('.price-picker-hint');
  hint.hidden = true;
  hint.innerHTML = '';

  if (!productId || !partnerId || partnerId === '__new__') return;

  const params = new URLSearchParams({ partner_id: partnerId, product_id: productId });
  try {
    const { prices } = await apiFetch(`/supplier-returns/prices?${params}`);
    const priceInput = row.querySelector('.item-purchase-price');
    if (prices.length === 1) {
      setMoneyValue(priceInput, prices[0]);
    } else if (prices.length >= 2) {
      hint.innerHTML = `
        <span class="price-picker-icon">${icon('info', 12)}</span>
        <span class="price-picker-hint-label">Từng mua nhiều giá, chọn 1:</span>
        ${prices.map((p) => `<button type="button" class="price-chip" data-price="${p}">${formatMoney(p)}</button>`).join('')}
      `;
      hint.hidden = false;
    }
  } catch (err) {
    // Tra cuu loi thi thoi, khong chan nguoi dung tu nhap tay gia.
  }
}

async function refreshAllSupplierRowReferences() {
  const rows = Array.from(supplierItemRowsContainer.querySelectorAll('.item-row'));
  await Promise.all(rows.map((row) => refreshSupplierRowReference(row)));
}

async function refreshAllSupplierRowPrices() {
  const rows = Array.from(supplierItemRowsContainer.querySelectorAll('.item-row'));
  await Promise.all(rows.map((row) => refreshSupplierRowPrice(row)));
}

// Khac selectProduct() cua "Tra hang xuat": KHONG tu dien gia theo product.sale_price (khai
// niem "gia ban" khong lien quan phieu nay) - gia nhap lay tu lich su mua qua refreshSupplierRowPrice().
function selectSupplierProduct(row, productId, label) {
  row.querySelector('.item-product-id').value = productId;
  row.querySelector('.item-product-search').value = label;
  row.querySelector('.combobox-suggestions').innerHTML = '';

  const product = productsCache.find((p) => String(p.id) === String(productId));
  row.querySelector('.item-unit-display').textContent = product ? product.unit : '';

  refreshSupplierRowReference(row);
  refreshSupplierRowPrice(row);
}

supplierItemRowsContainer.addEventListener('input', (event) => {
  if (event.target.classList.contains('item-product-search')) {
    const row = event.target.closest('.item-row');
    row.querySelector('.item-product-id').value = '';
    renderSuggestions(row, event.target.value);
    return;
  }

  if (event.target.classList.contains('item-quantity') || event.target.classList.contains('item-purchase-price')) {
    updateSupplierTotalAmount();
  }
});

supplierItemRowsContainer.addEventListener('click', (event) => {
  const option = event.target.closest('.combobox-option');
  if (option) {
    const row = option.closest('.item-row');
    selectSupplierProduct(row, option.dataset.productId, option.dataset.productLabel);
    return;
  }

  const chip = event.target.closest('.price-chip');
  if (chip) {
    const row = chip.closest('.item-row');
    setMoneyValue(row.querySelector('.item-purchase-price'), Number(chip.dataset.price));
    row.querySelector('.price-picker-hint').hidden = true;
    updateSupplierTotalAmount();
    return;
  }

  const removeBtn = event.target.closest('.item-row-remove');
  if (removeBtn) {
    removeSupplierItemRow(removeBtn.closest('.item-row'));
  }
});

// Dong ca goi y combobox lan khung chon gia khi bam ra ngoai - mo rong handler chung da co san
// o phan "Tra hang xuat" phia tren.
document.addEventListener('click', (event) => {
  if (!event.target.closest('.price-picker')) {
    document.querySelectorAll('.price-picker-hint').forEach((hint) => {
      hint.hidden = true;
    });
  }
});

btnAddSupplierItemRow.addEventListener('click', addSupplierItemRow);

function resetSupplierReturnForm() {
  supplierReturnForm.reset();
  supplierNewPartnerFields.hidden = true;
  supplierReturnDateInput.value = nowForDatetimeLocal();
  supplierItemRowsContainer.innerHTML = '';
  addSupplierItemRow();
  updateSupplierTotalAmount();
}

function openSupplierCreateModal() {
  editingSupplierReturnId = null;
  supplierReturnModalTitle.textContent = 'Lập phiếu trả hàng nhà cung cấp';
  resetSupplierReturnForm();
  supplierReturnFormErrorBox.hidden = true;
  supplierReturnModal.hidden = false;
}

async function openSupplierEditModal(id) {
  supplierReturnFormErrorBox.hidden = true;
  try {
    const { return: r } = await apiFetch(`/supplier-returns/${id}`);
    if (r.status !== 'cho_tru_kho') {
      renderReturnsError('Phiếu đã trừ kho, không thể sửa');
      await loadReturns();
      return;
    }

    editingSupplierReturnId = id;
    supplierReturnModalTitle.textContent = 'Sửa phiếu trả hàng nhà cung cấp';
    supplierReturnForm.reset();
    supplierNewPartnerFields.hidden = true;

    supplierPartnerSelect.value = String(r.partner_id);

    const iso = r.created_at.replace(' ', 'T') + 'Z';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    supplierReturnDateInput.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    supplierNoteInput.value = r.note || '';

    supplierItemRowsContainer.innerHTML = '';
    r.items.forEach((item) => {
      const row = createSupplierItemRow();
      supplierItemRowsContainer.appendChild(row);
      const product = productsCache.find((p) => p.id === item.product_id);
      const label = product ? `${product.code} - ${product.name}` : '';
      row.querySelector('.item-product-id').value = item.product_id;
      row.querySelector('.item-product-search').value = label;
      row.querySelector('.item-unit-display').textContent = product ? product.unit : '';
      row.querySelector('.item-quantity').value = item.quantity;
      setMoneyValue(row.querySelector('.item-purchase-price'), item.unit_price);
      refreshSupplierRowReference(row);
    });
    updateSupplierTotalAmount();

    supplierReturnModal.hidden = false;
  } catch (err) {
    renderReturnsError(err.message);
  }
}

function closeSupplierReturnModal() {
  supplierReturnModal.hidden = true;
}

btnCancelSupplierReturn.addEventListener('click', closeSupplierReturnModal);
supplierReturnModal.addEventListener('click', (event) => {
  if (event.target === supplierReturnModal) closeSupplierReturnModal();
});

supplierReturnForm.addEventListener('submit', (event) => event.preventDefault());

async function resolveSupplierPartnerId() {
  let partnerId = supplierPartnerSelect.value;
  if (partnerId !== '__new__') return partnerId;

  const name = supplierNewPartnerNameInput.value.trim();
  if (!name) {
    throw new Error('Thiếu tên nhà cung cấp mới');
  }
  const { partner } = await apiFetch('/partners', {
    method: 'POST',
    body: JSON.stringify({
      type: 'nha_cung_cap',
      name,
      phone: supplierNewPartnerPhoneInput.value.trim(),
      address: supplierNewPartnerAddressInput.value.trim(),
    }),
  });
  return partner.id;
}

function collectSupplierItems() {
  const rows = Array.from(supplierItemRowsContainer.querySelectorAll('.item-row'));
  const items = [];

  for (const row of rows) {
    const productId = row.querySelector('.item-product-id').value;
    const quantity = row.querySelector('.item-quantity').value;
    const priceInput = row.querySelector('.item-purchase-price');
    const priceRaw = priceInput.value;

    if (!productId && !quantity && priceRaw === '') continue;

    if (!productId || !quantity || priceRaw === '') {
      return { error: 'Mỗi dòng phải chọn sản phẩm, nhập số lượng trả lại và giá nhập' };
    }

    const remaining = row.dataset.remaining === '' ? null : Number(row.dataset.remaining);
    if (remaining !== null && Number(quantity) > remaining) {
      return { error: `Số lượng trả lại vượt quá số còn có thể trả (còn lại: ${formatMoney(remaining)})` };
    }

    items.push({
      product_id: Number(productId),
      quantity: Number(quantity),
      unit_price: getMoneyValue(priceInput),
    });
  }

  if (items.length === 0) {
    return { error: 'Phiếu trả hàng phải có ít nhất 1 dòng sản phẩm' };
  }

  return { items };
}

function buildSupplierReturnBody(partnerId, items) {
  return {
    partner_id: partnerId,
    note: supplierNoteInput.value.trim(),
    return_date: supplierReturnDateInput.value ? toSqliteDatetime(supplierReturnDateInput.value) : null,
    items,
  };
}

function validateSupplierFormBeforeSubmit() {
  supplierReturnFormErrorBox.hidden = true;
  if (!supplierPartnerSelect.value) {
    return { error: 'Vui lòng chọn nhà cung cấp' };
  }
  return collectSupplierItems();
}

function setSupplierSubmitButtonsBusy(busy) {
  btnSaveSupplierDraft.disabled = busy;
  btnProcessSupplierReturn.disabled = busy;
}

function showSupplierFormError(message) {
  supplierReturnFormErrorText.textContent = message;
  supplierReturnFormErrorBox.hidden = false;
}

btnSaveSupplierDraft.addEventListener('click', async () => {
  const { items, error } = validateSupplierFormBeforeSubmit();
  if (error) {
    showSupplierFormError(error);
    return;
  }

  setSupplierSubmitButtonsBusy(true);
  btnSaveSupplierDraft.textContent = 'Đang lưu...';

  try {
    const partnerId = await resolveSupplierPartnerId();
    const body = buildSupplierReturnBody(partnerId, items);

    if (editingSupplierReturnId) {
      await apiFetch(`/supplier-returns/${editingSupplierReturnId}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await apiFetch('/supplier-returns', { method: 'POST', body: JSON.stringify(body) });
    }

    closeSupplierReturnModal();
    await loadReturns();
  } catch (err) {
    showSupplierFormError(err.message);
  } finally {
    setSupplierSubmitButtonsBusy(false);
    btnSaveSupplierDraft.textContent = 'Lưu';
  }
});

btnProcessSupplierReturn.addEventListener('click', async () => {
  const { items, error } = validateSupplierFormBeforeSubmit();
  if (error) {
    showSupplierFormError(error);
    return;
  }

  setSupplierSubmitButtonsBusy(true);
  btnProcessSupplierReturn.textContent = 'Đang trừ kho...';

  try {
    const partnerId = await resolveSupplierPartnerId();
    const body = buildSupplierReturnBody(partnerId, items);

    if (editingSupplierReturnId) {
      await apiFetch(`/supplier-returns/${editingSupplierReturnId}`, { method: 'PUT', body: JSON.stringify(body) });
      await apiFetch(`/supplier-returns/${editingSupplierReturnId}/process`, { method: 'POST' });
    } else {
      await apiFetch('/supplier-returns', { method: 'POST', body: JSON.stringify({ ...body, process: true }) });
    }

    closeSupplierReturnModal();
    await loadReturns();
  } catch (err) {
    showSupplierFormError(err.message);
  } finally {
    setSupplierSubmitButtonsBusy(false);
    btnProcessSupplierReturn.textContent = 'Trừ kho';
  }
});

(async function init() {
  currentUser = await initLayout('stock-returns');
  if (!currentUser) return;

  btnAddReturn.innerHTML = `${icon('plus', 16)} Lập phiếu trả hàng ${icon('chevronDown', 14)}`;
  btnChooseCustomerReturn.innerHTML = `${icon('arrowDownTray', 16)} Trả hàng xuất (khách hàng)`;
  btnChooseSupplierReturn.innerHTML = `${icon('truck', 16)} Trả hàng nhà cung cấp`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await Promise.all([loadProducts(), loadPartners(), loadSupplierPartners(), loadReturns()]);
  renderPartnerOptions();
  renderSupplierPartnerOptions();
  resetReturnForm();
  resetSupplierReturnForm();
})();
