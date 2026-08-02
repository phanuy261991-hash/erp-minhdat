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

## Phase 2 — Kho (đã xong)

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
- [x] Migration `010_receipt_issue_adjustment.sql`: `adjusts_type`/`adjusts_id` trên `stock_receipts` và `stock_issues`
- [x] Frontend `stock-issues.html` (lập phiếu xuất): dropdown + thêm nhanh khách hàng (giống NCC), toggle `payment_status`, combobox sản phẩm, tổng thành tiền
- [x] Frontend `stock-receipts.html`: thêm modal xem chi tiết phiếu (`receipt-detail.js`, dùng chung với `product-detail.html` — bấm mã phiếu nhập trong lịch sử)
- [x] Cơ chế phiếu điều chỉnh bù trừ: trường "Điều chỉnh cho phiếu" (combobox tìm cả PN/PX, `adjustment.js` dùng chung) trên cả 2 form lập phiếu; hiển thị badge trên danh sách + 2 chiều liên kết trên modal chi tiết phiếu nhập ("Điều chỉnh cho phiếu" / "Được điều chỉnh bởi")
- [x] Test đầy đủ qua trình duyệt thật: lập phiếu xuất (chặn tồn kho không đủ, thành công khi đủ tồn, thêm nhanh khách hàng), phiếu điều chỉnh cả 2 chiều (nhập bù cho phiếu xuất, xuất bù cho phiếu nhập), liên kết 2 chiều hiển thị đúng
- [x] Thêm sửa (họ tên/vai trò/mật khẩu)/xóa cứng (chỉ Admin, chặn nếu có lịch sử) tài khoản người dùng trên `users.html` (ngoài kế hoạch gốc Phase 1.5, làm lúc này theo yêu cầu người dùng)

## Phase 3 — Công nợ (đã xong)

> Cập nhật 2026-08-01: bảng `partners` đã tạo ở Phase 2 — phase này chỉ còn migration `debt_ledger` + API/frontend đối tác và công nợ.
> Cập nhật 2026-07-31 (phiên hoàn thành Phase 3): chốt thêm `payment_status` vào `stock_receipts` (migration `011`) để hỗ trợ công nợ phải trả NCC — xem `docs/DECISIONS.md`.

- [x] Migration `011_receipt_payment_status.sql`: `stock_receipts.payment_status` (`da_thanh_toan`/`cong_no`, đối xứng `stock_issues.payment_status`)
- [x] Migration `012_debt_ledger.sql`: bảng `debt_ledger` (kèm `created_by` để truy vết, ngoài draft gốc ở `Plan.md`)
- [x] `debt.service.js`: `recordDebtFromDocument()` (gọi trong transaction có sẵn của `stockReceipt.service.js`/`stockIssue.service.js` khi `payment_status='cong_no'`, bắt buộc có `partnerId`), `recordPayment()` (ghi nhận thanh toán thủ công, cho phép trả từng phần), `getDebtBalance()`
- [x] `stockReceipts.routes.js`/`stockIssues.routes.js`: đọc/validate `payment_status`, chặn 400 nếu `cong_no` mà không chọn đối tác
- [x] `partners.routes.js` mở rộng: `PUT /:id` (sửa tên/SĐT/địa chỉ, không đổi được loại), `DELETE /:id` (chặn nếu đã có lịch sử phiếu nhập/xuất/công nợ) — quyền riêng `cong_no`
- [x] `debts.routes.js` (mới): `GET /api/debts/summary` (số dư từng đối tác), `GET /api/debts?partner_id=` (lịch sử giao dịch), `POST /api/debts/payment` (ghi nhận thanh toán)
- [x] Frontend `partners.html`/`partners.js`: danh sách, tìm kiếm theo tên, thêm/sửa/xóa
- [x] Frontend `debts.html`/`debts.js`: danh sách số dư (tô màu cảnh báo nếu còn nợ), modal lịch sử giao dịch, modal ghi nhận thanh toán (dùng chung cho nút đầu trang + từng dòng đối tác)
- [x] Frontend `stock-receipts.html`/`.js`: thêm toggle "Chưa thanh toán ngay" (tái dùng `.switch`/`.setting-row`), badge thanh toán trên danh sách + modal chi tiết phiếu
- [x] Bật menu "Đối tác"/"Công nợ" trong `layout.js`
- [x] Test đầy đủ qua trình duyệt thật: tạo phiếu nhập/xuất công nợ → số dư đối tác tự động tăng đúng; ghi nhận thanh toán từng phần → số dư giảm đúng; sửa/xóa đối tác (chặn đúng khi có lịch sử); chặn đúng khi `cong_no` mà không chọn đối tác; phân quyền `cong_no` chặn đúng cả UI (ẩn menu, redirect khi vào thẳng URL) lẫn API (403)

