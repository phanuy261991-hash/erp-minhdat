// Logic Trang chu ban mobile - loi chao dong (doi xung dashboard.js ban desktop, viet lai gon
// rieng cho mobile thay vi tach dung chung - xem docs/DECISIONS.md ly do khong tach logic tu
// 44 file JS desktop dang chay that) + 3 the so lieu + the "Sinh nhat trong thang".

const WEEKDAY_LABELS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

function formatVietnameseDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${WEEKDAY_LABELS[date.getDay()]}, ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function timeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'buổi sáng';
  if (hour < 18) return 'buổi chiều';
  return 'buổi tối';
}

function formatDateVN(value) {
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

async function loadStats() {
  const [{ products }, { partners: customers }, { partners: suppliers }] = await Promise.all([
    apiFetch('/products'),
    apiFetch('/partners?type=khach_hang'),
    apiFetch('/partners?type=nha_cung_cap'),
  ]);
  document.getElementById('m-stat-products').textContent = products.length;
  document.getElementById('m-stat-customers').textContent = customers.length;
  document.getElementById('m-stat-suppliers').textContent = suppliers.length;
}

// The "Sinh nhat trong thang" - dung Hang thong tin kieu Settings (#9), badge do khi con <=3
// ngay (dung y ngu nghia voi .birthday-row--soon ben desktop). Route mo cho MOI tai khoan.
async function loadBirthdaySection() {
  const section = document.getElementById('m-birthday-section');
  try {
    const { contacts } = await apiFetch('/contacts/birthdays-this-month');
    if (contacts.length === 0) {
      section.innerHTML = '';
      return;
    }

    const rows = contacts
      .map((c) => {
        const countdownText = c.days_until === 0 ? 'Hôm nay' : `Còn ${c.days_until} ngày`;
        const badgeClass = c.is_soon ? 'm-badge--destructive' : 'm-badge--muted';
        return `
          <div class="m-info-row">
            <span class="m-info-row-label">${c.full_name} <span style="color:var(--color-muted-foreground);">(${formatDateVN(c.date_of_birth)})</span></span>
            <span class="m-badge ${badgeClass}">${countdownText}</span>
          </div>
        `;
      })
      .join('');

    section.innerHTML = `
      <h2 class="m-section-title">Sinh nhật trong tháng</h2>
      <div class="m-info-group">${rows}</div>
    `;
  } catch (err) {
    // Khong chan trang Trang chu chi vi widget nay loi - im lang bo qua.
    section.innerHTML = '';
  }
}

(async function init() {
  const user = await initMobileLayout({ title: 'Trang chủ', activeTab: 'home' });
  if (!user) return;

  document.getElementById('m-greeting').textContent = `Xin chào ${timeOfDayGreeting()}, ${user.full_name}!`;
  document.getElementById('m-date').textContent = formatVietnameseDate(new Date());

  document.getElementById('m-tile-products').addEventListener('click', () => {
    window.location.href = 'coming-soon.html?section=kho';
  });
  document.getElementById('m-tile-customers').addEventListener('click', () => {
    window.location.href = 'coming-soon.html?section=khach-hang';
  });
  document.getElementById('m-tile-suppliers').addEventListener('click', () => {
    window.location.href = 'coming-soon.html?section=khach-hang';
  });

  await Promise.all([loadStats(), loadBirthdaySection()]);

  initPullToRefresh(document.getElementById('m-content'), async () => {
    await Promise.all([loadStats(), loadBirthdaySection()]);
  });
})();
