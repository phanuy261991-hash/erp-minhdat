# Plan chi tiết: Hệ thống Quản lý Kho & Công nợ nội bộ

**Dựa trên**: PRD v1.6 — cập nhật 2026-08-04
**Version**: v1.4 — cập nhật 2026-08-04 (bổ sung kế hoạch module Quản lý dự án, chưa code)

---

## 1. Cấu trúc thư mục dự án

> Cập nhật 2026-08-01 (Phase 1.6 hoàn thành) theo trạng thái thực tế. `(đã có)` = tồn tại thật trong repo; không đánh dấu = kế hoạch, chưa tạo. Nguồn chính xác nhất luôn là đọc trực tiếp thư mục — bảng này chỉ để định hướng nhanh.

```
project-root/
├─ backend/
│  ├─ server.js                        (đã có) khởi động Express, session, mount routes
│  ├─ config/
│  │  └─ modules.js                    (đã có) danh sách module_key cho phân quyền
│  ├─ db/
│  │  ├─ database.js                   (đã có) better-sqlite3, PRAGMA WAL + foreign_keys
│  │  ├─ migrate.js                    (đã có) migration runner
│  │  ├─ seedAdmin.js                  (đã có) seed tài khoản admin qua biến môi trường
│  │  └─ migrations/
│  │     ├─ 001_init.sql               (đã có) users, schema_migrations
│  │     ├─ 002_roles_permissions.sql  (đã có) roles, role_permissions, users.role→role_id
│  │     ├─ 003_company_warehouse_settings.sql (đã có) company_settings, warehouse_settings
│  │     ├─ 004_company_settings_extra_fields.sql (đã có) email/website/bank_branch, phone→phones (JSON)
│  │     ├─ 005_phase2_kho.sql          (đã có) partners, products, stock_receipts(_items), stock_issues(_items), stock_movements
│  │     ├─ 006_products_is_active.sql (đã có) products.is_active (vô hiệu hóa)
│  │     ├─ 007_costing_and_product_history.sql (đã có) stock_lots, stock_movements.unit_cost, product_change_log, seed costing_method
│  │     ├─ 008_receipt_discount.sql   (đã có) stock_receipt_items.discount_percent
│  │     ├─ 009_receipt_order_code.sql (đã có) stock_receipts.order_code
│  │     ├─ 010_receipt_issue_adjustment.sql (đã có) adjusts_type/adjusts_id trên stock_receipts + stock_issues (phiếu điều chỉnh bù trừ)
│  │     ├─ 011_receipt_payment_status.sql (đã có) stock_receipts.payment_status (đối xứng stock_issues, cho công nợ phải trả NCC)
│  │     ├─ 012_debt_ledger.sql (đã có) bảng debt_ledger (Phase 3)
│  │     ├─ 013_issue_discount.sql (đã có) stock_issue_items.discount_percent (đối xứng migration 008 của phiếu nhập)
│  │     ├─ 014_company_print_note.sql (đã có) company_settings.print_note (ghi chú hiển thị khi in phiếu xuất kho)
│  │     ├─ 015_customer_categories.sql (đã có) bảng customer_categories (loại khách hàng, kem han muc cong no) + partners.category_id
│  │     ├─ 016_debt_adjustment.sql (đã có, 2026-08-01) debt_ledger.is_adjustment ("Điều chỉnh công nợ")
│  │     ├─ 017_warranties.sql (đã có, 2026-08-01) bảng warranties (Bảo hành, gắn khách hàng)
│  │     ├─ 018_backup_path.sql (đã có, 2026-08-01) warehouse_settings.backup_path (Phase 5)
│  │     ├─ 019_cash_book.sql (đã có, 2026-08-02) module So quy: cash_book_settings, cash_categories, cash_vouchers (doc lap voi debt_ledger)
│  │     ├─ 020_partner_assigned_user.sql (đã có, 2026-08-03) partners.assigned_user_id (Nguoi phu trach, nullable, hien tai chi dung o customers.html)
│  │     ├─ 021_projects.sql            (kế hoạch, Đợt 1) project_phase_templates, projects, project_members, project_phases + seed quyen 'du_an'
│  │     ├─ 022_project_tasks.sql       (đã có, 2026-08-04) project_tasks (thuoc phase_id, khong luu project_id trung lap)
│  │     ├─ 023_project_task_actual_dates.sql (đã có, 2026-08-04, ngoai ke hoach ban dau) project_tasks.actual_start_date/actual_end_date (nhap tay, thay completed_at)
│  │     ├─ 024_project_materials.sql   (kế hoạch, Đợt 3 — lui so tu 023 vi 023 da dung cho actual dates o tren) project_material_plan + ADD COLUMN project_id cho stock_issues/stock_receipts/debt_ledger
│  │     └─ 025_project_payments.sql    (kế hoạch, Đợt 4 — lui so tu 024) project_payment_milestones, project_variations + ADD COLUMN debt_ledger.milestone_id
│  ├─ middleware/
│  │  ├─ auth.js                       (đã có) requireAuth (kiểm tra session)
│  │  └─ requirePermission.js          (đã có) requirePermission(module) + requireAnyPermission([module,...])
│  ├─ routes/
│  │  ├─ auth.routes.js                (đã có) login/logout/me
│  │  ├─ users.routes.js               (đã có) CRUD tài khoản
│  │  ├─ roles.routes.js               (đã có) CRUD vai trò
│  │  ├─ companySettings.routes.js     (đã có) GET/PUT thông tin công ty
│  │  ├─ warehouseSettings.routes.js   (đã có) GET/PUT cấu hình kho (gồm costing_method)
│  │  ├─ products.routes.js            (đã có) CRUD + vô hiệu hóa/xóa + chi tiết/lịch sử (Phase 2)
│  │  ├─ partners.routes.js            (đã có, bản rút gọn) GET danh sách + POST tạo nhanh — CRUD đầy đủ vẫn Phase 3
│  │  ├─ stockReceipts.routes.js       (đã có) Phase 2, kèm liên kết phiếu điều chỉnh bù trừ + payment_status (Phase 3)
│  │  ├─ stockIssues.routes.js         (đã có) Phase 2, kèm liên kết phiếu điều chỉnh bù trừ + payment_status
│  │  ├─ customerCategories.routes.js  (đã có, 2026-08-01) CRUD "Loại khách hàng" (tên + hạn mức công nợ)
│  │  ├─ debts.routes.js               (đã có) Phase 3 — summary (kèm category_debt_limit), lịch sử theo đối tác, ghi nhận thanh toán
│  │  ├─ reports.routes.js             (đã có) Phase 4 — inventory/stock-movements/debts, tinh truc tiep tu bang goc
│  │  ├─ warranties.routes.js          (đã có, 2026-08-01) CRUD Bao hanh, xoa chi Admin
│  │  ├─ cashVouchers.routes.js        (đã có, 2026-08-02) Phieu thu/chi (list+summary theo thang, tao, xoa, /staff) - module doc lap "so_quy"
│  │  ├─ cashCategories.routes.js      (đã có, 2026-08-02) CRUD "Loai thu chi"
│  │  ├─ cashBookSettings.routes.js    (đã có, 2026-08-02) GET/PUT Quy dau ky (cash_book_settings, singleton)
│  │  ├─ projects.routes.js            (kế hoạch, Đợt 1) CRUD du an + nguoi tham gia + giai doan cua tung du an
│  │  ├─ projectPhaseTemplates.routes.js (kế hoạch, Đợt 1) CRUD danh muc "Giai doan mau" (menu Cau hinh)
│  │  ├─ projectTasks.routes.js        (kế hoạch, Đợt 2) CRUD cong viec theo giai doan
│  │  └─ projectFinance.routes.js      (kế hoạch, Đợt 3-4) du toan vat tu, cong no du an, dot thanh toan, phat sinh
│  └─ services/
│     ├─ stockReceipt.service.js       (đã có) transaction: tạo phiếu nhập + movements + lô hàng + ghi nợ NCC neu cong_no
│     ├─ stockIssue.service.js         (đã có) transaction: tạo phiếu xuất + movements, tiêu thụ lô + ghi nợ khach hang neu cong_no
│     ├─ costing.service.js            (đã có) tính giá vốn bình quân gia quyền/FIFO (Phase 2)
│     ├─ debt.service.js               (đã có) Phase 3 — ghi nợ (trong transaction cua phieu)/thanh toan/tinh so du
│     ├─ cashVoucher.service.js        (đã có, 2026-08-02) tao ma PT/PC, tinh Quy dau ky/Tong thu/Tong chi/Ton quy theo thang (moc thoi gian UTC+7 co dinh)
│     └─ project.service.js            (kế hoạch, Đợt 1-4) sinh ma DA, copy giai doan mau khi tao du an, tinh % tien do / vat tu da xuat / cong no du an / trang thai dot thanh toan (tat ca on-the-fly, khong luu)
├─ frontend/
│  ├─ login.html                       (đã có)
│  ├─ dashboard.html                   (đã có) trang chủ sau đăng nhập
│  ├─ users.html                       (đã có) quản lý người dùng
│  ├─ roles.html                       (đã có) quản lý vai trò (CRUD + chọn module)
│  ├─ company-settings.html            (đã có) thông tin công ty (2 card song song)
│  ├─ warehouse-settings.html          (đã có) cấu hình kho (allow_negative_stock + costing_method)
│  ├─ sales-settings.html              (đã có) khung trống "Cấu hình bán hàng" — chưa có nội dung
│  ├─ about.html                       (đã có, 2026-08-01) "Thông tin phần mềm" — tên/phiên bản/bản quyền, mở cho mọi tài khoản
│  ├─ products.html                    (đã có) danh mục sản phẩm (tìm kiếm, sắp xếp, cảnh báo tồn thấp)
│  ├─ product-detail.html              (đã có, ngoài kế hoạch ban đầu) chi tiết sản phẩm + 2 lịch sử
│  ├─ stock-receipts.html              (đã có) lập phiếu nhập (combobox sản phẩm, chiết khấu, thời gian nhập tùy chỉnh, modal xem chi tiết, phiếu điều chỉnh bù trừ)
│  ├─ stock-issues.html                (đã có) lập phiếu xuất (combobox sản phẩm, toggle payment_status, phiếu điều chỉnh bù trừ)
│  ├─ print-issue.html                 (đã có) Phase 4 — trang in phiếu xuất kho, doc lap khong dung sidebar, @media print
│  ├─ partners.html                    (đã có) quản lý Nhà cung cấp (từ 2026-08-01 tách khỏi Khách hàng)
│  ├─ debts.html                       (đã có) Công nợ NCC — danh sách số dư + lịch sử + ghi nhận thanh toán
│  ├─ customers.html                   (đã có, 2026-08-01) quản lý Khách hàng (tách khỏi partners.html), có chọn Loại khách hàng
│  ├─ customer-debts.html              (đã có, 2026-08-01) Công nợ khách hàng, cảnh báo khi vượt hạn mức Loại khách hàng
│  ├─ customer-categories.html         (đã có, 2026-08-01) CRUD "Loại khách hàng", thuộc menu Cấu hình
│  ├─ customer-detail.html             (đã có, 2026-08-01, mới) chi tiết khách hàng + the Bảo hành
│  ├─ warranties.html                  (đã có, 2026-08-01) danh sách Bảo hành + modal thêm mới/sửa
│  ├─ reports.html                     (đã có) Phase 4 — ton kho + mua/ban theo thang (bieu do SVG tu ve) + cong no tong hop
│  ├─ cash-book.html                   (đã có, 2026-08-02) Sổ quỹ — danh sách phiếu thu/chi theo tháng (chọn Tháng/Năm), thẻ Quỹ đầu kỳ/Tổng thu/Tổng chi/Tồn quỹ, modal lập phiếu (kèm tạo nhanh "Loại thu chi")
│  ├─ cash-categories.html             (đã có, 2026-08-02) CRUD "Loại thu chi", thuộc menu Quỹ
│  ├─ projects.html                    (kế hoạch, Đợt 1) danh sách dự án + modal thêm/sửa (kèm người tham gia)
│  ├─ project-detail.html              (kế hoạch, Đợt 1-4) chi tiết dự án dạng 6 tab — pattern giao diện MỚI, phải dùng skill ui-ux-pro-max
│  ├─ project-phase-templates.html     (kế hoạch, Đợt 1) danh mục "Giai đoạn mẫu", thuộc menu Cấu hình
│  ├─ assets/
│     ├─ style.css                     (đã có) design system (xem docs/DESIGN-SYSTEM.md)
│     ├─ api.js                        (đã có) helper gọi API dùng chung
│     ├─ auth.js                       (đã có) logic riêng trang login
│     ├─ icons.js                      (đã có) bộ icon SVG dùng chung
│     ├─ layout.js                     (đã có) sidebar/điều hướng dùng chung mọi trang (lọc theo permissions), có dòng bản quyền footer (2026-08-01)
│     ├─ dashboard.js                  (đã có, 2026-08-01) logic trang dashboard.html (lời chào động, the bento, truy cap nhanh)
│     ├─ about.js                      (đã có, 2026-08-01) logic trang about.html
│     ├─ users.js                      (đã có) logic trang users.html
│     ├─ roles.js                      (đã có) logic trang roles.html
│     ├─ company-settings.js           (đã có) logic trang company-settings.html
│     ├─ warehouse-settings.js         (đã có) logic trang warehouse-settings.html
│     ├─ products.js                   (đã có) logic trang products.html
│     ├─ product-detail.js             (đã có) logic trang product-detail.html
│     ├─ stock-receipts.js             (đã có) logic trang stock-receipts.html
│     ├─ stock-issues.js               (đã có) logic trang stock-issues.html
│     ├─ receipt-detail.js             (đã có) modal xem chi tiết phiếu nhập, dùng chung stock-receipts.html + product-detail.html
│     ├─ issue-detail.js               (đã có) modal xem chi tiết phiếu xuất, dùng chung stock-issues.html + product-detail.html
│     ├─ adjustment.js                 (đã có) combobox "Điều chỉnh cho phiếu", dùng chung stock-receipts.html + stock-issues.html
│     ├─ partners.js                   (đã có) logic trang partners.html (chỉ Nhà cung cấp)
│     ├─ debts.js                      (đã có) logic trang debts.html (chỉ Công nợ NCC)
│     ├─ customers.js                  (đã có, 2026-08-01) logic trang customers.html
│     ├─ customer-debts.js             (đã có, 2026-08-01) logic trang customer-debts.html
│     ├─ customer-categories.js        (đã có, 2026-08-01) logic trang customer-categories.html
│     ├─ customer-detail.js            (đã có, 2026-08-01) logic trang customer-detail.html
│     ├─ warranties.js                 (đã có, 2026-08-01) logic trang warranties.html
│     ├─ warranty-calc.js              (đã có, 2026-08-01) hàm dùng chung: tính 2 chiều thời gian bảo hành ↔ ngày hết hạn, số ngày còn lại
│     ├─ print-issue.js                (đã có) logic trang print-issue.html
│     ├─ reports.js                    (đã có) logic trang reports.html (bieu do cot SVG tu ve)
│     ├─ cash-book.js                  (đã có, 2026-08-02) logic trang cash-book.html
│     ├─ cash-categories.js            (đã có, 2026-08-02) logic trang cash-categories.html
│     ├─ tokens.css                    (kế hoạch, Mobile Đợt 1) TÁCH từ style.css: :root (màu/font/shadow/radius) + @font-face — DÙNG CHUNG desktop + mobile, tránh lệch thương hiệu
│     └─ fonts/                        (đã có) file .woff2 host offline + fonts.css
│  └─ m/                               (kế hoạch, Giao diện di động — xem mục 4 "Giao diện di động" và docs/DECISIONS.md 2026-08-06)
│     │                                Bản app RIÊNG cho điện thoại/tablet. KHÔNG cần sửa server.js: express.static(frontend/)
│     │                                đã phục vụ sẵn thư mục con → tự chạy tại /m/. Dùng chung API + cookie session với desktop.
│     ├─ index.html                    (Đợt 1) Trang chủ mobile — thẻ tóm tắt + sinh nhật + thông báo
│     ├─ login.html                    (Đợt 1) đăng nhập bản mobile
│     ├─ products.html · product-detail.html          (Đợt 2)
│     ├─ customers.html · customer-detail.html        (Đợt 2)
│     ├─ partners.html · customer-debts.html · debts.html (Đợt 2)
│     ├─ contacts.html · warranties.html              (Đợt 2)
│     ├─ projects.html · project-detail.html          (Đợt 3)
│     └─ assets/
│        ├─ m-style.css                (Đợt 1) toàn bộ CSS bản mobile — import tokens.css dùng chung, KHÔNG import style.css
│        ├─ m-tokens.css               (Đợt 1) token riêng mobile: chiều cao app bar/tab bar, safe-area, cỡ vùng chạm
│        ├─ m-layout.js                (Đợt 1) app bar + thanh tab dưới (lọc theo user.permissions, dùng lại khai báo NAV_GROUPS)
│        ├─ m-ui.js                    (Đợt 1) bottom sheet, pull-to-refresh, skeleton, toast, khôi phục vị trí cuộn
│        └─ m-<màn>.js                 (Đợt 2-3) logic từng màn, viết mới gọn — KHÔNG tách logic từ 44 file JS desktop đang chạy
├─ data/
│  └─ data.db                          (đã có) file SQLite
├─ scripts/
│  └─ backup.js                        (đã có, 2026-08-01) copy data.db sang backup_path (warehouse_settings), tự xóa bản cũ >14 ngày — chạy tay (`npm run backup`) hoặc qua Windows Task Scheduler (xem docs/DEPLOY.md)
└─ ecosystem.config.js                 (đã có, 2026-08-01) cấu hình PM2 (Phase 5) — `pm2 start ecosystem.config.js`
```

