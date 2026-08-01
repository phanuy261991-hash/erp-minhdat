# Trạng thái hiện tại

**Cập nhật lần cuối**: 2026-08-01

## Giai đoạn

Phase 1, 1.5, 1.6, 2 (Kho), 3 (Công nợ), **4 (In phiếu & Báo cáo) đã hoàn thành**. Sau đó có thêm nhiều đợt chỉnh sửa/mở rộng ngoài phase (Báo cáo, In phiếu, tách Khách hàng, Bảo hành, Tổng quan — xem mục dưới). **Phase 5 (Vận hành & Go-live) đang làm** — phần code/cấu hình độc lập máy chủ đã xong, phần gắn với máy chủ thật (IP tĩnh, PM2 startup, go-live) chờ triển khai lên đúng máy chủ.

- ✅ **Bắt đầu Phase 5 — Vận hành & Go-live (2026-08-01)**: đã làm phần độc lập với máy chủ cụ thể — `ecosystem.config.js` (PM2), migration `018` + `scripts/backup.js` (backup `data.db`, tự dọn bản cũ >14 ngày), UI cấu hình đường dẫn backup + nút "Backup ngay" trong "Cấu hình kho", tài liệu quy trình đầy đủ `docs/DEPLOY.md`. **Chưa làm** (cần đúng máy chủ thật, hiện đang ở máy dev): đặt IP tĩnh, chạy `pm2 start`/`pm2-startup install`, đặt Task Scheduler backup hàng ngày, go-live thật.
- ✅ **Làm lại trang Tổng quan (2026-08-01, ngoài phase)**: `dashboard.js` mới (trước đây chỉ là khung tĩnh, không có code gọi API) — lời chào động theo giờ hệ thống + họ tên tài khoản, 3 card Sản phẩm/Khách hàng/Nhà cung cấp lấy số liệu thật, thiết kế lại bằng skill `ui-ux-pro-max` (card bento bấm được, icon mặt trời/mặt trăng, khu vực "Truy cập nhanh" lọc theo quyền) — xem `docs/DESIGN-SYSTEM.md`.
- ✅ **Bảo hành (2026-08-01, ngoài phase, theo yêu cầu người dùng, đã chỉnh sửa lại theo phản hồi ngay sau đó)**: module mới thuộc menu Khách hàng — migration `017` (bảng `warranties`, chỉ gắn khách hàng), CRUD đầy đủ (`warranties.routes.js`), trang danh sách (`warranties.html`) kèm **modal** thêm mới/sửa (ban đầu làm 1 trang riêng `warranty-detail.html`, đã bỏ và chuyển thành popup theo đúng pattern chung của hệ thống sau phản hồi người dùng), tương tác 2 chiều Thời gian bảo hành ↔ Ngày hết hạn (`warranty-calc.js`). Trang mới `customer-detail.html` (trước đây chưa có) hiển thị **card Bảo hành theo mẫu tham khảo** (icon vuông màu theo trạng thái, tiêu đề/phụ đề, nhãn trạng thái đối diện số ngày còn lại). Xóa cứng chỉ Admin. Sửa thêm 3 lỗi CSS `[hidden]` bị ghi đè phát hiện khi test (`.empty-state`, `.page-header-actions`, `.page-header-actions .btn-secondary`) + lỗi 2 card "Thông tin công ty"/"Ghi chú in phiếu" dính sát nhau (thiếu margin).
- ✅ **Chỉnh sửa Báo cáo/In phiếu + tách Khách hàng (2026-08-01, ngoài phase, theo yêu cầu người dùng)**: trang Báo cáo đổi thứ tự (Công nợ lên đầu); phiếu in xuất kho thêm cột "Mã sản phẩm" + sửa lỗi ghi chú công ty không xuống dòng (thiếu class CSS); tách hẳn "Khách hàng" thành menu riêng khỏi "Đối tác/Công nợ" (nay chỉ còn Nhà cung cấp) — thêm danh mục "Loại khách hàng" (migration `015`, có hạn mức công nợ chỉ để cảnh báo, không chặn cứng). Chi tiết đầy đủ: `docs/CHANGELOG.md`, quyết định kiến trúc: `docs/DECISIONS.md`.
- ✅ Phase 1 → 3: xem chi tiết ở các mục cũ bên dưới, không đổi gì thêm phiên này.
- ✅ **Phase 4 — In phiếu xuất kho** (`print-issue.html`, trang độc lập không dùng sidebar): dùng `GET /api/stock-issues/:id` có sẵn (không cần API `/print` riêng như dự tính ban đầu), hiển thị đầy đủ thông tin công ty (tên, địa chỉ, điện thoại, MST, email, website, ngân hàng) + thông tin khách hàng + bảng sản phẩm (kèm chiết khấu) + tổng tiền + chữ ký. Nút "In phiếu" (`window.print()`) trên từng dòng ở `stock-issues.html`.
- ✅ **Ghi chú in phiếu cấu hình được** (`company_settings.print_note`, migration `014`): nội dung hiển thị dưới bảng kê trên phiếu in (điều kiện bảo hành, chính sách đổi trả...) — sửa được qua trang Thông tin công ty (textarea mới), không hardcode cứng trong code. Seed sẵn nội dung mẫu theo yêu cầu người dùng.
- ✅ **Phase 4 — Báo cáo** (`reports.html`, quyền `bao_cao`): 3 phần — (1) Tồn kho hiện tại (bảng + tổng giá trị tồn, giá vốn luôn tính bình quân gia quyền bất kể `costing_method` đang chọn), (2) Mua hàng/Bán hàng theo tháng (biểu đồ cột SVG tự vẽ tay, không dùng thư viện ngoài, kèm % tăng trưởng so với tháng trước), (3) Công nợ tổng hợp toàn hệ thống (tổng phải thu/phải trả). `backend/routes/reports.routes.js` tính trực tiếp từ bảng gốc, không lưu số tổng hợp riêng.