### Hoàn thiện Xuất kho + Công nợ (sau Phase 3, theo yêu cầu người dùng)

- [x] Modal xem chi tiết phiếu xuất kho (`issue-detail.js`) — đối xứng phiếu nhập, gắn ở `stock-issues.html` + `product-detail.html`
- [x] Phiếu xuất: thêm "Thời gian xuất" tùy chỉnh (`issue_date`, giống `receipt_date`)
- [x] Phiếu xuất: hiển thị SĐT/địa chỉ khi chọn khách hàng có sẵn (2 ô chỉ đọc)
- [x] Sửa CSS: khoảng cách `.setting-row` với trường bên dưới (thêm `margin-bottom: 14px`)
- [x] Trang Công nợ: modal lịch sử — thẻ số liệu nổi bật "Cần thanh toán"/"Cần thu" (màu cảnh báo) + "Tổng tiền hàng đã mua"/"đã bán" (`debts.routes.js` bổ sung `total_transacted`, tính trực tiếp từ `stock_receipts`/`stock_issues`)
- [x] Migration `013_issue_discount.sql`: `stock_issue_items.discount_percent`, đối xứng phiếu nhập — cột "Chiết khấu (%)" + "Thành tiền" theo giá net trên dòng sản phẩm phiếu xuất, cập nhật `stockIssue.service.js`/`stockIssues.routes.js`/`issue-detail.js`/`debts.routes.js` (tổng tiền đã bán tính theo giá sau chiết khấu)
- [x] Test đầy đủ qua trình duyệt thật: thời gian xuất tùy chỉnh hiển thị đúng trên danh sách; chọn khách hàng tự điền đúng SĐT/địa chỉ; khoảng cách `.setting-row` đo được đúng 14px; modal lịch sử công nợ hiển thị đúng số liệu nổi bật; chiết khấu từng dòng tính đúng thành tiền + tổng tiền phiếu

## Phase 4 — In phiếu & Báo cáo (đã xong)

- [x] `print-issue.html`/`.js` (mới, trang độc lập không dùng sidebar) với CSS `@media print` — dùng lại `GET /api/stock-issues/:id` có sẵn, không cần API `/print` riêng
- [x] Migration `014_company_print_note.sql`: `company_settings.print_note` (ghi chú hiển thị dưới bảng kê khi in — điều kiện bảo hành, chính sách đổi trả... — sửa được qua trang Thông tin công ty, không hardcode) + textarea mới trong `company-settings.html`/`.js`
- [x] Nút "In phiếu" (icon mới `printer`) trên từng dòng ở `stock-issues.html`
- [x] API `backend/routes/reports.routes.js` (mới, quyền `bao_cao`): `GET /inventory` (tồn kho + giá trị), `GET /stock-movements?months=` (mua/bán hàng theo tháng, điền 0 cho tháng trống), `GET /debts` (tổng phải thu/phải trả toàn hệ thống)
- [x] Frontend báo cáo (`reports.html`/`.js`, mới): bảng tồn kho + thẻ tổng giá trị, **biểu đồ cột SVG tự vẽ tay** (không dùng Chart.js/thư viện ngoài — đúng nguyên tắc dự án không phụ thuộc CDN/build step) cho mua hàng/bán hàng theo tháng kèm % tăng trưởng so với tháng trước (`.stat-delta`, CSS mới), thẻ tổng công nợ phải thu/phải trả
- [x] Bật menu "Báo cáo" trong `layout.js`
- [x] Test đầy đủ qua trình duyệt thật: trang in phiếu hiển thị đúng toàn bộ thông tin công ty + khách hàng + chiết khấu + ghi chú, chặn đúng khi chưa đăng nhập; báo cáo hiển thị đúng số liệu khớp dữ liệu thật (tồn kho, mua/bán theo tháng, công nợ), tooltip hover từng cột đúng giá trị; phân quyền `bao_cao` chặn đúng cả UI (ẩn menu, redirect) lẫn API (403)