## 2. Database Schema chi tiết

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `users` | id PK, username, password_hash, full_name, role_id FK(roles), is_active, created_at | role_id thay cho cột `role` TEXT cố định trước đây (xem mục 2b) |
| `roles` | id PK, name, is_protected, created_at | is_protected=1 cho vai trò Admin — không cho sửa tên/xóa |
| `role_permissions` | role_id FK(roles), module_key, PRIMARY KEY(role_id, module_key) | 1 dòng = 1 module vai trò đó được truy cập; module_key là hằng số cố định trong code (không phải bảng riêng) |
| `company_settings` | id PK (CHECK id=1), company_name, address, tax_code, email, website, phones, bank_name, bank_branch, bank_account_number, bank_account_holder, print_note, updated_at | chỉ 1 dòng duy nhất; `phones` lưu mảng JSON dạng text (cho nhập từ 2 số trở lên) — không tách bảng riêng vì luôn gắn 1-1 với dòng duy nhất này; `print_note` (migration 014, Phase 4) — ghi chú hiển thị dưới bảng kê khi in phiếu xuất kho |
| `warehouse_settings` | key PK, value, updated_at | dạng key-value, mở rộng dần; key: `allow_negative_stock`, `costing_method` (`binh_quan_gia_quyen` mặc định hoặc `fifo`), `backup_path` (đường dẫn lưu backup `data.db`, Phase 5, 2026-08-01 — để trống nếu chưa cấu hình) |
| `products` | id PK, code, name, unit, cost_price, sale_price, low_stock_threshold, is_active, created_at | tồn kho không lưu ở đây; `cost_price` là giá tham chiếu nhập tay, giá vốn thực tế tính từ `stock_lots` (xem `costing.service.js`); `is_active=0` = vô hiệu hóa (vẫn hiện, không chọn được khi lập phiếu mới) |
| `partners` | id PK, type, name, phone, address, category_id, assigned_user_id, created_at | type ∈ {nha_cung_cap, khach_hang}; `category_id` FK(customer_categories) nullable — chỉ có ý nghĩa khi type='khach_hang' (validate ở API, không CHECK ở DB), 2026-08-01; `assigned_user_id` FK(users) nullable ("Người phụ trách", migration 020, 2026-08-03) — hiện chỉ hiển thị/sửa được qua `customers.html`, cột dùng chung cả 2 loại đối tác |
| `customer_categories` | id PK, name, debt_limit, created_at | migration `015`, 2026-08-01 — danh mục "Loại khách hàng" (name UNIQUE), `debt_limit` nullable = không giới hạn, chỉ dùng để CẢNH BÁO trên trang Công nợ khách hàng (không chặn cứng) |
| `warranties` | id PK, partner_id FK, phone, address, acceptance_date, expiry_date, duration_value, duration_unit, note, is_active, created_by FK, created_at, updated_at | migration `017`, 2026-08-01 — Bảo hành, `partner_id` chỉ áp dụng `type='khach_hang'` (validate ở API); `phone`/`address` là snapshot fill từ đối tác lúc tạo, sửa được, không tự đổi theo nếu sau này sửa hồ sơ khách hàng; `expiry_date` là nguồn tính "còn lại bao nhiêu ngày" (tính lại mỗi lần xem, không lưu số ngày cố định) |
| `stock_receipts` | id PK, code, order_code, partner_id FK, created_by FK(users), note, payment_status, adjusts_type, adjusts_id, created_at | phiếu nhập; `code` tự sinh nội bộ (PN000001...), `order_code` là số hóa đơn/đơn hàng của NCC (tự do, không bắt buộc); `created_at` có thể chỉnh khi lập phiếu — ảnh hưởng thứ tự FIFO/bình quân gia quyền; `payment_status` ∈ {da_thanh_toan, cong_no} (Phase 3, đối xứng `stock_issues`); `adjusts_type`/`adjusts_id` (Phase 2) đánh dấu phiếu điều chỉnh bù trừ cho phiếu nào |
| `stock_receipt_items` | id PK, receipt_id FK, product_id FK, quantity, unit_price, discount_percent | dòng chi tiết phiếu nhập; `unit_price` là giá gốc, `discount_percent` (0-100%) — giá vốn thực tế = `unit_price * (1 - discount_percent/100)` |
| `stock_issues` | id PK, code, partner_id FK, created_by FK(users), note, payment_status, adjusts_type, adjusts_id, created_at, `is_return`, `status` | phiếu xuất; `payment_status` ∈ {da_thu_tien, cong_no}. `is_return` (migration `034`, dùng chung bảng cho "Trả hàng NCC") + `status` ∈ {cho_tru_kho, da_tru_kho} (mặc định `da_tru_kho`) — từ migration `042` (2026-08-20) áp dụng luôn quy trình 2 bước "Lưu tạm"/"Xuất kho" cho phiếu xuất thường (`is_return=0`), không chỉ Trả hàng: `cho_tru_kho` = nháp (chưa ghi `stock_movements`/`debt_ledger`/`cash_vouchers`), chỉ chuyển `da_tru_kho` sau khi "Xuất kho" thật (xem `stockIssue.service.js#applyIssueProcessing()`) |
| `stock_issue_items` | id PK, issue_id FK, product_id FK, quantity, unit_price, discount_percent | dòng chi tiết phiếu xuất; `discount_percent` (0-100%, migration 013) — chỉ ảnh hưởng doanh thu ghi công nợ, **không** ảnh hưởng `unit_cost` (giá vốn tính riêng qua `costing.service.js`) |
| `stock_movements` | id PK, product_id FK, movement_type, quantity, unit_cost, reference_type, reference_id, created_at | ledger biến động kho — tồn kho = SUM(movement) theo product; `unit_cost` là snapshot giá vốn tại thời điểm phát sinh (không tính lại về sau) |
| `stock_lots` | id PK, product_id FK, receipt_id FK, unit_cost, quantity_received, quantity_remaining, created_at | 1 dòng = 1 lô hàng nhập; `quantity_remaining` trừ dần theo thứ tự cũ nhất trước (FIFO vật lý) bất kể `costing_method` đang chọn; dùng để tính giá vốn bình quân gia quyền/FIFO (xem `costing.service.js`) |
| `product_change_log` | id PK, product_id FK, changed_by FK(users), field_name, old_value, new_value, created_at | lịch sử chỉnh sửa thông tin sản phẩm — chỉ ghi khi `PUT /api/products/:id` thực sự đổi giá trị |
| `debt_ledger` | id PK, partner_id FK, type, amount, reference_type, reference_id, note, created_by FK(users), created_at, is_adjustment | type ∈ {no, tra}; số dư = SUM cộng dồn theo partner_id; `reference_type` ∈ {receipt, issue, payment} — `payment` (ghi nhận thanh toán thủ công) có `reference_id` NULL vì không gắn với 1 phiếu cụ thể; `created_by` bổ sung ngoài draft gốc để nhất quán truy vết với các bảng khác (xem `docs/DECISIONS.md`); `is_adjustment` (migration `016`, 2026-08-01) đánh dấu dòng "Điều chỉnh công nợ" thủ công — phân biệt với dòng tự động và thanh toán thật |
| `cash_book_settings` | id PK (CHECK id=1), opening_balance, updated_at | migration `019`, 2026-08-02 — Quỹ đầu kỳ, nhập 1 lần, tự động cộng dồn qua các tháng (không lưu riêng từng tháng) |
| `cash_categories` | id PK, name, type (`thu`/`chi`), created_at | migration `019` — danh mục "Loại thu chi", `UNIQUE(name, type)` |
| `cash_vouchers` | id PK, code, type, category_id FK NOT NULL, counterpart_name, handled_by FK(users), amount, note, record_business_result, created_by FK(users), created_at | migration `019` — Phiếu thu (`code` = `PT000001...`) / Phiếu chi (`PC000001...`), riêng từng type; **độc lập hoàn toàn với `debt_ledger`** (không ghi công nợ); không sửa được, chỉ tạo + xóa cứng; `created_at` nhận giá trị tùy chỉnh từ form (giống `stock_receipts`), quyết định phiếu thuộc tháng nào |
| `project_phase_templates` | id PK, name, sort_order, created_at | **kế hoạch** migration `021` — danh mục "Giai đoạn mẫu" (menu Cấu hình), seed sẵn Khảo sát → Thiết kế → Chuẩn bị vật tư → Thi công → Nghiệm thu → Bàn giao & Bảo hành |
| `projects` | id PK, code, name, partner_id FK(partners), contract_no, contract_date, site_address, contract_value, start_date, planned_end_date, actual_end_date, status, manager_id FK(users), note, created_by FK(users), created_at, updated_at | **kế hoạch** migration `021` — `code` tự sinh `DA000001...`; `partner_id` bắt buộc và phải là `type='khach_hang'` (validate ở API); `status` ∈ {chuan_bi, dang_thuc_hien, tam_dung, hoan_thanh, huy}. **Không lưu** % tiến độ, giá trị hợp đồng thực tế, vật tư đã xuất, công nợ — tất cả tính on-the-fly |
| `project_members` | id PK, project_id FK, user_id FK(users), role_in_project, UNIQUE(project_id, user_id) | **kế hoạch** migration `021` — danh sách người tham gia; `role_in_project` là ô chữ tự do (không có danh mục vai trò riêng ở giai đoạn này). Dùng để giới hạn dropdown "Người phụ trách" khi giao việc |
| `project_phases` | id PK, project_id FK, name, sort_order, planned_start, planned_end, actual_start, actual_end, status, note | **kế hoạch** migration `021` — copy từ `project_phase_templates` lúc tạo dự án rồi **tách rời hoàn toàn** (sửa mẫu về sau không ảnh hưởng dự án đã tạo) |
| `project_tasks` | id PK, phase_id FK(project_phases), name, assigned_user_id FK(users), start_date, due_date, actual_start_date, actual_end_date, status, completed_at, note, created_by FK(users), created_at, updated_at | migration `022` — **chỉ lưu `phase_id`**, lấy dự án qua JOIN (không lưu thêm `project_id` để tránh lệch dữ liệu khi chuyển công việc sang giai đoạn khác); `status` ∈ {chua_lam, dang_lam, hoan_thanh} — nguồn duy nhất để tính % tiến độ. `actual_start_date`/`actual_end_date` (migration `023`, 2026-08-04, ngoài kế hoạch ban đầu) — nhập tay giống hệt `project_phases.actual_start`/`actual_end`, **thay thế hoàn toàn** cơ chế `completed_at` tự động của Đợt 2 (cột `completed_at` vẫn còn trong schema nhưng không còn đọc/ghi, chỉ giữ dữ liệu lịch sử cũ) — cảnh báo trễ tiến độ của công việc nay so `due_date` với `actual_end_date` thay vì `completed_at` |
| `project_material_plan` | id PK, project_id FK, product_id FK, quantity, note, UNIQUE(project_id, product_id) | **kế hoạch** migration `023` — dự toán vật tư; "Đã xuất" **không lưu ở đây**, tính bằng phiếu xuất gắn dự án **trừ** phiếu nhập gắn dự án |
| `project_payment_milestones` | id PK, project_id FK, name, sort_order, amount, percent, due_date, note, created_at | **kế hoạch** migration `024` — đợt thanh toán theo hợp đồng. **Không lưu** số tiền đã thu hay trạng thái — suy ra từ `SUM(debt_ledger WHERE milestone_id)` so với `amount`: Chưa thu / Thu một phần / Đã thu đủ / Quá hạn |
| `project_variations` | id PK, project_id FK, type, title, amount, occurred_date, description, status, resolution, created_by FK(users), created_at, updated_at | **kế hoạch** migration `024` — phát sinh; `type` ∈ {chi_phi, van_de}. Chỉ `type='chi_phi'` + đã duyệt mới cộng vào giá trị hợp đồng thực tế; `type='van_de'` là nhật ký sự cố, `amount=0` |
| `project_acceptance_solutions` | id PK, project_id FK, name, note, created_by FK(users), created_at, updated_at | migration `041` (2026-08-19) — "Nghiệm thu theo giải pháp": 1 giải pháp đã ký với khách hàng, gom nhóm thiết bị đã xuất |
| `project_acceptance_solution_items` | id PK, solution_id FK(project_acceptance_solutions), product_id FK(products), quantity, UNIQUE(solution_id, product_id) | migration `041` — quan hệ **nhiều-nhiều** product↔solution (1 sản phẩm chia được vào nhiều giải pháp khác nhau). Không lưu đơn giá/thành tiền (tính on-the-fly từ giá bán bình quân gia quyền trên `stock_issue_items`, giống nguyên tắc "không lưu giá trị suy ra được") |
| `schema_migrations` | version PK, applied_at | migration runner đọc bảng này |

