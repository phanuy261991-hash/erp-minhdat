# Plan chi tiết: Hệ thống Quản lý Kho & Công nợ nội bộ

**Dựa trên**: PRD v1.4 — cập nhật 2026-08-02
**Version**: v1.2 — cập nhật 2026-08-02 (module Sổ quỹ, ngoài phase)

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
│  │     └─ 019_cash_book.sql (đã có, 2026-08-02) module So quy: cash_book_settings, cash_categories, cash_vouchers (doc lap voi debt_ledger)
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
│  │  └─ cashBookSettings.routes.js    (đã có, 2026-08-02) GET/PUT Quy dau ky (cash_book_settings, singleton)
│  └─ services/
│     ├─ stockReceipt.service.js       (đã có) transaction: tạo phiếu nhập + movements + lô hàng + ghi nợ NCC neu cong_no
│     ├─ stockIssue.service.js         (đã có) transaction: tạo phiếu xuất + movements, tiêu thụ lô + ghi nợ khach hang neu cong_no
│     ├─ costing.service.js            (đã có) tính giá vốn bình quân gia quyền/FIFO (Phase 2)
│     ├─ debt.service.js               (đã có) Phase 3 — ghi nợ (trong transaction cua phieu)/thanh toan/tinh so du
│     └─ cashVoucher.service.js        (đã có, 2026-08-02) tao ma PT/PC, tinh Quy dau ky/Tong thu/Tong chi/Ton quy theo thang (moc thoi gian UTC+7 co dinh)
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
│  └─ assets/
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
│     └─ fonts/                        (đã có) file .woff2 host offline + fonts.css
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
| `partners` | id PK, type, name, phone, address, category_id, created_at | type ∈ {nha_cung_cap, khach_hang}; `category_id` FK(customer_categories) nullable — chỉ có ý nghĩa khi type='khach_hang' (validate ở API, không CHECK ở DB), 2026-08-01 |
| `customer_categories` | id PK, name, debt_limit, created_at | migration `015`, 2026-08-01 — danh mục "Loại khách hàng" (name UNIQUE), `debt_limit` nullable = không giới hạn, chỉ dùng để CẢNH BÁO trên trang Công nợ khách hàng (không chặn cứng) |
| `warranties` | id PK, partner_id FK, phone, address, acceptance_date, expiry_date, duration_value, duration_unit, note, is_active, created_by FK, created_at, updated_at | migration `017`, 2026-08-01 — Bảo hành, `partner_id` chỉ áp dụng `type='khach_hang'` (validate ở API); `phone`/`address` là snapshot fill từ đối tác lúc tạo, sửa được, không tự đổi theo nếu sau này sửa hồ sơ khách hàng; `expiry_date` là nguồn tính "còn lại bao nhiêu ngày" (tính lại mỗi lần xem, không lưu số ngày cố định) |
| `stock_receipts` | id PK, code, order_code, partner_id FK, created_by FK(users), note, payment_status, adjusts_type, adjusts_id, created_at | phiếu nhập; `code` tự sinh nội bộ (PN000001...), `order_code` là số hóa đơn/đơn hàng của NCC (tự do, không bắt buộc); `created_at` có thể chỉnh khi lập phiếu — ảnh hưởng thứ tự FIFO/bình quân gia quyền; `payment_status` ∈ {da_thanh_toan, cong_no} (Phase 3, đối xứng `stock_issues`); `adjusts_type`/`adjusts_id` (Phase 2) đánh dấu phiếu điều chỉnh bù trừ cho phiếu nào |
| `stock_receipt_items` | id PK, receipt_id FK, product_id FK, quantity, unit_price, discount_percent | dòng chi tiết phiếu nhập; `unit_price` là giá gốc, `discount_percent` (0-100%) — giá vốn thực tế = `unit_price * (1 - discount_percent/100)` |
| `stock_issues` | id PK, code, partner_id FK, created_by FK(users), note, payment_status, adjusts_type, adjusts_id, created_at | phiếu xuất; `payment_status` ∈ {da_thu_tien, cong_no} |
| `stock_issue_items` | id PK, issue_id FK, product_id FK, quantity, unit_price, discount_percent | dòng chi tiết phiếu xuất; `discount_percent` (0-100%, migration 013) — chỉ ảnh hưởng doanh thu ghi công nợ, **không** ảnh hưởng `unit_cost` (giá vốn tính riêng qua `costing.service.js`) |
| `stock_movements` | id PK, product_id FK, movement_type, quantity, unit_cost, reference_type, reference_id, created_at | ledger biến động kho — tồn kho = SUM(movement) theo product; `unit_cost` là snapshot giá vốn tại thời điểm phát sinh (không tính lại về sau) |
| `stock_lots` | id PK, product_id FK, receipt_id FK, unit_cost, quantity_received, quantity_remaining, created_at | 1 dòng = 1 lô hàng nhập; `quantity_remaining` trừ dần theo thứ tự cũ nhất trước (FIFO vật lý) bất kể `costing_method` đang chọn; dùng để tính giá vốn bình quân gia quyền/FIFO (xem `costing.service.js`) |
| `product_change_log` | id PK, product_id FK, changed_by FK(users), field_name, old_value, new_value, created_at | lịch sử chỉnh sửa thông tin sản phẩm — chỉ ghi khi `PUT /api/products/:id` thực sự đổi giá trị |
| `debt_ledger` | id PK, partner_id FK, type, amount, reference_type, reference_id, note, created_by FK(users), created_at, is_adjustment | type ∈ {no, tra}; số dư = SUM cộng dồn theo partner_id; `reference_type` ∈ {receipt, issue, payment} — `payment` (ghi nhận thanh toán thủ công) có `reference_id` NULL vì không gắn với 1 phiếu cụ thể; `created_by` bổ sung ngoài draft gốc để nhất quán truy vết với các bảng khác (xem `docs/DECISIONS.md`); `is_adjustment` (migration `016`, 2026-08-01) đánh dấu dòng "Điều chỉnh công nợ" thủ công — phân biệt với dòng tự động và thanh toán thật |
| `cash_book_settings` | id PK (CHECK id=1), opening_balance, updated_at | migration `019`, 2026-08-02 — Quỹ đầu kỳ, nhập 1 lần, tự động cộng dồn qua các tháng (không lưu riêng từng tháng) |
| `cash_categories` | id PK, name, type (`thu`/`chi`), created_at | migration `019` — danh mục "Loại thu chi", `UNIQUE(name, type)` |
| `cash_vouchers` | id PK, code, type, category_id FK NOT NULL, counterpart_name, handled_by FK(users), amount, note, record_business_result, created_by FK(users), created_at | migration `019` — Phiếu thu (`code` = `PT000001...`) / Phiếu chi (`PC000001...`), riêng từng type; **độc lập hoàn toàn với `debt_ledger`** (không ghi công nợ); không sửa được, chỉ tạo + xóa cứng; `created_at` nhận giá trị tùy chỉnh từ form (giống `stock_receipts`), quyết định phiếu thuộc tháng nào |
| `schema_migrations` | version PK, applied_at | migration runner đọc bảng này |