### Chỉnh sửa Báo cáo/In phiếu + tách Khách hàng (sau Phase 4, ngoài phase, theo yêu cầu người dùng 2026-08-01)

- [x] `reports.html`: chuyển phần "Công nợ" lên đầu trang
- [x] `print-issue.html`/`.js`: thêm cột "Mã sản phẩm" riêng trong bảng kê
- [x] Sửa lỗi `print-company-note-text` thiếu `class` khiến `white-space: pre-line` không áp dụng (ghi chú in phiếu không xuống dòng đúng)
- [x] Migration `015_customer_categories.sql`: bảng `customer_categories` (tên + hạn mức công nợ) + `partners.category_id`
- [x] `backend/routes/customerCategories.routes.js` (mới): CRUD "Loại khách hàng"
- [x] `partners.routes.js`: GET trả `category_name`/`category_debt_limit`, POST/PUT nhận `category_id` (validate chỉ áp dụng `type='khach_hang'`)
- [x] `debts.routes.js`: `GET /summary` bổ sung `category_name`/`category_debt_limit`
- [x] Frontend mới: `customers.html`/`.js` (Khách hàng), `customer-debts.html`/`.js` (Công nợ khách hàng, cảnh báo vượt hạn mức — chỉ cảnh báo không chặn), `customer-categories.html`/`.js` (Loại khách hàng, menu Cấu hình)
- [x] `partners.html`/`.js`: đổi thành chỉ quản lý Nhà cung cấp (bỏ chọn loại, bỏ cột Loại)
- [x] `debts.html`/`.js`: đổi thành chỉ Công nợ NCC
- [x] `layout.js`: tách nhóm "Công nợ" cũ thành "Nhà cung cấp" + "Khách hàng"; thêm "Loại khách hàng" vào nhóm "Cấu hình"; `icons.js` thêm icon `truck`/`tag`
- [x] Test qua trình duyệt thật: CRUD Loại khách hàng, gán loại cho khách hàng, xác nhận dữ liệu công nợ NCC cũ không mất sau migration, phiếu in xuất kho hiển thị đúng mã SP + ghi chú xuống dòng đúng

### "Điều chỉnh công nợ" (sau các mục trên, ngoài phase, theo yêu cầu người dùng 2026-08-01)

- [x] Migration `016_debt_adjustment.sql`: `debt_ledger.is_adjustment`
- [x] `debt.service.js`: `recordDebtAdjustment()` — validate type/amount/note bắt buộc, phiếu gốc (nếu chọn) phải thuộc đúng đối tác
- [x] `debts.routes.js`: `POST /adjustment`, `GET /documents?partner_id=` (danh sách phiếu công nợ của 1 đối tác, không đòi quyền `kho`)
- [x] Frontend `debts.html`/`.js` và `customer-debts.html`/`.js`: modal "Điều chỉnh công nợ", combobox tìm phiếu gốc theo đối tác, badge "Điều chỉnh" riêng trong lịch sử
- [x] Test qua trình duyệt thật + API: điều chỉnh giảm số dư đúng, badge hiển thị đúng, chặn đúng khi thiếu lý do hoặc chọn nhầm phiếu của đối tác khác

### Bảo hành (ngoài phase, theo yêu cầu người dùng 2026-08-01)