**Cột thêm vào bảng có sẵn cho module Quản lý dự án** (kế hoạch, 2026-08-04 — tất cả đều là `ALTER TABLE ADD COLUMN` nullable, **không dựng lại bảng nào**):

| Bảng | Cột thêm | Migration | Lý do |
|---|---|---|---|
| `stock_issues` | `project_id` | `023` | Gắn phiếu xuất với dự án — nguồn tính vật tư đã xuất và công nợ phát sinh của dự án |
| `stock_receipts` | `project_id` | `023` | Bắt buộc có để "Đã xuất cho dự án" trừ được phiếu nhập bù trừ khi trả vật tư thừa về kho |
| `debt_ledger` | `project_id` | `023` | Nhãn dự án trên dòng công nợ — sổ cái vẫn thuộc khách hàng, đây chỉ là chiều phân tích thêm. Nếu suy ra bằng JOIN thì **dòng điều chỉnh công nợ thủ công không cách nào gắn được** vào dự án |
| `debt_ledger` | `milestone_id` | `024` | Biết khoản thu thuộc đợt thanh toán nào. **Cố ý không thêm giá trị `'project_milestone'` vào `reference_type`** — cột đó có `CHECK` mà SQLite không sửa được bằng `ALTER TABLE`, phải dựng lại toàn bộ bảng sổ cái đang chứa dữ liệu thật (rủi ro cao nhất có thể làm trong dự án này) |

> **Ràng buộc SQLite cần nhớ**: dự án bắt buộc `PRAGMA foreign_keys=ON`, nên cột thêm bằng `ADD COLUMN` có `REFERENCES` **phải mặc định NULL** — không `NOT NULL`, không `DEFAULT` khác NULL.

**Nguyên tắc quan trọng** (đã thống nhất ở bước trước, nhắc lại để dev không quên khi code):
- Tồn kho và công nợ **không bao giờ** lưu dưới dạng 1 số cố định — luôn tính từ tổng cộng dồn (`stock_movements`, `debt_ledger`). Tránh lệch dữ liệu.
- Mỗi phiếu nhập/xuất = 1 transaction SQLite duy nhất, gồm: insert phiếu + insert items + insert movements. Nếu 1 bước lỗi, rollback toàn bộ.

Sơ đồ ERD tương ứng: xem file `erd.mermaid` đi kèm (cần bổ sung `roles`/`role_permissions`/`company_settings`/`warehouse_settings` khi vào Phase 1.6).

## 2b. Phân quyền động (bổ sung 2026-08-01)

Thay cho danh sách vai trò cố định, hệ thống chuyển sang **phân quyền theo module**:

- `module_key` là hằng số cố định trong code (không lưu thành bảng riêng vì đây là tập hợp module do ứng dụng định nghĩa, không phải dữ liệu người dùng tạo ra): `kho`, `cong_no`, `khach_hang`, `bao_cao`, `nguoi_dung`, `cau_hinh`, `so_quy` (Sổ quỹ, 2026-08-02), `du_an` (Quản lý dự án, 2026-08-04), `doi_tac`, `bao_hanh` (2026-08-08), `nghiem_thu` (Nghiệm thu theo giải pháp, 2026-08-19). Mở rộng thêm khi có module mới (vd `ban_hang` khi module Bán hàng/POS được lên kế hoạch). Thêm module mới phải sửa cả `MODULE_KEYS` lẫn `MODULE_LABELS` trong `backend/config/modules.js` (trang "Vai trò" đọc động qua `GET /api/roles/modules`) và `NAV_GROUPS` trong `frontend/assets/layout.js` (**trừ** module chỉ dùng để phân quyền phụ trong 1 tab có sẵn như `nghiem_thu` — không có mục nav riêng, không sửa `layout.js`).
- Vai trò Admin (`is_protected = 1`) mặc nhiên có mọi `module_key`, không lưu dòng nào trong `role_permissions` cho Admin — middleware luôn cho qua nếu `role.is_protected = 1`, không cần tra bảng.
- Middleware `requireRole('admin')` kiểu cũ (so khớp tên vai trò) được thay bằng `requirePermission('module_key')` (tra `role_permissions` theo `role_id` của user, hoặc cho qua thẳng nếu vai trò `is_protected`).
- `GET /api/auth/me` trả thêm danh sách `permissions` (mảng `module_key`) của user hiện tại, để frontend (`layout.js`) lọc menu mà không cần gọi thêm API.

