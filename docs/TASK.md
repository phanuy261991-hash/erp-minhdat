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

### Module "Sổ quỹ" (ngoài phase, theo yêu cầu người dùng 2026-08-02)

> Đã hỏi và chốt 4 quyết định kiến trúc trước khi code (độc lập với Công nợ, quỹ đầu kỳ tự cộng dồn, không sửa chỉ xóa cứng, đối tượng nộp/nhận chỉ tên tự do) — chi tiết đầy đủ `docs/DECISIONS.md`.

- [x] Migration `019_cash_book.sql`: `cash_book_settings` (Quỹ đầu kỳ, singleton), `cash_categories` (Loại thu chi, seed 6 mục mẫu), `cash_vouchers` (độc lập `debt_ledger`), seed quyền `so_quy` cho vai trò Kế toán
- [x] `backend/config/modules.js`: thêm module_key `so_quy`
- [x] `backend/services/cashVoucher.service.js`: sinh mã `PT`/`PC` riêng từng loại, `monthBoundsUtc()` (mốc UTC+7 cố định theo giờ VN — không phải UTC thô hay giờ server), `getCashBookSummary()`, `createCashVoucher()` (validate danh mục đúng chiều thu/chi)
- [x] `backend/routes/cashVouchers.routes.js` (list+summary theo tháng bắt buộc `month`, tạo, xóa cứng, `/staff`), `cashCategories.routes.js` (CRUD, chặn xóa khi đã có phiếu dùng), `cashBookSettings.routes.js` (GET mở/PUT quyền `so_quy`) — mount vào `server.js`
- [x] Frontend `cash-book.html`/`.js`: danh sách phiếu theo tháng, thẻ Quỹ đầu kỳ/Tổng thu/Tổng chi/Tồn quỹ, modal lập phiếu dùng chung Thu/Chi (kèm nút "+ Tạo loại mới" tạo nhanh danh mục), modal sửa Quỹ đầu kỳ, modal xem chi tiết chỉ đọc
- [x] Frontend `cash-categories.html`/`.js`: CRUD "Loại thu chi" (rập khuôn `customer-categories.html`)
- [x] `frontend/assets/layout.js`: nhóm nav mới "Quỹ" (sau "Khách hàng", trước "Quản trị"); `icons.js` thêm icon `wallet` (không dùng lại `ledger` vì đã dùng 2 lần ở Công nợ NCC/KH)
- [x] `style.css`: `.text-accent`/`.text-destructive` (màu Giá trị thu/chi), `.month-select`/`.month-select-group`, `.form-field-label-row`
- [x] Sửa theo phản hồi người dùng ngay sau khi demo: nút đầu trang lệch dòng (do `.form-field` có `margin-bottom` không hợp khi đặt trong hàng ngang) → bỏ hẳn `<input type="month">`, đổi sang 2 `<select>` "Tháng"/"Năm" tự viết nhãn tiếng Việt (input kiểu tháng hiển thị theo locale trình duyệt, không ép được tiếng Việt); bổ sung nút "+ Tạo loại mới" ngay trên modal lập phiếu thu/chi
- [x] Test qua trình duyệt thật (Chrome headless điều khiển CDP thô + script Node gọi thẳng service để test ranh giới tháng): tạo/xóa phiếu, tính đúng 4 số liệu tổng hợp, ranh giới tháng đúng giờ VN (phiếu 23:30 vs 00:30 quanh nửa đêm cuối tháng), xóa danh mục đang dùng bị chặn đúng, phân quyền `so_quy` chặn đúng UI+API, xác nhận không ghi gì vào `debt_ledger`, tạo nhanh danh mục trên modal lập phiếu hoạt động đúng

### Trường "Người phụ trách" cho Khách hàng (ngoài phase, theo yêu cầu người dùng 2026-08-03)

- [x] Migration `020_partner_assigned_user.sql`: `partners.assigned_user_id` (nullable, FK `users`)
- [x] `backend/routes/partners.routes.js`: `GET /` trả kèm `assigned_user_name`, `POST`/`PUT` validate + lưu `assigned_user_id`, route mới `GET /staff` (không giới hạn quyền `nguoi_dung`, dùng cho combobox)
- [x] `frontend/customers.html`/`assets/customers.js`: ô "Người phụ trách" dạng combobox gõ gợi ý (tái dùng pattern `.combobox` có sẵn), áp dụng cho cả thêm mới lẫn sửa
- [x] Test qua API (curl) + trình duyệt thật (CDP thô, gõ ký tự thật qua `Input.dispatchKeyEvent`): gợi ý đúng, chọn đúng, lưu đúng, mở sửa lại tự điền đúng

### Sửa lỗi trang "Vai trò" thiếu module "Sổ quỹ" (ngoài phase, theo phản hồi người dùng 2026-08-03)

- [x] `backend/config/modules.js`: thêm `MODULE_LABELS` (nhãn tiếng Việt), export cùng `MODULE_KEYS`
- [x] `backend/routes/roles.routes.js`: thêm `GET /roles/modules` trả danh sách `{key, label}` theo đúng thứ tự `MODULE_KEYS`
- [x] `frontend/assets/roles.js`: bỏ `MODULE_LABELS`/`MODULE_ORDER` hardcode, gọi API mới lúc `init()`, dùng chung cho lưới checkbox modal lẫn nhãn chip trong bảng
- [x] Test qua API (curl) + trình duyệt thật (CDP thô, tái hiện đúng thao tác cũ gây mất quyền): xác nhận đủ 6 module hiện ra, lưu vai trò Kế toán không còn mất quyền "Sổ quỹ"

### Đổi logo thương hiệu "NEXA One" (ngoài phase, theo yêu cầu người dùng 2026-08-03)

- [x] Tìm đúng file logo nguồn người dùng cung cấp trên máy (`Downloads/LOGO ANH UY/`), dùng Pillow cắt gọn khoảng trắng thừa + tách icon/chữ riêng, lưu tại `frontend/assets/images/` (thư mục mới)
- [x] `frontend/login.html`/`style.css`: thay icon SVG bằng logo (`.login-brand-logo`), giữ nguyên `<h1>` theo phản hồi người dùng
- [x] `frontend/assets/layout.js`/`style.css`: thay icon+chữ "Kho & Công nợ" trong sidebar bằng logo (tách icon/wordmark 2 file, chữ dùng chung class `.label` để tự ẩn khi thu gọn)
- [x] Sửa lỗi phát sinh: icon sidebar biến mất khi thu gọn (flexbox ép về 0 do `.sidebar-brand` có `overflow:hidden`) — xếp dọc icon/nút thu gọn khi collapsed
- [x] `frontend/about.html`/`.js`/`style.css`: thay khung icon gradient bằng logo đầy đủ (`.about-logo`)
- [x] Test qua trình duyệt thật (Chrome headless CDP thô, chụp ảnh xác nhận): cả 4 điểm (đăng nhập, sidebar mở rộng, sidebar thu gọn, Thông tin phần mềm) hiển thị đúng, không lỗi console
- [x] **Chỉnh sửa thêm (2026-08-04)**: logo đăng nhập cắt lại từ nguồn độ phân giải cao hơn cho sắc nét; tăng khoảng cách logo↔tiêu đề (`margin-top` 16px→26px, chỉ `login.html`); đánh giá bản logo SVG người dùng gửi thêm (phát hiện nền đục + dữ liệu lặp 4 lần + rủi ro mất màu xanh khi trích xuất) — người dùng chọn giữ nguyên bộ PNG hiện tại

### Import/Export Excel cho Sản phẩm (ngoài phase, theo yêu cầu người dùng 2026-08-02)

> Đã hỏi và chốt 3 quyết định nghiệp vụ trước khi code (mã trùng báo lỗi không upsert, còn lỗi thì không nhập gì cả, export theo đúng danh sách đang hiển thị) — chi tiết đầy đủ `docs/DECISIONS.md`.

- [x] Thêm dependency `exceljs` (đọc/ghi `.xlsx`) và `multer` (nhận file upload, memory storage, giới hạn 5MB)
- [x] `backend/routes/products.routes.js`: `GET /import-template` (tải file mẫu kèm sheet "Hướng dẫn"), `POST /import` (validate toàn bộ file, all-or-nothing, báo lỗi theo từng dòng), `POST /export` (nhận danh sách `ids` từ frontend, xuất đúng theo thứ tự/danh sách đó)
- [x] `frontend/products.html`/`.js`: nút "Nhập Excel" (modal: link tải file mẫu, chọn file, bảng lỗi "Dòng"/"Lỗi" nếu có, thông báo thành công) + nút "Xuất Excel" (xuất đúng danh sách đang hiển thị qua `getVisibleProducts()`, tải file qua blob)
- [x] `style.css`: CSS scoped cho anchor "Tải file mẫu" hiển thị như nút (`#import-template-link.btn-secondary`)
- [x] Test qua API (curl): file lỗi bị chặn đúng + báo đúng dòng/lỗi, file hợp lệ nhập đúng, mã trùng DB/trong file bị chặn, sai định dạng/thiếu file bị chặn, phân quyền `kho` chặn đúng cho import/template nhưng export vẫn mở cho mọi tài khoản đã đăng nhập (giống `GET /products`)
- [x] Test qua trình duyệt thật (Chrome headless điều khiển CDP thô, chụp ảnh màn hình): mở modal, upload file lỗi → bảng lỗi đúng, upload file hợp lệ → thành công + danh sách tự làm mới, bấm "Xuất Excel" tải file thật đúng nội dung, không lỗi console. Dữ liệu test đã xóa sạch sau khi test xong.

### Module "Quản lý dự án" (ngoài phase, theo yêu cầu người dùng 2026-08-04 — đã chốt kế hoạch, CHƯA CODE)

> Đã hỏi và chốt **14 quyết định** qua 3 vòng trước khi lên kế hoạch (cấu trúc 1 cấp, gắn dự án vào phiếu hiện có, giai đoạn mẫu, đợt thanh toán mở form công nợ, công việc thuộc giai đoạn, % tiến độ tự tính, phát sinh 2 loại, dự toán vật tư, công nợ theo phiếu xuất và quản lý qua khách hàng, nhãn dự án trên dòng công nợ, người tham gia kèm vai trò, giao việc giới hạn theo người tham gia, ô Dự án trên form thanh toán/điều chỉnh, in tên công trình lên phiếu xuất) — chi tiết đầy đủ `docs/DECISIONS.md` mục 2026-08-04, nghiệp vụ `docs/PRD.md` mục 4.12, kỹ thuật `docs/Plan.md`.

**Đợt 1 — Nền tảng dự án (đã xong, 2026-08-04)**
- [x] Migration `021_projects.sql`: `project_phase_templates` (seed 6 giai đoạn mẫu), `projects`, `project_members`, `project_phases`; **không** seed quyền `du_an` cho vai trò mặc định nào (module liên quan cả Kho/Công nợ/điều phối nhân sự, không gắn rõ với 1 vai trò có sẵn — để Admin tự cấp qua trang "Vai trò")
- [x] `backend/config/modules.js`: thêm `du_an` vào `MODULE_KEYS` **và** `MODULE_LABELS`
- [x] `backend/services/project.service.js`: sinh mã `DA...`, copy Giai đoạn mẫu vào dự án mới (cùng transaction), tính % tiến độ (trả `null` cho tới khi có bảng `project_tasks` ở Đợt 2), validate `partner_id` phải `type='khach_hang'`, validate người tham gia (không trùng, phải đang hoạt động), chặn xóa dự án đã có giai đoạn "đang làm"/"hoàn thành"
- [x] `backend/routes/projectPhaseTemplates.routes.js` (CRUD, GET mở/ghi quyền `cau_hinh`) + `projects.routes.js` (CRUD dự án + sub-resource `/:id/phases`), mount vào `server.js`
- [x] Frontend `project-phase-templates.html`/`.js` (rập khuôn `customer-categories.html`), `projects.html`/`.js` (danh sách + modal thêm/sửa kèm `.member-picker-row` chọn nhiều người tham gia), `project-detail.html`/`.js` (tab Tổng quan + Giai đoạn kèm biểu đồ Gantt SVG tự vẽ)
- [x] `layout.js` nhóm nav "Dự án" (sau "Khách hàng", trước "Quỹ") + icon `briefcase` mới trong `icons.js`
- [x] Dùng skill `ui-ux-pro-max` cho pattern **trang chi tiết dạng tab** (mới, chưa từng có) + cập nhật `docs/DESIGN-SYSTEM.md`
- [x] Test qua API (curl, dùng file JSON UTF-8 thật thay vì gõ tiếng Việt trực tiếp vào `-d` — phát hiện gõ trực tiếp qua git-bash làm hỏng encoding, không phải lỗi ứng dụng): tạo dự án tự copy đủ 6 giai đoạn mẫu, validate partner phải là khách hàng, validate người tham gia trùng lặp, chặn xóa dự án đã có giai đoạn đang làm/hoàn thành, phân quyền `du_an` chặn đúng (403 với `thukho1`) nhưng `GET /project-phase-templates` vẫn mở cho mọi tài khoản đã đăng nhập
- [x] Test qua trình duyệt thật (Chrome headless điều khiển bằng CDP thô tự viết — không có sẵn `chromium-cli`/Playwright trong môi trường, xem `docs/CHANGELOG.md`): CRUD Giai đoạn mẫu, modal thêm dự án + chọn/xóa người tham gia, trang chi tiết dự án cả 2 tab, không lỗi console. **Phát hiện 1 lỗi UX khi test**: giai đoạn có ngày bắt đầu trùng đúng mép trái vùng vẽ Gantt không hiện nhãn tháng tham chiếu — đã sửa (đệm 3 ngày 2 bên + ép hiện nhãn tháng đầu tiên tối thiểu tại mép trái), test lại xác nhận đúng. Dữ liệu test đã xóa sạch sau khi xong.

