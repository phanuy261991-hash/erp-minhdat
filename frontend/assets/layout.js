// Khung dieu huong dung chung cho moi trang sau khi dang nhap (sidebar + thong tin user).
// Moi trang goi initLayout('key-cua-trang') sau khi da nap api.js + icons.js + layout.js.
// Sidebar duoc dung 1 lan o day va nhung vao #sidebar cua tung trang - tranh lap code HTML
// khi them trang moi (khong co build step/framework nen day la cach tranh trung lap don gian nhat).

// enabled:false = trang chua duoc xay dung o phase hien tai - de san cau hinh (icon, module) de
// phase sau chi can doi thanh true la muc menu tu dong xuat hien, khong can sua lai cho nay.
// module: null = hien voi moi tai khoan da dang nhap, khong can quyen rieng (vd Tong quan).
// module: '<module_key>' = chi hien khi user.permissions (tra ve tu GET /api/auth/me) co module do
// (danh sach module_key hop le: backend/config/modules.js).
const NAV_GROUPS = [
  {
    label: 'Chung',
    items: [
      { key: 'dashboard', label: 'Tổng quan', href: 'dashboard.html', icon: 'dashboard', module: null, enabled: true },
    ],
  },
  {
    label: 'Kho',
    items: [
      { key: 'products', label: 'Sản phẩm', href: 'products.html', icon: 'package', module: 'kho', enabled: true },
      { key: 'stock-receipts', label: 'Nhập kho', href: 'stock-receipts.html', icon: 'arrowDownTray', module: 'kho', enabled: true },
      { key: 'stock-issues', label: 'Xuất kho', href: 'stock-issues.html', icon: 'arrowUpTray', module: 'kho', enabled: true },
    ],
  },
  {
    // Truoc day la "Cong no", gop chung NCC+KH - tach rieng theo yeu cau nguoi dung 2026-08-01,
    // nhom nay tu day chi con Nha cung cap, Khach hang chuyen sang nhom rieng ben duoi.
    label: 'Nhà cung cấp',
    items: [
      { key: 'partners', label: 'Nhà cung cấp', href: 'partners.html', icon: 'truck', module: 'cong_no', enabled: true },
      { key: 'debts', label: 'Công nợ NCC', href: 'debts.html', icon: 'ledger', module: 'cong_no', enabled: true },
    ],
  },
  {
    label: 'Khách hàng',
    items: [
      { key: 'customers', label: 'Khách hàng', href: 'customers.html', icon: 'users', module: 'cong_no', enabled: true },
      { key: 'customer-debts', label: 'Công nợ khách hàng', href: 'customer-debts.html', icon: 'ledger', module: 'cong_no', enabled: true },
      { key: 'warranties', label: 'Bảo hành', href: 'warranties.html', icon: 'shield', module: 'cong_no', enabled: true },
    ],
  },
  {
    label: 'Quản trị',
    items: [
      { key: 'reports', label: 'Báo cáo', href: 'reports.html', icon: 'chartBar', module: 'bao_cao', enabled: true },
      { key: 'users', label: 'Người dùng', href: 'users.html', icon: 'userCog', module: 'nguoi_dung', enabled: true },
      { key: 'roles', label: 'Vai trò', href: 'roles.html', icon: 'shieldCheck', module: 'nguoi_dung', enabled: true },
    ],
  },
  {
    label: 'Cấu hình',
    items: [
      { key: 'company-settings', label: 'Thông tin công ty', href: 'company-settings.html', icon: 'building', module: 'cau_hinh', enabled: true },
      { key: 'warehouse-settings', label: 'Cấu hình kho', href: 'warehouse-settings.html', icon: 'sliders', module: 'cau_hinh', enabled: true },
      { key: 'customer-categories', label: 'Loại khách hàng', href: 'customer-categories.html', icon: 'tag', module: 'cau_hinh', enabled: true },
      { key: 'sales-settings', label: 'Cấu hình bán hàng', href: 'sales-settings.html', icon: 'cart', module: 'cau_hinh', enabled: true },
      { key: 'about', label: 'Thông tin phần mềm', href: 'about.html', icon: 'info', module: null, enabled: true },
    ],
  },
];