## 3. API Endpoints theo module

| Method | Path | Quyền (module) | Mô tả |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Đăng nhập, tạo session |
| POST | `/api/auth/logout` | Đã đăng nhập | Xóa session |
| GET | `/api/auth/me` | Đã đăng nhập | Thông tin user hiện tại + danh sách `permissions` |
| GET | `/api/roles` | `nguoi_dung` | Danh sách vai trò kèm quyền |
| POST | `/api/roles` | `nguoi_dung` | Tạo vai trò mới + gán module |
| PUT | `/api/roles/:id` | `nguoi_dung` | Sửa tên/quyền vai trò (chặn nếu `is_protected`) |
| DELETE | `/api/roles/:id` | `nguoi_dung` | Xóa vai trò (chặn nếu `is_protected` hoặc đang có user dùng) |
| GET | `/api/users` | `nguoi_dung` | Danh sách tài khoản |
| POST | `/api/users` | `nguoi_dung` | Tạo tài khoản |
| PUT | `/api/users/:id` | `nguoi_dung` | Sửa họ tên/vai trò/mật khẩu (tùy chọn) — không đổi username, chặn tự đổi vai trò chính mình |
| DELETE | `/api/users/:id` | Chỉ Admin (`is_protected`) | Xóa cứng — chặn nếu đã tự xóa chính mình hoặc tài khoản đã có lịch sử tạo/sửa dữ liệu |
| PATCH | `/api/users/:id/deactivate` | `nguoi_dung` | Vô hiệu hóa tài khoản |
| PATCH | `/api/users/:id/activate` | `nguoi_dung` | Kích hoạt lại tài khoản |
| GET | `/api/company-settings` | Đã đăng nhập | Thông tin công ty (dùng cho mẫu in) |
| PUT | `/api/company-settings` | `cau_hinh` | Cập nhật thông tin công ty |
| GET | `/api/warehouse-settings` | Đã đăng nhập | Cấu hình kho hiện tại (vd `allow_negative_stock`) |
| PUT | `/api/warehouse-settings` | `cau_hinh` | Cập nhật cấu hình kho |
| POST | `/api/warehouse-settings/backup` | `cau_hinh` | "Backup ngay" (Phase 5, 2026-08-01) — chạy `scripts/backup.js` ngay lập tức, trả về đường dẫn file backup vừa tạo |
| GET | `/api/products` | Đã đăng nhập | Danh mục + tồn kho hiện tại |
| POST | `/api/products` | `kho` | Thêm sản phẩm |
| PUT | `/api/products/:id` | `kho` | Sửa sản phẩm (ghi `product_change_log` nếu có thay đổi) |
| PATCH | `/api/products/:id/deactivate` \| `/activate` | `kho` | Vô hiệu hóa/mở lại sản phẩm |
| DELETE | `/api/products/:id` | Chỉ Admin (`is_protected`) | Xóa cứng — chặn nếu đã có `stock_movements` |
| GET | `/api/products/:id` | Đã đăng nhập | Chi tiết + giá vốn tính theo `costing_method` đang chọn |
| GET | `/api/products/:id/movements` | Đã đăng nhập | Lịch sử nhập/xuất kho của sản phẩm |
| GET | `/api/products/:id/history` | Đã đăng nhập | Lịch sử chỉnh sửa thông tin sản phẩm |
| GET | `/api/products/import-template` | `kho` | Tải file Excel mẫu để nhập hàng loạt sản phẩm (2026-08-02) |
| POST | `/api/products/import` | `kho` | Nhập hàng loạt từ file `.xlsx` — toàn bộ file phải hợp lệ mới ghi vào DB, báo lỗi theo từng dòng nếu có (2026-08-02) |
| POST | `/api/products/export` | Đã đăng nhập | Xuất `.xlsx` đúng theo danh sách `ids` gửi lên (khớp danh sách đang hiển thị trên giao diện, 2026-08-02) |
| GET | `/api/partners?type=` | Đã đăng nhập | Danh sách NCC/khách hàng (đủ dùng cho dropdown chọn/thêm nhanh), kèm `category_name`/`category_debt_limit` (LEFT JOIN, 2026-08-01) |
| GET | `/api/partners/staff` | Đã đăng nhập | Danh sách tài khoản đang hoạt động cho combobox "Người phụ trách" (2026-08-03) — không đòi quyền `nguoi_dung` như `GET /api/users`, cùng cách giải quyết đã dùng cho `GET /api/cash-vouchers/staff` |
| POST | `/api/partners` | `kho` **hoặc** `cong_no` | Thêm đối tác nhanh — đổi từ chỉ `cong_no` ban đầu, vì thủ kho cũng cần thêm NCC khi lập phiếu nhập (xem `docs/DECISIONS.md`, dùng `requireAnyPermission`); nhận thêm `category_id` (chỉ áp dụng type='khach_hang', 2026-08-01), `assigned_user_id` (nullable, 2026-08-03) |
| PUT | `/api/partners/:id` | `cong_no` | Sửa tên/SĐT/địa chỉ/`category_id`/`assigned_user_id` — không đổi được `type` sau khi tạo (Phase 3) |
| DELETE | `/api/partners/:id` | `cong_no` | Xóa cứng — chặn nếu đã có lịch sử `stock_receipts`/`stock_issues`/`debt_ledger` (Phase 3) |
| GET | `/api/customer-categories` | Đã đăng nhập | Danh sách "Loại khách hàng" (2026-08-01) |
| POST/PUT/DELETE | `/api/customer-categories(/:id)` | `cau_hinh` | CRUD "Loại khách hàng" — xóa chặn nếu đang có khách hàng thuộc loại đó (2026-08-01) |
| GET | `/api/stock-receipts` | `kho` | Danh sách phiếu nhập |
| GET | `/api/stock-receipts/:id` | `kho` | Chi tiết phiếu nhập (kèm `total_amount` tính từ items, `adjusts_code`, `adjusted_by`) |
| POST | `/api/stock-receipts` | `kho` | Tạo phiếu nhập (transaction) — nhận thêm `receipt_date` (tùy chọn, ảnh hưởng thứ tự FIFO), `order_code`, `payment_status` (Phase 3, mặc định `da_thanh_toan`, bắt buộc có `partner_id` nếu `cong_no`), `adjusts_type`/`adjusts_id` (tùy chọn, phiếu điều chỉnh bù trừ), mỗi item có thêm `discount_percent` |
| GET | `/api/stock-issues` | `kho` | Danh sách phiếu xuất |
| GET | `/api/stock-issues/:id` | `kho` | Chi tiết phiếu xuất (kèm `total_amount`, `adjusts_code`, `adjusted_by`, `partner_phone`/`partner_address` — dùng cho trang in) |
| POST | `/api/stock-issues` | `kho` | Tạo phiếu xuất (transaction) — nhận thêm `issue_date` (tùy chọn), `adjusts_type`/`adjusts_id` (tùy chọn, phiếu điều chỉnh bù trừ), `is_draft` (tùy chọn, mặc định false — migration `042`, 2026-08-20), mỗi item có thêm `discount_percent`; `payment_status='cong_no'` bắt buộc có `partner_id` |
| PUT | `/api/stock-issues/:id` | `kho` | Sửa phiếu đang `cho_tru_kho` (nháp) — thay toàn bộ items, chặn 400 nếu đã `da_tru_kho` (2026-08-20) |
| POST | `/api/stock-issues/:id/process` | `kho` | "Xuất kho" cho phiếu đã Lưu tạm trước đó — validate lại tồn kho + ghi `stock_movements`/`debt_ledger`/`cash_vouchers`, khóa `status='da_tru_kho'` vĩnh viễn (2026-08-20) |
| GET | `/api/debts/summary?type=` | `cong_no` | Số dư hiện tại từng đối tác (tính từ `SUM debt_ledger`) |
| GET | `/api/debts?partner_id=` | `cong_no` | Lịch sử giao dịch công nợ 1 đối tác, kèm `total_transacted` (tổng tiền hàng đã mua/bán tính trực tiếp từ `stock_receipts`/`stock_issues`, không phải từ `debt_ledger`) |
| POST | `/api/debts/payment` | `cong_no` | Ghi nhận thanh toán (cho phép trả từng phần) |
| GET | `/api/debts/documents?partner_id=` | `cong_no` | Danh sách phiếu nhập/xuất `cong_no` của 1 đối tác — dùng cho combobox chọn "phiếu gốc bị sai" khi điều chỉnh công nợ (2026-08-01, không đòi quyền `kho` như `/api/stock-receipts`) |
| POST | `/api/debts/adjustment` | `cong_no` | "Điều chỉnh công nợ" (2026-08-01, khác Ghi nhận thanh toán) — sửa số dư sai không sửa/xóa phiếu gốc, xem `docs/DECISIONS.md` |
| GET | `/api/reports/inventory` | `bao_cao` | Tồn kho hiện tại từng sản phẩm + giá vốn (luôn bình quân gia quyền) + giá trị tồn, tổng giá trị toàn kho |
| GET | `/api/reports/stock-movements?months=` | `bao_cao` | Tổng hợp mua hàng/bán hàng theo từng tháng (mặc định 6 tháng gần nhất, điền 0 cho tháng trống) |
| GET | `/api/reports/debts` | `bao_cao` | Tổng phải trả (NCC)/phải thu (khách hàng) toàn hệ thống |
| GET | `/api/warranties?partner_id=` | `cong_no` | Danh sách Bảo hành, lọc theo khách hàng (dùng cho trang Chi tiết khách hàng) — không lọc thì trả toàn bộ (2026-08-01) |
| GET | `/api/warranties/:id` | `cong_no` | Chi tiết 1 bản ghi Bảo hành |
| POST/PUT | `/api/warranties(/:id)` | `cong_no` | Tạo/sửa Bảo hành — validate `partner_id` phải là `type='khach_hang'`, `expiry_date` > `acceptance_date` |
| PATCH | `/api/warranties/:id/deactivate` \| `/activate` | `cong_no` | Vô hiệu hóa/mở lại |
| DELETE | `/api/warranties/:id` | Chỉ Admin (`is_protected`) | Xóa cứng — không kiểm tra "đã có lịch sử" vì không có bảng nào khác tham chiếu `warranties.id` |
| GET | `/api/cash-vouchers?month=YYYY-MM` | `so_quy` | Danh sách phiếu thu/chi của 1 tháng (bắt buộc `month`, không tự suy đoán) + `summary` (Quỹ đầu kỳ/Tổng thu/Tổng chi/Tồn quỹ) (2026-08-02) |
| POST | `/api/cash-vouchers` | `so_quy` | Tạo phiếu thu/chi — validate danh mục đúng chiều (`type` khớp `category.type`) |
| DELETE | `/api/cash-vouchers/:id` | `so_quy` | Xóa cứng — không có ràng buộc nào chặn (module độc lập) |
| GET | `/api/cash-vouchers/staff` | `so_quy` | Danh sách tài khoản đang hoạt động cho dropdown "Người thu/chi" |
| GET/POST/PUT/DELETE | `/api/cash-categories(/:id)` | `so_quy` | CRUD "Loại thu chi" — xóa chặn nếu đã có phiếu dùng loại đó |
| GET | `/api/cash-book-settings` | Đã đăng nhập | Đọc Quỹ đầu kỳ hiện tại |
| PUT | `/api/cash-book-settings` | `so_quy` | Cập nhật Quỹ đầu kỳ (giá trị gốc, tự cộng dồn qua các tháng) |