- [x] Migration `017_warranties.sql`: bảng `warranties` (chỉ gắn khách hàng, không gắn NCC)
- [x] `backend/routes/warranties.routes.js`: CRUD đầy đủ, validate `partner_id` phải là `khach_hang`, `expiry_date > acceptance_date`; xóa cứng chỉ Admin (`is_protected`)
- [x] `frontend/warranties.html`/`.js`: danh sách, tìm kiếm theo tên khách hàng, vô hiệu hóa/mở lại, xóa (ẩn nút nếu không phải Admin)
- [x] `frontend/warranties.html`/`.js`: modal thêm mới/sửa (ban đầu làm trang riêng `warranty-detail.html`, đã bỏ theo phản hồi người dùng — đổi thành popup như mọi trang khác trong hệ thống) — tương tác 2 chiều Thời gian bảo hành ↔ Ngày hết hạn (`frontend/assets/warranty-calc.js`, hàm dùng chung), hỗ trợ mở sẵn qua URL (`?customer_id=` thêm mới, `?edit=` sửa) khi điều hướng từ `customer-detail.html`
- [x] Sửa lại giao diện card "Bảo hành" trên `customer-detail.html` theo mẫu tham khảo người dùng cung cấp (icon vuông màu theo trạng thái + tiêu đề/phụ đề + nhãn trạng thái đối diện số ngày còn lại) và sửa lỗi 2 card "Thông tin công ty"/"Ghi chú in phiếu" dính nhau (`.settings-card`/`.settings-columns` thiếu `margin-bottom`)
- [x] `frontend/customer-detail.html`/`.js` (trang mới, trước đây `customers.html` chưa có trang chi tiết riêng): thông tin cơ bản khách hàng + card Bảo hành (số ngày còn lại + ngày hết hạn, màu theo mức khẩn cấp)
- [x] `customers.js`: thêm icon "Xem chi tiết" liên kết sang `customer-detail.html`
- [x] `layout.js`/`icons.js`: thêm mục "Bảo hành" vào nhóm Khách hàng, icon `shield` mới
- [x] Sửa 3 lỗi CSS `[hidden]` bị ghi đè phát hiện trong lúc test tính năng này (`.empty-state`, `.page-header-actions`, `.page-header-actions .btn-secondary` — cùng dạng lỗi đã gặp ở `.form-row`/`.modal-card` trước đó, thêm `:not([hidden])`)
- [x] Test qua trình duyệt thật: tạo bảo hành mới (tự điền SĐT/địa chỉ theo khách hàng, tính đúng ngày hết hạn theo lịch), sửa "Ngày hết hạn" trực tiếp → tự suy đúng thời gian bảo hành theo quy tắc ngày/tháng/năm; card trên trang Chi tiết khách hàng hiển thị đúng số ngày còn lại; test phân quyền bằng tài khoản Kế toán (không phải Admin) → nút Xóa ẩn đúng ở cả danh sách lẫn trang chi tiết, gọi thẳng API DELETE bị chặn 403

### Làm lại trang Tổng quan (ngoài phase, theo yêu cầu người dùng 2026-08-01)

- [x] `frontend/assets/dashboard.js` (mới): lời chào động theo giờ hệ thống + họ tên tài khoản; 3 card Sản phẩm/Khách hàng/Nhà cung cấp lấy số liệu thật từ API danh sách có sẵn (trước đó trang chỉ là khung tĩnh, chưa từng gọi API)
- [x] Thiết kế lại bằng skill `ui-ux-pro-max`: `.dashboard-hero` (icon mặt trời/mặt trăng + ngày tháng tiếng Việt), `.dashboard-card` kiểu bento bấm được điều hướng, `.quick-links` lọc theo quyền — xem `docs/DESIGN-SYSTEM.md`
- [x] Test qua trình duyệt thật với tài khoản Thủ kho và Admin — số liệu đúng, lọc quyền đúng, điều hướng đúng

### Bản quyền + trang "Thông tin phần mềm" (ngoài phase, theo yêu cầu người dùng 2026-08-01)

- [x] Dòng bản quyền footer sidebar (mọi trang) + trang `about.html` (menu Cấu hình) — thiết kế bằng skill `ui-ux-pro-max`
- [x] Sửa 3 lỗi CSS phát sinh khi test: subtitle rớt chữ, sidebar tràn màn hình + icon biến mất khi thu gọn, `.stat-grid` dính `.data-table-wrap` ở trang Báo cáo — chi tiết `docs/CHANGELOG.md`/`docs/DESIGN-SYSTEM.md`

### Đóng gói bản portable + thiết lập lần đầu qua giao diện + tự khởi động cùng Windows (ngoài phase, theo yêu cầu người dùng 2026-08-01)

> Chi tiết đầy đủ (bao gồm 1 lần thử thất bại với `pkg`): `docs/DECISIONS.md`, `docs/CHANGELOG.md`.

