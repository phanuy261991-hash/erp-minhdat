# Trạng thái hiện tại

**Cập nhật lần cuối**: 2026-08-01

## Giai đoạn

Phase 1, Phase 1.5, và **Phase 1.6 (Vai trò động & Cấu hình hệ thống) đã hoàn thành**, test qua trình duyệt thật cho từng trang. Sẵn sàng bắt đầu Phase 2 (Kho) khi người dùng yêu cầu.

- ✅ Backend vai trò động: xong, test qua API (curl).
- ✅ `company_settings` (gồm bổ sung `email`/`website`/`bank_branch`/`phones` ngoài phạm vi PRD gốc, theo yêu cầu người dùng) / `warehouse_settings` (migration + routes): xong, test qua API + trình duyệt thật.
- ✅ `layout.js`/`users.html`/`users.js` (lọc menu theo `permissions`, dropdown vai trò động): xong.
- ✅ Frontend: `roles.html` (CRUD vai trò), `company-settings.html` (2 card song song), `warehouse-settings.html` (toggle cấu hình), `sales-settings.html` (khung trống, empty-state): xong.
- ✅ Chuẩn hóa layout trang cấu hình dùng chung (`.settings-card`/`.settings-section`/`.setting-row`/`.switch`) — xem `docs/DESIGN-SYSTEM.md` mục "Trang cấu hình (settings)".

## Đã hoàn thành

- Tài liệu thiết kế + quản lý dự án: `docs/PRD.md`, `docs/Plan.md`, `docs/erd.mermaid`, `docs/CURRENT.md`, `docs/TASK.md`, `docs/CHANGELOG.md`, `docs/DECISIONS.md`, `docs/DESIGN-SYSTEM.md`, `docs/DEMO.md`, `.claude/docs/inventory-debt-ledger.md`.
- **Phase 1 — Nền tảng**: `package.json` (Express 5.x, better-sqlite3, bcrypt, express-session), migration runner + `001_init.sql`, script seed admin không hardcode credential, API `/api/auth/login|logout|me`, trang `frontend/login.html`.
- Hướng dẫn chạy demo tại `docs/DEMO.md`. Đã test thành công mô hình LAN thật (nhiều máy truy cập 1 máy chủ), kèm hướng dẫn mở Windows Firewall port 3000.
- **Design system** (`docs/DESIGN-SYSTEM.md`, tạo bằng skill `ui-ux-pro-max`): style Soft UI Evolution, màu xanh dương + accent, font Be Vietnam Pro/Open Sans host offline tại `frontend/assets/fonts/`, icon SVG dùng chung (`icons.js`). Bắt buộc dùng cho mọi trang UI mới.
- **Phase 1.5 — Quản trị người dùng & Phân quyền**: trang `frontend/users.html`, khung điều hướng dùng chung `layout.js`/`icons.js` (sidebar chia nhóm, thu gọn được, chặn client-side khi vào nhầm trang). `login.html` chỉ còn là màn hình đăng nhập thuần, đăng nhập xong chuyển sang `dashboard.html`. Đã test đầy đủ qua trình duyệt thật (kể cả tài khoản không phải admin, chặn 403 ở backend).
- **Phase 1.6 — toàn bộ (backend + frontend)**: migration `002_roles_permissions.sql`, `003_company_warehouse_settings.sql`, `004_company_settings_extra_fields.sql`; `backend/config/modules.js`; `backend/middleware/requirePermission.js` (thay `requireRole` — **đã xóa file `requireRole.js`**); `backend/routes/roles.routes.js`, `companySettings.routes.js`, `warehouseSettings.routes.js`; `auth.routes.js`/`users.routes.js` theo schema mới; frontend `roles.html`, `company-settings.html`, `warehouse-settings.html`, `sales-settings.html`, cập nhật `layout.js`/`users.html`/`users.js`. Test đầy đủ qua API (curl) và trình duyệt thật (từng trang + từng vai trò) — chi tiết xem `docs/CHANGELOG.md` các mục ngày 2026-08-01.
- Tài khoản demo hiện có trong `data/data.db`: `admin` / `Demo@123456` (vai trò Admin), `thukho1` / `ThuKho@123` (vai trò Thủ kho), `khophu1` / `KhoPhu@123` (vai trò tự tạo "Nhân viên kho phụ", quyền `kho`+`cong_no` — tạo lúc test, để lại làm dữ liệu test đa vai trò), `ketoan1` / `KeToan@123` (vai trò Kế toán — tạo lúc test trang Người dùng qua UI).

## Chưa bắt đầu / chưa xong

- Phase 2 (Kho), Phase 3 (Công nợ), Phase 4 (In phiếu & Báo cáo), Phase 5 (Vận hành & Go-live) theo `docs/Plan.md` mục 4.
- Module Bán hàng/POS đầy đủ — cần buổi trao đổi yêu cầu nghiệp vụ riêng, làm sau Phase 2/3 (xem `docs/DECISIONS.md` 2026-08-01). Hiện chỉ có khung menu trống (`sales-settings.html`).

## Việc cần làm tiếp theo

Phase 1.6 đã xong toàn bộ. Bước tiếp theo là **Phase 2 — Kho** (xem `docs/Plan.md` mục 4): migration `products`/`stock_receipts`/`stock_receipt_items`/`stock_issues`/`stock_issue_items`/`stock_movements`, `stockReceipt.service.js`/`stockIssue.service.js` (transaction), API + frontend danh mục sản phẩm/nhập kho/xuất kho/xem tồn kho. **Chưa bắt đầu — chờ người dùng yêu cầu**, không tự ý code tiếp.
