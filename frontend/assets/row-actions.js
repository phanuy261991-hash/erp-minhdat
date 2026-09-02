// Tien ich dung chung cho menu "..." gom hanh dong trong 1 dong bang (.data-table) - xem pattern
// đầy đủ ở docs/DESIGN-SYSTEM.md mục "Bảng dữ liệu". Trích xuất từ logic đã viết tay ở
// stock-issues.js/stock-returns.js (2026-09-02) vì cùng logic định vị + đóng/mở được lặp lại ở
// nhiều trang cùng ngày (áp dụng đồng bộ toàn app theo yêu cầu người dùng) - tránh copy 16 lần.
//
// Cach dung trong tung trang (xem stock-issues.js lam mau, giu nguyen khong doi):
//   1. Trong ham render dong, bọc cac nut hanh dong trong:
//      <div class="action-dropdown row-actions">
//        <button type="button" class="icon-btn" data-action="toggle-menu" title="Thao tác">${icon('moreHorizontal', 16)}</button>
//        <div class="action-dropdown-menu row-actions-menu" hidden>...cac .action-dropdown-item...</div>
//      </div>
//   2. Trong click handler cua tbody (dat O DAU, truoc khi xu ly cac action khac):
//      if (action === 'toggle-menu') {
//        event.stopPropagation();
//        toggleRowActionsMenu(button, tbody);
//        return;
//      }
//      closeAllRowActionMenus(tbody);
//   3. Ngay sau khi khai bao tbody, dang ky dong menu khi click ra ngoai:
//      document.addEventListener('click', (event) => {
//        if (!event.target.closest('.row-actions')) closeAllRowActionMenus(tbody);
//      });

// Dong toan bo menu dang mo trong 1 tbody - goi truoc khi mo 1 menu khac, khi click ra ngoai,
// hoac truoc khi xu ly bat ky hanh dong nao khac (Sua/Xoa/Xem...) de menu tu dong bien mat.
function closeAllRowActionMenus(tbody) {
  tbody.querySelectorAll('.row-actions-menu').forEach((menu) => {
    menu.hidden = true;
    menu.classList.remove('dropdown-open-up');
  });
}

// Mo/dong menu gan voi 1 nut kich hoat "..." cu the - tu dong dinh vi mo len tren (class
// .dropdown-open-up, xem style.css) neu mo xuong duoi se tran khoi vung nhin thay (hang gan cuoi
// bang, do .data-table-wrap co overflow-y:auto ngam dinh).
function toggleRowActionsMenu(triggerButton, tbody) {
  const menu = triggerButton.nextElementSibling;
  const wasHidden = menu.hidden;
  closeAllRowActionMenus(tbody);
  if (wasHidden) {
    menu.hidden = false;
    const triggerRect = triggerButton.getBoundingClientRect();
    const menuHeight = menu.offsetHeight;
    menu.classList.toggle('dropdown-open-up', triggerRect.bottom + menuHeight > window.innerHeight);
  }
}