**Đợt 2 — Công việc & Timeline (đã xong, 2026-08-04)**
- [x] Migration `022_project_tasks.sql`: `project_tasks` (chỉ `phase_id`, không lưu `project_id` trùng lặp), `status` là nguồn duy nhất tính % tiến độ
- [x] `backend/routes/projectTasks.routes.js` (router `mergeParams:true`, lồng vào `projects.routes.js` tại `/:id/tasks`): CRUD, validate `phase_id` thuộc đúng dự án, validate `assigned_user_id` phải nằm trong `project_members` của dự án đó; `completed_at` tự động gán/xóa khi trạng thái chuyển vào/ra khỏi `hoan_thanh` (không cho nhập tay)
- [x] `backend/routes/projects.routes.js`: `getPhases()` bổ sung `progress_percent` tính riêng từng giai đoạn (SQL gộp nhóm theo `phase_id`, không N+1 query); `backend/services/project.service.js`: `deleteProject()` bổ sung chặn khi dự án đã có công việc
- [x] Frontend tab "Công việc" (`project-detail.html`/`.js`): bộ lọc theo giai đoạn, bảng danh sách, modal thêm/sửa/xóa — select "Người phụ trách" **chỉ liệt kê người tham gia dự án** (không phải toàn bộ tài khoản hệ thống)
- [x] Cập nhật biểu đồ Gantt (đã có từ Đợt 1): mỗi thanh giờ có phần tô đậm bên trong thể hiện % hoàn thành + nhãn số ngay sau thanh; bảng "Danh sách giai đoạn" thêm cột "Tiến độ" (thanh ngang nhỏ + %)
- [x] % tiến độ tính từ công việc; giai đoạn/dự án chưa có việc hiện `—` không hiện `0%` — xác nhận đúng qua test (`getProjectProgress()`/`getPhases()` đã viết sẵn logic này từ Đợt 1, chỉ cần bảng `project_tasks` tồn tại là chạy đúng ngay)
- [x] Test qua API (curl): validate người phụ trách ngoài danh sách tham gia bị chặn (400), validate giai đoạn không thuộc dự án bị chặn, % tiến độ tính đúng theo tỷ lệ hoàn thành (2/4=50%, 67%, 0%...), `completed_at` tự động gán/xóa đúng, chặn xóa giai đoạn/dự án đang có công việc
- [x] Test qua trình duyệt thật (CDP thô): lọc theo giai đoạn đúng, modal thêm chỉ hiện đúng người tham gia dự án, tạo công việc qua UI → bảng + % tiến độ tổng quan cập nhật đúng ngay, không lỗi console. **Phát hiện + sửa 1 lỗi hiển thị**: khi khoảng đệm 3 ngày (đã thêm ở Đợt 1) đẩy domain sang tháng liền trước chỉ vài ngày, 2 nhãn tháng liên tiếp bị ép về gần sát mép trái đè chữ lên nhau (vd "Th6/2026" chồng "Th7/2026") — đã sửa bằng cách bỏ qua vẽ nhãn (vẫn giữ đường kẻ phân tháng) nếu cách nhãn liền trước dưới 55px

**Sau Đợt 2 — sửa lỗi + bổ sung theo phản hồi người dùng (đã xong, 2026-08-04, ngoài checklist chính)**
- [x] Sửa 4 lỗi người dùng phát hiện khi tự test qua UI thật: (1) tạo dự án chọn "Đang thực hiện" nhưng danh sách hiện "Chuẩn bị" — `createProject()` thiếu hẳn cột `status` trong INSERT; (2) "Thêm giai đoạn" điền Trạng thái + ngày thực tế nhưng lưu vẫn "Chưa bắt đầu" — route `POST /:id/phases` bỏ qua hoàn toàn 3 trường đó; (3) nút "Thêm giai đoạn"/"Thêm công việc" trông như lỗi — chưa từng gán icon+chữ qua JS; (4) combobox lọc trạng thái/giai đoạn không đúng style — `<select>` trần không có class, thêm `.filter-select` dùng chung
- [x] Thêm **cảnh báo "Trễ tiến độ"** cho giai đoạn + công việc (theo yêu cầu người dùng, đã hỏi 2 câu chốt phạm vi trước khi code): tính cả "đang trễ" (chưa xong, quá hạn so hôm nay) lẫn "xong trễ" (đã xong, ngày thực tế trễ hơn dự kiến) — `computeDelay()` trong `project.service.js`, mốc "hôm nay" theo giờ VN cố định UTC+7; hiển thị nhãn cảnh báo kèm icon dưới badge Trạng thái ở cả 2 bảng, không đổi màu Gantt
- [x] Sửa lỗi cảnh báo trễ im lặng khi giai đoạn đánh dấu "Hoàn thành" nhưng chưa điền `actual_end` (trường nhập tay riêng biệt với status, không tự động điền như `completed_at` của công việc) — `computeDelay()` nay fallback dùng "hôm nay" khi thiếu `actual_end` thay vì bỏ qua; đồng bộ luôn response `POST`/`PUT /:id/phases` trả đủ `is_late`/`late_days` giống `GET`
- [x] Sự cố phát sinh, đã xử lý: gõ tiếng Việt có dấu trực tiếp vào `curl -d` qua Git Bash **2 lần** trong lúc điều tra, lần 2 ghi đè dữ liệu thật dự án "Villa Kỳ Duyên" của người dùng — đã khôi phục đúng nguyên trạng ngay cả 2 lần; rà và sửa toàn bộ ~20 chuỗi lỗi tự viết cho module Dự án sang có dấu tiếng Việt đầy đủ theo phản hồi người dùng
- [x] Test qua API + trình duyệt thật (CDP thô) cho cả 3 đợt sửa trên, dữ liệu test đã xóa sạch mỗi lần — chi tiết đầy đủ `docs/CHANGELOG.md` (3 mục ngày 2026-08-04)

**Bỏ tab "Công việc" riêng, gộp vào tab "Giai đoạn" + ngày thực tế nhập tay cho công việc (đã xong, 2026-08-04, ngoài checklist chính, theo yêu cầu người dùng — đã hỏi 3 câu chốt phạm vi trước khi code)**
- [x] Migration `023_project_task_actual_dates.sql`: `project_tasks.actual_start_date`/`actual_end_date` (nhập tay) — thay thế hoàn toàn `completed_at` tự động của Đợt 2 (giữ nguyên cột cũ, không xóa)
- [x] `projectTasks.routes.js`: đọc/ghi 2 cột mới; `withDelay()` so `due_date` với `actual_end_date` thay vì `completed_at`
- [x] Bỏ tab "Công việc" khỏi `project-detail.html`/`.js` — gộp CRUD công việc vào tab "Giai đoạn": bấm dòng giai đoạn xổ ra bảng công việc con (`.phase-row`/`.phase-tasks-row`/`.subtask-table`), mỗi dòng có ô ngày thực tế + chọn Trạng thái + nút "Lưu" cập nhật nhanh, icon "Sửa" mở modal đầy đủ
- [x] Gantt dùng chung trạng thái mở rộng (`expandedPhaseIds`) với bảng — bấm giai đoạn trên Gantt cũng xổ danh sách công việc dạng text ngắn gọn (không vẽ thêm thanh SVG cho từng việc)
- [x] Cập nhật `docs/DESIGN-SYSTEM.md` (pattern mới), `docs/DECISIONS.md`, `docs/erd.mermaid`, `docs/Plan.md` (lùi số migration `023`/`024` kế hoạch xuống `024`/`025`)
- [x] Test qua API + trình duyệt thật (CDP thô, 3 script): mở/đóng đồng bộ đúng, lưu nhanh qua UI thật đúng, modal Thêm/Sửa đúng, giai đoạn rỗng hiện đúng thông báo, không lỗi console. Dữ liệu thật "Villa Kỳ Duyên" bị đổi tạm khi test đã khôi phục ngay.
- [x] **Sửa thêm 2 lỗi hiển thị phát hiện sau khi người dùng phản hồi lại "nền bị trắng"** (điều tra bằng computed style + tọa độ ô qua CDP thay vì đoán từ ảnh chụp): (1) `display:flex` đặt thẳng lên `<td>` hành động làm bảng tính sai độ rộng cột (~24px thay vì ~150px), 3 nút tràn ra ngoài ô — sửa bằng cách bọc nút trong `<div class="subtask-actions">` riêng bên trong `<td>` thay vì đặt flex lên chính ô; (2) `.phase-tasks-row td` (selector hậu duệ) vô tình áp nền muted lên cả ô của bảng con lồng bên trong — sửa thành `.phase-tasks-row > td`. Test hồi quy đầy đủ qua UI thật dùng giai đoạn trống ("Nghiệm thu") thay vì dữ liệu thật, xóa sạch sau khi xong, xác nhận lại qua API không còn sót.

**Đợt 3 — Vật tư & gắn dự án vào phiếu** ⚠️ *đợt nhạy cảm nhất, sửa vào transaction tạo phiếu* (số migration lùi từ `023` xuống `024`) — **đã xong, 2026-08-04**
- [x] Migration `024_project_materials.sql`: `project_material_plan` + `ADD COLUMN project_id` (nullable) cho `stock_issues`, `stock_receipts`, `debt_ledger`
- [x] `stockIssue.service.js`/`stockReceipt.service.js`: nhận `projectId`, ghi lên phiếu và truyền xuống `recordDebtFromDocument()` — không đụng logic tồn kho/giá vốn/ghi nợ hiện có
- [x] `debt.service.js`: rà lại **mọi** nơi gọi `recordDebtFromDocument()` trước khi đổi chữ ký hàm (chỉ 2 nơi: `stockReceipt.service.js`, `stockIssue.service.js`)
- [x] Frontend: trường "Dự án" trên form lập phiếu nhập/xuất + hiển thị trên `receipt-detail.js`/`issue-detail.js`
- [x] `print-issue.html`/`.js`: dòng "Công trình: …" tự ẩn nếu không gắn dự án
- [x] Frontend tab "Vật tư": Dự toán / Đã xuất / Còn lại / Vượt + danh sách phiếu đã gắn (`projectMaterials.routes.js` mới, lồng `/:id/materials`)
- [x] Bổ sung ngoài checklist gốc (đã ghi sẵn trong code từ Đợt 1): `project.service.js#deleteProject()` chặn xóa dự án đã có phiếu/công nợ gắn `project_id`
- [x] Test bắt buộc: phiếu **không** gắn dự án chạy y hệt như cũ; rollback đúng khi lỗi giữa transaction (dự án không tồn tại bị chặn, không sót phiếu/nợ); nhập trả vật tư về kho làm giảm đúng "Đã xuất" (xác nhận qua cả API lẫn UI thật, công thức `issued - received`)
- [x] Test qua API (curl) + trình duyệt thật (CDP thô, script Node dùng `WebSocket` built-in) — chi tiết đầy đủ `docs/CHANGELOG.md`

**Đợt 4 — Đợt thanh toán, Công nợ dự án & Phát sinh** (số migration lùi từ `024` xuống `025`) — **đã xong, 2026-08-04**
- [x] Migration `025_project_payments.sql`: `project_payment_milestones`, `project_variations` + `ADD COLUMN debt_ledger.milestone_id`
- [x] Routes: công nợ dự án (`contract_value_actual`/`debt_summary` trong `GET /projects/:id`), CRUD đợt thanh toán (`projectMilestones.routes.js`, trạng thái suy ra: Chưa thu/Thu một phần/Đã thu đủ/Quá hạn), CRUD phát sinh (`projectVariations.routes.js`)
- [x] `projects.routes.js`: thêm filter `?partner_id=` cho `GET /` (dùng cho select "Dự án" lọc theo khách hàng ở `customer-debts.html`)
- [x] `debts.routes.js`/`debt.service.js`: `POST /payment` + `POST /adjustment` nhận `project_id`/`milestone_id`, validate dự án thuộc đúng đối tác (và đợt thanh toán thuộc đúng dự án)
- [x] Frontend: ô "Dự án" (+ "Đợt thanh toán" chỉ ở form thanh toán) trên form Ghi nhận thanh toán + Điều chỉnh công nợ ở `customer-debts.html` (ẩn nếu khách chưa có dự án; không thêm vào `debts.html` của NCC)
- [x] Frontend tab "Thanh toán & Công nợ" (đợt thanh toán + số liệu Nợ phát sinh/Đã thu/Còn phải thu, nút "Ghi nhận đã thu" điều hướng sang `customer-debts.html` tự chọn sẵn + khóa Khách hàng/Dự án/Đợt thanh toán) và tab "Phát sinh" (CRUD chi phí/vấn đề, "Giá trị hợp đồng thực tế" hiện thêm ở tab Tổng quan khi có chi phí đã duyệt)
- [x] Test qua API (curl): 1 khách hàng có 2 dự án (`DA000002`/`DA000003`), thanh toán riêng từng dự án → số dư khách hàng và "Còn phải thu" từng dự án đều đúng, không lẫn sang nhau; chọn đợt thanh toán của dự án khác hoặc dự án của khách hàng khác qua API đều bị chặn 400; xóa đợt đã có tiền thu bị chặn; phát sinh "vấn đề" ép `amount=0` dù client gửi gì
- [x] Test qua trình duyệt thật (CDP thô): thêm đợt thanh toán, bấm "Ghi nhận đã thu" mở đúng modal đã khóa + điền sẵn, ghi nhận thành công, số liệu cập nhật đúng khi quay lại trang dự án; thêm phát sinh chi phí đã duyệt → "Giá trị hợp đồng thực tế" ở tab Tổng quan cộng đúng; không lỗi console

**Đợt 5 — Báo cáo dự án (tùy chọn) — đã xong, 2026-08-05**
- [x] Đã hỏi 3 câu qua `AskUserQuestion` chốt bố cục (thẻ + bảng)/phạm vi (chỉ dự án đang hoạt động)/cột vật tư (số dòng vượt dự toán, có link) trước khi code
- [x] `backend/routes/reports.routes.js`: `GET /reports/projects` — tiến độ + trễ tiến độ (tái dùng `project.service.js`), còn phải thu (`debt_ledger`), số dòng vật tư vượt dự toán (`project_material_plan`), tính gộp 1 lần không N+1
- [x] `frontend/assets/project-detail.js`: hỗ trợ mở sẵn tab qua URL (`?tab=...`)
- [x] `reports.html`/`.js`: section "Dự án đang hoạt động" — 4 thẻ tổng hợp + bảng chi tiết, link "Vật tư" điều hướng đúng tab
- [x] Test qua API (curl) + trình duyệt thật (CDP thô): số liệu đúng, link điều hướng đúng tab, không lỗi console — **module "Quản lý dự án" hoàn thành trọn vẹn 5/5 đợt theo kế hoạch gốc**