> Admin (`is_protected`) luôn qua được mọi route ở trên, không cần liệt kê riêng.

### API module Quản lý dự án (kế hoạch 2026-08-04, chưa code)

| Method | Path | Quyền | Mô tả | Đợt |
|---|---|---|---|---|
| GET/POST/PUT/DELETE | `/api/project-phase-templates(/:id)` | GET: đã đăng nhập / ghi: `cau_hinh` | CRUD danh mục "Giai đoạn mẫu" | 1 |
| GET | `/api/projects` | `du_an` | Danh sách dự án kèm khách hàng, trạng thái, % tiến độ (tính on-the-fly) | 1 |
| GET | `/api/projects/:id` | `du_an` | Chi tiết dự án + người tham gia + giai đoạn + số liệu tổng hợp | 1 |
| POST | `/api/projects` | `du_an` | Tạo dự án — validate `partner_id` phải là `type='khach_hang'`, tự sinh mã `DA...`, **copy toàn bộ Giai đoạn mẫu** vào dự án trong cùng transaction | 1 |
| PUT | `/api/projects/:id` | `du_an` | Sửa thông tin dự án + danh sách người tham gia | 1 |
| DELETE | `/api/projects/:id` | `du_an` | Xóa cứng — **chặn nếu đã có** `stock_receipts`/`stock_issues`/`debt_ledger` gắn dự án (chỉ cho chuyển trạng thái `huy`) | 1 |
| POST/PUT/DELETE | `/api/projects/:id/phases(/:phaseId)` | `du_an` | Thêm/sửa/xóa giai đoạn của riêng dự án đó | 1 |
| GET/POST/PUT/DELETE | `/api/projects/:id/tasks(/:taskId)` | `du_an` | CRUD công việc — validate `assigned_user_id` **phải nằm trong `project_members`** của dự án | 2 |
| GET/PUT | `/api/projects/:id/materials` | `du_an` | Dự toán vật tư + bảng đối chiếu Dự toán/Đã xuất/Còn lại/Vượt | 3 |
| GET | `/api/projects/:id/documents` | `du_an` | Danh sách phiếu nhập/xuất đã gắn dự án | 3 |
| GET | `/api/projects/:id/debts` | `du_an` | Công nợ của dự án: phát sinh, đã thu, còn phải thu (tính từ `debt_ledger` lọc theo `project_id`) | 4 |
| GET/POST/PUT/DELETE | `/api/projects/:id/milestones(/:mid)` | `du_an` | CRUD đợt thanh toán; GET trả kèm số tiền đã thu + trạng thái suy ra | 4 |
| GET/POST/PUT/DELETE | `/api/projects/:id/variations(/:vid)` | `du_an` | CRUD phát sinh (chi phí / vấn đề) | 4 |
| GET | `/api/projects/:id/acceptance-solutions` | `du_an` | Danh sách giải pháp nghiệm thu + 4 số liệu tổng hợp (đã xuất/đã gán/chưa gán/tổng giá trị) | ngoài phase, 2026-08-19 |
| GET | `/api/projects/:id/acceptance-solutions/available-devices` | `du_an` | Danh sách thiết bị đã xuất cho dự án còn có thể gán (query `exclude_solution_id` khi sửa) | ngoài phase, 2026-08-19 |
| GET | `/api/projects/:id/acceptance-solutions/:sid` | `du_an` | Chi tiết 1 giải pháp kèm items | ngoài phase, 2026-08-19 |
| POST/PUT/DELETE | `/api/projects/:id/acceptance-solutions(/:sid)` | `du_an` **+ `nghiem_thu`** | Tạo/sửa/xóa giải pháp — kiểm tra `nghiem_thu` thủ công trong handler (phân quyền 2 lớp, xem `docs/DECISIONS.md`) | ngoài phase, 2026-08-19 |

**Route có sẵn cần sửa** (không đổi hành vi cũ khi không truyền tham số mới):

| Path | Thay đổi | Đợt |
|---|---|---|
| `POST /api/stock-receipts`, `POST /api/stock-issues` | Nhận thêm `project_id` (tùy chọn); truyền xuống service để ghi lên phiếu **và** lên dòng `debt_ledger` sinh ra khi `payment_status='cong_no'` | 3 |
| `GET /api/stock-receipts/:id`, `GET /api/stock-issues/:id` | Trả thêm `project_id`/`project_name` (dùng cho modal chi tiết + trang in) | 3 |
| `POST /api/debts/payment` | Nhận thêm `project_id` và `milestone_id` (đều tùy chọn) — **bắt buộc validate dự án thuộc đúng đối tác** đang ghi nhận, không tin dữ liệu gửi từ trình duyệt | 4 |
| `POST /api/debts/adjustment` | Nhận thêm `project_id` (tùy chọn), cùng cách validate như trên — nếu thiếu, mỗi lần điều chỉnh sẽ làm lệch "Còn phải thu của dự án" | 4 |
| `GET /api/debts?partner_id=` | Trả thêm `project_name` trên từng dòng lịch sử | 4 |

## 4. Trình tự triển khai theo phase (checklist)

### Phase 1 — Nền tảng
- [ ] Khởi tạo project, cài `express`, `better-sqlite3`, `bcrypt`
- [ ] Viết `001_init.sql`: bảng `users`, `schema_migrations`
- [ ] Viết migration runner (`migrate.js`)
- [ ] API đăng nhập + hash password + session middleware
- [ ] Middleware `requireRole`
- [ ] Trang `login.html`
- [ ] Seed tài khoản admin mặc định

### Phase 1.5 — Quản trị người dùng & Phân quyền

> Bổ sung vào plan ngày 2026-07-31: các route `/api/users/*` đã có trong mục 3 (API Endpoints) nhưng chưa từng được đưa vào checklist theo phase nào. Cần làm trước Phase 2 vì Thủ kho/Kế toán cần tài khoản thật (không phải admin) để test đúng phân quyền.

- [ ] `backend/routes/users.routes.js`: `GET /api/users` (danh sách), `POST /api/users` (tạo tài khoản — chọn role, hash password bcrypt), `PATCH /api/users/:id/deactivate` (khóa tài khoản) — tất cả yêu cầu `requireAuth` + `requireRole('admin')`
- [ ] Validation: username không trùng, role hợp lệ (admin/ke_toan/thu_kho), không tự khóa tài khoản admin đang đăng nhập
- [ ] Frontend `frontend/users.html` (chỉ Admin truy cập được): bảng danh sách người dùng, form tạo tài khoản mới, nút khóa/mở tài khoản
- [ ] Thêm điều hướng đơn giản từ màn hình chào sau đăng nhập (login.html) tới trang quản lý người dùng — chỉ hiện với role admin
- [ ] Áp dụng đúng `docs/DESIGN-SYSTEM.md` (đồng bộ với `login.html`)

### Phase 1.6 — Vai trò động & Cấu hình hệ thống (đã xong)

> Bổ sung vào plan ngày 2026-08-01, theo yêu cầu người dùng. Xem chi tiết nghiệp vụ tại `docs/PRD.md` mục 4.1/4.7/4.8/4.9 và quyết định tại `docs/DECISIONS.md`.

- [x] Migration: bảng `roles` + `role_permissions`; thêm cột `users.role_id` (FK), chuyển dữ liệu từ cột `role` TEXT cũ sang `role_id`, seed vai trò Admin (`is_protected=1`), Kế toán, Thủ kho kèm quyền module tương ứng hành vi hiện tại; xóa cột `role` cũ sau khi chuyển xong (SQLite: tạo bảng mới, copy dữ liệu, đổi tên — không có `DROP COLUMN` trực tiếp trên bản cũ)
- [x] Migration: bảng `company_settings` (1 dòng duy nhất, `CHECK (id = 1)`) — mở rộng thêm `email`/`website`/`bank_branch`/`phones` (mảng JSON) ở migration `004` sau khi người dùng yêu cầu bổ sung
- [x] Migration: bảng `warehouse_settings` (key-value), seed `allow_negative_stock = false`
- [x] `backend/middleware/requirePermission.js` thay cho cách dùng `requireRole('admin')` kiểu so tên cố định — tra `role_permissions`, cho qua thẳng nếu vai trò `is_protected`
- [x] Cập nhật `auth.routes.js` — `GET /api/auth/me` trả thêm `permissions` (mảng module_key) của user
- [x] `backend/routes/roles.routes.js`: CRUD vai trò (chặn sửa/xóa vai trò `is_protected`)
- [x] `backend/routes/companySettings.routes.js`, `backend/routes/warehouseSettings.routes.js`: get/update
- [x] Frontend: trang "Vai trò" (danh sách, tạo vai trò mới, chọn module dạng lưới ô đều nhau), trang "Thông tin công ty" (2 card song song "Thông tin chung"/"Thông tin ngân hàng"), trang "Cấu hình kho" (toggle `allow_negative_stock`, nhóm "Cấu hình chung" để chỗ mở rộng), mục menu "Cấu hình bán hàng" (khung trống, empty-state rõ ràng, chưa có nội dung)
- [x] Cập nhật `frontend/assets/layout.js`: đổi `NAV_GROUPS` từ lọc theo `roles: []` (tên vai trò cố định) sang lọc theo `permissions` (module_key) lấy từ `/api/auth/me`
- [x] Test: tạo vai trò mới tùy ý, gán 1-2 module, đăng nhập bằng tài khoản vai trò đó, xác nhận đúng menu + đúng chặn API; xác nhận không sửa/xóa được vai trò Admin — xem chi tiết từng bước tại `docs/CHANGELOG.md` 2026-08-01

### Phase 2 — Kho

> Cập nhật 2026-08-01: gộp thêm migration bảng `partners` vào phase này (quyết định `docs/DECISIONS.md` mục "Gộp bảng `partners` sớm vào migration Phase 2") — vì `stock_receipts`/`stock_issues` cần FK `partner_id` ngay từ đầu. Chỉ gộp migration, **không** gộp API/frontend quản lý đối tác (vẫn ở Phase 3).
> Cập nhật 2026-07-31: mở rộng thêm phạm vi ngoài kế hoạch gốc theo yêu cầu người dùng — giá vốn bình quân gia quyền/FIFO (`stock_lots`, `costing.service.js`), chiết khấu phiếu nhập, thời gian nhập tùy chỉnh, mã đơn hàng, vô hiệu hóa/xóa sản phẩm, trang chi tiết sản phẩm + lịch sử chỉnh sửa, API đối tác rút gọn (quick-add). Chi tiết đầy đủ xem `docs/DECISIONS.md` các mục ngày 2026-07-31.

