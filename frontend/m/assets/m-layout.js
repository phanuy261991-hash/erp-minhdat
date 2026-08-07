// Khung dieu huong cho Giao dien di dong: App bar (#2) + Thanh tab duoi (#1).
// Nap theo thu tu: api.js -> icons.js -> ../../assets/layout.js (CHI de lay NAV_GROUPS/icon(),
// KHONG goi initLayout() nen khong dung DOM/CSS desktop nao) -> m-ui.js -> m-layout.js -> script
// rieng cua trang, roi trang tu goi initMobileLayout({...}).
//
// Tai sao load lai layout.js (desktop) o day: NAV_GROUPS la nguon DUY NHAT khai bao module_key
// cho tung nhom menu (Kho/Khach hang/Du an...) - doc lai tu day thay vi hardcode 1 danh sach
// rieng cho mobile, de neu sau nay desktop doi module_key cua 1 nhom thi tab mobile tu dong
// dung theo, khong bi lech ma khong ai nho sua 2 cho.

function _mTabModule(groupLabel) {
  const group = NAV_GROUPS.find((g) => g.label === groupLabel);
  return group && group.items.length ? group.items[0].module : null;
}

function _mTabItems() {
  return [
    { key: 'home', label: 'Trang chủ', icon: 'dashboard', href: 'index.html', module: null },
    { key: 'kho', label: 'Kho', icon: 'package', href: 'coming-soon.html?section=kho', module: _mTabModule('Kho') },
    { key: 'khach-hang', label: 'Khách hàng', icon: 'users', href: 'coming-soon.html?section=khach-hang', module: _mTabModule('Khách hàng') },
    { key: 'du-an', label: 'Dự án', icon: 'briefcase', href: 'coming-soon.html?section=du-an', module: _mTabModule('Dự án') },
    { key: 'more', label: 'Thêm', icon: 'moreHorizontal', href: null, module: null },
  ];
}

// ----- App bar -----

// Quay lai: neu referrer cung la 1 trang trong /m/ (dieu huong tu ben trong app) thi dung
// history.back() de giu dung ngu canh; neu vao thang qua URL/deep-link (khong co referrer hop
// le) thi ve dung trang goc duoc chi dinh (fallbackHref) thay vi doan mo lung tung.
function goBackMobile(fallbackHref) {
  const cameFromApp = document.referrer && document.referrer.indexOf(`${window.location.origin}/m/`) === 0;
  if (cameFromApp && window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = fallbackHref || 'index.html';
  }
}

function _renderAppBar({ title, showBack, backHref }) {
  const appbar = document.getElementById('m-appbar');
  if (!appbar) return;

  appbar.innerHTML = `
    ${showBack
      ? '<button type="button" class="m-appbar-back" id="m-appbar-back" aria-label="Quay lại"></button>'
      : '<span class="m-appbar-spacer"></span>'}
    <h1 class="m-appbar-title">${title || ''}</h1>
    <button type="button" class="m-appbar-action m-appbar-bell" id="m-appbar-bell" aria-label="Thông báo">
      <span id="m-appbar-bell-icon"></span>
      <span class="m-appbar-bell-badge" id="m-appbar-bell-badge" hidden></span>
    </button>
  `;

  document.getElementById('m-appbar-bell-icon').innerHTML = icon('bell', 20);
  document.getElementById('m-appbar-bell').addEventListener('click', openNotificationsSheet);

  if (showBack) {
    const backBtn = document.getElementById('m-appbar-back');
    backBtn.innerHTML = icon('arrowLeft', 22);
    backBtn.addEventListener('click', () => goBackMobile(backHref));
  }
}

// ----- Thanh tab duoi -----

function _renderTabBar(activeKey, permissions) {
  const tabbar = document.getElementById('m-tabbar');
  if (!tabbar) return;

  const items = _mTabItems().filter((item) => item.module === null || permissions.includes(item.module));

  tabbar.innerHTML = items
    .map((item) => {
      const activeClass = item.key === activeKey ? ' active' : '';
      return `
        <button type="button" class="m-tab${activeClass}" data-tab-key="${item.key}">
          ${icon(item.icon, 22)}
          <span class="m-tab-label">${item.label}</span>
        </button>
      `;
    })
    .join('');

  tabbar.querySelectorAll('.m-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = items.find((i) => i.key === btn.dataset.tabKey);
      if (item.key === 'more') {
        openMoreSheet();
      } else if (item.key !== activeKey) {
        window.location.href = item.href;
      }
    });
  });
}

// ----- Sheet "Thêm" (mo tu tab cuoi cung) -----

