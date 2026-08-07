// Man "sap co" dung chung cho cac tab chua co noi dung nghiep vu o Dot 1 (Kho/Khach hang/Du an -
// se thay bang trang that o Dot 2/3). Doc ?section= tu URL de hien dung tieu de + giu dung tab
// dang chon o thanh tab duoi, giup test day du khung app (loc quyen, active state) ma khong
// phai cho tung trang that xong.

const SECTION_INFO = {
  kho: { title: 'Kho', tabKey: 'kho', icon: 'package' },
  'khach-hang': { title: 'Khách hàng', tabKey: 'khach-hang', icon: 'users' },
  'du-an': { title: 'Dự án', tabKey: 'du-an', icon: 'briefcase' },
};

(async function init() {
  const params = new URLSearchParams(window.location.search);
  const section = SECTION_INFO[params.get('section')] || { title: 'NEXA One', tabKey: 'home', icon: 'dashboard' };

  const user = await initMobileLayout({ title: section.title, activeTab: section.tabKey });
  if (!user) return;

  document.getElementById('m-coming-soon-icon').innerHTML = icon(section.icon, 48);
})();