- [x] Migration thêm `partners`, `products`, `stock_receipts`, `stock_receipt_items`, `stock_issues` (kèm `payment_status`), `stock_issue_items`, `stock_movements` (`005_phase2_kho.sql`)
- [x] Migration bổ sung: `products.is_active` (`006`), giá vốn + lịch sử sản phẩm (`stock_lots`/`stock_movements.unit_cost`/`product_change_log`/costing_method — `007`), chiết khấu phiếu nhập (`008`), mã đơn hàng (`009`)
- [x] `stockReceipt.service.js` / `stockIssue.service.js` (transaction) — đã bổ sung tạo/tiêu thụ `stock_lots`, snapshot `unit_cost`, kiểm tra `is_active`, `adjustsType`/`adjustsId` tùy chọn (phiếu điều chỉnh bù trừ)
- [x] `costing.service.js` — tính giá vốn bình quân gia quyền (on-the-fly) và FIFO
- [x] Migration `010_receipt_issue_adjustment.sql` — `adjusts_type`/`adjusts_id` trên `stock_receipts`/`stock_issues` (cơ chế phiếu điều chỉnh bù trừ, xem `docs/DECISIONS.md`)
- [x] API + frontend: danh mục sản phẩm (`products.html`) — tìm kiếm, sắp xếp tồn kho, cảnh báo tồn thấp, vô hiệu hóa/xóa
- [x] Trang chi tiết sản phẩm (`product-detail.html`) — lịch sử nhập/xuất + lịch sử chỉnh sửa (ngoài kế hoạch ban đầu), mở được modal chi tiết phiếu nhập từ mã phiếu trong lịch sử
- [x] API `partners.routes.js` bản rút gọn (GET danh sách + POST tạo nhanh) — dùng cho dropdown chọn/thêm nhanh NCC/khách hàng
- [x] Frontend lập phiếu nhập (`stock-receipts.html`) — chọn/thêm nhanh NCC, combobox tìm sản phẩm, chiết khấu %, thời gian nhập tùy chỉnh, mã đơn hàng, tổng thành tiền, modal xem chi tiết phiếu, trường "Điều chỉnh cho phiếu"
- [x] Frontend lập phiếu xuất (`stock-issues.html`) — dropdown/thêm nhanh khách hàng, toggle `payment_status`, combobox sản phẩm, tổng thành tiền, trường "Điều chỉnh cho phiếu"
- [x] Sửa/xóa tài khoản người dùng (`PUT`/`DELETE /api/users/:id`, ngoài kế hoạch gốc Phase 1.5 — làm ở Phase 2 theo yêu cầu người dùng)
- [ ] Xem tồn kho tổng hợp riêng (hiện đã xem được qua `products.html`/`product-detail.html`, chưa có báo cáo tổng hợp riêng — có thể đủ dùng, để Phase 4 nếu cần thêm)

### Phase 3 — Công nợ (đã xong)

> Cập nhật 2026-08-01: bảng `partners` đã tạo ở Phase 2 (migration) — phase này chỉ còn migration `debt_ledger` + API/frontend quản lý đối tác và công nợ.
> Cập nhật 2026-07-31 (hoàn thành): thêm migration `011` (`stock_receipts.payment_status`) trước `debt_ledger` — phát hiện thiếu khi chuẩn bị code, xem `docs/DECISIONS.md`.

- [x] Migration `011_receipt_payment_status.sql` (`stock_receipts.payment_status`, đối xứng `stock_issues`)
- [x] Migration `012_debt_ledger.sql`
- [x] `debt.service.js`, tự động ghi nợ khi tạo phiếu nhập/xuất đánh dấu `cong_no` (trong cùng transaction tạo phiếu, bắt buộc có đối tác)
- [x] API `partners.routes.js` mở rộng CRUD (PUT/DELETE) + frontend `partners.html`
- [x] API `debts.routes.js` (summary, lịch sử, ghi nhận thanh toán) + frontend `debts.html`
- [x] Test qua trình duyệt thật: ghi nợ tự động đúng số tiền, thanh toán từng phần đúng, chặn cong_no thiếu đối tác, sửa/xóa đối tác, phân quyền `cong_no` chặn đúng UI+API
- [x] Hoàn thiện sau đó (cùng phiên): modal chi tiết phiếu xuất, `issue_date`, hiển thị liên hệ khách hàng, migration `013` (chiết khấu phiếu xuất, đối xứng phiếu nhập), `total_transacted` trên trang Công nợ — chi tiết `docs/CHANGELOG.md`

### Phase 4 — In phiếu & Báo cáo (đã xong)
- [x] `print-issue.html`/`.js` với CSS `@media print` — tái dùng `GET /api/stock-issues/:id` có sẵn, không cần API `/print` riêng
- [x] Migration `014_company_print_note.sql` + textarea "Ghi chú in phiếu" trong `company-settings.html`
- [x] API `/api/reports/*` (`inventory`, `stock-movements`, `debts`)
- [x] Frontend báo cáo (`reports.html`) — bảng + thẻ số liệu (`.stat-delta`) + **biểu đồ cột SVG tự vẽ tay** (quyết định không dùng Chart.js, xem `docs/DECISIONS.md`)
- [x] Test qua trình duyệt thật: trang in hiển thị đúng đầy đủ (công ty/khách hàng/chiết khấu/ghi chú), chặn đúng khi chưa đăng nhập; báo cáo khớp số liệu thật, tooltip đúng; phân quyền `bao_cao` chặn đúng UI+API

### Phase 5 — Vận hành & Go-live

> Cập nhật 2026-08-01: bắt đầu Phase 5 trên máy dev (không phải máy chủ thật) — chỉ chuẩn bị được phần code/cấu hình độc lập với máy cụ thể (backup, PM2 config, tài liệu quy trình); các bước gắn với máy chủ thật (IP tĩnh, `pm2 startup`, test LAN, go-live) để lại làm khi triển khai lên đúng máy chủ, xem `docs/DEPLOY.md` (mới) — hướng dẫn đầy đủ từng bước.

- [x] `ecosystem.config.js` (gốc dự án) — cấu hình PM2 sẵn dùng (`pm2 start ecosystem.config.js`), không hardcode `SESSION_SECRET` trong file (đọc từ biến môi trường hệ thống)
- [x] Migration `018_backup_path.sql`: `warehouse_settings.backup_path` (đường dẫn lưu backup, người dùng tự chọn qua UI thay vì hardcode cố định)
- [x] `scripts/backup.js`: checkpoint WAL trước khi copy `data.db`, tự xóa bản backup cũ hơn 14 ngày; dùng được cả qua CLI (`npm run backup`) lẫn gọi lại từ API
- [x] `backend/routes/warehouseSettings.routes.js`: `POST /warehouse-settings/backup` ("Backup ngay", quyền `cau_hinh`) + `TEXT_KEYS` cho `backup_path`
- [x] Frontend `warehouse-settings.html`/`.js`: mục "Sao lưu dữ liệu" — ô nhập đường dẫn + nút "Backup ngay"
- [x] `docs/DEPLOY.md` (mới): quy trình đầy đủ IP tĩnh, Windows Firewall, `SESSION_SECRET`, PM2 + `pm2-windows-startup` (Windows không hỗ trợ `pm2 startup` chính thức), Task Scheduler cho backup, checklist go-live
- [x] Test qua trình duyệt thật: nhập đường dẫn backup, bấm "Backup ngay" → tạo đúng file trên đĩa; tài khoản không có quyền `cau_hinh` gọi thẳng API bị chặn 403

> Cập nhật 2026-08-01 (đợt 2): người dùng yêu cầu thêm cách đóng gói/phân phối đơn giản hơn PM2 thủ công — tự tạo database mới, thiết lập tài khoản admin đầu tiên qua giao diện, tự khởi động cùng Windows. Chi tiết đầy đủ (bao gồm 1 lần thử thất bại với `pkg`): `docs/DECISIONS.md`, `docs/CHANGELOG.md`.

- [x] `backend/server.js` tự gọi `runMigrations()` khi khởi động (không cần `npm run migrate` thủ công cho bản đóng gói)
- [x] `backend/routes/setup.routes.js` + `frontend/setup.html`/`assets/setup.js` (mới): trang "Thiết lập lần đầu" tạo tài khoản Admin đầu tiên qua giao diện, tự khoá sau khi có ≥1 tài khoản — thay `npm run seed:admin` cho bản đóng gói
- [x] `scripts/build-portable.js` (`npm run build:portable`): đóng gói thành thư mục `dist/` tự chứa `node.exe`, kèm `start.bat` — không cần cài Node trên máy đích (đã thử `@yao-pkg/pkg` đóng gói thành 1 file `.exe` duy nhất trước, thất bại do lỗi native-addon)
- [x] `scripts/install-autostart.ps1`/`uninstall-autostart.ps1`: tự khởi động cùng Windows qua Task Scheduler (chọn thay `node-windows` vì không cần Node cài vĩnh viễn trên máy chủ)
- [x] `docs/DEPLOY.md`: thêm "Cách A — Cài đặt từ bản đóng gói" (đơn giản hơn, khuyến nghị) song song quy trình PM2 thủ công cũ, kèm hướng dẫn cập nhật phiên bản không mất dữ liệu
- [x] Test qua trình duyệt thật với bản portable (database rỗng): tự tạo DB → thiết lập lần đầu → đăng nhập → dashboard đúng
- [ ] Chạy `install-autostart.ps1` thật trên máy chủ chính thức (chưa làm — máy đang thao tác vẫn là máy dev)
- [ ] Đặt IP tĩnh/DHCP reservation cho máy chủ thật (chưa làm — cần đúng máy chủ, xem `docs/DEPLOY.md` mục 1)
- [ ] Chạy `pm2 start`/`pm2-startup install`/`pm2 save` trên máy chủ thật (chưa làm — xem `docs/DEPLOY.md` mục 3–4)
- [ ] Đặt Windows Task Scheduler chạy backup hàng ngày trên máy chủ thật (chưa làm — xem `docs/DEPLOY.md` mục 5)
- [ ] Test toàn bộ luồng với dữ liệu thật, đào tạo người dùng
- [ ] Go-live, theo dõi 1 tuần đầu để chỉnh sửa

### Module "Sổ quỹ" (ngoài phase, theo yêu cầu người dùng 2026-08-02)

- [x] Migration `019_cash_book.sql`: `cash_book_settings` (singleton, Quỹ đầu kỳ), `cash_categories` (Loại thu/chi, seed 6 mục mẫu), `cash_vouchers` (độc lập với `debt_ledger`), seed quyền `so_quy` cho vai trò Kế toán
- [x] `backend/config/modules.js`: thêm module_key `so_quy`
- [x] `backend/services/cashVoucher.service.js`: sinh mã `PT`/`PC` riêng từng loại, `monthBoundsUtc()` (mốc thời gian UTC+7 cố định — xem `docs/DECISIONS.md`), `getCashBookSummary()`, `createCashVoucher()` (validate danh mục đúng chiều)
- [x] `backend/routes/cashVouchers.routes.js`, `cashCategories.routes.js`, `cashBookSettings.routes.js` — mount vào `server.js`
- [x] Frontend `cash-book.html`/`.js` (danh sách theo tháng, chọn Tháng/Năm tiếng Việt — không dùng `<input type="month">` vì hiển thị theo locale trình duyệt không ép được tiếng Việt, thẻ tổng hợp, modal lập phiếu dùng chung cho Thu/Chi kèm nút "+ Tạo loại mới" tạo nhanh danh mục ngay trên form, modal Quỹ đầu kỳ, modal xem chi tiết chỉ đọc), `cash-categories.html`/`.js` (CRUD "Loại thu chi")
- [x] `frontend/assets/layout.js`: nhóm nav mới "Quỹ" (sau "Khách hàng", trước "Quản trị"); `icons.js` thêm icon `wallet`
- [x] `style.css`: `.text-accent`/`.text-destructive` (màu cột Giá trị), `.month-select`/`.month-select-group` (chọn Tháng/Năm), `.form-field-label-row` (nhãn kèm nút "+ Tạo loại mới")
- [x] Test qua trình duyệt thật (Chrome headless điều khiển CDP thô): tạo/xóa phiếu thu/chi, tính đúng Quỹ đầu kỳ/Tổng thu/Tổng chi/Tồn quỹ, ranh giới tháng đúng theo giờ VN (test phiếu 23:30 và 00:30 giờ VN quanh nửa đêm cuối tháng), xóa danh mục đang dùng bị chặn đúng, phân quyền `so_quy` chặn đúng UI+API (trừ `GET /api/cash-book-settings` mở cho mọi tài khoản), xác nhận không ghi gì vào `debt_ledger`, tạo nhanh "Loại thu chi" ngay trên modal lập phiếu hoạt động đúng