## Đã hoàn thành

- Tài liệu thiết kế + quản lý dự án: `docs/PRD.md`, `docs/Plan.md`, `docs/erd.mermaid`, `docs/CURRENT.md`, `docs/TASK.md`, `docs/CHANGELOG.md`, `docs/DECISIONS.md`, `docs/DESIGN-SYSTEM.md`, `docs/DEMO.md`, `.claude/docs/inventory-debt-ledger.md`.
- **Phase 1 — Nền tảng**: `package.json` (Express 5.x, better-sqlite3, bcrypt, express-session), migration runner + `001_init.sql`, script seed admin không hardcode credential, API `/api/auth/login|logout|me`, trang `frontend/login.html`.
- Hướng dẫn chạy demo tại `docs/DEMO.md`. Đã test thành công mô hình LAN thật (nhiều máy truy cập 1 máy chủ), kèm hướng dẫn mở Windows Firewall port 3000.
- **Design system** (`docs/DESIGN-SYSTEM.md`, tạo bằng skill `ui-ux-pro-max`): style Soft UI Evolution, màu xanh dương + accent, font Be Vietnam Pro/Open Sans host offline tại `frontend/assets/fonts/`, icon SVG dùng chung (`icons.js`).
- **Phase 1.5 — Quản trị người dùng & Phân quyền**: trang `frontend/users.html` (có thêm sửa/xóa tài khoản), khung điều hướng dùng chung `layout.js`/`icons.js`.
- **Phase 1.6 — toàn bộ (backend + frontend)**: vai trò động, cấu hình công ty/kho.
- **Phase 2 — Kho (hoàn thành)**: migration `005`-`010`, `costing.service.js`, `products.routes.js` mở rộng, `stockReceipts.routes.js`/`stockIssues.routes.js` (kèm cơ chế điều chỉnh bù trừ), frontend `products.html`/`product-detail.html`/`stock-receipts.html`/`stock-issues.html`, modal xem chi tiết phiếu nhập + phiếu xuất dùng chung (`receipt-detail.js`/`issue-detail.js`), combobox "Điều chỉnh cho phiếu" dùng chung (`adjustment.js`).
- **Phase 3 — Công nợ (hoàn thành)**: migration `011`-`012`, `debt.service.js`, `debts.routes.js`, `partners.routes.js` CRUD đầy đủ, frontend `partners.html`/`debts.html`, bật menu "Đối tác"/"Công nợ" trong `layout.js`.
- **Hoàn thiện Xuất kho + Công nợ (sau Phase 3)**: migration `013` (chiết khấu phiếu xuất), `stockIssue.service.js`/`stockIssues.routes.js` cập nhật (thời gian xuất, chiết khấu), `debts.routes.js` bổ sung `total_transacted`, frontend `stock-issues.html`/`.js` (thời gian xuất, hiển thị liên hệ khách hàng, chiết khấu), `debts.html`/`.js` (thẻ số liệu nổi bật), CSS `.stat-card-value--warning` + spacing `.setting-row`.
- **Phase 4 — In phiếu & Báo cáo (hoàn thành)**: migration `014` (`company_settings.print_note`), `backend/routes/reports.routes.js` (mới), frontend `print-issue.html`/`.js` (mới), `reports.html`/`.js` (mới, biểu đồ cột SVG tự vẽ + `.stat-delta`), `company-settings.html`/`.js` cập nhật (textarea ghi chú in phiếu), icon `printer` mới, bật menu "Báo cáo" trong `layout.js`.
- Tài khoản demo hiện có trong `data/data.db`: `admin` / `Demo@123456` (Admin), `thukho1` / `ThuKho@123` (Thủ kho), `khophu1` / `KhoPhu@123` (vai trò tự tạo, quyền `kho`+`cong_no`), `ketoan1` / `KeToan@123` (Kế toán). Có nhiều dữ liệu test tích lũy qua các phiên (phiếu nhập/xuất PN/PX..., vài đối tác test, vài dòng `debt_ledger` test) — không xóa được theo đúng nguyên tắc ledger, chấp nhận để lại. `company_settings` hiện có dữ liệu test đầy đủ (email/website/ngân hàng) để demo trang in phiếu.