**Bổ sung: đổi thẻ "Trễ tiến độ" thành "Tổng giá trị hợp đồng" (2026-08-07, theo yêu cầu người dùng)**
- [x] Đã hỏi 2 câu qua `AskUserQuestion` (phạm vi tính: chỉ dự án đang hoạt động; cột dữ liệu: `contract_value` gốc, không cộng phát sinh) trước khi code
- [x] `backend/routes/reports.routes.js`: thêm `contract_value` vào SELECT + item, thêm `total_contract_value` vào `summary`, bỏ `late_count` (không còn nơi dùng)
- [x] `frontend/assets/reports.js`: đổi thẻ thứ 2 từ "Trễ tiến độ" sang "Tổng giá trị hợp đồng"
- [x] Nhãn "Trễ N ngày" ở bảng chi tiết từng dự án (`renderProjectDelayCell()`) giữ nguyên, không đổi
- [x] Test qua API (khớp tay: 500.000.000đ/3 dự án) + trình duyệt thật (CDP thô): thẻ đúng vị trí/nội dung, badge trễ ở bảng vẫn hoạt động, không lỗi console

**Bổ sung: bộ lọc kỳ theo tháng/khoảng ngày + đổi thẻ "Dự án vượt dự toán vật tư" thành "Tổng số tiền đã thu" (2026-08-07, theo yêu cầu người dùng)**
- [x] Đã hỏi 2 câu qua `AskUserQuestion` (phạm vi bộ lọc: chỉ thẻ mới; mốc "đã thu": ngày thực trả, không phải due_date) trước khi code
- [x] `backend/routes/reports.routes.js`: thêm `monthBoundsUtc()`/`dateRangeBoundsUtc()` (giờ VN cố định, duplicate theo tiền lệ dự án) + `getTotalCollectedInPeriod()` (dò cumulative từng đợt thanh toán theo `created_at`, chỉ tính vào kỳ có lần trả HOÀN TẤT)
- [x] `GET /reports/projects` nhận `?month=`/`?from=&to=`, mặc định tháng hiện tại; trả thêm `period` + `summary.total_collected_amount`; bỏ `summary.over_budget_projects_count` (giữ nguyên `over_budget_count` từng dự án cho bảng chi tiết)
- [x] Frontend: khối chuyển đổi "Theo tháng"/"Khoảng ngày" trên `#project-stats` (tái dùng `.month-select`/`.filter-select` có sẵn, không dùng `<input type="month">`), auto-tải lại khi đổi lựa chọn
- [x] Test qua service trực tiếp (1 đợt trả đủ 1 lần, 1 đợt trả 2 lần khác tháng — chỉ tính đúng kỳ có lần trả hoàn tất) + trình duyệt thật (CDP thô, click thật). Phát hiện + sửa 1 lỗi kịch bản test (viewport headless quá thấp khiến click không trúng nút, không phải lỗi ứng dụng — xác nhận qua gọi hàm JS trực tiếp trước khi sửa test). Đối chiếu số liệu thật khớp đúng 100% (120.000.000đ)

### Định dạng dấu chấm phân cách hàng nghìn khi nhập số tiền (ngoài phase, theo yêu cầu người dùng 2026-08-05)

- [x] `frontend/assets/money-input.js` (mới): `bindMoneyInputs()`/`getMoneyValue()`/`setMoneyValue()` dùng chung
- [x] Đổi 11 trường tiền trên 9 trang từ `type="number"` sang `type="text" class="money-input"`: `products.html`, `stock-receipts.js`/`stock-issues.js` (dòng động), `projects.html`, `project-detail.html` (đợt thanh toán + phát sinh), `customer-categories.html`, `cash-book.html` (phiếu + quỹ đầu kỳ), `debts.html`/`customer-debts.html` (thanh toán + điều chỉnh)
- [x] Test qua trình duyệt thật (CDP thô, gõ ký tự thật): cả 11 trường + dòng phiếu nhập (tính "Thành tiền"), không lỗi console

### Module "Đối tác" (ngoài phase, theo yêu cầu người dùng 2026-08-05)

> Đã hỏi 2 câu qua `AskUserQuestion` trước khi code (tách biệt hoàn toàn với Nhà cung cấp/Khách hàng, xóa chỉ đúng vai trò Admin `is_protected`) — chi tiết đầy đủ `docs/DECISIONS.md`.

- [x] Migration `026_contacts.sql`: bảng `contacts` (Họ và tên/SĐT/Địa chỉ/Nghề nghiệp/Ngày sinh/Ghi chú), độc lập hoàn toàn với `partners`
- [x] `backend/config/modules.js`: thêm module `doi_tac` vào `MODULE_KEYS`/`MODULE_LABELS` — trang "Vai trò" tự động hiện checkbox mới, không cần sửa `roles.routes.js`/`roles.js`
- [x] `backend/routes/contacts.routes.js` (mới): CRUD, GET/POST/PUT theo quyền `doi_tac` (kiểm tra ở `server.js`), DELETE kiểm tra thêm `req.session.user.is_protected` ngay trong file (giống `warranties.routes.js`)
- [x] Frontend `contacts.html`/`assets/contacts.js` (mới, rập khuôn `warranties.html`): danh sách + tìm kiếm theo tên/SĐT, modal thêm/sửa, nút Xóa chỉ hiện với Admin
- [x] Trang "Xem chi tiết" (bổ sung ngay sau, theo yêu cầu người dùng): `frontend/contact-detail.html`/`assets/contact-detail.js` (mới, rập khuôn `customer-detail.html`) — đủ 6 trường + Ngày tạo, nút Sửa điều hướng `contacts.html?edit=ID` (mở sẵn modal), nút Xóa chỉ hiện với Admin; icon "Xem chi tiết" thêm vào từng dòng ở `contacts.js`
- [x] `frontend/assets/icons.js` thêm icon `contact`; `frontend/assets/layout.js` thêm nhóm nav "Đối tác" (sau "Khách hàng", trước "Dự án")
- [x] `docs/PRD.md` (mục 4.13 mới), `docs/erd.mermaid` (bảng `CONTACTS`)
- [x] Test qua API (curl): CRUD đúng, tài khoản chưa có quyền `doi_tac` bị chặn 403, tài khoản có quyền `doi_tac` nhưng không phải Admin bị chặn đúng khi xóa (403), khôi phục lại quyền vai trò Thủ kho về nguyên trạng sau test
- [x] Test qua trình duyệt thật (Chrome headless CDP thô, script Node dùng `WebSocket` built-in): thêm/sửa/xóa qua đúng thao tác UI thật, trang "Vai trò" tự hiện "Đối tác", không lỗi console

### Hệ thống thông báo (ngoài phase, theo yêu cầu người dùng 2026-08-05 — hoàn thành phiên bản đầu)

> Ban đầu tạm dừng sau khi chốt 7 quyết định qua `AskUserQuestion` để ưu tiên làm module "Đối tác" trước — sau khi Đối tác xong, người dùng yêu cầu làm tiếp với phạm vi cụ thể hơn: 3 loại (thanh toán NCC/KH, sinh nhật đối tác — dùng `contacts` thay vì `partners` như dự tính ban đầu), cấu hình nhiều mốc nhắc lịch, card sinh nhật ở Tổng quan, thêm trường "Sở thích". Chi tiết đầy đủ `docs/DECISIONS.md`.

- [x] Migration `027_notifications.sql`: `contacts.hobby` (mới), `notification_settings` (singleton, `birthday_reminder_days` dạng CSV nhiều mốc), `notifications` (co `dedupe_key` UNIQUE), `notification_reads` (đọc riêng từng user)
- [x] `backend/services/notification.service.js`: `notifySupplierPayment()`/`notifyCustomerPayment()`, `ensureBirthdayNotifications()` (quét MỖI LẦN gọi, không gate theo ngày — xem quyết định kỹ thuật ở `docs/DECISIONS.md`), `daysUntilNextBirthday()`
- [x] `backend/services/debt.service.js#recordPayment()`: gọi `notifySupplierPayment()`/`notifyCustomerPayment()` theo `partner.type`, bọc try/catch không chặn luồng thanh toán chính nếu ghi thông báo lỗi
- [x] `backend/routes/notifications.routes.js` (GET/unread-count/POST :id/read/POST read-all, mở cho mọi tài khoản) + `notificationSettings.routes.js` (GET mở, PUT quyền `cau_hinh`)
- [x] `backend/routes/contacts.routes.js`: thêm `GET /birthdays-this-month` (mở cho MỌI tài khoản, không đòi quyền `doi_tac` — dùng cho card Tổng quan) + trường `hobby` trong CRUD
- [x] `server.js`: đổi cách mount `/api/contacts` (quyền `doi_tac` chuyển vào kiểm tra riêng từng route thay vì gán chung ở đây) để route `birthdays-this-month` mở được cho mọi người
- [x] Frontend: chuông nổi + popup toast realtime (giả lập qua polling 20s) trực tiếp trong `frontend/assets/layout.js` (không tạo file riêng, không sửa từng trang HTML)
- [x] `frontend/notification-settings.html`/`.js` (mới, menu Cấu hình): 3 toggle + danh sách mốc nhắc lịch sinh nhật (thêm/xóa từng mốc, dùng lại pattern `.member-picker-row`/`.member-list`)
- [x] Card "Sinh nhật trong tháng" trên `dashboard.html`/`.js`: đỏ khi còn ≤3 ngày, hiện ngày sinh — đã thu gọn mỗi dòng còn 1 dòng duy nhất (~30px) sau phản hồi người dùng
- [x] `frontend/contacts.html`/`.js`, `contact-detail.html`/`.js`: thêm trường "Sở thích"
- [x] Sửa 2 lỗi CSS `[hidden]` bị `display` đè phát hiện khi test (`.notification-panel`, `.notification-badge`) — thêm `:not([hidden])`
- [x] Đổi vị trí chuông xuống góc dưới-phải (ban đầu ở trên) + popup toast hiện ngay trên chuông, theo phản hồi người dùng
- [x] Test qua API (curl): dedupe sinh nhật đúng (không tạo trùng khi quét lại), hook thanh toán tạo đúng thông báo đúng nội dung mẫu yêu cầu
- [x] Test qua trình duyệt thật (CDP thô, `fetch` built-in thay `curl` qua `child_process.exec` để né lỗi quoting trên Windows cmd.exe): toast xuất hiện đúng vị trí/nội dung/tự ẩn sau 4s, panel thu gọn đúng khi bấm ra ngoài, trang cấu hình lưu/tải lại đúng, card sinh nhật hiện đúng + đỏ đúng ngưỡng

### Sửa trang Báo cáo: phân trang + số tiền không xuống dòng + khớp chiều cao (ngoài phase, theo phản hồi người dùng kèm ảnh chụp 2026-08-05)

- [x] `reports.html`/`.js`: phân trang bảng tồn kho (15 dòng/trang, nút Trước/Sau, `.pagination` — tư vấn qua skill `ui-ux-pro-max` trước khi code)
- [x] `style.css`: `.report-chart-row .stat-card-value` giảm cỡ chữ + `white-space:nowrap` + `text-overflow:ellipsis` dự phòng; `title` gắn qua `reports.js` để xem đủ khi bị cắt
- [x] `style.css`: `.report-chart-svg` đổi từ `height:auto` (phụ thuộc bề rộng màn hình) sang **cố định 200px**, `.report-chart-row .stat-grid` đặt `min-height` cố định tương ứng — khớp tuyệt đối với khung biểu đồ, áp dụng chung cho cả "Mua hàng" và "Bán hàng theo tháng"
- [x] `.icon-btn:disabled` (mới, dùng cho nút Trước/Sau ở trang đầu/cuối)
- [x] Test qua trình duyệt thật: seed 16 sản phẩm test xác nhận phân trang 15/5 đúng, nút Trước/Sau disable đúng, chiều cao 2 biểu đồ khớp tuyệt đối (0px lệch), số tiền không xuống dòng — xóa sạch dữ liệu test sau khi xong

### Cấu hình mẫu in — bắt đầu với Phiếu xuất kho (ngoài phase, theo yêu cầu người dùng 2026-08-05)

> Đã lên kế hoạch qua `EnterPlanMode` + chốt 3 quyết định phạm vi qua `AskUserQuestion` trước khi code (bảng sản phẩm chỉ bật/tắt+sắp xếp cột có sẵn không tự vẽ bảng tay, chỉ khổ A4 dọc/ngang, mỗi loại phiếu đúng 1 mẫu sửa trực tiếp) — chi tiết đầy đủ `docs/DECISIONS.md`.

- [x] Migration `028_print_templates.sql`: bảng `print_templates` (`type` UNIQUE, `header_html`/`footer_html`, `table_columns` JSON, `orientation`), seed dòng `stock_issue` dựng lại đúng y hệt layout tĩnh cũ
- [x] `backend/config/printTemplateTokens.js` (mới): registry token + cột bảng theo từng loại phiếu + nội dung mặc định ("factory default")
- [x] `backend/routes/printTemplates.routes.js` (mới): `GET /`, `GET /:type`, `GET /:type/tokens`, `GET /:type/default` (mở), `PUT /:type` (quyền `cau_hinh`) — mount `server.js` giống pattern `companySettings.routes.js`
- [x] `frontend/assets/print-template-render.js` (mới, dùng chung trang in thật + khung xem trước): `buildStockIssueTokenValues()`, `applyPrintTemplateTokens()`, `renderPrintTable()`, `SAMPLE_STOCK_ISSUE_DATA`
- [x] `frontend/print-templates.html`/`.js` (mới, menu Cấu hình): danh sách loại phiếu đã có mẫu, không có nút tạo mới
- [x] `frontend/print-template-edit.html`/`.js` (mới, dùng skill `ui-ux-pro-max` trước khi viết CSS): toolbar định dạng + chèn token, cấu hình cột bảng (checkbox + mũi tên sắp xếp), toggle khổ giấy, khung xem trước trực quan
- [x] `frontend/print-issue.html`/`.js`: viết lại hoàn toàn phần render, bỏ markup tĩnh hardcode, dựng động từ mẫu đã lưu; tự chèn `<style>@page{size:A4 landscape;}</style>` khi mẫu là khổ ngang
- [x] `frontend/assets/icons.js` (6 icon toolbar mới: bold/italic/underline/alignLeft/alignCenter/alignRight), `frontend/assets/layout.js` (mục nav "Mẫu in")
- [x] `style.css`: `.print-sheet--landscape` + toàn bộ pattern mới cho trang chỉnh sửa (`.pt-*`)
- [x] Test qua API (curl): GET/PUT đúng, chặn 403 thiếu quyền `cau_hinh`, chặn 400 dữ liệu không hợp lệ
- [x] Test qua trình duyệt thật (Chrome headless CDP thô): danh sách + trình soạn thảo hoạt động đúng đầy đủ thao tác; **regression bắt buộc** — phiếu xuất kho thật có sẵn (PX000016) render khớp đúng 100% dữ liệu gốc sau khi đổi cơ chế, không lỗi console. Mẫu in đã khôi phục về đúng bản seed mặc định sau khi test xong.