### Import/Export Excel cho Sản phẩm (ngoài phase, theo yêu cầu người dùng 2026-08-02)

- [x] Dependency mới: `exceljs` (đọc/ghi `.xlsx`), `multer` (nhận file upload, memory storage) — xem `docs/DECISIONS.md` (lý do không dùng `xlsx`/SheetJS)
- [x] `backend/routes/products.routes.js`: `GET /import-template`, `POST /import` (all-or-nothing, báo lỗi theo dòng), `POST /export` (theo danh sách `ids` từ frontend)
- [x] Frontend `products.html`/`.js`: nút "Nhập Excel" (modal, bảng lỗi "Dòng"/"Lỗi") + "Xuất Excel" (theo đúng danh sách đang hiển thị)
- [x] Test qua API (curl) + trình duyệt thật (CDP thô, `DOM.setFileInputFiles` + `Browser.setDownloadBehavior`) — chi tiết `docs/CHANGELOG.md`

### Module "Quản lý dự án" (ngoài phase, theo yêu cầu người dùng 2026-08-04 — đã chốt kế hoạch, chưa code)

> 14 quyết định nghiệp vụ + kỹ thuật đã hỏi và chốt trước khi lên kế hoạch — chi tiết đầy đủ `docs/DECISIONS.md` mục 2026-08-04. Nghiệp vụ: `docs/PRD.md` mục 4.12.
> **Chia 4 đợt + 1 đợt tùy chọn. Mỗi đợt tự chạy được và test được độc lập** — dừng lại sau bất kỳ đợt nào hệ thống vẫn hoạt động bình thường, không để lại chức năng dở dang.

**Đợt 1 — Nền tảng dự án (đã xong, 2026-08-04)**
- [x] Migration `021_projects.sql`: `project_phase_templates` (seed 6 giai đoạn mẫu), `projects`, `project_members`, `project_phases`; **không** seed quyền `du_an` cho vai trò mặc định nào (khác `so_quy` vốn rõ ràng thuộc Kế toán — module Dự án liên quan cả Kho/Công nợ/điều phối nhân sự, không gắn rõ 1 vai trò có sẵn, để Admin tự cấp qua trang "Vai trò")
- [x] `backend/config/modules.js`: thêm `du_an` vào `MODULE_KEYS` **và** `MODULE_LABELS`
- [x] `backend/services/project.service.js`: sinh mã `DA...`, copy Giai đoạn mẫu vào dự án mới (cùng transaction), tính % tiến độ (trả `null` — hiện "-" — cho tới khi có bảng `project_tasks` ở Đợt 2, tránh lỗi "no such table")
- [x] `backend/routes/projectPhaseTemplates.routes.js`, `projects.routes.js` (kèm sub-resource `/:id/phases`) — mount vào `server.js`
- [x] Frontend `project-phase-templates.html`/`.js` (menu Cấu hình), `projects.html`/`.js` (danh sách + modal thêm/sửa kèm người tham gia), `project-detail.html`/`.js` (tab Tổng quan + Giai đoạn, biểu đồ Gantt SVG)
- [x] `layout.js`: nhóm nav mới "Dự án" (sau "Khách hàng", trước "Quỹ"); `icons.js`: icon `briefcase` mới cho dự án
- [x] **Dùng skill `ui-ux-pro-max` cho pattern trang chi tiết dạng tab** (chưa từng có trong dự án) + cập nhật `docs/DESIGN-SYSTEM.md`
- [x] Test qua API (curl) + trình duyệt thật (Chrome headless điều khiển bằng CDP thô tự viết — không có sẵn `chromium-cli`/Playwright trong môi trường): tạo dự án tự copy đủ 6 giai đoạn mẫu, validate partner phải khách hàng, validate người tham gia trùng lặp, chặn xóa dự án đã có giai đoạn đang làm/hoàn thành, phân quyền `du_an` chặn đúng UI+API, không lỗi console. Phát hiện + sửa 1 lỗi UX: giai đoạn có ngày bắt đầu trùng mép trái vùng vẽ Gantt không hiện nhãn tháng tham chiếu — đã đệm 3 ngày 2 bên + ép hiện nhãn tháng đầu tại mép trái. Dữ liệu test đã xóa sạch sau khi xong.

**Đợt 2 — Công việc & Timeline (đã xong, 2026-08-04)**
- [x] Migration `022_project_tasks.sql`: `project_tasks` (chỉ `phase_id`, không lưu `project_id` trùng lặp), `status` là nguồn duy nhất tính % tiến độ
- [x] `backend/routes/projectTasks.routes.js` — router `mergeParams:true`, **lồng vào `projects.routes.js`** tại `/:id/tasks` (khác dự tính ban đầu là mount riêng ở `server.js` — mounting 2 router riêng cùng tiền tố `/api/projects` dễ vỡ do thứ tự khớp route của Express; lồng trực tiếp an toàn và rõ ràng hơn): CRUD, validate `phase_id` thuộc đúng dự án, validate `assigned_user_id` phải nằm trong `project_members`; `completed_at` tự động gán/xóa theo trạng thái, không nhận nhập tay
- [x] `getPhases()` trong `projects.routes.js` bổ sung `progress_percent` riêng từng giai đoạn (1 câu SQL gộp nhóm, không N+1); `deleteProject()` trong `project.service.js` bổ sung chặn khi dự án đã có công việc
- [x] Frontend tab "Công việc" (`project-detail.html`/`.js`): lọc theo giai đoạn, bảng danh sách, modal thêm/sửa/xóa — "Người phụ trách" chỉ liệt kê người tham gia dự án (không phải toàn bộ tài khoản hệ thống)
- [x] Cập nhật Gantt (Đợt 1): mỗi thanh có phần tô đậm bên trong = % hoàn thành + nhãn số ngay sau thanh; bảng "Danh sách giai đoạn" thêm cột "Tiến độ" (thanh ngang nhỏ + %) — cập nhật `docs/DESIGN-SYSTEM.md`
- [x] % tiến độ tính từ công việc — giai đoạn/dự án chưa có việc nào hiện `—`, không hiện `0%`
- [x] Test qua API + trình duyệt thật (CDP thô): validate người phụ trách/giai đoạn sai bị chặn, % tính đúng, `completed_at` tự động đúng, chặn xóa khi có công việc. Phát hiện + sửa 1 lỗi hiển thị: 2 nhãn tháng liên tiếp trên Gantt đè chữ lên nhau khi bị ép sát mép trái — đã bỏ nhãn nào cách nhãn trước dưới 55px (vẫn giữ đường kẻ)

**Bỏ tab "Công việc" riêng, gộp vào tab "Giai đoạn" + thêm ngày thực tế cho công việc (2026-08-04, ngoài kế hoạch ban đầu, theo yêu cầu người dùng)**
- [x] Migration `023_project_task_actual_dates.sql`: `project_tasks.actual_start_date`/`actual_end_date` (nhập tay) — thay thế hoàn toàn `completed_at` tự động (giữ nguyên cột cũ, không xóa, chỉ không còn đọc/ghi)
- [x] `projectTasks.routes.js`: đọc/ghi 2 cột mới thay cho logic tự gán `completed_at`; `withDelay()` so `due_date` với `actual_end_date` thay vì `completed_at`
- [x] Bỏ tab "Công việc" khỏi `project-detail.html` — gộp toàn bộ CRUD công việc vào tab "Giai đoạn": bấm 1 dòng giai đoạn (trừ vùng nút) sẽ xổ ra bảng công việc con ngay dưới, mỗi dòng có 2 ô ngày thực tế (nhập tay) + chọn Trạng thái + nút "Lưu" cập nhật nhanh không cần mở modal; icon "Sửa" vẫn mở modal đầy đủ (đổi tên/người phụ trách/giai đoạn/ngày kế hoạch)
- [x] Biểu đồ Gantt đồng bộ cùng trạng thái mở rộng (`expandedPhaseIds` dùng chung bảng + Gantt): bấm vào giai đoạn trên Gantt cũng xổ ra danh sách công việc dạng text ngắn gọn (chấm màu theo trạng thái + tên + trạng thái + cảnh báo trễ nếu có) ngay dưới thanh giai đoạn đó — theo lựa chọn người dùng, không vẽ thêm thanh SVG riêng cho từng việc
- [x] Cập nhật `docs/DESIGN-SYSTEM.md` mục pattern mới "Dòng giai đoạn bấm mở rộng bảng công việc con"
- [x] Test qua API (curl, file UTF-8) + trình duyệt thật (CDP thô, 3 script test): mở/đóng đúng, lưu nhanh ngay thuộc dòng cập nhật đúng qua UI thật (xác nhận lại qua API), nút "Thêm công việc" mở modal đúng giai đoạn preset, nút "Sửa" điền đúng ngày thực tế, giai đoạn chưa có việc hiện đúng "Chưa có công việc nào" ở cả bảng lẫn Gantt, không lỗi console. Dữ liệu thật (dự án "Villa Kỳ Duyên") bị đổi tạm trong lúc test đã khôi phục đúng nguyên trạng ngay sau đó.

**Đợt 3 — Vật tư & gắn dự án vào phiếu** ⚠️ *đợt nhạy cảm nhất* (số migration lùi từ `023` xuống `024` vì `023` đã dùng cho actual dates ở trên)
- [ ] Migration `024_project_materials.sql`: `project_material_plan` + `ADD COLUMN project_id` (nullable) cho `stock_issues`, `stock_receipts`, `debt_ledger`
- [ ] Sửa `stockIssue.service.js`/`stockReceipt.service.js`: nhận `projectId`, ghi lên phiếu **và** truyền xuống `recordDebtFromDocument()`. **Chỉ thêm 1 trường ghi kèm — không đụng logic tồn kho/giá vốn/ghi nợ hiện có**
- [ ] Sửa `debt.service.js` (`recordDebtFromDocument`) — rà lại **mọi** nơi đang gọi để không làm hỏng luồng công nợ NCC đang chạy
- [ ] Frontend: trường "Dự án" trên form lập phiếu nhập/xuất, hiển thị dự án trên modal chi tiết phiếu (`receipt-detail.js`/`issue-detail.js`)
- [ ] `print-issue.html`/`.js`: dòng "Công trình: …", tự ẩn nếu phiếu không gắn dự án (tái dùng `renderCompanyLine()`)
- [ ] Frontend tab "Vật tư": bảng Dự toán / Đã xuất / Còn lại / Vượt + danh sách phiếu đã gắn dự án
- [ ] Test bắt buộc: rollback transaction vẫn đúng; phiếu **không** gắn dự án chạy y hệt như cũ; trả vật tư về kho qua phiếu nhập gắn dự án làm giảm đúng "Đã xuất"

