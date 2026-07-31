# Trạng thái hiện tại

**Cập nhật lần cuối**: 2026-07-31

## Giai đoạn

Phase 1, 1.5, 1.6 đã hoàn thành. **Phase 2 (Kho) đang làm dở** — Danh mục sản phẩm + Nhập kho đã xong và test qua trình duyệt thật; **Xuất kho chưa làm**, đang chờ chốt 2 điểm nghiệp vụ (xem "Việc cần làm tiếp theo").

- ✅ Phase 1/1.5/1.6: xem chi tiết ở các mục cũ bên dưới, không đổi gì thêm phiên này.
- ✅ **Phase 2 — Danh mục sản phẩm** (`products.html`): CRUD, tìm kiếm, sắp xếp tồn kho, cảnh báo tồn thấp, vô hiệu hóa (quyền `kho`)/xóa cứng (chỉ Admin, chặn nếu có lịch sử).
- ✅ **Phase 2 — Giá vốn**: 2 phương pháp chọn qua Cấu hình kho (bình quân gia quyền mặc định, hoặc FIFO) — `stock_lots` theo dõi lô hàng, snapshot `unit_cost` trên từng movement. Đã verify bằng số liệu thật (2 lô giá khác nhau → bình quân đúng; đổi FIFO → xuất đúng giá lô cũ nhất).
- ✅ **Phase 2 — Trang chi tiết sản phẩm** (`product-detail.html`, ngoài kế hoạch gốc): giá vốn hiện tại + lịch sử nhập/xuất + lịch sử chỉnh sửa thông tin (`product_change_log`).
- ✅ **Phase 2 — Nhập kho** (`stock-receipts.html`): chọn/thêm nhanh NCC (API `partners.routes.js` rút gọn, quyền `kho` hoặc `cong_no`), combobox tìm sản phẩm, chiết khấu % từng dòng (giá vốn = giá net), thời gian nhập tùy chỉnh (ảnh hưởng thứ tự FIFO), mã đơn hàng, tổng thành tiền, bố cục form ngang (`.form-row`).
- ⏳ **Phase 2 — Xuất kho** (`stock-issues.html`): **chưa bắt đầu code**. Đã hỏi 2 câu hỏi nghiệp vụ trong chat nhưng **người dùng chưa trả lời** (bị dismiss): (1) đối tác khách hàng dùng dropdown+thêm nhanh giống hệt NCC hay khác, (2) `payment_status` hiển thị dạng toggle đơn hay 2 radio ngang hàng.

## Đã hoàn thành

