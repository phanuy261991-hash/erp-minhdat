# Danh sách công việc

> Theo checklist `docs/Plan.md` mục 4. Đánh dấu `[x]` khi hoàn thành, cập nhật `docs/CURRENT.md` và `docs/CHANGELOG.md` kèm theo.

## Phase 0 — Khởi tạo tài liệu (đã xong)

- [x] Viết PRD, Plan, ERD, CLAUDE.md
- [x] Chốt các quyết định nghiệp vụ quan trọng (tồn kho âm, công nợ tự động, sửa/hủy phiếu)
- [x] Thiết lập cấu trúc thư mục dự án + docs quản lý (CURRENT/TASK/CHANGELOG/DECISIONS)

## Phase 1 — Nền tảng (đã xong)

- [x] Khởi tạo project, cài `express`, `better-sqlite3`, `bcrypt`, `express-session`
- [x] Viết `001_init.sql`: bảng `users`, `schema_migrations`
- [x] Viết migration runner (`migrate.js`)
- [x] API đăng nhập + hash password + session middleware
- [x] Middleware `requireRole` (⚠️ đã thay thế bằng `requirePermission` ở Phase 1.6, file `requireRole.js` không còn tồn tại — giữ dòng này làm lịch sử)
- [x] Trang `login.html` (phong cách hiện đại, nhiều màu sắc, tông xanh dương — chỉ tối ưu desktop)
- [x] Seed tài khoản admin mặc định (không hardcode trong code — đọc từ biến môi trường)
- [x] Hướng dẫn chạy demo trên máy (`docs/DEMO.md`)

## Phase 1.5 — Quản trị người dùng & Phân quyền (đã xong)

> Bổ sung 2026-07-31: route `/api/users/*` đã có trong `docs/Plan.md` mục 3 nhưng chưa từng được lên lịch ở phase nào — làm trước Phase 2 để có tài khoản Thủ kho/Kế toán thật khi test phân quyền.

- [x] `backend/routes/users.routes.js`: `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id/deactivate`, `PATCH /api/users/:id/activate` (đều Admin-only)
- [x] Validation: username không trùng, role hợp lệ, không tự khóa chính tài khoản admin đang đăng nhập
- [x] `frontend/users.html`: bảng danh sách người dùng, modal tạo tài khoản, nút khóa/mở — theo `docs/DESIGN-SYSTEM.md`
- [x] Khung điều hướng dùng chung (`frontend/assets/layout.js` + `icons.js`): sidebar chia nhóm, menu hiển thị theo role, thu gọn được (lưu trạng thái), chặn client-side khi vào nhầm trang không đúng quyền (redirect về dashboard, độc lập với chặn 403 ở API)
- [x] `frontend/dashboard.html` — trang chủ sau đăng nhập (thay cho màn hình chào cũ trong login.html)
- [x] Cập nhật `login.html`/`auth.js`: bỏ màn hình chào inline, chuyển hướng sang `dashboard.html` sau khi đăng nhập

## Phase 1.6 — Vai trò động & Cấu hình hệ thống (đã xong)

> Bổ sung 2026-08-01 theo yêu cầu người dùng. Chi tiết: `docs/Plan.md` mục 2b/4 (Phase 1.6), `docs/PRD.md` mục 4.1/4.7/4.8/4.9, `docs/DECISIONS.md`.