**Đợt 4 — Đợt thanh toán, Công nợ dự án & Phát sinh** (số migration lùi từ `024` xuống `025`)
- [ ] Migration `025_project_payments.sql`: `project_payment_milestones`, `project_variations` + `ADD COLUMN debt_ledger.milestone_id`
- [ ] `backend/routes/projectFinance.routes.js` (hoặc mở rộng `projects.routes.js`): công nợ dự án, đợt thanh toán, phát sinh
- [ ] `debts.routes.js`/`debt.service.js`: `POST /payment` và `POST /adjustment` nhận thêm `project_id`/`milestone_id`, **validate dự án thuộc đúng đối tác**
- [ ] Frontend: ô "Dự án" trên form Ghi nhận thanh toán + form Điều chỉnh công nợ ở `customer-debts.html` (ẩn hẳn nếu khách hàng chưa có dự án nào; **không** thêm vào `debts.html` của NCC)
- [ ] Frontend tab "Thanh toán & Công nợ" (đợt thanh toán + phiếu xuất công nợ + lịch sử thu + nút Ghi nhận thanh toán tự chọn sẵn và khóa dự án) và tab "Phát sinh"
- [ ] Chỉ bật tab này ở Đợt 4 — bật sớm từ Đợt 3 sẽ hiển thị số sai (nợ đã gắn dự án nhưng tiền thu thì chưa)

**Đợt 5 — Báo cáo dự án (tùy chọn)**
- [ ] Thêm phần "Dự án" vào `reports.html`: tiến độ, công nợ, chênh lệch vật tư của toàn bộ dự án

### Giao diện di động (ngoài phase, theo yêu cầu người dùng 2026-08-06 — đã chốt kế hoạch, CHƯA CODE)

> Nghiệp vụ: `docs/PRD.md` mục 4.16. Quyết định kiến trúc đầy đủ (gồm 2 phương án đã cân nhắc và loại bỏ): `docs/DECISIONS.md` mục 2026-08-06 "Giao diện di động".
> **Nguyên tắc nền tảng**: bản app RIÊNG tại `frontend/m/`, **không sửa frontend desktop đang chạy production**; giữ mô hình MPA (không tự viết SPA router); dùng chung API + cookie session; **không có API mới, không sửa backend** cho phần giao diện.

**API**: dùng lại 100% endpoint hiện có (mục 3 của tài liệu này). Không thêm route mới. Không sửa `server.js` — `express.static(frontend/)` đã phục vụ sẵn `frontend/m/` tại `/m/`.

**Đợt 0 — Thiết kế (không code)**
- [ ] Dùng skill `ui-ux-pro-max` thiết kế **10 thành phần giao diện mới**: thanh tab dưới, app bar + nút quay lại, thẻ danh sách (thay `.data-table`), bottom sheet kéo-để-đóng (thay `.modal-overlay`), ô tìm kiếm dính đầu trang, segmented control (thay tab trang chi tiết dự án), pull-to-refresh, skeleton đang tải, hàng thông tin kiểu Settings, nút hành động chính
- [ ] Bổ sung mục "Giao diện di động" vào `docs/DESIGN-SYSTEM.md` (bắt buộc trước khi viết CSS, theo ràng buộc `CLAUDE.md`)

**Đợt 1 — Khung app** *(nặng nhất, chưa có màn nghiệp vụ nào — nền tảng cho mọi đợt sau)*
- [ ] Tách `frontend/assets/tokens.css` từ `style.css` (`:root` + `@font-face`), `style.css` thêm đúng 1 dòng `@import` — **thay đổi duy nhất chạm vào CSS desktop**, verify ngay bằng cách so sánh trang desktop trước/sau
- [ ] `frontend/m/assets/m-tokens.css` + `m-style.css` (import `tokens.css`, **không** import `style.css`)
- [ ] `frontend/m/assets/m-layout.js`: app bar + thanh tab dưới cố định (`position:fixed` + `env(safe-area-inset-bottom)`), lọc mục theo `user.permissions` — **dùng lại khai báo `NAV_GROUPS` của `layout.js`, không hardcode danh sách tab thứ 2**. Tab: `Trang chủ · Kho · Khách hàng · Dự án · Thêm` (mục "Thêm" chứa các màn còn lại + Thông báo + Đăng xuất + "Dùng bản máy tính")
- [ ] `frontend/m/assets/m-ui.js`: bottom sheet, pull-to-refresh, skeleton, toast, khôi phục vị trí cuộn qua `sessionStorage`
- [ ] Phát hiện thiết bị + chuyển hướng: sửa `frontend/assets/layout.js` (`initLayout()`) và `auth.js` — điều kiện `matchMedia('(hover: none) and (pointer: coarse)')` + `innerWidth <= 820`, **không UA sniffing**; cờ thoát `localStorage['erp_force_desktop']`; banner "Chuyển sang bản di động" khi mở desktop trên điện thoại
- [ ] `frontend/m/login.html` + `index.html` (Trang chủ: thẻ tóm tắt + sinh nhật trong tháng + thông báo)
- [ ] `manifest.json`, `apple-touch-icon`, meta `apple-mobile-web-app-capable`/`theme-color` — **không** làm `service-worker.js` (cần HTTPS, xem `docs/DECISIONS.md`)
- [ ] `frontend/assets/icons.js`: **chỉ THÊM** icon mới cho tab bar/app bar, tuyệt đối không sửa key cũ
- [ ] Nghiệm thu: **điện thoại thật qua LAN** (không chỉ headless) + test bằng tài khoản quyền hạn chế (`thukho1`/`ketoan1`), xác nhận tab bar lọc đúng

**Đợt 2 — Tra cứu** *(7 màn, chỉ đọc → rủi ro thấp nhất, giá trị cao nhất)*
- [ ] Sản phẩm (danh sách + tìm kiếm) + chi tiết (tồn kho, giá vốn, lịch sử nhập/xuất)
- [ ] Khách hàng + chi tiết (kèm thẻ Bảo hành), Nhà cung cấp
- [ ] Công nợ khách hàng, Công nợ NCC (số dư + lịch sử giao dịch)
- [ ] Đối tác (danh bạ), Bảo hành
- [ ] 3 tính năng **chỉ mobile**: bấm SĐT gọi trực tiếp (`tel:`), bấm địa chỉ công trình mở bản đồ, chia sẻ nhanh thông tin công nợ
- [ ] Tìm kiếm theo tên/mã/số điện thoại — giữ đúng hành vi lọc như bản desktop

**Đợt 3 — Dự án tại công trường** *(1 màn nhưng phức tạp nhất)*
- [ ] Danh sách dự án (thẻ có thanh tiến độ, lọc theo trạng thái)
- [ ] Chi tiết dự án với segmented control `[Tổng quan | Giai đoạn | Vật tư | Thanh toán | Phát sinh]`
- [ ] Giai đoạn: mở ra công việc con, **cập nhật trạng thái + ngày thực tế ngay tại chỗ** (ghi dữ liệu nhưng **không đụng sổ cái tồn kho/công nợ** → rủi ro thấp)
- [ ] Phát sinh: thêm "vấn đề" ngay tại công trường
- [ ] **KHÔNG đưa biểu đồ Gantt lên điện thoại** — thay bằng danh sách giai đoạn có thanh tiến độ (cùng dữ liệu, khác cách trình bày). Tablet giữ Gantt cuộn ngang
- [ ] Vật tư (Dự toán/Đã xuất/Còn lại) và Thanh toán: chỉ đọc

**Đợt 4 — Nghiệp vụ ghi** *(ĐỂ NGỎ — đánh giá lại sau khi người dùng dùng thật Đợt 1-3, chưa cam kết)*
- [ ] Lập phiếu nhập/xuất/trả hàng, ghi nhận thanh toán công nợ, phiếu thu/chi sổ quỹ

**Hạng mục phụ thuộc (đụng backend — cần duyệt riêng trước khi làm)**
- [ ] `server.js`: `rolling: true` + kéo dài `maxAge` — nếu không, điện thoại phải đăng nhập lại mỗi 8 tiếng
- [ ] `server.js`: đổi `express-session` từ `MemoryStore` sang store lưu xuống đĩa — nếu không, **restart server là toàn bộ điện thoại bị đăng xuất**. Vấn đề này đã ghi nhận sẵn cho Phase 5 Go-live, nên gộp làm cùng Đợt 1

**Không làm bản mobile** (chốt để tránh phình phạm vi): 7 trang Cấu hình, Vai trò, Người dùng, Mẫu in + trình soạn thảo, Import/Export Excel, Báo cáo đầy đủ (chỉ có bản tóm tắt ở Trang chủ), 2 trang In phiếu.

## 5. Kiểm thử cơ bản mỗi phase

- Phase 1: đăng nhập sai/đúng, truy cập route không đúng role bị chặn.
- Phase 1.5: tạo tài khoản mới với từng role, đăng nhập bằng tài khoản đó và xác nhận đúng quyền hạn; xác nhận user không phải admin không truy cập được `/api/users/*`.
- Phase 1.6: tạo vai trò mới tùy ý, gán/bỏ module, xác nhận menu + API đổi theo đúng thời gian thực; thử sửa/xóa vai trò Admin phải bị chặn; xác nhận `users.role_id` chuyển đổi đúng cho các tài khoản đã tạo ở Phase 1.5 (không mất quyền sau migration).
- Phase 2: tạo phiếu nhập/xuất, cố tình gây lỗi giữa transaction (vd sản phẩm không tồn tại) → xác nhận rollback đúng, tồn kho không bị lệch.
- Phase 3: nhiều lần ghi nợ + thanh toán từng phần → số dư tính đúng.
- Phase 4: in thử trên máy in văn phòng thật, không chỉ xem trên PDF ảo.
- Phase 5: tắt máy chủ giữa chừng, bật lại → xác nhận PM2 tự chạy app mà không cần thao tác thủ công.
- Module Dự án — Đợt 3 (nhạy cảm nhất): lập phiếu nhập/xuất **không** gắn dự án → kết quả phải y hệt trước khi sửa (tồn kho, giá vốn, công nợ); gây lỗi giữa transaction → rollback đúng, phiếu lẫn dòng công nợ đều không được ghi; xuất vật tư cho dự án rồi nhập trả lại một phần → "Đã xuất cho dự án" giảm đúng.
- Module Dự án — Đợt 4: 1 khách hàng có **2 dự án** cùng lúc, ghi nhận thanh toán cho từng dự án → số dư tổng của khách hàng và "Còn phải thu" của **từng** dự án đều đúng, không lẫn sang nhau; chọn dự án của khách hàng khác qua API bị chặn.
- Giao diện di động — **nghiệm thu 2 lớp mỗi đợt**: (1) Chrome headless CDP với `Emulation.setDeviceMetricsOverride` + `Emulation.setTouchEmulation` + `Input.dispatchTouchEvent` (**chạm thật**, không phải `.click()`); (2) **thiết bị thật của người dùng qua LAN** — lớp này mới là nghiệm thu chính, vì "cảm giác native" không đo được bằng headless. Bắt buộc test bằng tài khoản quyền hạn chế (`thukho1`/`ketoan1`) để xác nhận thanh tab lọc đúng, không chỉ `admin`.
- Giao diện di động — **hồi quy bắt buộc với bản desktop**: sau khi tách `tokens.css` và sửa `layout.js`/`auth.js` (phát hiện thiết bị), mở lại bản desktop trên máy tính xác nhận không đổi gì về màu/font/bố cục và **không bị chuyển hướng nhầm** sang `/m/`.
