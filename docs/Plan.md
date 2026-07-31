# Plan chi tiết: Hệ thống Quản lý Kho & Công nợ nội bộ

**Dựa trên**: PRD v1.1 — cập nhật 2026-08-01
**Version**: v1.1 — cập nhật 2026-08-01 (mục 2b, Phase 1.6)

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
│  │     └─ 004_company_settings_extra_fields.sql (đã có) email/website/bank_branch, phone→phones (JSON)
│  ├─ middleware/
│  │  ├─ auth.js                       (đã có) requireAuth (kiểm tra session)
│  │  └─ requirePermission.js          (đã có) kiểm tra quyền module qua role_permissions
│  ├─ routes/
│  │  ├─ auth.routes.js                (đã có) login/logout/me
│  │  ├─ users.routes.js               (đã có) CRUD tài khoản
│  │  ├─ roles.routes.js               (đã có) CRUD vai trò
│  │  ├─ companySettings.routes.js     (đã có) GET/PUT thông tin công ty
│  │  ├─ warehouseSettings.routes.js   (đã có) GET/PUT cấu hình kho
│  │  ├─ products.routes.js            Phase 2
│  │  ├─ partners.routes.js            Phase 3
│  │  ├─ stockReceipts.routes.js       Phase 2
│  │  ├─ stockIssues.routes.js         Phase 2
│  │  ├─ debts.routes.js               Phase 3
│  │  └─ reports.routes.js             Phase 4
│  └─ services/
│     ├─ stockReceipt.service.js       Phase 2 — transaction: tạo phiếu nhập + movements
│     ├─ stockIssue.service.js         Phase 2 — transaction: tạo phiếu xuất + movements
│     └─ debt.service.js               Phase 3 — ghi nợ/thanh toán
├─ frontend/
│  ├─ login.html                       (đã có)
│  ├─ dashboard.html                   (đã có) trang chủ sau đăng nhập
│  ├─ users.html                       (đã có) quản lý người dùng
│  ├─ roles.html                       (đã có) quản lý vai trò (CRUD + chọn module)
│  ├─ company-settings.html            (đã có) thông tin công ty (2 card song song)
│  ├─ warehouse-settings.html          (đã có) cấu hình kho (toggle allow_negative_stock)
│  ├─ sales-settings.html              (đã có) khung trống "Cấu hình bán hàng" — chưa có nội dung
│  ├─ products.html                    Phase 2
│  ├─ stock-receipts.html              Phase 2
│  ├─ stock-issues.html                Phase 2
│  ├─ print-issue.html                 Phase 4 — trang in phiếu riêng, dùng @media print
│  ├─ partners.html                    Phase 3
│  ├─ debts.html                       Phase 3
│  ├─ reports.html                     Phase 4
│  └─ assets/
│     ├─ style.css                     (đã có) design system (xem docs/DESIGN-SYSTEM.md)
│     ├─ api.js                        (đã có) helper gọi API dùng chung
│     ├─ auth.js                       (đã có) logic riêng trang login
│     ├─ icons.js                      (đã có) bộ icon SVG dùng chung
│     ├─ layout.js                     (đã có) sidebar/điều hướng dùng chung mọi trang (lọc theo permissions)
│     ├─ users.js                      (đã có) logic trang users.html
│     ├─ roles.js                      (đã có) logic trang roles.html
│     ├─ company-settings.js           (đã có) logic trang company-settings.html
│     ├─ warehouse-settings.js         (đã có) logic trang warehouse-settings.html
│     └─ fonts/                        (đã có) file .woff2 host offline + fonts.css
├─ data/
│  └─ data.db                          (đã có) file SQLite, backup định kỳ (Phase 5, chưa có script)
└─ scripts/
   └─ backup.js hoặc backup.sh         Phase 5, chưa tạo — copy data.db sang nơi lưu trữ khác theo lịch