- [x] Migration (`002_roles_permissions.sql`): bảng `roles`, `role_permissions`; đổi `users.role` (TEXT) sang `users.role_id` (FK); seed Admin (`is_protected`), Kế toán, Thủ kho kèm quyền module tương ứng hành vi hiện tại — đã verify dữ liệu tài khoản cũ (`admin`, `thukho1`) không mất quyền sau migrate
- [x] Migration (`003_company_warehouse_settings.sql`): bảng `company_settings` (1 dòng, `CHECK id=1`, seed sẵn dòng rỗng), `warehouse_settings` (key-value, seed `allow_negative_stock='0'`)
- [x] Migration (`004_company_settings_extra_fields.sql`, bổ sung ngoài phạm vi ban đầu theo yêu cầu người dùng): thêm `email`/`website`/`bank_branch`; đổi `phone` (1 giá trị) sang `phones` (mảng JSON, nhập được từ 2 số trở lên) — đã migrate dữ liệu cũ tự động
- [x] `backend/middleware/requirePermission.js` (thay cho `requireRole` — đã xóa file cũ), cập nhật `GET /api/auth/me` + login trả thêm `role_id`/`role_name`/`is_protected`/`permissions`
- [x] `backend/routes/roles.routes.js` (CRUD vai trò, chặn sửa/xóa vai trò `is_protected`, chặn xóa vai trò đang có user dùng)
- [x] Sửa `backend/routes/users.routes.js` cho khớp schema mới (`role_id` thay vì `role`, JOIN `roles` để trả `role_name`)
- [x] `backend/routes/companySettings.routes.js`, `backend/routes/warehouseSettings.routes.js` (GET mở cho mọi tài khoản đã đăng nhập, PUT riêng kiểm tra quyền `cau_hinh`)
- [x] Frontend: trang "Vai trò" (`roles.html`/`roles.js` — danh sách, tạo/sửa/xóa, chọn module dạng lưới ô đều nhau), trang "Thông tin công ty" (`company-settings.html`/`company-settings.js` — 2 card song song), trang "Cấu hình kho" (`warehouse-settings.html`/`warehouse-settings.js` — toggle `allow_negative_stock`, nhóm "Cấu hình chung"), mục menu "Cấu hình bán hàng" (`sales-settings.html` — khung trống, empty-state)
- [x] Cập nhật `layout.js`: lọc `NAV_GROUPS` theo `permissions` thay vì `roles` tên cố định (mỗi mục khai báo `module`, `null` = hiện với mọi tài khoản); cập nhật `users.html`/`users.js` dùng `role_id` (dropdown lấy động từ `GET /api/roles` thay vì hardcode 3 giá trị cũ); bật `enabled:true` cho cả 4 trang Phase 1.6
- [x] Test qua API: tạo vai trò mới, gán module, đăng nhập xác nhận đúng `permissions`; sửa quyền vai trò → `/api/auth/me` phản ánh ngay (không cần đăng nhập lại, vì permissions luôn tính lại từ DB); chặn đúng khi sửa/xóa vai trò Admin hoặc vai trò đang có user dùng
- [x] Test qua API: GET/PUT `company-settings`/`warehouse-settings` — admin đọc/ghi được; `thukho1` (chỉ quyền `kho`) đọc được nhưng ghi bị chặn 403; chưa đăng nhập bị chặn 401; key cấu hình kho không hợp lệ bị chặn 400
- [x] Test qua trình duyệt thật (từng trang, cả 2 vai trò `admin`/`thukho1`): `layout.js`/`users.html`/`users.js` — sidebar đúng menu + tên vai trò, dropdown vai trò động, tạo tài khoản `ketoan1` qua UI thành công, `thukho1` bị ẩn menu + chặn URL trực tiếp. `roles.html` — tạo/sửa/xóa vai trò qua UI phản ánh đúng ngay trên bảng. `company-settings.html` — load/lưu đủ 10 trường (gồm nhiều số điện thoại), `thukho1` bị chặn cả menu lẫn URL. `warehouse-settings.html` — bật/tắt toggle lưu đúng qua API, chặn quyền đúng. `sales-settings.html` — hiển thị đúng empty-state, chặn quyền đúng.

## Phase 2 — Kho (đang làm — sản phẩm + nhập kho xong, xuất kho chưa làm)

> Cập nhật 2026-08-01: gộp thêm migration `partners` vào phase này — xem `docs/DECISIONS.md` mục "Gộp bảng `partners` sớm vào migration Phase 2". Chỉ gộp migration, API/frontend quản lý đối tác vẫn ở Phase 3.
> Cập nhật 2026-07-31: mở rộng phạm vi ngoài kế hoạch gốc theo yêu cầu người dùng (giá vốn bình quân gia quyền/FIFO, chiết khấu, thời gian nhập tùy chỉnh, mã đơn hàng, vô hiệu hóa/xóa sản phẩm, trang chi tiết sản phẩm, API đối tác rút gọn). Chi tiết: `docs/DECISIONS.md`, `docs/CHANGELOG.md` mục 2026-07-31.