**Bổ sung: chỉnh độ rộng cột + dòng "Số tiền viết bằng chữ" (cùng ngày 2026-08-05, theo phản hồi người dùng ngay sau khi thử tính năng trên)**
- [x] Migration `029_print_template_extra_options.sql`: `print_templates.show_amount_in_words`
- [x] `table_columns` đổi sang mảng object `{key,width}` (tỉ lệ tương đối) — `normalizeTableColumns()` mới trong `print-template-render.js` tự quy đổi dữ liệu cũ (mảng chuỗi) sang độ rộng đều nhau, không cần migrate lại dữ liệu đã lưu
- [x] `print-template-render.js`: `numberToVietnameseWords()` (đọc số tiền thành chữ tiếng Việt, thuần JS), `renderPrintTable()` dựng `<colgroup>` theo độ rộng đã chuẩn hóa + thêm dòng "Số tiền viết bằng chữ" cố định trong `tfoot` (bật/tắt qua `showAmountInWords`)
- [x] `style.css`: `.print-table` đổi `table-layout:fixed` + `overflow-wrap:break-word` trên `td`/`th`; `.pt-column-width`/`.print-amount-words` mới
- [x] `print-template-edit.html`/`.js`: ô nhập "Độ rộng (%)" từng dòng cột, checkbox "Hiển thị dòng Số tiền viết bằng chữ"
- [x] `backend/routes/printTemplates.routes.js`: validate `table_columns` dạng object mới, đọc/lưu `show_amount_in_words`
- [x] Test qua API (curl) + trình duyệt thật: phiếu xuất kho thật (PX000016) hiển thị đúng dòng số tiền bằng chữ + cột co giãn đúng tỉ lệ. Phát hiện dữ liệu mẫu in thật đã bị người dùng tự chỉnh qua UI giữa lúc phát triển (không phải lỗi) — chỉ còn test đọc (read-only), không chạy lại kịch bản Save/Reset để tránh ghi đè tùy chỉnh thật.

**Bổ sung: sửa 3 lỗi hiển thị (cùng ngày 2026-08-05, theo ảnh chụp phản hồi người dùng)**
- [x] `print-template-render.js#applyPrintTemplateTokens()`: thay `<span data-token>` bằng text node thuần thay vì chỉ đổi `textContent` — chip màu xanh (chỉ nên thấy lúc soạn thảo) không còn "rò rỉ" ra bản in thật/khung xem trước
- [x] `style.css`: `.print-table th` căn giữa (`text-align:center`), tách riêng `td.print-num` khỏi rule căn phải
- [x] `style.css`: `.page-header-actions`/`.btn-secondary`/`.btn-primary` thêm `white-space:nowrap`/`flex-shrink:0`/`text-decoration:none` — sửa nút "Quay lại" (thẻ `<a>` đầu tiên dùng pattern này) bị nén xuống dòng + gạch chân
- [x] Test qua trình duyệt thật (chỉ đọc, không Save/Reset): xác nhận 0 chip còn sót trong bản in thật (PX000016) + khung xem trước, tiêu đề cột `text-align:center`, nút đầu trang cùng chiều cao 1 dòng không gạch chân, vùng soạn thảo vẫn giữ đúng chip để dùng bình thường, không lỗi console

**Bổ sung tiếp: nút "Lưu mẫu" quá khổ + đậm chữ thông tin công ty + bỏ "đ" thừa (cùng ngày 2026-08-05)**
- [x] `style.css`: `.page-header-actions .btn-primary` thêm `width:auto` (bỏ `width:100%` kế thừa từ `.btn-primary` mặc định)
- [x] `style.css`: `.print-header p` đổi màu `--color-muted-foreground` → `--color-foreground` + `font-weight:500`
- [x] `print-template-render.js#renderPrintTable()`: bỏ hậu tố `đ` ở ô `.print-total-value`
- [x] Test qua trình duyệt thật (chỉ đọc): 3 nút đầu trang cùng cỡ hợp lý, màu/độ đậm thông tin công ty đúng, số tổng cộng không còn "đ", không lỗi console

**Bổ sung: token "Số tiền tạm ứng bằng chữ" + đính kèm hình ảnh tự do (2026-08-06, theo yêu cầu người dùng)**
- [x] `backend/config/printTemplateTokens.js`/`print-template-render.js`: token mới `advance_amount_words` cho mẫu "Giấy đề nghị tạm ứng" (dùng lại `numberToVietnameseWords()`), không tự chèn sẵn vào mẫu mặc định
- [x] `backend/db/database.js`: thêm `db.dataDir` (nguồn dùng chung cho file runtime ngoài `data.db`)
- [x] `backend/routes/printTemplates.routes.js`: `POST /:type/images` (quyền `cau_hinh`, multer memoryStorage ≤3MB, chỉ PNG/JPG/WEBP/GIF) — lưu file vào `data/print-template-uploads/<type>/`, trả URL tĩnh
- [x] `backend/server.js`: static serve công khai `/uploads/print-templates`; `.gitignore` thêm `data/print-template-uploads/`
- [x] `frontend/print-template-edit.html`/`.js`: nút "Chèn hình ảnh" (dùng chung mọi loại mẫu) — chụp `Range` con trỏ lúc bấm nút (`pendingImageRange`, giữ đúng vị trí qua lúc hộp thoại chọn file chiếm focus), tải file lên rồi tự chèn `<img class="pt-inline-image">` đúng vị trí đó
- [x] `frontend/assets/icons.js`: icon `image` mới; `style.css`: `.pt-editable img, .print-sheet img { max-width:100%; height:auto }`
- [x] Test qua API (curl): upload hợp lệ/sai định dạng/thiếu file/loại mẫu không tồn tại/chưa đăng nhập
- [x] Test qua trình duyệt thật (Chrome headless, **click thật** qua CDP `Input.dispatchMouseEvent` + `Page.fileChooserOpened` + `DOM.setFileInputFiles` — không bypass code mới): chèn đúng vị trí, hiện đúng khung xem trước, lưu/đọc lại đúng, nút có ở cả 2 loại mẫu in, không lỗi console. Đã khôi phục mẫu mặc định + xóa file test trên đĩa sau khi xong.

**Bổ sung: đậm-nghiêng "Số tiền bằng chữ" + bỏ chữ "Chi nhánh" thừa + popup xem trước khi in (2026-08-06, theo phản hồi người dùng)**
- [x] `backend/config/printTemplateTokens.js`: chèn token `advance_amount_words` vào `PROJECT_ADVANCE_DEFAULT_HEADER_HTML` (dòng mới, bọc `<strong><em>`); đồng bộ dòng dữ liệu thật trong `print_templates` qua API (xác nhận trước chưa bị người dùng tự sửa)
- [x] `print-template-render.js#buildBankNameBranchLine()`: bỏ chữ "Chi nhánh " thừa trước tên chi nhánh
- [x] `style.css`: `.print-advance-amount-words` (mới) + giảm margin-bottom `.print-advance-amount`
- [x] `frontend/assets/print-preview.js` (mới, dùng chung): `openPrintPreview(url)` (tiêm/mở popup iframe full-screen ngay trên trang hiện tại), `closePrintPreview()`, `goBackFromPrintPage(fallbackUrl)` (cho nút "Quay lại" bên trong 2 trang in tự nhận biết đang chạy trong popup hay mở trực tiếp qua URL)
- [x] `print-issue.html`/`.js`, `print-project-advance.html`/`.js`: nạp `print-preview.js`, đổi nút "Quay lại" dùng `goBackFromPrintPage()`; `print-issue.html`: đổi `<a href>` thành `<button>`
- [x] `stock-issues.html`/`.js`, `project-detail.html`/`.js`: nạp `print-preview.js`; nút in đổi từ `<a target="_blank">` sang `<button data-action="print"/"print-milestone">`, gọi `openPrintPreview(...)` trong listener delegated đã có sẵn
- [x] `style.css`: `.print-preview-modal`/`.print-preview-topbar`/`.print-preview-iframe` (mới, `z-index:200`)
- [x] Test qua trình duyệt thật (Chrome headless, click thật, dữ liệu có sẵn PX000016 + đợt thanh toán DA000003): xác nhận 0 tab/cửa sổ mới mở (theo dõi `Target.targetCreated`), popup hiện đúng, "Quay lại" đóng popup không điều hướng, tự ẩn đúng khi giả lập `afterprint`, 2 nội dung sửa hiển thị đúng, không lỗi console
- [x] **Sửa lỗi phát hiện ngay sau đó** (phản hồi người dùng kèm ảnh): `.print-preview-modal` thiếu `:not([hidden])` (đúng lỗi CSS `[hidden]` bị `display` đè đã lặp lại nhiều lần trong dự án) — popup không ẩn được thật sự. Test lại bằng computed style + bounding box qua CDP (không chỉ đọc `.hidden` như lượt đầu)
- [x] **Sửa lỗi thứ 2 phát hiện ngay sau đó** (2 nút "Quay lại" chồng nhau): bỏ hẳn thanh công cụ riêng của popup, chỉ dùng thanh công cụ có sẵn bên trong trang in được nhúng
- [x] **Sửa lỗi thứ 3 phát hiện ngay sau đó** (nút B/I/U không tác dụng khi chọn chip token — `execCommand()` bỏ qua nội dung `contenteditable="false"`): `applyFormatCommand()` tự bọc/gỡ `<strong>`/`<em>`/`<u>` quanh chip bằng tay (song song `execCommand()` cho chữ thường); dọn thêm thẻ rỗng khi xóa chip đã bọc

### Sửa 3 lỗi modal "Ghi nhận thanh toán" — luồng "Ghi nhận đã thu" từ Dự án (ngoài phase, theo phản hồi người dùng 2026-08-05)

- [x] `style.css`: `.form-row > .form-field > label` thêm `min-height:38px` + `display:flex; align-items:flex-end` — sửa lệch hàng 2 ô "Dự án"/"Đợt thanh toán" (áp dụng chung mọi `.form-row`)
- [x] `customer-debts.js`: cache `paymentMilestonesCache`, hàm `autofillAmountFromMilestone()` tự điền "Số tiền" theo `remaining_amount` của đợt đã chọn (gắn cả vào sự kiện chọn tay lẫn URL preset)
- [x] `project-detail.js`: nút "Ghi nhận đã thu" trên từng dòng đợt thanh toán tự disable khi `status === 'da_thu_du'`
- [x] `customer-debts.js#applyPaymentPresetFromUrl()`: khóa ô Số tiền/Ghi chú/nút Ghi nhận + hiện thông báo khi preset trỏ tới 1 đợt đã thu đủ; `openPaymentModal()` tự mở khóa lại các trường này mỗi lần mở modal (tránh trạng thái khóa "dính" từ lần mở trước)
- [x] Test qua trình duyệt thật (CDP thô, chỉ đọc — không tạo bản ghi công nợ thật): dùng dữ liệu thật `DA000003` (đợt còn 300.000 và đợt đã thu đủ 10.000.000) xác nhận cả 3 lỗi đã sửa đúng, không lỗi console

### In "Giấy đề nghị tạm ứng" theo đợt thanh toán dự án (ngoài phase, theo yêu cầu người dùng kèm mẫu PDF thật, 2026-08-05)

> Đã lên kế hoạch qua `EnterPlanMode` + chốt 1 quyết định qua `AskUserQuestion` trước khi code (phần "Đại diện bởi"/tên người ký nhập cố định trực tiếp trong mẫu, không thêm trường mới vào `company_settings`) — chi tiết đầy đủ `docs/DECISIONS.md`.

- [x] Migration `030_print_template_project_advance.sql`: seed 1 dòng `type='project_payment_advance'` (không cần `ALTER TABLE`)
- [x] `backend/config/printTemplateTokens.js`: thêm entry `project_payment_advance` (`hasTable:false`, 8 token đầu trang + 4 token chân trang), thêm `hasTable:true` cho entry `stock_issue`
- [x] `backend/routes/printTemplates.routes.js`: `GET /:type/tokens` trả thêm `hasTable`; `PUT /:type` bỏ qua validate cột khi `hasTable=false`
- [x] `frontend/assets/print-template-render.js`: `formatDateVNLong()`, `buildProjectAdvanceTokenValues()`, `SAMPLE_PROJECT_ADVANCE_DATA`, registry `PRINT_TYPE_HANDLERS` (tổng quát cho mọi loại phiếu)
- [x] `frontend/assets/print-template-edit.js`: tổng quát hóa theo `hasTable` (ẩn/hiện khối cột+checkbox, đổi mô tả 2 vùng soạn thảo, `updatePreview()` dùng `PRINT_TYPE_HANDLERS`)
- [x] `frontend/print-project-advance.html`/`assets/print-project-advance.js` (mới, không có bảng)
- [x] `frontend/assets/project-detail.js`: icon "In giấy đề nghị tạm ứng" trên từng dòng đợt thanh toán
- [x] `frontend/assets/print-templates.js`: thêm nhãn loại phiếu mới vào danh sách
- [x] `style.css`: `.print-advance-*` (dùng `--color-foreground`, không dùng muted — áp dụng bài học lần trước)
- [x] Test qua API (curl) + trình duyệt thật (CDP thô, dữ liệu thật dự án `DA000001`): token hiện đúng, không chip xanh sót, chữ công ty màu đen. **Hồi quy bắt buộc**: mở lại mẫu `stock_issue` (chỉ đọc, không Save/Reset vì mẫu thật đã bị người dùng tự chỉnh trước đó) — xác nhận không đổi gì, không lỗi console

