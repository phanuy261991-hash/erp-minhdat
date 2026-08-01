# Trạng thái hiện tại

**Cập nhật lần cuối**: 2026-07-31

## Giai đoạn

Phase 1, 1.5, 1.6, 2 (Kho), **3 (Công nợ) đã hoàn thành**. Sẵn sàng chuyển sang Phase 4 (In phiếu & Báo cáo) khi người dùng yêu cầu.

- ✅ Phase 1/1.5/1.6/2: xem chi tiết ở các mục cũ bên dưới, không đổi gì thêm phiên này.
- ✅ **Phase 3 — Công nợ phải trả NCC** (bổ sung `payment_status` vào `stock_receipts`, migration `011`): phiếu nhập giờ có toggle "Chưa thanh toán ngay" giống hệt phiếu xuất, giá trị `da_thanh_toan`/`cong_no`.
- ✅ **Phase 3 — Sổ cái công nợ** (`debt_ledger`, migration `012`): số dư luôn tính từ `SUM` cộng dồn theo `partner_id` (không lưu số cố định, đúng nguyên tắc ledger). `debt.service.js` tự động ghi 1 dòng `type='no'` **trong cùng transaction** tạo phiếu khi phiếu nhập/xuất đánh dấu `cong_no` (bắt buộc phải chọn đối tác, chặn nếu không có). Ghi nhận thanh toán thủ công (`type='tra'`) qua trang Công nợ, cho phép trả từng phần.
- ✅ **Phase 3 — Quản lý đối tác đầy đủ** (`partners.routes.js` mở rộng CRUD, `partners.html`): sửa (tên/SĐT/địa chỉ, không đổi được loại NCC/khách hàng sau khi tạo), xóa cứng (chặn nếu đã có lịch sử phiếu nhập/xuất hoặc công nợ) — quyền `cong_no` riêng cho sửa/xóa (khác với "thêm nhanh" lúc lập phiếu vẫn dùng chung `kho`/`cong_no`).
- ✅ **Phase 3 — Trang Công nợ** (`debts.html`): danh sách đối tác kèm số dư hiện tại (tô màu cảnh báo nếu còn nợ), xem lịch sử giao dịch từng đối tác (kèm mã phiếu gốc nếu có), ghi nhận thanh toán (modal dùng chung cho cả nút ở đầu trang lẫn từng dòng đối tác).
- ✅ **Hoàn thiện Xuất kho** (bổ sung sau khi Phase 3 xong, theo yêu cầu người dùng): thêm "Thời gian xuất" tùy chỉnh (giống `receipt_date`), tự động hiển thị SĐT/địa chỉ khi chọn khách hàng có sẵn (2 ô chỉ đọc), **chiết khấu % từng dòng sản phẩm** (migration `013`, đối xứng phiếu nhập — `unit_price` giữ giá gốc, `total_amount`/ghi công nợ tính theo giá sau chiết khấu).
- ✅ **Cải thiện hiển thị trang Công nợ**: modal lịch sử công nợ đổi từ text thường sang 2 thẻ số liệu lớn — "Cần thanh toán"/"Cần thu" (tô màu cảnh báo khi còn nợ) đặt cạnh "Tổng tiền hàng đã mua"/"đã bán" (tính trực tiếp từ `stock_receipts`/`stock_issues`, không phải từ `debt_ledger`, để phản ánh đúng TỔNG giá trị giao dịch kể cả phần đã thanh toán ngay) — giúp so sánh trực quan.

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
- Tài khoản demo hiện có trong `data/data.db`: `admin` / `Demo@123456` (Admin), `thukho1` / `ThuKho@123` (Thủ kho), `khophu1` / `KhoPhu@123` (vai trò tự tạo, quyền `kho`+`cong_no`), `ketoan1` / `KeToan@123` (Kế toán). Có nhiều dữ liệu test tích lũy qua các phiên (phiếu nhập/xuất PN/PX..., vài đối tác test, vài dòng `debt_ledger` test) — không xóa được theo đúng nguyên tắc ledger, chấp nhận để lại.

## Chưa bắt đầu / chưa xong

- Phase 4 (In phiếu & Báo cáo), Phase 5 (Vận hành & Go-live) theo `docs/Plan.md` mục 4.
- Cơ chế phiếu điều chỉnh bù trừ hiện chỉ áp dụng cho tồn kho (`stock_receipts`/`stock_issues`) — chưa có cơ chế tương tự để điều chỉnh 1 dòng `debt_ledger` ghi sai (vd ghi nhận thanh toán nhầm số tiền). Chưa có yêu cầu cụ thể, để khi phát sinh nhu cầu thực tế.
- Module Bán hàng/POS đầy đủ — cần buổi trao đổi yêu cầu nghiệp vụ riêng. Hiện chỉ có khung menu trống (`sales-settings.html`).

## Việc cần làm tiếp theo

Chưa có việc cụ thể đang treo — chờ người dùng chọn hướng tiếp theo: Phase 4 (in phiếu xuất + báo cáo tồn kho/công nợ), Phase 5 (vận hành/go-live), hoặc yêu cầu bổ sung khác ngoài kế hoạch.