- [x] Migration `005_phase2_kho.sql`: `partners`, `products`, `stock_receipts`, `stock_receipt_items`, `stock_issues` (kèm `payment_status`), `stock_issue_items`, `stock_movements`
- [x] Migration `006_products_is_active.sql`: vô hiệu hóa sản phẩm
- [x] Migration `007_costing_and_product_history.sql`: `stock_lots`, `stock_movements.unit_cost`, `product_change_log`, seed `costing_method`
- [x] Migration `008_receipt_discount.sql`: `stock_receipt_items.discount_percent`
- [x] Migration `009_receipt_order_code.sql`: `stock_receipts.order_code`
- [x] `stockReceipt.service.js` / `stockIssue.service.js` (transaction) — đã test rollback đúng khi lỗi giữa transaction
- [x] `costing.service.js` — bình quân gia quyền (on-the-fly) + FIFO (tiêu thụ `stock_lots`), đã verify bằng số liệu thật
- [x] `backend/middleware/requirePermission.js` — thêm `requireAnyPermission([modules])`
- [x] `backend/routes/partners.routes.js` (bản rút gọn: GET danh sách + POST tạo nhanh, quyền `kho` hoặc `cong_no`)
- [x] `backend/routes/products.routes.js`: CRUD + vô hiệu hóa/mở lại + xóa cứng (chỉ Admin, chặn nếu có lịch sử) + chi tiết/lịch sử nhập-xuất/lịch sử chỉnh sửa
- [x] Frontend `products.html`/`products.js`: danh mục sản phẩm (tìm kiếm, sắp xếp tồn kho, cảnh báo tồn thấp, modal thêm/sửa, vô hiệu hóa/mở lại/xóa)
- [x] Frontend `product-detail.html`/`product-detail.js` (ngoài kế hoạch ban đầu): chi tiết sản phẩm + giá vốn hiện tại + 2 bảng lịch sử
- [x] Frontend `warehouse-settings.html`/`.js`: thêm chọn phương pháp tính giá vốn (radio card `.method-group`)
- [x] Frontend `stock-receipts.html`/`stock-receipts.js`: danh sách phiếu nhập, modal lập phiếu (dropdown/thêm nhanh NCC, combobox tìm sản phẩm, số lượng/đơn giá/chiết khấu %/ĐVT tự động/thành tiền từng dòng, thời gian nhập tùy chỉnh, mã đơn hàng, tổng thành tiền, bố cục ngang `.form-row`)
- [x] Test đầy đủ qua curl (permission, rollback, công thức giá vốn, validation) và trình duyệt thật (admin + thukho1)
- [ ] Frontend `stock-issues.html` (lập phiếu xuất) — **chưa làm**, đang chờ chốt 2 điểm: cách xử lý khách hàng (dropdown+thêm nhanh giống NCC), cách hiển thị `payment_status`
- [ ] Cơ chế phiếu điều chỉnh bù trừ cho sửa/hủy phiếu — chưa làm

## Phase 3 — Công nợ

> Cập nhật 2026-08-01: bảng `partners` đã tạo ở Phase 2 — phase này chỉ còn migration `debt_ledger` + API/frontend đối tác và công nợ.

- [ ] Migration thêm `debt_ledger`
- [ ] `debt.service.js`, tự động ghi nợ khi phiếu xuất đánh dấu "chưa thu tiền ngay"
- [ ] API + frontend: quản lý đối tác (`partners.routes.js`/`partners.html`), ghi nhận thanh toán, xem số dư công nợ

## Phase 4 — In phiếu & Báo cáo

- [ ] `print-issue.html` với CSS `@media print`
- [ ] API `/api/reports/*`
- [ ] Frontend báo cáo (bảng + Chart.js nếu cần biểu đồ)

## Phase 5 — Vận hành & Go-live

- [ ] Cấu hình PM2 (`pm2 start`, `pm2 startup`, `pm2 save`)
- [ ] Đặt IP tĩnh/DHCP reservation cho máy chủ
- [ ] Viết script backup `data.db` định kỳ
- [ ] Test toàn bộ luồng với dữ liệu thật, đào tạo người dùng
- [ ] Go-live, theo dõi 1 tuần đầu

## Open questions cần chốt trước khi code phần liên quan

Xem `docs/DECISIONS.md` mục "Open questions".