## Đã hoàn thành (tiếp — 2026-08-01, ngoài phase)

- Migration `015_customer_categories.sql`: bảng `customer_categories` + `partners.category_id`.
- Backend: `customerCategories.routes.js` (mới), `partners.routes.js`/`debts.routes.js` cập nhật hỗ trợ `category_id`/cảnh báo hạn mức.
- Frontend mới: `customers.html`/`.js` (Khách hàng), `customer-debts.html`/`.js` (Công nợ khách hàng), `customer-categories.html`/`.js` (Loại khách hàng, menu Cấu hình).
- Frontend cập nhật: `partners.html`/`.js` (chỉ còn Nhà cung cấp), `debts.html`/`.js` (chỉ còn Công nợ NCC), `layout.js`/`icons.js` (menu mới, icon `truck`/`tag`), `reports.html` (Công nợ lên đầu), `print-issue.html`/`.js` (cột Mã sản phẩm, sửa lỗi xuống dòng ghi chú).
- Test qua trình duyệt thật: CRUD Loại khách hàng, gán loại cho khách hàng, xác nhận dữ liệu công nợ NCC cũ không mất sau migration, menu sidebar đúng cấu trúc mới.
- Sửa lỗi ô "Địa chỉ" không nhập được khi thêm nhanh khách hàng/NCC mới trên phiếu xuất/nhập kho (thiếu ô nhập + lỗi CSS `.form-row` đè lên thuộc tính `hidden`).
- **"Điều chỉnh công nợ"** (migration `016_debt_adjustment.sql`, `debt_ledger.is_adjustment`): sửa số dư công nợ sai (vd nhập nhầm giá vốn phiếu nhập) mà không sửa/xóa phiếu gốc — ghi thêm 1 dòng `debt_ledger` (tăng hoặc giảm tùy chọn), tùy chọn liên kết về đúng phiếu nhập/xuất bị sai (validate đúng đối tác), bắt buộc ghi lý do. Có ở cả trang Công nợ NCC và Công nợ khách hàng (nút đầu trang + icon từng dòng), badge riêng "Điều chỉnh" trong lịch sử để không nhầm với thanh toán thật.

## Chưa bắt đầu / chưa xong

- Phase 5 (Vận hành & Go-live) theo `docs/Plan.md` mục 4: cấu hình PM2, IP tĩnh, script backup `data.db`, `SESSION_SECRET` cố định.
- Module Bán hàng/POS đầy đủ — cần buổi trao đổi yêu cầu nghiệp vụ riêng. Hiện chỉ có khung menu trống (`sales-settings.html`).
- **Cần người dùng xác nhận lại**: nội dung "Ghi chú in phiếu" mặc định (seed từ migration `014`) có 1 dòng bị suy đoán lại vì ảnh mẫu gốc bị cắt ở lề ("Các sản phẩm thương hiệu khác bảo hành theo tiêu chuẩn của nhà sản xuất") — cần vào trang Thông tin công ty kiểm tra/sửa lại cho đúng nguyên văn nếu cần.
- In phiếu hiện chỉ có cho **phiếu xuất kho** (đúng phạm vi PRD 4.5 "In phiếu xuất") — chưa có mẫu in cho phiếu nhập kho, chưa có yêu cầu cụ thể.

## Việc cần làm tiếp theo

Chưa có việc cụ thể đang treo — chờ người dùng chọn hướng tiếp theo: Phase 5 (vận hành/go-live), hoặc yêu cầu bổ sung khác ngoài kế hoạch (vd in phiếu nhập, mở rộng báo cáo, module Bán hàng/POS).

**Ghi chú nhỏ (2026-08-01)**: cảnh báo vượt hạn mức công nợ trên trang Công nợ khách hàng chưa được test với dữ liệu thật có số dư vượt hạn mức (dữ liệu test hiện tại số dư khách hàng đều = 0) — logic đã review kỹ, nên test lại khi có dữ liệu thật vượt ngưỡng.