**Nguyên tắc quan trọng** (đã thống nhất ở bước trước, nhắc lại để dev không quên khi code):
- Tồn kho và công nợ **không bao giờ** lưu dưới dạng 1 số cố định — luôn tính từ tổng cộng dồn (`stock_movements`, `debt_ledger`). Tránh lệch dữ liệu.
- Mỗi phiếu nhập/xuất = 1 transaction SQLite duy nhất, gồm: insert phiếu + insert items + insert movements. Nếu 1 bước lỗi, rollback toàn bộ.

Sơ đồ ERD tương ứng: xem file `erd.mermaid` đi kèm (cần bổ sung `roles`/`role_permissions`/`company_settings`/`warehouse_settings` khi vào Phase 1.6).

## 2b. Phân quyền động (bổ sung 2026-08-01)

Thay cho danh sách vai trò cố định, hệ thống chuyển sang **phân quyền theo module**:

- `module_key` là hằng số cố định trong code (không lưu thành bảng riêng vì đây là tập hợp module do ứng dụng định nghĩa, không phải dữ liệu người dùng tạo ra): `kho`, `cong_no`, `bao_cao`, `nguoi_dung`, `cau_hinh`, `so_quy` (Sổ quỹ, 2026-08-02). Mở rộng thêm khi có module mới (vd `ban_hang` khi module Bán hàng/POS được lên kế hoạch).
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
| GET | `/api/partners?type=` | Đã đăng nhập | Danh sách NCC/khách hàng (đủ dùng cho dropdown chọn/thêm nhanh), kèm `category_name`/`category_debt_limit` (LEFT JOIN, 2026-08-01) |
| POST | `/api/partners` | `kho` **hoặc** `cong_no` | Thêm đối tác nhanh — đổi từ chỉ `cong_no` ban đầu, vì thủ kho cũng cần thêm NCC khi lập phiếu nhập (xem `docs/DECISIONS.md`, dùng `requireAnyPermission`); nhận thêm `category_id` (chỉ áp dụng type='khach_hang', 2026-08-01) |
| PUT | `/api/partners/:id` | `cong_no` | Sửa tên/SĐT/địa chỉ/`category_id` — không đổi được `type` sau khi tạo (Phase 3) |
| DELETE | `/api/partners/:id` | `cong_no` | Xóa cứng — chặn nếu đã có lịch sử `stock_receipts`/`stock_issues`/`debt_ledger` (Phase 3) |
| GET | `/api/customer-categories` | Đã đăng nhập | Danh sách "Loại khách hàng" (2026-08-01) |
| POST/PUT/DELETE | `/api/customer-categories(/:id)` | `cau_hinh` | CRUD "Loại khách hàng" — xóa chặn nếu đang có khách hàng thuộc loại đó (2026-08-01) |
| GET | `/api/stock-receipts` | `kho` | Danh sách phiếu nhập |
| GET | `/api/stock-receipts/:id` | `kho` | Chi tiết phiếu nhập (kèm `total_amount` tính từ items, `adjusts_code`, `adjusted_by`) |
| POST | `/api/stock-receipts` | `kho` | Tạo phiếu nhập (transaction) — nhận thêm `receipt_date` (tùy chọn, ảnh hưởng thứ tự FIFO), `order_code`, `payment_status` (Phase 3, mặc định `da_thanh_toan`, bắt buộc có `partner_id` nếu `cong_no`), `adjusts_type`/`adjusts_id` (tùy chọn, phiếu điều chỉnh bù trừ), mỗi item có thêm `discount_percent` |
| GET | `/api/stock-issues` | `kho` | Danh sách phiếu xuất |
| GET | `/api/stock-issues/:id` | `kho` | Chi tiết phiếu xuất (kèm `total_amount`, `adjusts_code`, `adjusted_by`, `partner_phone`/`partner_address` — dùng cho trang in) |
| POST | `/api/stock-issues` | `kho` | Tạo phiếu xuất (transaction) — nhận thêm `issue_date` (tùy chọn), `adjusts_type`/`adjusts_id` (tùy chọn, phiếu điều chỉnh bù trừ), mỗi item có thêm `discount_percent`; `payment_status='cong_no'` bắt buộc có `partner_id` |
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

## 5. Kiểm thử cơ bản mỗi phase

- Phase 1: đăng nhập sai/đúng, truy cập route không đúng role bị chặn.
- Phase 1.5: tạo tài khoản mới với từng role, đăng nhập bằng tài khoản đó và xác nhận đúng quyền hạn; xác nhận user không phải admin không truy cập được `/api/users/*`.
- Phase 1.6: tạo vai trò mới tùy ý, gán/bỏ module, xác nhận menu + API đổi theo đúng thời gian thực; thử sửa/xóa vai trò Admin phải bị chặn; xác nhận `users.role_id` chuyển đổi đúng cho các tài khoản đã tạo ở Phase 1.5 (không mất quyền sau migration).
- Phase 2: tạo phiếu nhập/xuất, cố tình gây lỗi giữa transaction (vd sản phẩm không tồn tại) → xác nhận rollback đúng, tồn kho không bị lệch.
- Phase 3: nhiều lần ghi nợ + thanh toán từng phần → số dư tính đúng.
- Phase 4: in thử trên máy in văn phòng thật, không chỉ xem trên PDF ảo.
- Phase 5: tắt máy chủ giữa chừng, bật lại → xác nhận PM2 tự chạy app mà không cần thao tác thủ công.