### Thêm nhóm trường "Thông tin phiếu in" cho Đợt thanh toán (ngoài phase, theo yêu cầu người dùng 2026-08-06)

- [x] Migration `031_project_milestone_recipient.sql`: `project_payment_milestones.recipient_name`/`recipient_title` (không bắt buộc, `recipient_title` có `CHECK` giới hạn 4 giá trị + rỗng)
- [x] `backend/routes/projectMilestones.routes.js`: đọc/validate/lưu 2 trường mới ở cả `POST`/`PUT`
- [x] `frontend/project-detail.html`: modal "Thêm/Sửa đợt thanh toán" thêm nhóm `.section-heading` "Thông tin phiếu in" + ô "Gửi đến" + `<select>` "Danh xưng" (Anh/Chị/Công Ty/Đơn vị)
- [x] `frontend/assets/project-detail.js`: điền lại giá trị khi sửa, gửi lên API khi lưu
- [x] `backend/config/printTemplateTokens.js`: thêm token `recipient_title`/`recipient_name` vào mẫu "Giấy đề nghị tạm ứng" (`project_payment_advance`)
- [x] `frontend/assets/print-template-render.js`: `buildProjectAdvanceTokenValues()` tính giá trị 2 token mới (map mã danh xưng → nhãn tiếng Việt), cập nhật dữ liệu mẫu cho khung xem trước
- [x] `docs/erd.mermaid`: bổ sung 2 cột vào entity `PROJECT_PAYMENT_MILESTONES`
- [x] Test qua API (Node `fetch`): tạo/sửa/validate `recipient_title` sai bị chặn 400, dữ liệu test đã xóa sạch. Test qua trình duyệt thật (Chrome headless CDP thô): modal hiện đúng nhóm trường + 4 lựa chọn danh xưng; trang chỉnh mẫu in có đủ 2 token mới trong dropdown "Chèn trường thông tin", chèn thử vào đầu trang → khung xem trước hiển thị đúng giá trị mẫu, không lưu đè mẫu in thật đã được người dùng tự tùy chỉnh trước đó

### "Trả hàng xuất" — khách hàng trả lại hàng đã mua (ngoài phase, theo yêu cầu người dùng 2026-08-06)

> Đã lên kế hoạch qua `EnterPlanMode` + chốt 4 quyết định phạm vi qua `AskUserQuestion` trước khi code (Số lượng đã xuất tự tính chỉ đọc, chặn cứng khi trả vượt số còn lại, không cần gắn đích danh phiếu xuất gốc, tách biệt hoàn toàn khỏi danh sách Phiếu nhập kho) — chi tiết đầy đủ `docs/DECISIONS.md`.

- [x] Migration `032_stock_returns.sql`: `stock_receipts.is_return` (mặc định 0), `stock_receipt_items.sale_price` (nullable) — tái dùng cơ chế `stock_receipts`/`stock_movements`/`stock_lots` hiện có, không tạo bảng mới (lý do `CHECK` trên `reference_type` của `stock_movements`/`debt_ledger`, xem `docs/DECISIONS.md`)
- [x] `backend/services/debt.service.js`: thêm `recordReturnCredit()` (`type='tra', reference_type='receipt'`, không dùng `recordDebtFromDocument()`)
- [x] `backend/services/stockReturn.service.js` (mới): `createStockReturn()` (transaction đầy đủ: validate khách hàng + công trình, `getReturnReference()` tính "Đã xuất/Đã trả/Còn lại có thể trả" on-the-fly, sinh mã `TH...`, insert phiếu+items+movements+lots với `unit_cost` tự động = giá vốn bình quân gia quyền hiện tại, gọi `recordReturnCredit()`)
- [x] `backend/routes/stockReturns.routes.js` (mới): `GET /`, `GET /:id`, `GET /reference`, `POST /` — mount `server.js` dùng quyền `kho` có sẵn
- [x] `backend/routes/stockReceipts.routes.js`: `GET /` thêm `WHERE r.is_return = 0` để ẩn phiếu trả khỏi danh sách Phiếu nhập kho
- [x] `backend/routes/projectMaterials.routes.js` (`getDocumentsForProject`): SELECT thêm `r.is_return`
- [x] `frontend/stock-returns.html`/`assets/stock-returns.js` (mới): danh sách + tìm kiếm (mã phiếu/tên/SĐT khách hàng) + modal "Lập phiếu trả hàng" (Khách hàng, Công trình tự lọc theo khách hàng đang chọn, dòng sản phẩm có "Đã xuất" tự tính chỉ đọc + "Số lượng trả lại" + "Giá bán" tự điền) + modal xem chi tiết
- [x] `frontend/assets/icons.js`: icon `undo` mới; `frontend/assets/layout.js`: mục nav "Trả hàng xuất" (nhóm Kho, sau "Xuất kho")
- [x] `frontend/assets/customer-debts.js`: badge "Trả hàng" trong lịch sử giao dịch (nhận diện qua `type==='tra' && !is_adjustment && reference_type==='receipt'`)
- [x] `frontend/assets/project-detail.js`: nhãn "Trả hàng" thay "Nhập kho" trong tab Vật tư khi `is_return=1`
- [x] `docs/erd.mermaid`, `docs/PRD.md` (mục 4.15 mới)
- [x] Test qua API (Node `fetch`): tồn kho tăng đúng "Số lượng trả lại" (không phải "Số lượng đã xuất"), công nợ giảm đúng, `debt_ledger` ghi đúng `type='tra', reference_type='receipt'`; chặn đúng khi trả vượt số còn lại (400); chặn đúng đối tác không phải khách hàng (400); không xuất hiện ở `GET /stock-receipts`; "Đã xuất/Còn lại" tính đúng sau khi trả
- [x] Test qua trình duyệt thật (Chrome headless CDP thô): lập phiếu đầy đủ luồng qua UI thật (chọn khách hàng → công trình tự lọc đúng theo khách hàng → chọn sản phẩm qua combobox thật → "Đã xuất" hiện đúng → nhập số lượng/giá bán → lưu), tìm kiếm đúng theo mã phiếu/tên/SĐT, modal chi tiết hiện đúng, badge "Trả hàng" hiện đúng ở Công nợ khách hàng, nhãn "Trả hàng" hiện đúng ở tab Vật tư dự án (dùng dự án test, không đụng dữ liệu thật "Villa Kỳ Duyên"), trang "Phiếu nhập kho" xác nhận không lẫn mã `TH...`, không lỗi console

### "Trả hàng": quy trình 2 bước Lưu (nháp) / Trừ kho (thực thi) + đổi tên menu (ngoài phase, theo yêu cầu người dùng 2026-08-06, ngay sau khi hoàn thành mục trên)

