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
      { key: 'stock-returns', label: 'Trả hàng', href: 'stock-returns.html', icon: 'undo', module: 'kho', enabled: true },
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
    // Module "Quan ly du an" (2026-08-04) - so cai cong no VAN thuoc khach hang, du an chi doc
    // lai (xem docs/DECISIONS.md). Dat sau "Khach hang", truoc "Quy" (theo dung thu tu da chot).
    label: 'Dự án',
    items: [
      { key: 'projects', label: 'Dự án', href: 'projects.html', icon: 'briefcase', module: 'du_an', enabled: true },
    ],
  },
  {
    // Module "Doi tac" (2026-08-05) - danh ba lien he ca nhan, HOAN TOAN TACH BIET voi
    // "Nha cung cap"/"Khach hang" (partners, gan kho/cong no) - theo yeu cau nguoi dung.
    label: 'Đối tác',
    items: [
      { key: 'contacts', label: 'Đối tác', href: 'contacts.html', icon: 'contact', module: 'doi_tac', enabled: true },
    ],
  },
  {
    // Module "So quy" (2026-08-02) - doc lap hoan toan voi Cong no, khong ghi debt_ledger
    // (xem docs/DECISIONS.md). Dat rieng nhom, sau "Khach hang" truoc "Quan tri".
    label: 'Quỹ',
    items: [
      { key: 'cash-book', label: 'Sổ quỹ', href: 'cash-book.html', icon: 'wallet', module: 'so_quy', enabled: true },
      { key: 'cash-categories', label: 'Loại thu chi', href: 'cash-categories.html', icon: 'tag', module: 'so_quy', enabled: true },
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
      { key: 'notification-settings', label: 'Cấu hình thông báo', href: 'notification-settings.html', icon: 'bell', module: 'cau_hinh', enabled: true },
      { key: 'print-templates', label: 'Mẫu in', href: 'print-templates.html', icon: 'printer', module: 'cau_hinh', enabled: true },
      { key: 'customer-categories', label: 'Loại khách hàng', href: 'customer-categories.html', icon: 'tag', module: 'cau_hinh', enabled: true },
      { key: 'project-phase-templates', label: 'Giai đoạn mẫu', href: 'project-phase-templates.html', icon: 'ledger', module: 'cau_hinh', enabled: true },
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
        <img src="assets/images/nexa-one-icon.png" alt="NEXA One" class="sidebar-brand-icon" />
        <img src="assets/images/nexa-one-wordmark.png" alt="" class="label sidebar-brand-wordmark" />
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

// ----- Chuong thong bao (migration 027) - noi FIXED goc tren-phai, doc lap voi sidebar, chay
// tren MOI trang da goi initLayout() (khong can them script/the rieng vao tung file HTML). -----
// "Realtime" o day la GIA LAP bang polling dinh ky (khong co ha tang WebSocket/push that -
// dung quyet dinh da chot 2026-08-05: khong dung WebSocket, phu hop app LAN <20 nguoi dung).
// Moi lan poll goi GET /notifications (lay ca danh sach, khong chi so dem) de vua cap nhat badge
// vua phat hien dong MOI (id lon hon lan poll truoc) va tu dong hien popup toast cho dong do.

const NOTIFICATION_POLL_MS = 20000;
const NOTIFICATION_TOAST_DURATION_MS = 4000;
const NOTIFICATION_ICON_BY_TYPE = { supplier_payment: 'truck', customer_payment: 'users', birthday: 'cake' };

// null = chua poll lan nao - lan poll DAU TIEN sau khi tai trang chi thiet lap moc, KHONG toast
// hang loat thong bao cu da co san tu truoc (tranh spam popup moi lan mo lai trinh duyet).
let lastSeenNotificationId = null;

function notificationLink(n) {
  if (n.type === 'supplier_payment') return 'debts.html';
  if (n.type === 'customer_payment') return 'customer-debts.html';
  if (n.type === 'birthday' && n.reference_id) return `contact-detail.html?id=${n.reference_id}`;
  return null;
}

function formatNotificationTime(sqliteDateTime) {
  const d = new Date(sqliteDateTime.replace(' ', 'T') + 'Z');
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderNotificationBadge(count) {
  const badge = document.getElementById('notification-badge');
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

function ensureToastStack() {
  let stack = document.getElementById('toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toast-stack';
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  return stack;
}

// Popup hinh chu nhat goc duoi-phai man hinh, tu an sau 4 giay (NOTIFICATION_TOAST_DURATION_MS) -
// bam vao dieu huong toi trang lien quan giong item trong chuong (dung chung notificationLink()).
function showNotificationToast(n) {
  const stack = ensureToastStack();
  const href = notificationLink(n);

  const toastEl = document.createElement('div');
  toastEl.className = 'toast-item';
  if (href) toastEl.classList.add('toast-item--clickable');
  toastEl.innerHTML = `
    <span class="toast-item-icon">${icon(NOTIFICATION_ICON_BY_TYPE[n.type] || 'bell', 16)}</span>
    <div class="toast-item-body">
      <p class="toast-item-title">${n.title}</p>
      <p class="toast-item-message">${n.message || ''}</p>
    </div>
  `;
  if (href) {
    toastEl.addEventListener('click', () => {
      window.location.href = href;
    });
  }
  stack.appendChild(toastEl);

  setTimeout(() => {
    toastEl.classList.add('toast-item--leaving');
    toastEl.addEventListener('animationend', () => toastEl.remove(), { once: true });
  }, NOTIFICATION_TOAST_DURATION_MS);
}

async function pollNotifications() {
  try {
    const { notifications } = await apiFetch('/notifications');
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    renderNotificationBadge(unreadCount);

    if (lastSeenNotificationId === null) {
      lastSeenNotificationId = notifications.reduce((max, n) => Math.max(max, n.id), 0);
      return;
    }

    const freshOnes = notifications.filter((n) => n.id > lastSeenNotificationId).sort((a, b) => a.id - b.id);
    freshOnes.forEach(showNotificationToast);
    if (notifications.length > 0) {
      lastSeenNotificationId = notifications.reduce((max, n) => Math.max(max, n.id), lastSeenNotificationId);
    }
  } catch (err) {
    // Bo qua loi polling ngam - khong lam gian doan trai nghiem trang chinh.
  }
}

async function loadNotificationList() {
  const listEl = document.getElementById('notification-list');
  try {
    const { notifications } = await apiFetch('/notifications');
    if (notifications.length === 0) {
      listEl.innerHTML = '<p class="notification-empty">Chưa có thông báo nào.</p>';
      return;
    }
    listEl.innerHTML = notifications
      .map((n) => {
        const href = notificationLink(n);
        const tag = href ? 'a' : 'div';
        const hrefAttr = href ? `href="${href}"` : '';
        return `
          <${tag} ${hrefAttr} class="notification-item${n.is_read ? '' : ' notification-item--unread'}" data-id="${n.id}">
            <span class="notification-item-icon">${icon(NOTIFICATION_ICON_BY_TYPE[n.type] || 'bell', 16)}</span>
            <div class="notification-item-body">
              <p class="notification-item-title">${n.title}</p>
              <p class="notification-item-message">${n.message || ''}</p>
              <p class="notification-item-time">${formatNotificationTime(n.created_at)}</p>
            </div>
          </${tag}>
        `;
      })
      .join('');
  } catch (err) {
    listEl.innerHTML = `<p class="notification-empty">${err.message}</p>`;
  }
}

function renderNotificationBell() {
  const wrap = document.createElement('div');
  wrap.className = 'notification-bell-wrap';
  wrap.id = 'notification-bell-wrap';
  wrap.innerHTML = `
    <button type="button" id="notification-bell-btn" class="notification-bell-btn" aria-label="Thông báo">
      ${icon('bell', 20)}
      <span id="notification-badge" class="notification-badge" hidden></span>
    </button>
    <div id="notification-panel" class="notification-panel" hidden>
      <div class="notification-panel-header">
        <h4>Thông báo</h4>
        <button type="button" id="notification-mark-all" class="notification-mark-all">Đánh dấu tất cả đã đọc</button>
      </div>
      <div id="notification-list" class="notification-list"></div>
    </div>
  `;
  document.body.appendChild(wrap);

  const bellBtn = document.getElementById('notification-bell-btn');
  const panel = document.getElementById('notification-panel');

  bellBtn.addEventListener('click', async () => {
    const opening = panel.hidden;
    panel.hidden = !opening;
    if (opening) {
      await loadNotificationList();
    }
  });

  document.addEventListener('click', (event) => {
    if (!wrap.contains(event.target)) {
      panel.hidden = true;
    }
  });

  document.getElementById('notification-list').addEventListener('click', async (event) => {
    const item = event.target.closest('.notification-item[data-id]');
    if (!item) return;
    const id = item.dataset.id;
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'POST' });
      item.classList.remove('notification-item--unread');
      pollNotifications();
    } catch (err) {
      // Bo qua - khong chan viec dieu huong (neu co href) chi vi loi danh dau da doc.
    }
  });

  document.getElementById('notification-mark-all').addEventListener('click', async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      await loadNotificationList();
      pollNotifications();
    } catch (err) {
      // Bo qua loi - nguoi dung co the bam lai.
    }
  });

  pollNotifications();
  setInterval(pollNotifications, NOTIFICATION_POLL_MS);
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
  // Dang mo tren dien thoai/tablet nho (2026-08-06, Giao dien di dong) - chuyen sang ban mobile.
  // Dot 1 chi co Trang chu + Dang nhap ben /m/, nen moi trang desktop deu ve chung 1 diem vao
  // (m/index.html) thay vi co gang anh xa dung trang tuong ung (se lam khi Dot 2/3 co du trang
  // mobile). m/index.html/m-layout.js tu kiem tra lai session, khong can lo mat dang nhap o day.
  if (isMobileDevice()) {
    window.location.href = 'm/index.html';
    return null;
  }

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
  renderNotificationBell();
  return user;
}