const COLLAPSE_STORAGE_KEY = 'erp_sidebar_collapsed';

function initials(fullName) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function buildNavHtml(activeKey, permissions) {
  return NAV_GROUPS.map((group) => {
    const items = group.items.filter((item) => item.enabled && (!item.module || permissions.includes(item.module)));
    if (items.length === 0) return '';

    const itemsHtml = items
      .map((item) => {
        const activeClass = item.key === activeKey ? ' active' : '';
        return `<a href="${item.href}" class="nav-item${activeClass}">${icon(item.icon)}<span class="label">${item.label}</span></a>`;
      })
      .join('');

    return `<div class="nav-group-label label">${group.label}</div>${itemsHtml}`;
  }).join('');
}

function renderSidebar(user, activeKey) {
  const sidebar = document.getElementById('sidebar');

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-brand">
        ${icon('box', 20)}
        <span class="label">Kho &amp; Công nợ</span>
      </div>
      <button type="button" id="sidebar-toggle" class="sidebar-toggle" aria-label="Thu gọn menu">
        ${icon('sidebarCollapse', 18)}
      </button>
    </div>
    <nav class="sidebar-nav">${buildNavHtml(activeKey, user.permissions)}</nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <span class="sidebar-avatar">${initials(user.full_name)}</span>
        <div class="label sidebar-user-info">
          <p class="sidebar-user-name">${user.full_name}</p>
          <p class="sidebar-user-role">${user.role_name}</p>
        </div>
        <button type="button" id="sidebar-logout" class="sidebar-logout" aria-label="Đăng xuất">${icon('logout', 16)}</button>
      </div>
      <p class="sidebar-copyright label">© 2026 Bản quyền thuộc về Mr Nguyễn Phan Uy</p>
    </div>
  `;

  const toggleButton = document.getElementById('sidebar-toggle');
  const collapsed = localStorage.getItem(COLLAPSE_STORAGE_KEY) === 'true';
  applyCollapsedState(collapsed);

  toggleButton.addEventListener('click', () => {
    const next = !sidebar.classList.contains('collapsed');
    applyCollapsedState(next);
    localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
  });

  document.getElementById('sidebar-logout').addEventListener('click', async () => {
    await apiFetch('/auth/logout', { method: 'POST' });
    window.location.href = 'login.html';
  });
}

function applyCollapsedState(collapsed) {
  const sidebar = document.getElementById('sidebar');
  const toggleIcon = document.getElementById('sidebar-toggle');
  sidebar.classList.toggle('collapsed', collapsed);
  toggleIcon.innerHTML = icon(collapsed ? 'sidebarExpand' : 'sidebarCollapse', 18);
}

function findNavItem(activeKey) {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((i) => i.key === activeKey);
    if (item) return item;
  }
  return null;
}

// Goi o dau moi trang can dang nhap. Neu chua co session hop le se chuyen ve login.html.
// Neu role hien tai khong duoc phep xem trang nay (theo cau hinh NAV_GROUPS), chuyen ve
// dashboard.html thay vi de trang hien khung rong kem loi 403 tu API - du API van chan
// dung, day chi la cai thien trai nghiem, khong thay the kiem tra quyen o backend.
// Tra ve Promise<user> de trang co the dung tiep (vd kiem tra quyen truoc khi hien nut thao tac).
async function initLayout(activeKey) {
  let user;
  try {
    const data = await apiFetch('/auth/me');
    user = data.user;
  } catch (err) {
    window.location.href = 'login.html';
    return null;
  }

  const navItem = findNavItem(activeKey);
  if (navItem && navItem.module && !user.permissions.includes(navItem.module)) {
    window.location.href = 'dashboard.html';
    return null;
  }

  renderSidebar(user, activeKey);
  return user;
}