- [x] Migration `033_stock_return_draft.sql`: `stock_receipts.status` (`cho_tru_kho`/`da_tru_kho`, mặc định `da_tru_kho` — không ảnh hưởng phiếu nhập kho thường)
- [x] `backend/services/stockReturn.service.js`: viết lại — `validatePartnerAndProject()`/`validateItemsShape()`/`validateRemaining()` tách riêng; `applyProcessing()` (dùng chung, đọc lại items từ DB, validate số lượng còn lại + tính giá vốn bình quân + ghi movements/lots/`recordReturnCredit()` + khóa `status='da_tru_kho')`; `createStockReturn({..., process})` (process=false chỉ lưu, process=true gọi `applyProcessing()` ngay — đúng y hệt hành vi 1 bước cũ); `updateStockReturn()` (sửa phiếu `cho_tru_kho`: thay toàn bộ phiếu+items); `processStockReturn()` ("Trừ kho" cho phiếu đã lưu trước đó); `getReturnReference()` chỉ tính phiếu `da_tru_kho` vào "đã trả"
- [x] `backend/routes/stockReturns.routes.js`: `SELECT` thêm `r.status`; `POST /` nhận `process` (mặc định false); thêm `PUT /:id` (sửa phiếu nháp) và `POST /:id/process` (trừ kho phiếu đã lưu)
- [x] `frontend/stock-returns.html`: đổi `<title>`/`<h2>` thành "Trả hàng"; thêm cột "Trạng thái"; modal đổi 1 nút submit thành 2 nút `type="button"` (`#btn-save-draft` "Lưu", `#btn-process-return` "Trừ kho"), tiêu đề modal đổi động qua `#return-modal-title`
- [x] `frontend/assets/stock-returns.js`: `renderReturnRow()` thêm badge trạng thái + icon Sửa/Trừ kho chỉ hiện khi `cho_tru_kho` (khóa vĩnh viễn sau khi `da_tru_kho`); `openEditModal()` (mới, dựng lại đầy đủ form + item rows từ dữ liệu đã lưu); `resolvePartnerId()`/`buildReturnBody()` tách dùng chung; nút "Lưu" gọi `POST`/`PUT` không `process`; nút "Trừ kho" — tạo mới thì `POST` kèm `process:true` (1 bước), đang sửa thì `PUT` lưu trước rồi mới gọi `POST /:id/process` (tránh mất dữ liệu vừa sửa); icon "Trừ kho" ngoài danh sách gọi thẳng `POST /:id/process` kèm `confirm()`
- [x] `frontend/assets/layout.js`: đổi nhãn nav từ "Trả hàng xuất" thành "Trả hàng"
- [x] `docs/erd.mermaid`, `docs/PRD.md` (mục 4.15 cập nhật quy trình 2 bước)
- [x] Test qua API (Node `fetch`): Lưu không đụng tồn kho/công nợ/`getReturnReference()`; sửa phiếu nháp cập nhật đúng; Trừ kho dùng đúng số liệu MỚI NHẤT sau khi sửa (không phải lúc tạo); sau khi trừ kho — sửa lại bị chặn 400, trừ kho lần 2 bị chặn 400; "Lưu" không chặn vượt số còn lại nhưng "Trừ kho" vẫn chặn đúng 400; tạo mới kèm `process:true` hoạt động y hệt hành vi 1 bước cũ
- [x] Test qua trình duyệt thật (Chrome headless CDP thô, đóng đúng theo PID cây tiến trình sau khi test): tiêu đề trang/menu đổi đúng "Trả hàng" (không còn "Trả hàng xuất"); tạo phiếu qua UI → Lưu → badge "Chờ trừ kho" đúng → bấm icon Sửa mở đúng modal + đúng dữ liệu → sửa số lượng → Lưu lại → bấm icon "Trừ kho" trên danh sách (có `confirm()`) → badge chuyển "Đã trừ kho" + icon Sửa/Trừ kho biến mất; xác nhận số liệu trừ kho đúng theo giá trị đã sửa (không phải giá trị lúc tạo ban đầu), không lỗi console

### "Trả hàng nhà cung cấp" + gộp chung danh sách "Trả hàng" (ngoài phase, theo yêu cầu người dùng 2026-08-06, ngay sau mục trên)

> Đã invoke skill `ui-ux-pro-max` cho 2 pattern UI mới (nút dropdown 2 lựa chọn, chip chọn giá nhập) trước khi code CSS — theo đúng nguyên tắc bắt buộc của dự án. Chi tiết quyết định kiến trúc đầy đủ `docs/DECISIONS.md`.

- [x] Migration `034_supplier_returns.sql`: `stock_issues.is_return` + `stock_issues.status` (mặc định `da_tru_kho`) — tái dùng `stock_issues`/`stock_issue_items` (không tạo bảng mới, `unit_price` có sẵn dùng đúng nghĩa lưu "Giá nhập", không cần cột mới)
- [x] `backend/services/debt.service.js`: tổng quát hóa `recordReturnCredit()` nhận thêm `referenceType` (`'receipt'`/`'issue'`) thay vì hardcode `'receipt'`; cập nhật lại call site trong `stockReturn.service.js`
- [x] `backend/services/supplierReturn.service.js` (mới): đối xứng `stockReturn.service.js` nhưng chiều ngược — `applyProcessing()` dùng `consumeStockForIssue()` (FIFO/bình quân gia quyền, giống phiếu xuất thường) + chặn cứng tồn kho không đủ (`allow_negative_stock`); `getSupplierReturnReference()` ("Đã nhập/Đã trả/Còn lại"); `getSupplierPrices()` (danh sách giá nhập phân biệt theo NCC+sản phẩm); `createSupplierReturn()`/`updateSupplierReturn()`/`processSupplierReturn()` cùng quy trình 2 bước
- [x] `backend/routes/supplierReturns.routes.js` (mới): `GET /`, `GET /reference`, `GET /prices`, `GET /:id`, `POST /`, `PUT /:id`, `POST /:id/process` — mount `server.js` dùng quyền `kho` có sẵn
- [x] `backend/routes/stockIssues.routes.js`: `GET /` thêm `WHERE i.is_return = 0` — **lỗi phát hiện khi test** (phiếu trả NCC lộ trong danh sách Phiếu xuất kho), đã sửa ngay
- [x] `frontend/assets/debts.js` (Công nợ NCC): thêm badge "Trả hàng" cho tổ hợp `type==='tra' && !is_adjustment && reference_type==='issue'`
- [x] `frontend/assets/style.css`: `.action-dropdown`/`.action-dropdown-menu`/`.action-dropdown-item` (nút dropdown 2 lựa chọn, cùng token với `.pt-token-dropdown` đã có); `.price-picker`/`.price-picker-hint`/`.price-chip` (khung chọn giá định vị tuyệt đối giống `.combobox-suggestions`, màu `--color-primary` để phân biệt với đỏ/cam dùng cho lỗi/cảnh báo nơi khác)
- [x] `frontend/stock-returns.html`: nút "+ Lập phiếu trả hàng" bọc trong `.action-dropdown` xổ 2 lựa chọn; thêm cột "Loại" vào bảng danh sách (đổi "Khách hàng"→"Đối tác"); thêm modal `#supplier-return-modal` mới (Nhà cung cấp, không có Công trình, cột "Đã nhập"/"Giá nhập")
- [x] `frontend/assets/stock-returns.js`: `loadReturns()` gọi song song `/stock-returns` + `/supplier-returns`, gộp + gắn `return_type`, sắp xếp chung theo ngày; `renderReturnRow()`/`openDetailModal()` nhận diện theo `return_type` để gọi đúng API + hiển thị đúng nhãn; toàn bộ logic combobox/item-row/Lưu/Sửa/Trừ kho cho "Trả hàng nhà cung cấp" viết riêng (rập khuôn cấu trúc "Trả hàng xuất", theo đúng tiền lệ `stock-receipts.js`/`stock-issues.js` đã tách riêng thay vì dùng chung) — thêm `refreshSupplierRowPrice()` (tra cứu/tự điền/hiện chip chọn giá)
- [x] `docs/erd.mermaid` (cột mới trên `STOCK_ISSUES`), `docs/PRD.md` (mục 4.15 bổ sung phần "Trả hàng nhà cung cấp")
- [x] Test qua API (Node `fetch`, dùng dữ liệu NCC có sẵn "Cong ty CP Thep Hoa Phat" — 1 sản phẩm có 2 giá nhập lịch sử, 1 sản phẩm chỉ 1 giá): tra giá đúng (1 giá / 2 giá phân biệt); Lưu draft không đụng tồn kho; sửa draft đổi số lượng đúng; Trừ kho làm tồn kho **giảm** đúng + công nợ NCC giảm đúng theo giá đã chọn; `debt_ledger` ghi đúng `type='tra', reference_type='issue'`; chặn đúng đối tác không phải NCC (400); sau khi trừ kho khóa đúng (sửa/trừ kho lại đều 400); xác nhận **không** lẫn trong `GET /stock-issues` (bắt được lỗi thiếu filter, đã sửa)
- [x] Test qua trình duyệt thật (Chrome headless CDP thô, đóng đúng theo PID cây tiến trình): nút dropdown xổ đúng 2 lựa chọn, chọn "Trả hàng nhà cung cấp" mở đúng modal; chọn NCC + sản phẩm có 2 giá lịch sử → hiện đúng chip `30.000`/`50.000`, bấm chip điền đúng vào ô; chọn sản phẩm chỉ 1 giá lịch sử → tự điền thẳng không hiện chip; "Đã nhập" hiển thị đúng; Lưu → Trừ kho qua icon danh sách → chuyển đúng "Đã trừ kho"; danh sách gộp hiển thị đúng cả 2 loại phiếu (cột "Loại"); trang Công nợ NCC hiện đúng badge "Trả hàng"; không lỗi console

### Sửa lỗi "Trả hàng nhà cung cấp" báo sai số lượng còn có thể trả + 2 lỗi liên quan (ngoài phase, theo phản hồi người dùng 2026-08-07)

- [x] Điều tra qua agent (chỉ đọc code) — chẩn đoán: `createSupplierReturn({process:true})` ghi `status='da_tru_kho'` ngay lúc INSERT trước khi validate, khiến `validateRemaining()` tự đếm nhầm chính phiếu đang tạo vào "đã trả"
- [x] `backend/services/supplierReturn.service.js#createSupplierReturn()`: luôn INSERT với `status='cho_tru_kho'`, để `applyProcessing()` tự đổi thành `'da_tru_kho'` ở cuối (sau khi validate) — thống nhất với luồng 2 bước vốn không lỗi
- [x] **Cùng lỗi phát hiện + sửa ở `backend/services/stockReturn.service.js#createStockReturn()`** ("Trả hàng xuất" khách hàng, đã hỏi và người dùng xác nhận sửa luôn) — cùng cách sửa
- [x] **Lỗi khác phát hiện tình cờ khi test, đã hỏi và người dùng xác nhận sửa luôn**: `generateReceiptCode()` (`stockReceipt.service.js`)/`generateIssueCode()` (`stockIssue.service.js`) không lọc `is_return` khi lấy "mã gần nhất" — nếu phiếu gần nhất là 1 phiếu Trả hàng (`TH...`/`TN...`) thì `parseInt()` trả về `NaN`, sinh mã hỏng `PN000NaN`/`PX000NaN` cho phiếu thường tiếp theo. Đã xác nhận dữ liệu thật chưa bị dính. Sửa bằng thêm `WHERE is_return = 0`, đúng cách 2 hàm sinh mã Trả hàng đã làm
- [x] Test qua service trực tiếp (dữ liệu test riêng, xóa sạch sau khi xong): tái hiện đúng kịch bản lỗi gốc (nhập 2, trả 2, Tạo+Trừ kho 1 bước) cho cả 2 chiều NCC/khách hàng — trước sửa lỗi, sau sửa thành công; tái hiện đúng kịch bản mã NaN cho cả PN/PX — trước sửa ra NaN, sau sửa ra mã hợp lệ. Đã restart server sau khi sửa

### Thêm nhanh khách hàng ngay trên form "Thêm dự án mới" (ngoài phase, theo yêu cầu người dùng 2026-08-06)

- [x] `frontend/projects.html`: thêm khối `#new-partner-fields` (tái dùng `.new-partner-inputs` có sẵn) dưới select "Khách hàng"
- [x] `frontend/assets/projects.js`: option `__new__` trong `loadCustomers()`, toggle hiện/ẩn khi đổi select, ép ẩn khi mở modal thêm/sửa, submit handler tạo khách hàng mới qua `POST /partners` trước khi tạo/sửa dự án, tải lại danh sách khách hàng sau khi lưu
- [x] Phát hiện + sửa lỗi phân quyền: `backend/routes/partners.routes.js#POST /` mở rộng `requireAnyPermission(['kho','cong_no','du_an'])` (trước đó tài khoản chỉ có quyền `du_an` sẽ bị 403) — đã hỏi và người dùng chọn hướng này
- [x] Test qua trình duyệt thật (CDP thô): mở modal → chọn thêm nhanh → khối nhập hiện đúng → lưu → xác nhận qua API khách hàng mới tạo đúng SĐT/địa chỉ, dự án gắn đúng `partner_id`, không lỗi console. Dữ liệu test đã xóa sạch

### Hạ tầng ghi log chẩn đoán: log server ra file + request chậm + lỗi JS trình duyệt (ngoài phase, theo yêu cầu người dùng 2026-08-06, ngay sau mục điều tra "đơ ứng dụng" bên dưới)

- [x] `backend/utils/logger.js` (mới): ghi `data/logs/server-YYYY-MM-DD.log` song song console, xoay theo ngày, tự dọn >14 ngày
- [x] `backend/server.js`: đổi `console.*` sang `log.*`; thêm `uncaughtException`/`unhandledRejection` (ghi log rồi thoát); middleware ghi log request ≥2s
- [x] `backend/routes/clientLogs.routes.js` (mới, `POST /api/client-logs`, không đòi đăng nhập) + mount `server.js`
- [x] `frontend/assets/api.js`: `window.addEventListener('error'/'unhandledrejection')` gửi về endpoint trên, dedupe theo message+url, đặt ở đây (không phải `layout.js`) vì nạp trên MỌI trang kể cả trước khi đăng nhập
- [x] `.gitignore`: thêm `data/logs/`
- [x] Test qua API (curl: POST giả lập lỗi ghi đúng file) + trình duyệt thật (CDP thô, không đăng nhập, ném lỗi JS thật + Promise reject thật trên `login.html` — cả 2 tự động ghi đúng vào log); restart server xác nhận không hồi quy
- [x] Middleware request chậm: chỉ xác nhận qua đọc code (chưa có cách an toàn giả lập request thật ≥2s để test trực tiếp)

### Điều tra "đơ ứng dụng" báo cáo từ 1 người dùng + sửa vòng lặp Gantt không giới hạn (ngoài phase, theo phản hồi người dùng 2026-08-06)

- [x] Điều tra: đọc `database.js` (WAL/busy_timeout), `layout.js` (polling thông báo), `project-detail.js` (event listener có gán lặp không), `projects.routes.js`/`projectMilestones.routes.js` (N+1/query nặng) — không thấy vấn đề rõ ràng; xác nhận với người dùng chỉ 1 người bị đơ cùng lúc (loại trừ nghẽn server toàn cục)
- [x] Stress test qua trình duyệt thật (CDP thô): 300 lần mở/đóng modal "Thêm đợt thanh toán" + chuyển tab — không tái hiện lỗi, 0 lỗi console, JS heap không tăng
- [x] Phát hiện lỗi thật: `renderGanttChart()` chạy lại mỗi lần `loadProjectDetail()` (mọi tab, không riêng "Giai đoạn"), vòng lặp vẽ nhãn tháng không giới hạn — giai đoạn bị nhập nhầm năm sẽ làm khoảng ngày bị thổi phồng, gây đơ cứng tab. Dữ liệu thật hiện tại (18 giai đoạn) chưa có outlier, chưa xác nhận là nguyên nhân gốc của báo cáo cụ thể
- [x] `frontend/assets/project-detail.js#renderGanttChart()`: thêm chặn an toàn `MAX_MONTH_TICKS = 1000`
- [x] Test qua trình duyệt thật (CDP thô, dự án test riêng): mô phỏng lỗi (chênh ~7973 năm, trước đây ~95.676 lần lặp) — sau khi sửa tải trang ~1.5s, nút vẫn phản hồi đúng; test lại 300 lần bình thường không hồi quy. Dữ liệu test đã xóa sạch
- [x] Ghi nhận (chưa xử lý, ngoài phạm vi): `express-session` dùng `MemoryStore` mặc định — không phù hợp production theo khuyến cáo chính thức, cần xem lại ở Phase 5 Go-live

### Sửa lỗi hiển thị: khung chọn giá nhập hiện thừa dù trống (ngoài phase, theo phản hồi người dùng 2026-08-06, ngay sau mục trên)

- [x] `frontend/assets/style.css`: `.price-picker-hint` — tách `display:flex` sang rule riêng `.price-picker-hint:not([hidden])` (cùng dạng lỗi `[hidden]` bị `display` đè đã gặp ở `.alert`/`.form-row`/`.notification-panel`/`.page-header-actions`, lần này bỏ sót khi viết mới)
- [x] Test qua trình duyệt thật (Chrome headless CDP thô, computed style + geometry): mặc định `display:none`/0×0 đúng, trạng thái ≥2 giá lịch sử vẫn hiện đúng `display:flex` + đủ chip — không hồi quy

### Mẫu in Phiếu xuất kho: dạng hiển thị ngân hàng + dòng "Tổng cộng" không căn phải (ngoài phase, theo phản hồi người dùng 2026-08-06)

- [x] `print-template-render.js#buildCompanyBankLine()`: bỏ ngoặc đơn quanh chi nhánh, **dùng chung `buildBankNameBranchLine()`** với mẫu "Giấy đề nghị tạm ứng" → `Vietcombank – PGD An Nhơn` (một nguồn duy nhất cho định dạng tên NH + chi nhánh ở mọi mẫu in)
- [x] `print-template-render.js`: dữ liệu mẫu khung xem trước đổi `bank_branch` sang `'PGD An Nhơn'` cho khớp định dạng thật
- [x] `style.css`: sửa lỗi CSS chết lặng — `.print-total-label`/`.print-total-value` (`0,1,0`) bị `.print-table td` (`0,1,1`) ghi đè → dòng "Tổng cộng" luôn căn TRÁI và cỡ chữ 15px chưa bao giờ áp dụng. Đổi sang `.print-table td.print-total-label`/`.print-table td.print-total-value`
- [x] Test đo hình học thật qua CDP (`Network.setCacheDisabled`) trên 3 nơi: khung xem trước (mép phải khớp 0px), **trang in thật PX000016** (khớp 0px), hồi quy "Giấy đề nghị tạm ứng" (không đổi). Không lỗi console, chỉ đọc — không ghi đè mẫu in thật
- [ ] *(để ngỏ, chờ người dùng quyết định)* Ô "Tổng cộng" hiện nằm ở cột cuối ("Đơn giá sau CK") chứ không dưới cột "Thành tiền" mà nó cộng tổng — hiện khớp đúng yêu cầu "canh sát qua phải" nên giữ nguyên

### Giao diện di động (ngoài phase, theo yêu cầu người dùng 2026-08-06 — ĐÃ CHỐT KẾ HOẠCH, CHƯA CODE)

> Đã khảo sát hiện trạng frontend + phân tích 3 phương án kiến trúc + chốt 4 quyết định qua `AskUserQuestion` trước khi lên kế hoạch. Nghiệp vụ: `docs/PRD.md` mục 4.16. Kiến trúc + 2 phương án đã loại bỏ: `docs/DECISIONS.md` mục 2026-08-06 "Giao diện di động". Kỹ thuật chi tiết theo đợt: `docs/Plan.md` mục 4 "Giao diện di động".
>
> **Nguyên tắc xuyên suốt**: bản app RIÊNG tại `frontend/m/` — **không sửa frontend desktop đang chạy production**; giữ MPA (không tự viết SPA router); dùng chung API + cookie session; **không thêm API, không sửa `server.js`** cho phần giao diện.
>
> **Phạm vi đã chốt**: Tra cứu + Dự án làm trước (Đợt 1–3); nghiệp vụ ghi để ngỏ (Đợt 4). Không bật HTTPS → iOS toàn màn hình gần native, Android còn thanh địa chỉ, cả 2 không có offline/push. Điện thoại trước, tablet dùng chung khung. Chỉ LAN.

**Đợt 0 — Thiết kế (không code) — ĐÃ XONG 2026-08-06**
- [x] Dùng skill `ui-ux-pro-max` thiết kế 10 thành phần mới: thanh tab dưới, app bar + nút quay lại, thẻ danh sách (thay `.data-table`), bottom sheet kéo-để-đóng (thay `.modal-overlay`), ô tìm kiếm dính đầu trang, segmented control, pull-to-refresh, skeleton, hàng thông tin kiểu Settings, nút hành động chính — mỗi thành phần đã trình bày riêng và được người dùng duyệt từng cái trước khi sang cái tiếp theo
- [x] Bổ sung mục "Giao diện di động" vào `docs/DESIGN-SYSTEM.md` (đủ 10 thành phần + token tái sử dụng cho từng cái)

**Đợt 1 — Khung app — ĐÃ XONG PHẦN CODE 2026-08-06** *(chưa có màn nghiệp vụ nào, chỉ có Trang chủ/Đăng nhập/3 tab "sắp có")*
- [x] Tách `frontend/assets/tokens.css` từ `style.css` (`:root` + `@font-face`) + `style.css` thêm 1 dòng `@import` — thay đổi DUY NHẤT chạm CSS desktop
- [x] `frontend/m/assets/m-tokens.css` + `m-style.css` (import `tokens.css`, KHÔNG import `style.css`) — đủ 10 thành phần đã thiết kế Đợt 0
- [x] `frontend/m/assets/m-layout.js`: app bar + thanh tab dưới cố định (`env(safe-area-inset-bottom)`), lọc theo `user.permissions` **đọc lại `NAV_GROUPS`** qua `_mTabModule(groupLabel)` (tìm nhóm theo label, lấy `module` của item đầu — không hardcode danh sách tab thứ 2, tự động khớp nếu desktop đổi module_key sau này); chuông thông báo (badge + sheet liệt kê, polling 20s); sheet "Thêm" (Dùng bản máy tính/Đăng xuất)
- [x] `frontend/m/assets/m-ui.js`: bottom sheet (kéo-để-đóng có ngưỡng chống nhầm), pull-to-refresh, skeleton, toast, debounce, khôi phục vị trí cuộn (`sessionStorage`)
- [x] Phát hiện thiết bị: hàm `isMobileDevice()` đặt tại `frontend/assets/api.js` (dùng chung 1 định nghĩa, gọi từ cả `layout.js`/`auth.js` — khác dự tính ban đầu định viết riêng ở 2 file) — `matchMedia('(hover: none) and (pointer: coarse)')` + `innerWidth <= 820`, không UA sniffing; cờ thoát `localStorage['erp_force_desktop']`
- [x] `frontend/m/login.html`/`m-login.js` + `frontend/m/index.html`/`m-index.js` (Trang chủ: hero chào + 3 thẻ số liệu + sinh nhật trong tháng)
- [x] `frontend/m/coming-soon.html`/`m-coming-soon.js` (dùng chung, đọc `?section=` — placeholder cho 3 tab Kho/Khách hàng/Dự án tới khi có Đợt 2/3)
- [x] `manifest.json` + `apple-touch-icon` (tự tạo icon vuông 192/512px từ logo hiện có qua Pillow, đệm nền trắng — file gốc không vuông) + meta `apple-mobile-web-app-capable`/`theme-color` — không làm `service-worker.js` (cần HTTPS)
- [x] `frontend/assets/icons.js`: thêm 6 icon mới (`moreHorizontal`/`refresh`/`phone`/`mapPin`/`chevronRight`/`monitor`), không sửa key cũ
- [x] Test qua CDP (Chrome headless, `Emulation.setDeviceMetricsOverride(mobile:true)` + `setTouchEmulationEnabled` — **phát hiện lỗi CDP**: bật thêm `setEmitTouchEventsForMouse` cùng lúc làm `Input.dispatchMouseEvent` treo vĩnh viễn, đã bỏ, chỉ giữ `setTouchEmulationEnabled`): redirect thiết bị đúng, đăng nhập mobile đúng, Trang chủ hiện đúng số liệu, bấm chuông/đóng sheet/chuyển tab **bằng click thật qua CDP Input** (không gọi `.click()` JS) đều đúng, "Dùng bản máy tính" đặt cờ + điều hướng đúng và cờ được tôn trọng ở lần mở sau, **lọc quyền đúng với `thukho1`** (chỉ còn Trang chủ/Kho/Thêm, không có Khách hàng/Dự án) — không lỗi console
- [x] **Hồi quy desktop**: mở lại `dashboard.html` sau khi tắt giả lập — không bị chuyển hướng nhầm, sidebar hiện đúng, biến màu `--color-primary` không đổi
- [x] **Chưa test được trên điện thoại thật qua LAN** (môi trường hiện tại không có thiết bị vật lý) — người dùng cần tự kiểm tra bước này, đặc biệt cảm giác "an toàn" của vùng chạm/safe-area trên iPhone có notch
- [x] **Hạng mục phụ thuộc đã hỏi và xử lý ngay** (khác dự tính "để riêng"): `backend/server.js` thêm `rolling: true` + `maxAge` từ 8 tiếng lên **7 ngày** (người dùng chọn làm luôn) — đã restart server + verify qua `curl` (cookie `Expires` đúng +7 ngày). **Đổi `MemoryStore` sang store lưu đĩa: người dùng chọn ĐỂ SAU**, gộp vào Phase 5 Go-live như dự tính ban đầu — restart server hiện tại vẫn làm mất toàn bộ phiên đăng nhập (kể cả mobile)

**Đợt 2 — Tra cứu** *(7 màn, chỉ đọc)*
- [ ] Sản phẩm + chi tiết (tồn kho, giá vốn, lịch sử nhập/xuất)
- [ ] Khách hàng + chi tiết (kèm thẻ Bảo hành), Nhà cung cấp
- [ ] Công nợ khách hàng, Công nợ NCC (số dư + lịch sử giao dịch)
- [ ] Đối tác (danh bạ), Bảo hành
- [ ] 3 tính năng chỉ mobile: `tel:` gọi trực tiếp, mở bản đồ theo địa chỉ công trình, chia sẻ nhanh thông tin công nợ
- [ ] Tìm kiếm theo tên/mã/SĐT giữ đúng hành vi lọc như desktop

**Đợt 3 — Dự án tại công trường**
- [ ] Danh sách dự án (thẻ có thanh tiến độ, lọc theo trạng thái)
- [ ] Chi tiết dự án với segmented control `[Tổng quan | Giai đoạn | Vật tư | Thanh toán | Phát sinh]`
- [ ] Giai đoạn: mở ra công việc con, cập nhật trạng thái + ngày thực tế ngay tại chỗ (**không đụng sổ cái tồn kho/công nợ**)
- [ ] Phát sinh: thêm "vấn đề" ngay tại công trường
- [ ] **KHÔNG đưa Gantt lên điện thoại** — thay bằng danh sách giai đoạn có thanh tiến độ; tablet giữ Gantt cuộn ngang
- [ ] Vật tư + Thanh toán: chỉ đọc

**Đợt 4 — Nghiệp vụ ghi** *(ĐỂ NGỎ, đánh giá lại sau Đợt 3 — chưa cam kết)*
- [ ] Lập phiếu nhập/xuất/trả hàng, ghi nhận thanh toán công nợ, phiếu thu/chi sổ quỹ

**Hạng mục phụ thuộc (đụng backend — cần duyệt riêng)**
- [ ] `server.js`: `rolling: true` + kéo dài `maxAge` (nếu không, điện thoại phải đăng nhập lại mỗi 8 tiếng)
- [ ] `server.js`: đổi `express-session` từ `MemoryStore` sang store lưu xuống đĩa — **restart server hiện đang làm đăng xuất toàn bộ**; đã ghi nhận sẵn cho Phase 5, nên gộp làm cùng Đợt 1

**Không làm bản mobile** (chốt để tránh phình phạm vi): 7 trang Cấu hình, Vai trò, Người dùng, Mẫu in + trình soạn thảo, Import/Export Excel, Báo cáo đầy đủ (chỉ có bản tóm tắt ở Trang chủ), 2 trang In phiếu.

### Sửa "Ngày nhập phiếu" cho Phiếu nhập kho (ngoài phase, theo yêu cầu người dùng 2026-08-15)

> Ngoại lệ có chủ đích của nguyên tắc "không sửa/xóa phiếu đã tạo" (2026-07-31) — chỉ cho sửa riêng trường ngày, mọi trường khác khóa cứng. Đã chốt 2 quyết định qua `AskUserQuestion` trước khi code: đồng bộ ngày sang `stock_movements`/`stock_lots`/`cash_vouchers`; quyền `kho` (không riêng Admin). Xem `docs/DECISIONS.md`.

- [x] `stockReceipt.service.js#updateStockReceiptDate()`: cập nhật `created_at` đồng bộ trên `stock_receipts` + `stock_movements` + `stock_lots` + `cash_vouchers` (nếu có phiếu Chi tự động) trong 1 transaction; chặn nếu `is_return=1`
- [x] `stockReceipts.routes.js`: `PATCH /:id/date`
- [x] Frontend `stock-receipts.html`/`.js`: nút bút chì "Sửa ngày nhập" trên mỗi dòng + modal 1 trường `datetime-local`, `toDatetimeLocalValue()` (mới, chiều ngược `toSqliteDatetime()`)
- [x] Test qua API thật (curl: đồng bộ đúng 4 bảng, chặn đúng is_return=1/thiếu ngày/sai định dạng/không tồn tại/chưa đăng nhập, quyền `kho` đúng qua `thukho1`) + trình duyệt thật (Chrome headless CDP thô, click thật qua DOM: mở modal đúng, điền sẵn đúng giờ địa phương, lưu → danh sách cập nhật, không lỗi console) — dữ liệu test đã xóa sạch

### Checkbox "Nhập tồn đầu kỳ" cho Phiếu nhập kho (ngoài phase, theo yêu cầu người dùng 2026-08-18)

> Thay quy ước cũ (chỉ ghi chú tự do, không có cơ chế chặn) bằng công tắc thật. Đã chốt 1 quyết định qua `AskUserQuestion` trước khi code: loại phiếu tồn đầu kỳ khỏi biểu đồ "Tổng mua hàng theo tháng". Xem `docs/DECISIONS.md`.

- [x] Migration `037`: `stock_receipts.is_opening_balance`
- [x] `stockReceipt.service.js#createStockReceipt()`: bỏ qua `recordDebtFromDocument()`/`recordAutoVoucher()` khi cờ bật, vẫn tạo `stock_movements`/`stock_lots` đầy đủ
- [x] `stockReceipts.routes.js`: đọc/truyền/trả về `is_opening_balance`
- [x] `reports.routes.js#/stock-movements`: loại `is_opening_balance=1` khỏi tổng mua hàng
- [x] Frontend `stock-receipts.html`/`.js` + `receipt-detail.js`: công tắc mới, ẩn khung thanh toán khi bật, badge "Tồn đầu kỳ"
- [x] Đồng bộ `docs/PRD.md` mục 4.3/4.6/4.11
- [x] Test qua API thật (không tạo công nợ/phiếu chi, vẫn đổi đúng tồn kho, báo cáo loại đúng số tiền, hồi quy phiếu thường) + trình duyệt thật (Chrome headless CDP thô, click/gõ thật, không lỗi console) — dữ liệu test đã xóa sạch

### 6 việc trong 1 phiên: sắp xếp/gom nhóm danh sách, bảo hành theo dự án, tách quyền Khách hàng (ngoài phase, theo yêu cầu người dùng 2026-08-19)

> Chi tiết đầy đủ (đặc biệt 2 việc kiến trúc lớn: bảo hành theo dự án, tách quyền): `docs/DECISIONS.md` mục 2026-08-19.

- [x] `warranties.html`/`.js`: cột "Ngày nghiệm thu" sắp xếp tăng/giảm dần (`.sortable-th`, dùng lại pattern cột "Tồn kho" ở `products.js`)
- [x] Migration `038`: `warranties.project_id` (tùy chọn) + bảng `warranty_visits` (lịch sử bảo hành)
- [x] `backend/routes/warranties.routes.js`: đọc/validate/lưu `project_id` (phải đúng khách hàng đã chọn), `?project_id=` filter cho `GET /`, CRUD đầy đủ `/:warrantyId/visits` (Lần tự tính `MAX+1`), chặn xóa bảo hành đã có lịch sử
- [x] `backend/services/project.service.js#deleteProject()`: chặn xóa dự án đã có bảo hành gắn vào
- [x] `warranties.html`/`.js`: select "Dự án" trong modal Thêm/Sửa (ẩn nếu thiếu quyền `du_an`), cột "Dự án" trong bảng, hỗ trợ prefill `?project_id=` từ URL
- [x] `project-detail.html`/`.js`: tab "Bảo hành" mới (đòi cả `du_an` và `bao_hanh`, tải tách biệt khỏi `Promise.all` chính để tránh lỗi 403 làm sập cả tab khác) — hiển thị + quản lý lịch sử, không tạo bảo hành mới tại đây
- [x] **Bổ sung ngay sau, theo yêu cầu người dùng**: `warranties.html`/`.js` — nút "Xem chi tiết" (icon mắt) mở modal `modal-card-lg` hiện đầy đủ thông tin + bảng lịch sử bảo hành + CRUD từng lần, dùng chung API với tab Dự án
- [x] `frontend/assets/customer-debts.js`: sắp xếp danh sách ưu tiên `balance !== 0` lên trên, `balance === 0` xuống cuối (sort ổn định, không đổi thứ tự trong cùng nhóm)
- [x] `frontend/customers.html`/`.js`: gom nhóm hiển thị theo "Loại khách hàng" — dòng tiêu đề nhóm (`.table-group-row`, CSS mới qua skill `ui-ux-pro-max`), nhóm "Không phân loại" luôn cuối, bỏ cột "Loại khách hàng" (dư thừa với tiêu đề nhóm)
- [x] `frontend/assets/reports.js#renderBarChart()`: hiện nhãn số tiền ở CẢ 2 cột cuối (tháng hiện tại + tháng trước), trước đây chỉ hiện 1 cột cuối
- [x] Migration `039`: tách quyền `khach_hang` khỏi `cong_no` — `cong_no` từ nay chỉ còn Nhà cung cấp/Công nợ NCC (đổi nhãn "Công nợ" → "Nhà cung cấp"), backfill vai trò đang có `cong_no` được cấp thêm `khach_hang`
- [x] `backend/config/modules.js`, `frontend/assets/layout.js`: thêm module `khach_hang`, đổi module của 2 mục nav "Khách hàng"/"Công nợ khách hàng"
- [x] `backend/middleware/requirePermission.js`: thêm hàm thuần `userHasPermission()` dùng được cả trong middleware lẫn gọi trực tiếp trong route handler
- [x] `backend/routes/debts.routes.js`: bỏ quyền cố định gắn lúc mount ở `server.js`, chuyển kiểm tra theo đúng `partner.type` ngay trong từng route (`GET /summary` đổi `type` từ tùy chọn thành bắt buộc)
- [x] `backend/routes/partners.routes.js`: `PUT`/`DELETE /:id` kiểm tra quyền theo `existing.type` sau khi đọc được đối tác; `POST /` mở rộng thêm `khach_hang` vào danh sách quyền được tạo nhanh đối tác
- [x] `backend/server.js`: đổi mount `/api/debts` bỏ `requirePermission('cong_no')` cố định
- [x] Sửa luôn 1 lỗi có sẵn phát hiện tình cờ: `dashboard.js` link "Bảo hành" ở Truy cập nhanh còn dùng quyền `cong_no` cũ thay vì `bao_hanh` (sót lại từ migration `036`)
- [x] Đồng bộ `docs/PRD.md` mục 4.1/4.10, `docs/erd.mermaid` (thêm `WARRANTY_VISITS`, quan hệ `PROJECTS`-`WARRANTIES`)
- [x] Test qua API thật (Node `fetch`) + trình duyệt thật (Chrome headless CDP thô, click/gõ thật) cho toàn bộ 6 việc — chi tiết đầy đủ `docs/CHANGELOG.md`. Dữ liệu/tài khoản/vai trò test đã xóa sạch. Đã restart server (bắt buộc, không có hot-reload).

### Viết lại cơ chế "Mẫu in": khung HTML/CSS thật + token binding (ngoài phase, theo yêu cầu người dùng 2026-08-19)

> Đảo ngược cách tiếp cận migration `028`/`029` (trình soạn WYSIWYG contenteditable + bảng chọn cột) — người dùng phản hồi khó dùng (không định vị tự do được, khó tìm token). Đã bàn kỹ hướng thiết kế qua nhiều vòng trao đổi (kể cả so sánh với 1 phần mềm tham khảo dạng canvas kéo-thả, cuối cùng chọn hướng đơn giản/mạnh hơn), chốt qua `EnterPlanMode`. Chi tiết đầy đủ `docs/DECISIONS.md` mục 2026-08-19 (Mẫu in).

- [x] Migration `040`: `print_templates` bỏ `header_html`/`footer_html`/`table_columns`/`show_amount_in_words`, thêm `template_html` (1 khung HTML/CSS đầy đủ do người dùng tự soạn)
- [x] `backend/config/printTemplateTokens.js`: viết lại — danh sách token phẳng theo `group: 'document'|'item'`, cú pháp `{{TenBien}}` (đổi từ `#TenBien`/chip DOM cũ để tránh trùng dấu `#` của CSS ID selector); mẫu khởi điểm chuyển thành file `.html` thật trong `backend/config/print-template-defaults/` (dễ đọc/soạn hơn string JS dài)
- [x] `backend/routes/printTemplates.routes.js`: `PUT` validate + quét toàn bộ `{{...}}`/`<!-- if:KEY -->` trong `template_html`, so khớp whitelist token đúng phạm vi (token `Item.*` chỉ hợp lệ bên trong khối lặp), trả 400 kèm danh sách tên token sai nếu gõ nhầm — bắt lỗi trước khi lưu thay vì để phát hiện lúc in thật
- [x] `frontend/assets/print-template-render.js`: viết lại render engine string-based (`renderPrintTemplate()`) thay DOM-walk cũ — xử lý khối điều kiện `<!-- if:KEY -->...<!-- endif -->` (thay `data-token-line`), khối lặp `<!-- items:start -->...<!-- items:end -->` (thay `table_columns` JSON) với token con `{{Item.Xxx}}`, `escapeHtml()` cho giá trị token (an toàn thay thế cho `document.createTextNode` cũ)
- [x] `frontend/print-template-edit.html`/`.js`: bỏ hẳn contenteditable + toolbar rich-text + bảng chọn cột — thay bằng `<textarea class="pt-code-editor">` (monospace, nền tối) + panel token luôn hiện sẵn bấm-để-chèn tại vị trí con trỏ (`.pt-token-panel`/`.pt-token-chip`, giải quyết đúng phản hồi "khó tìm token") + 2 nút "Tải mẫu lên"/"Tải mẫu về" file `.html` (tiện soạn ngoài trình duyệt) + xem trước bằng `<iframe sandbox srcdoc>` cô lập hoàn toàn CSS mẫu với trang quản trị
- [x] `frontend/print-issue.html`/`.js`, `frontend/print-project-advance.html`/`.js`: đổi sang render qua `renderPrintTemplate()`, **dùng Shadow DOM** (`#print-sheet.attachShadow()`) để cô lập `<style>` riêng của mẫu khỏi ảnh hưởng `.print-toolbar`/nút "Quay lại"/"In phiếu" của trang — **sửa 1 lỗi phát hiện qua phản hồi người dùng ngay sau khi triển khai**: thiếu bước cô lập này ở trang in thật (chỉ mới làm cho khung xem trước ở trang chỉnh sửa) khiến CSS tự viết của người dùng (`* {margin:0}`, `body{display:flex}`) đẩy lệch nút bấm ra khỏi vị trí
- [x] `frontend/assets/style.css`: dọn toàn bộ CSS cũ gắn với cấu trúc mẫu cố định (`.print-header`/`.print-table`/`.print-advance-*`/`.pt-editable`/`.pt-token`/`.pt-columns-list`...), đơn giản hóa `.print-sheet` thành shadow host trung lập (không còn ép khung "tờ giấy" — mỗi mẫu tự mang theo trình bày riêng), thêm CSS mới cho code editor/token panel/iframe preview (qua skill `ui-ux-pro-max`)
- [x] Cập nhật `docs/PRD.md` mục 4.5, `docs/erd.mermaid` (bảng `PRINT_TEMPLATES`), `docs/DESIGN-SYSTEM.md` (pattern editor mới)
- [x] Test qua API thật (Node `fetch`: lưu mẫu thành công, chặn đúng 400 khi token sai tên hoặc dùng token `Item.*` ngoài khối lặp, 403 đúng khi thiếu quyền `cau_hinh`, `GET` vẫn mở cho mọi tài khoản) + trình duyệt thật (Chrome headless CDP thô: chèn token đúng vị trí con trỏ, tải mẫu lên/xuống round-trip đúng nội dung, đổi khổ giấy, xem trước không lỗi console) — dữ liệu/tài khoản test đã xóa sạch. Phát hiện + sửa 1 lỗi hiển thị thật trên mẫu đang dùng (thẻ `<img>` mã QR bị lồng cú pháp do chèn ảnh khi con trỏ đứng giữa 1 thẻ `<img>` chưa gõ xong) — sửa trực tiếp bằng script, xác nhận lại qua CDP (`naturalWidth` ảnh > 0). Đã restart server sau khi sửa backend (bắt buộc, không có hot-reload).

### "Nghiệm thu theo giải pháp" — tab mới trong Chi tiết dự án (ngoài phase, theo yêu cầu người dùng 2026-08-19, code thẳng từ mockup/kế hoạch đã chốt phiên trước)

> Mockup giao diện + 4 giả định kỹ thuật đã chốt qua `AskUserQuestion` ở phiên trước — xem `docs/handoff/HANDOFF-NghiemThu-2026-08-19-v2.md`. Phiên này code theo đúng checklist đã ghi, không hỏi lại. Chi tiết đầy đủ `docs/DECISIONS.md` mục 2026-08-19 (Nghiệm thu).

- [x] Migration `041`: `project_acceptance_solutions` + `project_acceptance_solution_items` (quan hệ nhiều-nhiều product↔solution, `UNIQUE(solution_id, product_id)`) + seed dòng `print_templates` mới cho type `acceptance_solution`
- [x] `backend/config/modules.js`: thêm module `nghiem_thu` — phân quyền 2 lớp mới (quyền `du_an` đủ để XEM, quyền `nghiem_thu` mới THAO TÁC)
- [x] `backend/routes/projectAcceptanceSolutions.routes.js` (mới, `mergeParams:true`, mount tại `/:id/acceptance-solutions`): công thức "đã xuất NET" copy nguyên xi từ `projectMaterials.routes.js`; đơn giá bình quân gia quyền theo giá bán trên `stock_issue_items`; validate không vượt "còn lại chưa gán" tính lại từ dữ liệu thật
- [x] `backend/services/project.service.js#deleteProject()`: chặn xóa dự án đã có giải pháp nghiệm thu
- [x] `backend/config/printTemplateTokens.js` + `backend/config/print-template-defaults/acceptance_solution.html`: loại mẫu in mới "Biên bản nghiệm thu theo giải pháp"
- [x] `frontend/assets/print-template-render.js`: `buildAcceptanceSolutionTokenValues()`/`buildAcceptanceSolutionItemTokenValues()` + dữ liệu mẫu
- [x] `frontend/print-acceptance-solution.html`/`assets/print-acceptance-solution.js` (mới, copy khung `print-issue.html`/`.js`) — bắt buộc Shadow DOM
- [x] `frontend/project-detail.html`/`assets/project-detail.js`: tab "Nghiệm thu" (không ẩn tab, chỉ ẩn/khóa nút "Thêm giải pháp"/icon Sửa-Xóa theo quyền `nghiem_thu`) — 4 thẻ số liệu, danh sách thẻ giải pháp, modal Thêm/Sửa với bảng chọn thiết bị đã xuất
- [x] `frontend/assets/style.css`: CSS mới cho `.solution-card`/`.device-table`/`.stat-card-bar`... (tái dùng token có sẵn trong `tokens.css`)
- [x] Đồng bộ `docs/PRD.md` mục 4.12, `docs/Plan.md`, `docs/erd.mermaid`
- [x] Test qua API thật (Node `fetch`: chia 1 sản phẩm vào 2 giải pháp đúng số dư, chặn đúng 400 khi vượt số lượng, tài khoản chỉ có `du_an` xem được nhưng bị chặn đúng 403 ở POST/PUT/DELETE) + trình duyệt thật (Chrome headless CDP thô: tạo giải pháp qua UI, in biên bản render đúng trong Shadow DOM không lỗi console, ẩn đúng nút "Thêm giải pháp" cho tài khoản thiếu `nghiem_thu`) — phát hiện + sửa 1 lỗi CSS tự phát hiện qua ảnh chụp (`.qty-hint.full` gán ngược điều kiện). Dữ liệu/vai trò/tài khoản test đã xóa sạch. Đã restart server (bắt buộc, không có hot-reload).

### Phiếu xuất kho: quy trình 2 bước "Lưu tạm"/"Xuất kho" + "Phiếu xác nhận đơn hàng" (ngoài phase, theo yêu cầu người dùng 2026-08-20)

> Tái tạo đúng pattern "Trả hàng" (migration 033/034) cho phiếu xuất kho thường. Đã lên kế hoạch qua `EnterPlanMode` (khảo sát code thật bằng subagent Explore trước khi code). Chi tiết `docs/DECISIONS.md` mục 2026-08-20.

- [x] Migration `042`: seed mẫu in mới `order_confirmation` (không cần đổi schema `stock_issues` — cột `status`/`is_return` đã có sẵn từ migration `034`)
- [x] `backend/services/stockIssue.service.js`: viết lại — `applyIssueProcessing()` dùng chung cho tạo-và-xuất-ngay lẫn xuất-kho-phiếu-đã-lưu, `updateStockIssue()`, `processStockIssue()`
- [x] `backend/routes/stockIssues.routes.js`: `POST /` nhận `is_draft`, thêm `PUT /:id` + `POST /:id/process`, `readAdjustment()` chặn chọn phiếu nháp làm mốc điều chỉnh
- [x] `backend/routes/stockReceipts.routes.js`: `readAdjustment()` chặn tương tự (đối xứng)
- [x] Rà soát + sửa 9 điểm SQL đọc `stock_issues` chưa lọc `status`: `stockReturn.service.js`, `projectMaterials.routes.js`, `projectAcceptanceSolutions.routes.js` (2 chỗ), `reports.routes.js` (2 chỗ), `debts.routes.js` (2 chỗ)
- [x] `backend/config/printTemplateTokens.js` + `print-template-defaults/order_confirmation.html`: loại mẫu in mới, tái dùng token `stock_issue`
- [x] `frontend/print-order-confirmation.html`/`assets/print-order-confirmation.js` (mới)
- [x] `frontend/assets/print-template-render.js` + `print-templates.js`: đăng ký `order_confirmation`
- [x] `frontend/stock-issues.html`/`.js`: cột "Trạng thái", modal Thêm/Sửa dùng chung, 2 nút Lưu tạm/Xuất kho, icon thao tác theo trạng thái
- [x] `frontend/assets/adjustment.js`: lọc client-side chỉ hiện phiếu `da_tru_kho`
- [x] `frontend/assets/issue-detail.js`: thêm dòng "Trạng thái" vào modal xem chi tiết
- [x] Đồng bộ `docs/PRD.md` mục 4.3/4.5/4.6, `docs/Plan.md`
- [x] Test qua API thật (Node `fetch`: Lưu tạm không đụng tồn kho/công nợ/sổ quỹ; sửa nháp rồi Xuất kho dùng đúng số liệu MỚI; khóa đúng sau khi xuất kho; validate tồn kho chỉ chặn lúc Xuất kho; cả 9 điểm lọc status xác nhận đúng qua kịch bản phiếu nháp số lượng/giá trị lớn) + trình duyệt thật (Chrome headless CDP thô: luồng đầy đủ Lưu tạm → in Phiếu xác nhận đơn hàng → Sửa → Xuất kho, không lỗi console). Dữ liệu test đã xóa sạch (đảo ngược đúng stock_movements/debt_ledger/cash_vouchers phát sinh). Đã restart server (bắt buộc, không có hot-reload).

## Open questions cần chốt trước khi code phần liên quan

Xem `docs/DECISIONS.md` mục "Open questions".