- [x] `backend/server.js` tự gọi `runMigrations()` khi khởi động (trước đây chỉ chạy qua `npm run migrate` thủ công)
- [x] `backend/routes/setup.routes.js` (mới): `GET /api/setup/status`, `POST /api/setup` — tạo tài khoản Admin đầu tiên qua giao diện, tự khoá vĩnh viễn sau khi có ≥1 tài khoản
- [x] Sửa bug có từ trước trong `backend/db/seedAdmin.js` (còn dùng cột `role` cũ đã bỏ từ migration `002`)
- [x] `frontend/setup.html`/`assets/setup.js` (mới), `frontend/assets/auth.js` cập nhật (tự chuyển hướng sang `setup.html` khi hệ thống chưa có tài khoản nào)
- [x] Thử đóng gói bằng `@yao-pkg/pkg` thành 1 file `.exe` — thất bại (crash native-addon `better-sqlite3`, không sửa được), đã hỏi lại người dùng và chuyển hướng
- [x] `scripts/build-portable.js` (`npm run build:portable`): đóng gói thư mục `dist/` tự chứa `node.exe` + toàn bộ app, kèm `start.bat`
- [x] `scripts/install-autostart.ps1`/`uninstall-autostart.ps1` (Task Scheduler, chạy `AtStartup`) — chọn thay cho `node-windows` (không cần Node cài vĩnh viễn trên máy chủ)
- [x] `backend/db/database.js`: xuất kèm `db.dataFilePath`, `scripts/backup.js` dùng lại thay vì tự ghép đường dẫn
- [x] Test qua trình duyệt thật với bản portable (dùng đúng `node.exe` trong `dist/`, database rỗng): tự tạo DB mới → chuyển sang thiết lập lần đầu → tạo tài khoản → đăng nhập → dashboard trống đúng
- [x] Khôi phục lại dữ liệu dev/demo gốc sau khi test xong (đã backup trước khi xoá `data/data.db` để test)
- [x] `docs/DEPLOY.md`: thêm hướng dẫn cài đặt từ bản đóng gói `dist/`, giữ nguyên quy trình PM2 thủ công cho trường hợp cần theo dõi/quản lý process nâng cao
- [ ] Chạy thật `install-autostart.ps1` trên đúng máy chủ chính thức (chưa làm — máy đang thao tác vẫn là máy dev, xem `docs/DECISIONS.md` mục Phase 5)

## Phase 5 — Vận hành & Go-live

> Bắt đầu 2026-08-01 trên máy dev (không phải máy chủ thật — xem `docs/DECISIONS.md`) — chỉ làm được phần độc lập với máy cụ thể, các bước còn lại để khi triển khai lên đúng máy chủ, xem quy trình đầy đủ `docs/DEPLOY.md`.

- [x] `ecosystem.config.js` — cấu hình PM2 sẵn dùng, không hardcode `SESSION_SECRET`
- [x] Migration `018_backup_path.sql` + `scripts/backup.js` (checkpoint WAL, copy `data.db`, tự dọn bản backup cũ >14 ngày)
- [x] `POST /api/warehouse-settings/backup` ("Backup ngay") + UI cấu hình đường dẫn backup trong "Cấu hình kho" (người dùng tự chọn đường dẫn, không hardcode)
- [x] `docs/DEPLOY.md` (mới) — quy trình đầy đủ: IP tĩnh, Windows Firewall, `SESSION_SECRET`, PM2 + `pm2-windows-startup` (Windows không hỗ trợ `pm2 startup` chính thức), Task Scheduler cho backup, checklist go-live
- [x] Test qua trình duyệt thật: "Backup ngay" tạo đúng file trên đĩa; chặn đúng 403 khi gọi API không có quyền `cau_hinh`
- [ ] Cấu hình PM2 thật (`pm2 start`, `pm2-startup install`, `pm2 save`) — trên máy chủ thật
- [ ] Đặt IP tĩnh/DHCP reservation cho máy chủ thật
- [ ] Đặt Windows Task Scheduler chạy backup hàng ngày trên máy chủ thật
- [ ] Test toàn bộ luồng với dữ liệu thật, đào tạo người dùng
- [ ] Go-live, theo dõi 1 tuần đầu

### Tìm kiếm theo số điện thoại (ngoài phase, theo yêu cầu người dùng 2026-08-02)

- [x] `partners.html`/`.js`, `debts.html`/`.js`, `customers.html`/`.js`, `customer-debts.html`/`.js`, `warranties.html`/`.js`: mở rộng ô tìm kiếm lọc thêm theo số điện thoại (trước chỉ lọc theo tên) — chỉ sửa hàm lọc phía frontend, không đổi API (`phone` đã có sẵn trong response)
- [x] Test qua trình duyệt thật (CDP headless + chụp ảnh màn hình): cả 5 trang lọc đúng theo số điện thoại

## Open questions cần chốt trước khi code phần liên quan

Xem `docs/DECISIONS.md` mục "Open questions".