function openMoreSheet() {
  openBottomSheet({
    title: 'Thêm',
    bodyHtml: `
      <button type="button" class="m-sheet-menu-item" id="m-more-desktop">
        <span class="m-sheet-menu-item-icon">${icon('monitor', 18)}</span>
        Dùng bản máy tính
      </button>
      <button type="button" class="m-sheet-menu-item m-sheet-menu-item--destructive" id="m-more-logout">
        <span class="m-sheet-menu-item-icon">${icon('logout', 18)}</span>
        Đăng xuất
      </button>
    `,
  });

  document.getElementById('m-more-desktop').addEventListener('click', () => {
    // Co "thoat" luon luon co - dat co localStorage de layout.js (desktop) khong tu chuyen
    // huong nguoc lai vao /m/ ngay lan sau (xem initLayout() da sua trong layout.js).
    localStorage.setItem('erp_force_desktop', 'true');
    window.location.href = '../dashboard.html';
  });

  document.getElementById('m-more-logout').addEventListener('click', async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (err) {
      // Bo qua loi logout API - van dieu huong ve trang dang nhap.
    }
    window.location.href = 'login.html';
  });
}

// ----- Chuong thong bao: badge dem chua doc (polling 20s, dung chung chu ky voi layout.js
// desktop) + sheet liet ke, danh dau da doc tung dong. Khong lam popup toast rieng o Dot 1
// (pham vi PRD 4.16 chi yeu cau "Thong bao" o muc Chung, chua yeu cau realtime toast mobile). -----

const M_NOTIF_ICON_BY_TYPE = { supplier_payment: 'truck', customer_payment: 'users', birthday: 'cake' };
const M_NOTIF_POLL_MS = 20000;

async function _refreshNotifBadge() {
  try {
    const { notifications } = await apiFetch('/notifications');
    const unread = notifications.filter((n) => !n.is_read).length;
    const badge = document.getElementById('m-appbar-bell-badge');
    if (!badge) return;
    if (unread > 0) {
      badge.textContent = unread > 99 ? '99+' : String(unread);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  } catch (err) {
    // Bo qua loi polling ngam - khong lam gian doan trai nghiem trang chinh.
  }
}

async function openNotificationsSheet() {
  openBottomSheet({ title: 'Thông báo', bodyHtml: skeletonListHtml(4) });

  try {
    const { notifications } = await apiFetch('/notifications');
    const bodyEl = document.getElementById('m-sheet-body');

    if (notifications.length === 0) {
      bodyEl.innerHTML = '<div class="m-empty-state">Chưa có thông báo nào.</div>';
      return;
    }

    bodyEl.innerHTML = notifications
      .map(
        (n) => `
          <button type="button" class="m-sheet-menu-item" data-notif-id="${n.id}" style="opacity:${n.is_read ? '0.55' : '1'}">
            <span class="m-sheet-menu-item-icon">${icon(M_NOTIF_ICON_BY_TYPE[n.type] || 'bell', 18)}</span>
            <span style="flex:1; min-width:0;">
              <span style="display:block; font-weight:600;">${n.title}</span>
              <span style="display:block; font-size:13px; color:var(--color-muted-foreground);">${n.message || ''}</span>
            </span>
          </button>
        `
      )
      .join('');

    bodyEl.querySelectorAll('[data-notif-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await apiFetch(`/notifications/${btn.dataset.notifId}/read`, { method: 'POST' });
          btn.style.opacity = '0.55';
          _refreshNotifBadge();
        } catch (err) {
          // Bo qua - nguoi dung co the bam lai.
        }
      });
    });
  } catch (err) {
    document.getElementById('m-sheet-body').innerHTML = `<div class="m-empty-state">${err.message}</div>`;
  }
}

// ----- Diem vao chinh: goi o dau moi trang mobile can dang nhap. -----
// options: { title, showBack, backHref, activeTab } - activeTab null/undefined = an tab bar
// (danh cho man con sau nay, Dot 2-3). Tra ve Promise<user> giong initLayout() ben desktop.
async function initMobileLayout(options) {
  options = options || {};
  let user;
  try {
    const data = await apiFetch('/auth/me');
    user = data.user;
  } catch (err) {
    window.location.href = 'login.html';
    return null;
  }

  _renderAppBar({ title: options.title, showBack: !!options.showBack, backHref: options.backHref });

  if (options.activeTab) {
    _renderTabBar(options.activeTab, user.permissions);
  }

  _refreshNotifBadge();
  setInterval(_refreshNotifBadge, M_NOTIF_POLL_MS);

  return user;
}