- Tài liệu thiết kế + quản lý dự án: `docs/PRD.md`, `docs/Plan.md`, `docs/erd.mermaid`, `docs/CURRENT.md`, `docs/TASK.md`, `docs/CHANGELOG.md`, `docs/DECISIONS.md`, `docs/DESIGN-SYSTEM.md`, `docs/DEMO.md`, `.claude/docs/inventory-debt-ledger.md`.
- **Phase 1 — Nền tảng**: `package.json` (Express 5.x, better-sqlite3, bcrypt, express-session), migration runner + `001_init.sql`, script seed admin không hardcode credential, API `/api/auth/login|logout|me`, trang `frontend/login.html`.
- Hướng dẫn chạy demo tại `docs/DEMO.md`. Đã test thành công mô hình LAN thật (nhiều máy truy cập 1 máy chủ), kèm hướng dẫn mở Windows Firewall port 3000.
- **Design system** (`docs/DESIGN-SYSTEM.md`, tạo bằng skill `ui-ux-pro-max`): style Soft UI Evolution, màu xanh dương + accent, font Be Vietnam Pro/Open Sans host offline tại `frontend/assets/fonts/`, icon SVG dùng chung (`icons.js`). Bắt buộc dùng cho mọi trang UI mới — đã mở rộng thêm nhiều pattern mới ở Phase 2 (xem mục "Form nhiều dòng động", "Chọn 1 trong nhiều phương án", "Bố cục ngang cho form").
- **Phase 1.5 — Quản trị người dùng & Phân quyền**: trang `frontend/users.html`, khung điều hướng dùng chung `layout.js`/`icons.js`. Test đầy đủ qua trình duyệt thật.
- **Phase 1.6 — toàn bộ (backend + frontend)**: vai trò động, cấu hình công ty/kho. Test đầy đủ qua API (curl) và trình duyệt thật — chi tiết `docs/CHANGELOG.md` 2026-08-01.
- **Phase 2 — Kho (đang làm, xem chi tiết mục "Giai đoạn" ở trên và `docs/CHANGELOG.md` 2026-07-31)**: migration `005`-`009`, `costing.service.js`, `products.routes.js` mở rộng, `partners.routes.js` rút gọn, `stockReceipts.routes.js`, frontend `products.html`/`product-detail.html`/`stock-receipts.html`, `requireAnyPermission` trong middleware.
- Tài khoản demo hiện có trong `data/data.db`: `admin` / `Demo@123456` (Admin), `thukho1` / `ThuKho@123` (Thủ kho), `khophu1` / `KhoPhu@123` (vai trò tự tạo, quyền `kho`+`cong_no`), `ketoan1` / `KeToan@123` (Kế toán). Đã có dữ liệu test: vài sản phẩm (SP001, SP020...), vài phiếu nhập (PN000001-008), 2 đối tác test (Cong ty CP Thep Hoa Phat, Cong ty TNHH Vat Lieu Xay Dung ABC).

## Chưa bắt đầu / chưa xong

- **Phase 2**: `stock-issues.html` (Xuất kho) — chưa code, đang chờ người dùng trả lời 2 câu hỏi ở mục "Giai đoạn". Cơ chế phiếu điều chỉnh bù trừ cho sửa/hủy phiếu — chưa làm.
- Phase 3 (Công nợ), Phase 4 (In phiếu & Báo cáo), Phase 5 (Vận hành & Go-live) theo `docs/Plan.md` mục 4.
- Module Bán hàng/POS đầy đủ — cần buổi trao đổi yêu cầu nghiệp vụ riêng, làm sau Phase 2/3. Hiện chỉ có khung menu trống (`sales-settings.html`).

## Việc cần làm tiếp theo

**Ưu tiên 1**: hỏi lại người dùng 2 điểm còn treo trước khi code `stock-issues.html` (đã hỏi nhưng câu hỏi bị dismiss, chưa có câu trả lời):
1. Đối tác khách hàng trong phiếu xuất: dùng đúng cơ chế dropdown + thêm nhanh giống hệt NCC ở phiếu nhập (chỉ đổi `type='khach_hang'`) hay xử lý khác đi?
2. `payment_status` (`da_thu_tien`/`cong_no`) hiển thị trên form dạng gì: 1 toggle đơn ("Chưa thu tiền ngay", mặc định tắt) hay 2 nút radio ngang hàng bắt buộc chọn?

**Sau khi chốt 2 điểm trên**: code `stock-issues.html`/`stock-issues.js` theo đúng pattern đã dùng ở `stock-receipts.html` (combobox sản phẩm, `.form-row`, chiết khấu nếu cần, tổng thành tiền) — API backend `stockIssue.service.js`/`stockIssues.routes.js` **đã có sẵn và đã test qua curl** từ trước (chặn tồn kho không đủ, `allow_negative_stock`, tính giá vốn theo `costing_method`), chỉ còn thiếu giao diện.

Sau khi xong `stock-issues.html`, coi như hoàn thành Phase 2 cơ bản (còn thiếu phiếu điều chỉnh bù trừ, có thể để sau) — cập nhật docs theo đúng cadence đã thống nhất, rồi hỏi người dùng có chuyển sang Phase 3 (Công nợ) không.