```

## 2. Database Schema chi tiết

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `users` | id PK, username, password_hash, full_name, role_id FK(roles), is_active, created_at | role_id thay cho cột `role` TEXT cố định trước đây (xem mục 2b) |
| `roles` | id PK, name, is_protected, created_at | is_protected=1 cho vai trò Admin — không cho sửa tên/xóa |
| `role_permissions` | role_id FK(roles), module_key, PRIMARY KEY(role_id, module_key) | 1 dòng = 1 module vai trò đó được truy cập; module_key là hằng số cố định trong code (không phải bảng riêng) |
| `company_settings` | id PK (CHECK id=1), company_name, address, tax_code, email, website, phones, bank_name, bank_branch, bank_account_number, bank_account_holder, updated_at | chỉ 1 dòng duy nhất; `phones` lưu mảng JSON dạng text (cho nhập từ 2 số trở lên) — không tách bảng riêng vì luôn gắn 1-1 với dòng duy nhất này |
| `warehouse_settings` | key PK, value, updated_at | dạng key-value, mở rộng dần; key đầu tiên: `allow_negative_stock` |
| `products` | id PK, code, name, unit, cost_price, sale_price, low_stock_threshold, created_at | tồn kho không lưu ở đây |
| `partners` | id PK, type, name, phone, address, created_at | type ∈ {nha_cung_cap, khach_hang} |
| `stock_receipts` | id PK, code, partner_id FK, created_by FK(users), note, created_at | phiếu nhập |
| `stock_receipt_items` | id PK, receipt_id FK, product_id FK, quantity, unit_price | dòng chi tiết phiếu nhập |
| `stock_issues` | id PK, code, partner_id FK, created_by FK(users), note, created_at | phiếu xuất |
| `stock_issue_items` | id PK, issue_id FK, product_id FK, quantity, unit_price | dòng chi tiết phiếu xuất |
| `stock_movements` | id PK, product_id FK, movement_type, quantity, reference_type, reference_id, created_at | ledger biến động kho — tồn kho = SUM(movement) theo product |
| `debt_ledger` | id PK, partner_id FK, type, amount, reference_type, reference_id, note, created_at | type ∈ {no, tra}; số dư = SUM cộng dồn |
| `schema_migrations` | version PK, applied_at | migration runner đọc bảng này |

**Nguyên tắc quan trọng** (đã thống nhất ở bước trước, nhắc lại để dev không quên khi code):
- Tồn kho và công nợ **không bao giờ** lưu dưới dạng 1 số cố định — luôn tính từ tổng cộng dồn (`stock_movements`, `debt_ledger`). Tránh lệch dữ liệu.
- Mỗi phiếu nhập/xuất = 1 transaction SQLite duy nhất, gồm: insert phiếu + insert items + insert movements. Nếu 1 bước lỗi, rollback toàn bộ.

Sơ đồ ERD tương ứng: xem file `erd.mermaid` đi kèm (cần bổ sung `roles`/`role_permissions`/`company_settings`/`warehouse_settings` khi vào Phase 1.6).

## 2b. Phân quyền động (bổ sung 2026-08-01)

Thay cho danh sách vai trò cố định, hệ thống chuyển sang **phân quyền theo module**:

- `module_key` là hằng số cố định trong code (không lưu thành bảng riêng vì đây là tập hợp module do ứng dụng định nghĩa, không phải dữ liệu người dùng tạo ra): `kho`, `cong_no`, `bao_cao`, `nguoi_dung`, `cau_hinh`. Mở rộng thêm khi có module mới (vd `ban_hang` khi module Bán hàng/POS được lên kế hoạch).
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
| PATCH | `/api/users/:id/deactivate` | `nguoi_dung` | Vô hiệu hóa tài khoản |
| PATCH | `/api/users/:id/activate` | `nguoi_dung` | Kích hoạt lại tài khoản |
| GET | `/api/company-settings` | Đã đăng nhập | Thông tin công ty (dùng cho mẫu in) |
| PUT | `/api/company-settings` | `cau_hinh` | Cập nhật thông tin công ty |
| GET | `/api/warehouse-settings` | Đã đăng nhập | Cấu hình kho hiện tại (vd `allow_negative_stock`) |
| PUT | `/api/warehouse-settings` | `cau_hinh` | Cập nhật cấu hình kho |
| GET | `/api/products` | Đã đăng nhập | Danh mục + tồn kho hiện tại |
| POST | `/api/products` | `kho` | Thêm sản phẩm |
| PUT | `/api/products/:id` | `kho` | Sửa sản phẩm |
| GET | `/api/partners?type=` | Đã đăng nhập | Danh sách NCC/khách hàng |
| POST | `/api/partners` | `cong_no` | Thêm đối tác |
| GET | `/api/stock-receipts` | `kho` | Danh sách phiếu nhập |
| POST | `/api/stock-receipts` | `kho` | Tạo phiếu nhập (transaction) |
| GET | `/api/stock-issues` | `kho` | Danh sách phiếu xuất |
| POST | `/api/stock-issues` | `kho` | Tạo phiếu xuất (transaction) |
| GET | `/api/stock-issues/:id/print` | `kho` | Dữ liệu để render trang in |
| GET | `/api/debts?partner_id=&type=` | `cong_no` | Lịch sử công nợ |
| POST | `/api/debts/payment` | `cong_no` | Ghi nhận thanh toán |
| GET | `/api/debts/summary` | `cong_no` | Tổng nợ theo đối tượng |
| GET | `/api/reports/inventory` | `bao_cao` | Báo cáo tồn kho |
| GET | `/api/reports/stock-movements?from=&to=` | `bao_cao` | Báo cáo xuất/nhập theo kỳ |
| GET | `/api/reports/debts` | `bao_cao` | Báo cáo công nợ |

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

- [ ] Migration thêm `partners`, `products`, `stock_receipts`, `stock_receipt_items`, `stock_issues` (kèm `payment_status`), `stock_issue_items`, `stock_movements`
- [ ] `stockReceipt.service.js` / `stockIssue.service.js` (transaction)
- [ ] API + frontend: danh mục sản phẩm, lập phiếu nhập, lập phiếu xuất, xem tồn kho

### Phase 3 — Công nợ

> Cập nhật 2026-08-01: bảng `partners` đã tạo ở Phase 2 (migration) — phase này chỉ còn migration `debt_ledger` + API/frontend quản lý đối tác và công nợ.

- [ ] Migration thêm `debt_ledger`
- [ ] `debt.service.js`, tự động ghi nợ khi tạo phiếu xuất/nhập (nếu công nợ phát sinh từ phiếu)
- [ ] API + frontend: quản lý đối tác (`partners.routes.js`/`partners.html`), ghi nhận thanh toán, xem số dư công nợ

### Phase 4 — In phiếu & Báo cáo
- [ ] `print-issue.html` với CSS `@media print`
- [ ] API `/api/reports/*`
- [ ] Frontend báo cáo (bảng + Chart.js nếu cần biểu đồ)

### Phase 5 — Vận hành & Go-live
- [ ] Cấu hình PM2 (`pm2 start`, `pm2 startup`, `pm2 save`)
- [ ] Đặt IP tĩnh/DHCP reservation cho máy chủ
- [ ] Viết script backup `data.db` định kỳ (cron/Task Scheduler)
- [ ] Test toàn bộ luồng với dữ liệu thật, đào tạo người dùng
- [ ] Go-live, theo dõi 1 tuần đầu để chỉnh sửa

## 5. Kiểm thử cơ bản mỗi phase

- Phase 1: đăng nhập sai/đúng, truy cập route không đúng role bị chặn.
- Phase 1.5: tạo tài khoản mới với từng role, đăng nhập bằng tài khoản đó và xác nhận đúng quyền hạn; xác nhận user không phải admin không truy cập được `/api/users/*`.
- Phase 1.6: tạo vai trò mới tùy ý, gán/bỏ module, xác nhận menu + API đổi theo đúng thời gian thực; thử sửa/xóa vai trò Admin phải bị chặn; xác nhận `users.role_id` chuyển đổi đúng cho các tài khoản đã tạo ở Phase 1.5 (không mất quyền sau migration).
- Phase 2: tạo phiếu nhập/xuất, cố tình gây lỗi giữa transaction (vd sản phẩm không tồn tại) → xác nhận rollback đúng, tồn kho không bị lệch.
- Phase 3: nhiều lần ghi nợ + thanh toán từng phần → số dư tính đúng.
- Phase 4: in thử trên máy in văn phòng thật, không chỉ xem trên PDF ảo.
- Phase 5: tắt máy chủ giữa chừng, bật lại → xác nhận PM2 tự chạy app mà không cần thao tác thủ công.
