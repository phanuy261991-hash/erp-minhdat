// Trang "Thong tin phan mem" (2026-08-01) - noi dung tinh (khong goi API), chi can initLayout
// de render sidebar + kiem tra dang nhap. Muc menu nay mo cho moi tai khoan da dang nhap
// (module: null trong layout.js), khong gioi han theo quyen vi chi la thong tin, khong nhay cam.

(async function init() {
  const currentUser = await initLayout('about');
  if (!currentUser) return;

  document.getElementById('about-icon').innerHTML = icon('box', 32);
})();
