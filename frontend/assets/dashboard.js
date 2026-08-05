// Logic trang Tong quan (dashboard.html) - thiet ke lai sinh dong hon (2026-08-01, dung skill
// ui-ux-pro-max): loi chao dong theo gio he thong + ho ten tai khoan, icon mat troi/mat trang
// doi mau theo khung gio, 3 the so lieu dang "bento" (bam duoc, dieu huong sang danh sach
// tuong ung) lay tu API danh sach da co san, va khu vuc "Truy cap nhanh" loc theo quyen
// module cua tai khoan dang dang nhap (giong cach loc NAV_GROUPS trong layout.js).

const errorBox = document.getElementById('dashboard-error');
const errorText = document.getElementById('dashboard-error-text');

function renderError(message) {
  errorText.textContent = message;
  errorBox.hidden = false;
}

const WEEKDAY_LABELS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

function formatVietnameseDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${WEEKDAY_LABELS[date.getDay()]}, ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

// Loi chao theo khung gio HE THONG (may chu, khong phai gio trinh duyet) - 3 khung thay vi 2
// (sang/chieu) nguoi dung neu ban dau, vi "Buoi chieu" luc 9 gio toi la vo ly - bo sung "buoi
// toi" cho hop ly, van dung tinh than "tuy vao thoi gian he thong" nguoi dung yeu cau.
function timeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return { label: 'buổi sáng', icon: 'sun' };
  if (hour < 18) return { label: 'buổi chiều', icon: 'sun' };
  return { label: 'buổi tối', icon: 'moon' };
}

// Khu vuc "Truy cap nhanh" - loc theo dung quyen module cua tai khoan dang dang nhap (giong
// NAV_GROUPS trong layout.js), tranh dua link toi trang tai khoan khong duoc vao.
const QUICK_LINKS = [
  { label: 'Nhập kho', href: 'stock-receipts.html', icon: 'arrowDownTray', module: 'kho' },
  { label: 'Xuất kho', href: 'stock-issues.html', icon: 'arrowUpTray', module: 'kho' },
  { label: 'Bảo hành', href: 'warranties.html', icon: 'shield', module: 'cong_no' },
  { label: 'Báo cáo', href: 'reports.html', icon: 'chartBar', module: 'bao_cao' },
];

function renderQuickLinks(permissions) {
  const container = document.getElementById('quick-links');
  const items = QUICK_LINKS.filter((item) => permissions.includes(item.module));

  if (items.length === 0) {
    container.hidden = true;
    document.querySelector('h3.section-heading').hidden = true;
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
        <a href="${item.href}" class="quick-link">
          <span class="quick-link-icon">${icon(item.icon, 18)}</span>
          ${item.label}
        </a>
      `
    )
    .join('');
}

function formatDateVN(value) {
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

// The "Sinh nhat trong thang" - danh sach doi tac (contacts.html) co ngay sinh trong THANG HIEN
// TAI, do mau khi con <=3 ngay nua den sinh nhat (theo dung yeu cau nguoi dung, doc lap voi so
// ngay nhac lich co the cau hinh o notification-settings.html). Dung route rieng mo cho MOI tai
// khoan (khong doi quyen module 'doi_tac') vi day la widget chung o Tong quan.
async function loadBirthdayCard() {
  try {
    const { contacts } = await apiFetch('/contacts/birthdays-this-month');
    const heading = document.getElementById('birthday-heading');
    const card = document.getElementById('birthday-card');
    const listEl = document.getElementById('birthday-list');

    if (contacts.length === 0) {
      heading.hidden = true;
      card.hidden = true;
      return;
    }

    heading.hidden = false;
    card.hidden = false;
    listEl.innerHTML = contacts
      .map((c) => {
        const soonClass = c.is_soon ? ' birthday-row--soon' : '';
        const countdownText = c.days_until === 0 ? 'Hôm nay' : `Còn ${c.days_until} ngày`;
        return `
          <div class="birthday-row${soonClass}">
            <p class="birthday-row-name">
              <span class="birthday-row-name-text">${c.full_name}</span>
              <span class="birthday-row-date">${formatDateVN(c.date_of_birth)}</span>
            </p>
            <span class="birthday-row-countdown">${countdownText}</span>
          </div>
        `;
      })
      .join('');
  } catch (err) {
    // Khong chan trang Tong quan chi vi widget nay loi (vd tai khoan chua co quyen lien quan) -
    // im lang bo qua, cac card so lieu khac van hoat dong binh thuong.
  }
}

(async function init() {
  const currentUser = await initLayout('dashboard');
  if (!currentUser) return;

  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  const { label, icon: heroIcon } = timeOfDay();
  document.getElementById('dashboard-greeting').textContent = `Xin chào ${label}, ${currentUser.full_name}!`;
  document.getElementById('dashboard-date').textContent = formatVietnameseDate(new Date());
  document.getElementById('dashboard-hero-icon').innerHTML = icon(heroIcon, 26);

  document.getElementById('card-icon-products').innerHTML = icon('package', 22);
  document.getElementById('card-icon-customers').innerHTML = icon('users', 22);
  document.getElementById('card-icon-suppliers').innerHTML = icon('truck', 22);
  ['card-link-icon-1', 'card-link-icon-2', 'card-link-icon-3'].forEach((id) => {
    document.getElementById(id).innerHTML = icon('arrowRight', 14);
  });

  renderQuickLinks(currentUser.permissions);

  try {
    const [{ products }, { partners: customers }, { partners: suppliers }] = await Promise.all([
      apiFetch('/products'),
      apiFetch('/partners?type=khach_hang'),
      apiFetch('/partners?type=nha_cung_cap'),
    ]);

    document.getElementById('stat-products').textContent = products.length;
    document.getElementById('stat-customers').textContent = customers.length;
    document.getElementById('stat-suppliers').textContent = suppliers.length;
  } catch (err) {
    renderError(err.message);
  }

  await loadBirthdayCard();
})();
