// Logic trang danh sach "Tra hang". Gom 2 loai phieu tra dung chung 1 danh sach: "Tra hang xuat"
// (khach hang tra lai hang da mua - API /stock-returns) va "Tra hang nha cung cap" (tra hang ve
// NCC - API /supplier-returns). Lap phieu moi/sua da chuyen sang 2 trang rieng
// stock-return-form.html/supplier-return-form.html (2026-09-28, thay the 2 modal cu) - trang nay
// chi con: danh sach, tim kiem, xem chi tiet, tru kho nhanh, xoa nhap.

let returnsCache = [];
let searchKeyword = '';

// return_type -> tien to API tuong ung, dung chung cho render danh sach + cac thao tac.
function apiPrefixFor(returnType) {
  return returnType === 'nha_cung_cap' ? '/supplier-returns' : '/stock-returns';
}

const returnsTbody = document.getElementById('returns-tbody');
const returnsErrorBox = document.getElementById('returns-error');
const returnsErrorText = document.getElementById('returns-error-text');
const searchInput = document.getElementById('return-search');

const btnAddReturn = document.getElementById('btn-add-return');

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
  // Phieu con 'cho_tru_kho' (chua tru kho) co 4 hanh dong - gom vao 1 menu "..." (dropdown, xem
  // style.css .row-actions-menu) de tranh tran/che khuat nhu khi xep rieng tung icon-btn (phan
  // hoi nguoi dung 2026-09-02). Phieu 'da_tru_kho' chi con 1 hanh dong (Xem), giu icon-btn rieng
  // le. data-type gan kem tren tung nut de click handler biet goi API /stock-returns hay
  // /supplier-returns.
  const editHref = r.return_type === 'nha_cung_cap' ? `supplier-return-form.html?id=${r.id}` : `stock-return-form.html?id=${r.id}`;
  const actions = isDraft
    ? `
      <div class="action-dropdown row-actions">
        <button type="button" class="icon-btn" data-action="toggle-menu" title="Thao tác">${icon('moreHorizontal', 16)}</button>
        <div class="action-dropdown-menu row-actions-menu" hidden>
          <a class="action-dropdown-item" href="${editHref}">${icon('pencil', 16)} Sửa phiếu</a>
          <button type="button" class="action-dropdown-item" data-action="process" data-id="${r.id}" data-type="${r.return_type}">${icon('check', 16)} Trừ kho</button>
          <button type="button" class="action-dropdown-item" data-action="view" data-id="${r.id}" data-type="${r.return_type}">${icon('eye', 16)} Xem chi tiết</button>
          <button type="button" class="action-dropdown-item action-dropdown-item-danger" data-action="delete" data-id="${r.id}" data-type="${r.return_type}">${icon('trash', 16)} Xóa phiếu nháp</button>
        </div>
      </div>
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

// Menu "..." gom hanh dong o dong 'cho_tru_kho' (xem renderReturnRow) - dong tat ca menu dang mo
// truoc khi mo 1 menu khac/khi click ra ngoai, dinh vi mo len tren neu mo xuong se tran khoi
// vung nhin thay (hang gan cuoi bang, xem .row-actions-menu.dropdown-open-up trong style.css).
function closeAllRowMenus() {
  returnsTbody.querySelectorAll('.row-actions-menu').forEach((menu) => {
    menu.hidden = true;
    menu.classList.remove('dropdown-open-up');
  });
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('.row-actions')) closeAllRowMenus();
});

returnsTbody.addEventListener('click', async (event) => {
  const toggleBtn = event.target.closest('button[data-action="toggle-menu"]');
  if (toggleBtn) {
    event.stopPropagation();
    const menu = toggleBtn.nextElementSibling;
    const wasHidden = menu.hidden;
    closeAllRowMenus();
    if (wasHidden) {
      menu.hidden = false;
      const triggerRect = toggleBtn.getBoundingClientRect();
      const menuHeight = menu.offsetHeight;
      menu.classList.toggle('dropdown-open-up', triggerRect.bottom + menuHeight > window.innerHeight);
    }
    return;
  }

  closeAllRowMenus();

  const viewBtn = event.target.closest('button[data-action="view"]');
  if (viewBtn) {
    openDetailModal(viewBtn.dataset.id, viewBtn.dataset.type);
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
    return;
  }

  const deleteBtn = event.target.closest('button[data-action="delete"]');
  if (deleteBtn) {
    if (!confirm('Xóa phiếu nháp này? Phiếu chưa trừ kho nên không ảnh hưởng tồn kho/công nợ.')) return;
    deleteBtn.disabled = true;
    returnsErrorBox.hidden = true;
    try {
      await apiFetch(`${apiPrefixFor(deleteBtn.dataset.type)}/${deleteBtn.dataset.id}`, { method: 'DELETE' });
      await loadReturns();
    } catch (err) {
      renderReturnsError(err.message);
      deleteBtn.disabled = false;
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

// ----- Nut "+ Lap phieu tra hang" (dropdown 2 lua chon, dieu huong sang trang rieng) -----

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
  window.location.href = 'stock-return-form.html';
});
btnChooseSupplierReturn.addEventListener('click', () => {
  window.location.href = 'supplier-return-form.html';
});

(async function init() {
  const currentUser = await initLayout('stock-returns');
  if (!currentUser) return;

  btnAddReturn.innerHTML = `${icon('plus', 16)} Lập phiếu trả hàng ${icon('chevronDown', 14)}`;
  btnChooseCustomerReturn.innerHTML = `${icon('arrowDownTray', 16)} Trả hàng xuất (khách hàng)`;
  btnChooseSupplierReturn.innerHTML = `${icon('truck', 16)} Trả hàng nhà cung cấp`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await loadReturns();
})();
