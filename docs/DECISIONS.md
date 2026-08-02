# Quyết định kiến trúc & nghiệp vụ

> Ghi lại các quyết định đã chốt để không thảo luận lại trừ khi có lý do mới. Mỗi mục ghi ngày chốt.

## 2026-08-02 — Module "Sổ quỹ": độc lập với Công nợ, quỹ đầu kỳ tự cộng dồn, không sửa chỉ xóa cứng

**Bối cảnh**: người dùng yêu cầu module mới quản lý dòng tiền quỹ (phiếu thu/chi, quỹ đầu kỳ, thanh tổng hợp theo tháng), kèm ảnh mẫu tham khảo từ phần mềm khác. Trước khi code đã hỏi lại 4 câu hỏi kiến trúc quan trọng (qua AskUserQuestion):

1. **Sổ quỹ hoàn toàn độc lập với module Công nợ** — tạo/xóa phiếu thu/chi **không** ghi vào `debt_ledger`, không tự động giảm công nợ đối tác. Muốn ghi nhận thanh toán công nợ vẫn phải vào đúng trang Công nợ NCC/Khách hàng như trước — chấp nhận đánh đổi (2 nơi thao tác cho cùng 1 sự việc thực tế) để giữ 2 module tách bạch, đơn giản hơn về logic và không rủi ro double-booking.
2. **Quỹ đầu kỳ tự động cộng dồn qua các tháng** — chỉ nhập 1 lần (giá trị gốc, không gắn ngày), lưu ở bảng singleton `cash_book_settings` (mirror đúng pattern `company_settings`, khác `warehouse_settings` vì chỉ có 1 giá trị). "Quỹ đầu kỳ" của 1 tháng bất kỳ = `opening_balance` + SUM(thu-chi) mọi phiếu tạo TRƯỚC tháng đó — tính hoàn toàn on-the-fly, không lưu riêng từng tháng, đúng nguyên tắc ledger xuyên suốt dự án.
3. **Phiếu thu/chi không sửa được, chỉ tạo và xóa cứng** — khác nguyên tắc "chỉ tạo phiếu điều chỉnh bù trừ" của Kho/Công nợ (`stock_receipts`/`stock_issues`/`debt_ledger`), vì `cash_vouchers` không có bảng nào tham chiếu ngược (module độc lập, không cần giữ vết lịch sử bù trừ). Quyền xóa chỉ cần quyền module `so_quy`, không phân biệt theo hành động — đúng triết lý "phân quyền theo module, không chi tiết theo hành động" đã chốt từ Phase 1.6 (`docs/PRD.md` mục 4.1).
4. **Trường "Đối tượng nộp/nhận" chỉ là tên tự do** — không liên kết danh sách Nhà cung cấp/Khách hàng có sẵn, không có combobox tìm/thêm nhanh đối tác như phiếu nhập/xuất kho. Đơn giản hóa đáng kể (không cần API `/api/partners` trong module này).

**Quyết định kỹ thuật phát sinh khi hiện thực hóa**:

- **Mốc thời gian "tháng hiện tại" tính theo giờ Việt Nam (UTC+7 cố định), không phải UTC thô hay giờ hệ thống máy chủ**: toàn bộ `created_at` trong DB lưu dạng UTC text (giống mọi bảng khác — xem `toSqliteDatetime()` ở `stock-receipts.js`). Người dùng ở Việt Nam, không có DST — nếu tính ranh giới tháng theo UTC thô sẽ lệch 7 giờ, phân loại sai các phiếu tạo gần nửa đêm (vd phiếu lúc 23:30 giờ VN ngày 31 sẽ bị tính nhầm sang tháng sau nếu dùng UTC thô). Đã hardcode offset `+7h` cố định trong `monthBoundsUtc()` (`backend/services/cashVoucher.service.js`), không dùng thư viện timezone (đúng phong cách "không phụ thuộc dependency ngoài" của dự án). **Quan trọng: không được "sửa lại" thành giờ server hệ thống ở phiên sau** — máy chủ đóng gói có thể chạy trên máy có timezone hệ điều hành không đúng, offset cố định +7h mới là điều đúng theo bản chất nghiệp vụ (người dùng luôn ở VN).
- **`GET /api/cash-vouchers` bắt buộc tham số `month`, không tự suy đoán "tháng hiện tại" ở backend** — để tránh 2 nơi tự định nghĩa "tháng hiện tại" theo 2 cách khác nhau (frontend dùng giờ trình duyệt, backend nếu tự suy đoán sẽ dùng giờ server có thể sai timezone). Frontend luôn gửi tường minh `?month=YYYY-MM`.
- **Không dùng `<input type="month">`**: control này hiển thị theo locale trình duyệt (vd "August 2026"), không ép được tiếng Việt qua CSS/HTML thuần — đây là input kiểu tháng đầu tiên trong dự án, không có tiền lệ. Đã đổi sang 2 `<select>` "Tháng"/"Năm" tự viết nhãn tiếng Việt (`cash-book.js`), ghép lại thành `YYYY-MM` khi gọi API. Phát sinh sau khi người dùng phản hồi trực tiếp qua ảnh chụp màn hình.
- **Danh mục "Loại thu chi" tạo nhanh được ngay trên modal lập phiếu** (nút "+ Tạo loại mới", theo yêu cầu người dùng ngay sau khi xong bản đầu) — gọi `POST /api/cash-categories` trước khi tạo phiếu, không bắt người dùng rời sang trang "Loại thu chi" riêng chỉ để thêm 1 loại còn thiếu. Khác pattern sentinel `"__new__"` trong `<select>` của `stock-receipts.js` (dùng nút toggle riêng thay vì option đặc biệt) vì chỉ cần đúng 1 trường (tên), không cần mở cả khối nhiều trường như "thêm nhanh đối tác".
- **Seed sẵn 6 danh mục mẫu** (Thu: Thu bán hàng/Thu hồi công nợ/Thu khác; Chi: Chi mua hàng/Chi phí vận hành/Chi khác) trong migration `019` — người dùng xác nhận muốn có ví dụ dùng thử ngay, sửa/xóa/thêm được tự do sau.
- **Nhóm nav "Quỹ" riêng** (không gộp vào "Kho" hay "Công nợ") — đặt sau nhóm "Khách hàng", trước "Quản trị" (người dùng chọn qua AskUserQuestion). Icon nav mới `wallet` (thêm vào `icons.js`) — icon `ledger` đã dùng 2 lần (Công nợ NCC/KH), dùng lại lần 3 sẽ trùng hình ảnh trong sidebar.
- **`record_business_result`** ("Hạch toán kết quả kinh doanh", checkbox mặc định bật): chỉ lưu cờ, đã grep toàn bộ repo xác nhận **chưa có báo cáo lãi/lỗ nào** dùng đến ở giai đoạn này — để dành cho tính năng tương lai, không tự suy diễn logic báo cáo chưa được yêu cầu.
- Test qua trình duyệt thật bằng Chrome headless điều khiển qua CDP thô (dự án không có sẵn Playwright/chromium-cli) — bao gồm cả test trực tiếp `monthBoundsUtc()`/`createCashVoucher()` qua script Node riêng để xác nhận đúng ranh giới tháng giờ VN (phiếu 23:30 ngày cuối tháng vs 00:30 ngày đầu tháng sau, chênh nhau đúng 1 giờ UTC quanh mốc 17:00 UTC = 00:00 giờ VN).

## 2026-08-01 — Đóng gói phân phối: bỏ `pkg` (crash native-addon), chuyển sang thư mục "portable Node" + Task Scheduler

**Bối cảnh**: người dùng hỏi có cách nào đóng gói/phân phối đơn giản hơn cách chạy PM2 thủ công (copy nguyên thư mục dự án, `npm install`, cấu hình tay) trong `docs/DEPLOY.md`, và hỏi người dùng cuối có xem được mã nguồn không. Đã trả lời: trình duyệt không bao giờ thấy mã nguồn backend (chỉ thấy frontend JS qua DevTools, không tránh được với bất kỳ web app thuần không qua build nào); ai có quyền truy cập trực tiếp filesystem máy chủ thì đọc được file `.js` backend dù đóng gói cách nào. Người dùng xác nhận muốn đóng gói thành 1 file `.exe` tự cài đặt: tạo database mới, cho cấu hình tài khoản admin đầu tiên qua giao diện, và tự động khởi động cùng Windows (khi được hỏi, chọn "làm luôn" thay vì để sau).

**Phần 1 — Bootstrap database + tài khoản admin lần đầu (giữ nguyên, không đổi)**:
- `backend/server.js` tự gọi `runMigrations()` ngay khi khởi động (trước đây chỉ chạy qua `npm run migrate` thủ công) — bắt buộc để bản đóng gói tự dựng schema đầy đủ khi chạy trên máy chưa từng có database.
- `backend/routes/setup.routes.js` (mới, không gắn `requireAuth`): `GET /api/setup/status` (`needs_setup` = chưa có user nào), `POST /api/setup` (tạo tài khoản Admin đầu tiên qua form, tự khóa vĩnh viễn ngay khi có ≥1 user) — thay thế `npm run seed:admin` (cần biến môi trường + terminal, không phù hợp người dùng không rành kỹ thuật chạy file đóng gói).
- `frontend/setup.html`/`assets/setup.js` (mới) + `frontend/assets/auth.js` (sửa `checkSession`): trang đăng nhập tự chuyển hướng sang trang "Thiết lập lần đầu" khi hệ thống chưa có tài khoản nào.
- Tiện thể sửa `backend/db/seedAdmin.js` — script này đã hỏng từ lâu (còn dùng cột `role` TEXT cũ, schema đã đổi sang `role_id`/bảng `roles` từ migration `002` nhưng script chưa từng được cập nhật theo).
- Đã test end-to-end qua trình duyệt thật (2 lần, cả `pkg` lẫn bản portable cuối cùng): xoá `data/data.db`, khởi động lại → 18 migration tự áp dụng → tự chuyển sang `setup.html` → tạo tài khoản → đăng nhập → dashboard trống hoạt động đúng. Dữ liệu dev/demo gốc đã backup ra `scratchpad` trước khi test và khôi phục lại đầy đủ sau đó.

**Phần 2 — Đóng gói: thử `pkg` trước, thất bại, đổi hướng (quyết định chính của mục này)**:
- **Thử `@yao-pkg/pkg`** (fork còn bảo trì của `pkg` gốc — `pkg` gốc của Vercel đã ngừng phát triển): build thành công, file `.exe` ~70MB chạy được cho các phần thuần JS. Nhưng **crash ngay khi gọi `new Database(...)` của `better-sqlite3`** (access violation `0xC0000005`), dù `require()` module vẫn thành công. Đã cô lập nguyên nhân bằng test tối giản: không phải lỗi code dự án (cùng module chạy đúng dưới `node` thường), không phải ABI Node version (crash giống hệt nhau ở cả target `node18-win-x64` và `node20-win-x64`), không phải `pkg` hỏng hoàn toàn (file `.exe` "hello world" chạy đúng). Kết luận: xung đột giữa cơ chế patch runtime của `pkg` và addon native N-API của `better-sqlite3` — giới hạn thuộc về `pkg`, không sửa được từ phía code dự án trong thời gian hợp lý.
- **Đã hỏi lại người dùng** giữa 2 hướng: tiếp tục mò `pkg`/thử Node SEA (rủi ro cao, không chắc thành công) hay chuyển sang thư mục "portable Node" (đáng tin cậy hơn, đã verify không lỗi, nhưng không che giấu mã nguồn backend — vẫn là file `.js` đọc được nếu có quyền truy cập filesystem máy chủ, giống hệt cách deploy PM2 thủ công hiện tại, không tệ hơn). **Người dùng chọn portable Node.**
- **Kiến trúc cuối cùng** (`scripts/build-portable.js`, chạy qua `npm run build:portable`): copy nguyên `backend/`, `frontend/`, `scripts/`, `node_modules/`, `package.json` + 1 bản `node.exe` lấy từ Node cài trên máy build, vào thư mục `dist/`. Không dùng snapshot/bytecode ảo của `pkg` nữa nên **không cần thay đổi cách `require()` module native** — đã revert lại `backend/nativeRequire.js` (file tạo ra khi làm theo hướng `pkg`, dùng `require(path.join(...))` động để né lỗi bundle của `pkg`) về `require('better-sqlite3')`/`require('bcrypt')` bình thường, vì portable-Node chạy file `.js` thật 100% giống hệt `npm start` trên máy dev, không có lớp ảo nào ở giữa.
- File `start.bat` (double-click chạy `node.exe backend\server.js`) là điểm vào cho người dùng cuối.
- Đã build + test thật (không chỉ đọc code): dùng `node.exe` bên trong `dist/` (không phải Node hệ thống) chạy với `data/` rỗng — xác nhận đúng luồng tự tạo DB → setup wizard → tạo tài khoản → đăng nhập → dashboard, y hệt luồng đã test ở Phần 1.

**Phần 3 — Tự động khởi động cùng Windows: Task Scheduler thay vì `node-windows`**:
- Đã hỏi lại người dùng giữa 2 cách: `node-windows` (đăng ký đúng nghĩa "Windows Service", hiện trong `services.msc`, nhưng cơ chế bên trong luôn chạy `node.exe <script>` — nghĩa là máy chủ vẫn phải cài Node.js **vĩnh viễn** để service này hoạt động, đi ngược một phần mục tiêu "không cần cài gì thêm" của bản đóng gói) và Task Scheduler (`schtasks`/`ScheduledTasks` module có sẵn trong Windows, không cần cài thêm gì, không đụng tới việc load module native nên không có rủi ro kỹu thuật tương tự `pkg`). **Người dùng không phản hồi câu hỏi này** (bỏ qua) — đã chủ động chọn Task Scheduler vì đây là phương án khuyến nghị và an toàn hơn, có nêu rõ lý do trước khi làm.
- `scripts/install-autostart.ps1`/`uninstall-autostart.ps1` (mới, copy kèm vào `dist/` khi build): đăng ký task chạy `node.exe backend\server.js` lúc khởi động máy (`AtStartup`, principal `SYSTEM`, tự khởi động lại tối đa 3 lần nếu crash). Chạy 1 lần bằng PowerShell quyền Administrator trên đúng máy chủ thật — **chưa** chạy thật trên máy chủ chính thức (máy đang thao tác vẫn là máy dev, xem quyết định Phase 5 bên dưới), chỉ mới verify logic bằng cách đọc kỹ + review, không đăng ký task thật trên máy dev (tránh thay đổi cấu hình hệ thống dùng chung ngoài phạm vi được yêu cầu rõ ràng).

## 2026-08-01 — Phase 5: chỉ làm phần độc lập máy chủ trên máy dev, để lại phần gắn máy thật

**Bối cảnh**: người dùng yêu cầu bắt đầu Phase 5 (Vận hành & Go-live). Kiểm tra `ipconfig` trên máy đang thao tác phát hiện đây là máy cá nhân/dev (card Wi-Fi, IP do DHCP cấp `192.168.3.14`, có adapter OpenVPN) — không phải máy chủ sẽ đặt cố định trong văn phòng theo đúng mô hình PRD ("một máy chủ chạy 24/7, các máy khác trong LAN truy cập qua IP nội bộ"). Đã hỏi lại và người dùng xác nhận **đây chỉ là máy dev**, việc đặt IP tĩnh/PM2 startup thật sẽ làm sau trên đúng máy chủ.

**Quyết định phạm vi**: tách Phase 5 thành 2 nhóm việc:
1. **Làm ngay, không phụ thuộc máy cụ thể** (code + tài liệu): `ecosystem.config.js`, `scripts/backup.js` + UI cấu hình đường dẫn backup, `docs/DEPLOY.md` (quy trình đầy đủ, viết sẵn để làm theo khi có máy chủ thật).
2. **Để lại khi có máy chủ thật**: đặt IP tĩnh, `pm2 start`/`pm2-startup install`/`pm2 save`, đặt Windows Task Scheduler chạy backup, test LAN nhiều máy, go-live.

**Các quyết định kỹ thuật cụ thể khi hiện thực hóa nhóm 1**:
- **Đường dẫn backup do người dùng tự chọn qua UI** (`warehouse_settings.backup_path`, migration `018`), không hardcode cố định trong `scripts/backup.js` — theo đúng yêu cầu người dùng ("cho phép người dùng chọn đường dẫn chứa file backup trên máy" khi được hỏi ở bước trước, xem lịch sử hội thoại). Trang "Cấu hình kho" có thêm nút "Backup ngay" để xác nhận cấu hình đúng ngay lập tức, không phải đợi đến giờ chạy lịch tự động mới biết có lỗi.
- **PM2 trên Windows dùng thêm gói `pm2-windows-startup`** — lệnh `pm2 startup` chính thức của PM2 chỉ hỗ trợ Linux/macOS (dùng systemd/launchd), không có hiệu lực trên Windows. `docs/DEPLOY.md` ghi rõ điều này để tránh làm theo hướng dẫn PM2 gốc không áp dụng được.
- **`SESSION_SECRET` không đặt trong `ecosystem.config.js`** (file commit vào git) — hướng dẫn đặt qua `setx` (biến môi trường hệ thống Windows) trong `docs/DEPLOY.md`, đúng nguyên tắc "không hardcode thông tin bí mật" của `CLAUDE.md`.
- **Backup dùng `wal_checkpoint(TRUNCATE)` trước khi copy file** — vì dự án bắt buộc WAL mode, dữ liệu mới nhất có thể còn nằm trong file `data.db-wal` chưa được ghi vào `data.db` chính; nếu copy trực tiếp không checkpoint có thể mất giao dịch gần nhất trong bản backup.

## 2026-08-01 — Module "Bảo hành" đổi từ trang riêng sang modal, vẽ lại card theo mẫu tham khảo

**Bối cảnh**: ngay sau khi làm xong module Bảo hành theo thiết kế "1 trang `warranty-detail.html` dùng chung cho thêm mới/sửa" (xem quyết định gốc bên dưới), người dùng phản hồi 3 điểm: (1) ô "Thời gian bảo hành" hiển thị mất cân đối, (2) muốn phần nhập liệu là **popup** giống mọi trang khác trong hệ thống thay vì trang riêng, (3) nghi ngờ tương tác 2 chiều Thời gian bảo hành ↔ Ngày hết hạn không hoạt động. Đã sửa cả 3:

- **Bỏ hẳn `warranty-detail.html`/`.js`**, chuyển thêm mới + sửa vào **modal trên `warranties.html`** (`#warranty-modal`) — đúng pattern list+modal dùng chung mọi nơi khác (`customers.html`, `partners.html`, `products.html`...). Vẫn hỗ trợ mở modal sẵn qua URL khi điều hướng từ `customer-detail.html`: `?customer_id=` (thêm mới, chọn sẵn khách hàng) và `?edit=` (sửa 1 bản ghi) — giữ được lợi ích điều hướng trực tiếp mà không cần trang riêng.
- **Sửa CSS mất cân đối**: ô số dùng chung class `.new-partner-inputs` (thiết kế cho nhiều ô text cùng loại, `flex:1` đều nhau) khiến ô số và ô chọn đơn vị co giãn sai tỷ lệ — tách class riêng `.warranty-duration-row` (ô số `flex:2`, ô chọn `flex:1` kèm `min-width`).
- **Xác nhận tương tác 2 chiều vẫn hoạt động đúng** (đã kiểm tra lại kỹ qua trình duyệt thật) — dữ liệu lỗi người dùng thấy trước đó (vd hạn "2078") là do 1 bug thật: trang `warranty-detail.html` cũ dùng `.page-header-actions` cho khu vực trạng thái, và class này lúc đó thiếu `:not([hidden])` (xem mục lỗi CSS bên dưới) — không liên quan trực tiếp đến logic tính toán nhưng có thể đã gây thao tác nhầm khi vùng ẩn/hiện sai. Trang mới (modal) không còn tái sử dụng `.page-header-actions` cho phần này nên không còn nguy cơ tương tự.
- **Vẽ lại card "Bảo hành" trên `customer-detail.html`** theo đúng mẫu ảnh người dùng cung cấp (dạng card danh sách công cụ nội bộ: icon vuông bo góc + tiêu đề/phụ đề, 2 dòng thông tin phụ, hàng dưới cùng là nhãn trạng thái (chữ màu, không nền) đối diện 1 số lớn nổi bật) — áp dụng cho "số ngày còn lại" thay vì giá trị tiền như mẫu gốc, màu icon/nhãn/số đồng bộ theo 1 trong 4 mức: còn hạn (xanh) / sắp hết hạn ≤30 ngày (cam) / hết hạn (đỏ) / vô hiệu hóa (xám).
- **Sửa lỗi 2 card "Thông tin công ty"/"Ghi chú in phiếu" dính nhau**: `.settings-card`/`.settings-columns` chưa từng có `margin-bottom`, chỉ tách nhau nhờ `.settings-section + .settings-section` (không áp dụng ở đây vì đây là 2 `.settings-card`, không phải `.settings-section`) — thêm `margin-bottom: 20px` cho cả 2 class, ảnh hưởng chung mọi trang dùng `.settings-card` (`company-settings.html`, `warehouse-settings.html`...).

### Quyết định gốc (đã thay đổi 1 phần, giữ lại để biết bối cảnh)

**Bối cảnh gốc**: người dùng yêu cầu module Bảo hành hoàn toàn mới, gắn với khách hàng, hiển thị "còn bao nhiêu ngày" trên giao diện chi tiết khách hàng — nhưng `customers.html` từ trước tới nay chỉ có danh sách + modal, **chưa từng có trang chi tiết riêng**. Một số quyết định thiết kế đưa ra khi hiện thực hóa (không hỏi lại vì đây là chi tiết trình bày, không phải quy tắc nghiệp vụ — spec gốc của người dùng đã rất đầy đủ):

- ~~**1 trang `warranty-detail.html` dùng chung cho cả "Thêm mới" lẫn "Xem/sửa"**~~ — **đã đổi thành modal, xem mục cập nhật phía trên.** (Lý do ban đầu: người dùng yêu cầu rõ "lưu thông tin thay đổi trên giao diện xem chi tiết bảo hành" — dùng chung 1 trang cho cả 2 chế độ tránh trùng lặp logic tính 2 chiều. Sau đó người dùng làm rõ ý muốn là popup như mọi nơi khác, không phải trang riêng.)
- **`phone`/`address` trên `warranties` là bản snapshot lúc tạo** (tự điền từ hồ sơ khách hàng nhưng lưu riêng, sửa được độc lập) — không tham chiếu trực tiếp `partners.phone`/`partners.address` mỗi lần hiển thị. Lý do: thông tin liên hệ tại thời điểm bảo hành (vd giao hàng) không nên tự đổi theo nếu sau này khách hàng cập nhật hồ sơ, giữ đúng lịch sử tại thời điểm phát sinh — nhất quán với cách `stock_issues`/`stock_receipts` không tự cập nhật giá theo hồ sơ sản phẩm mới.
- **"Còn lại bao nhiêu ngày" không lưu cột riêng** — luôn tính lại từ `expiry_date` tại thời điểm xem (`warrantyDaysRemaining()` trong `warranty-calc.js`), đúng nguyên tắc "không lưu giá trị suy ra được" xuyên suốt dự án (giống tồn kho/công nợ).
- **Tạo mới trang `customer-detail.html`** (ngoài phạm vi yêu cầu gốc nhưng cần thiết để có chỗ đặt "Card" theo đúng yêu cầu) — theo đúng pattern trang chi tiết đã có (`product-detail.html`): `initLayout('customers')` để sidebar vẫn sáng đúng mục "Khách hàng", nút "Xem chi tiết" mới thêm vào `customers.js`.
- **Xóa cứng chỉ Admin, không kiểm tra "đã có lịch sử"** (khác hẳn nguyên tắc chung của dự án — sản phẩm/đối tác/tài khoản đều cho xóa nếu CHƯA có lịch sử liên quan) — vì `warranties` không phải bảng ledger, không có bảng nào khác tham chiếu ngược `warranties.id`, nên không có khái niệm "đã có lịch sử" cần bảo vệ; giới hạn Admin chỉ vì người dùng yêu cầu rõ ràng.
- **Phát hiện lại đúng loại lỗi CSS `[hidden]` bị `display` đè** (đã từng sửa cho `.form-row`/`.modal-card` trong phiên trước) — lần này ở `.page-header-actions`/`.page-header-actions .btn-secondary`/`.empty-state`, hậu quả nghiêm trọng hơn các lần trước: nút "Xóa" bảo hành **hiện cho cả tài khoản không phải Admin** dù JS đã ẩn đúng (chỉ sai ở tầng trình bày, API vẫn chặn đúng 403 nên không lộ rủi ro bảo mật thật, nhưng gây nhầm lẫn UI). Bài học: **mọi rule CSS `display: ...` áp lên phần tử có thể bị JS set `hidden`, phải luôn kèm `:not([hidden])`** — không riêng gì các trường hợp đã phát hiện, cần lưu ý khi thêm rule mới trong tương lai.

## 2026-08-01 — "Điều chỉnh công nợ": sửa số dư sai không sửa/xóa phiếu gốc

**Bối cảnh**: người dùng hỏi cách xử lý khi nhập sai giá vốn trên phiếu nhập làm công nợ NCC bị sai theo. Cơ chế "phiếu điều chỉnh bù trừ" có sẵn (migration `010`) chỉ sửa được **tồn kho** (vì `stock_movements` có 2 chiều `in`/`out` triệt tiêu nhau) — không sửa được **công nợ**, vì `recordDebtFromDocument()` luôn ghi `type='no'` (tăng nợ) bất kể là phiếu nhập hay xuất; một phiếu bù trừ (dù là nhập hay xuất) sẽ **cộng thêm nợ** thay vì trừ, làm sai lệch nặng hơn.

**Quyết định**: xây riêng cơ chế "Điều chỉnh công nợ" (khác "Ghi nhận thanh toán" vốn không gắn với phiếu cụ thể, `reference_type='payment'`):
- Migration `016`: thêm `debt_ledger.is_adjustment` (cờ, không đổi CHECK constraint nào) — phân biệt dòng điều chỉnh thủ công với dòng tự động (`no`) và thanh toán thật (`tra`, `reference_type='payment'`).
- Cho phép chọn chiều điều chỉnh (`type='no'` tăng hoặc `'tra'` giảm) tùy theo sai lệch thực tế, **tùy chọn** liên kết về đúng phiếu nhập/xuất bị sai (`reference_type`/`reference_id`, tái dùng đúng 2 giá trị `receipt`/`issue` đã có, không thêm giá trị CHECK mới) để đối chiếu — **bắt buộc validate phiếu đó thuộc đúng đối tác** đang điều chỉnh, tránh liên kết nhầm.
- **Bắt buộc ghi lý do** (`note`) — khác `payment.note` vốn không bắt buộc, vì đây là sửa sai sót, cần giữ vết rõ ràng cho việc đối chiếu sau này.
- Route `GET /api/debts/documents?partner_id=` (mới) thay vì tái dùng `/api/stock-receipts`/`/api/stock-issues` cho combobox chọn phiếu gốc — 2 route đó đòi quyền `kho`, trong khi trang Công nợ chỉ đòi quyền `cong_no` (vd vai trò Kế toán không có `kho`), tái dùng sẽ gây 403 sai.
- Không thêm bảng/route riêng cho "khách hàng" vs "NCC" — dùng chung `debt.service.js`/`debts.routes.js`, chỉ khác UI (`debts.html` vs `customer-debts.html`, đã tách từ trước).

## 2026-08-01 — Tách Khách hàng khỏi Đối tác, thêm "Loại khách hàng"

**Bối cảnh**: người dùng phản ánh chưa có "quản lý khách hàng và công nợ khách hàng" — thực ra đã có (trang Đối tác/Công nợ gộp chung NCC+KH), nhưng người dùng muốn tách riêng hẳn để rõ ràng hơn, và cần phân loại khách hàng (vd VIP, Đại lý). Đã hỏi lại 3 câu hỏi trước khi code (theo CLAUDE.md — thay đổi kiến trúc/schema phải hỏi trước):

1. **Cấu trúc menu**: `frontend/partners.html` (đổi tên hiển thị "Đối tác" → "Nhà cung cấp") từ nay **chỉ quản lý NCC**, `type` luôn cố định `nha_cung_cap`, không còn chọn được. Khách hàng có trang riêng hoàn toàn mới `frontend/customers.html` (không tái dùng partners.html).
2. **Công nợ**: tách theo đúng cấu trúc trên — `debts.html` (đổi tên "Công nợ" → "Công nợ NCC") chỉ còn NCC; `customer-debts.html` (mới) chỉ công nợ khách hàng. Cả 2 dùng chung API `/api/debts/*` (đã hỗ trợ `?type=`), không tạo API riêng.
3. **Loại khách hàng**: bảng mới `customer_categories` (migration `015`) — tên + `debt_limit` (hạn mức công nợ, có thể để trống = không giới hạn). Chỉ áp dụng cho `partners.type='khach_hang'` (validate ở tầng API, không dùng CHECK constraint DB vì SQLite không so sánh được cột khác trong CHECK theo điều kiện gọn). **Hạn mức công nợ chỉ dùng để CẢNH BÁO trên trang Công nợ khách hàng — không chặn cứng** việc lập phiếu xuất công nợ mới (khác với `allow_negative_stock` vốn chặn cứng theo mặc định) — người dùng xác nhận rõ đây chỉ là công cụ theo dõi, không phải rào chắn nghiệp vụ.

**Không đổi**: API `POST/PUT /api/partners` vẫn dùng chung 1 route cho cả 2 loại đối tác (không tách route riêng `/api/customers`) — `category_id` chỉ có hiệu lực khi `type='khach_hang'`, NCC gửi lên sẽ bị bỏ qua (luôn lưu `NULL`). Tránh nhân đôi logic CRUD cho 2 bảng thực chất giống nhau.

## 2026-08-01 — Phase 4 hoàn thành: phạm vi Báo cáo, biểu đồ tự vẽ, ghi chú in phiếu cấu hình được

**Phạm vi trang Báo cáo**: PRD 4.6 chỉ ghi chung chung ("bảng; biểu đồ nếu cần") — đã hỏi lại và người dùng xác nhận: làm **dạng thẻ số liệu (card)** cho các số tổng, và **có biểu đồ** so sánh tăng trưởng mua hàng/bán hàng theo tháng so với tháng trước (khác với đề xuất ban đầu "chỉ làm bảng trước, biểu đồ để sau").

- **Không dùng Chart.js hay bất kỳ thư viện biểu đồ ngoài nào** — tự vẽ biểu đồ cột bằng SVG tay (`frontend/assets/reports.js`), nhất quán với nguyên tắc xuyên suốt dự án: không phụ thuộc CDN (đã áp dụng cho font từ Phase 1), không build step, tự vẽ SVG thay vì dùng thư viện (đã áp dụng cho icon từ `icons.js`). Đã tham khảo skill `dataviz` trước khi code (mark spec: cột bo góc chỉ ở đỉnh, 1 màu/biểu đồ không cần legend vì chỉ 1 chuỗi số liệu, nhãn %  tăng/giảm luôn kèm icon mũi tên không chỉ dựa màu).
- **Giá vốn dùng cho báo cáo tồn kho luôn là bình quân gia quyền** (`getWeightedAverageCost()`), **bất kể** `warehouse_settings.costing_method` hệ thống đang chọn là gì (kể cả khi đang chọn FIFO cho việc tính giá xuất kho). Lý do: đây là 2 khái niệm khác nhau — "giá trị TỒN KHO hiện tại" (báo cáo) luôn hợp lý khi tính theo giá bình quân của các lô còn lại, trong khi `costing_method` chỉ quyết định cách tính giá vốn ghi vào **từng phiếu xuất** khi hàng rời kho. Đã áp dụng cách tính này nhất quán với `product-detail.html` (đã dùng từ Phase 2).
- **`GET /api/stock-issues/:id/print` không cần code riêng** như dự tính ban đầu trong `docs/Plan.md` — trang in phiếu tái dùng thẳng `GET /api/stock-issues/:id` đã có sẵn đủ dữ liệu (`items`, `total_amount`, thông tin đối tác), chỉ cần bổ sung `partner_phone`/`partner_address` vào `SELECT_ISSUE`. Tránh trùng lặp code không cần thiết.
- **Ghi chú in phiếu (`company_settings.print_note`, migration `014`) là trường cấu hình được, không hardcode** — dù người dùng cung cấp ảnh mẫu thật và cho phép "lấy toàn bộ nội dung ghi chú trên hình cũng được", vẫn chọn lưu thành cột DB sửa được qua UI (trang Thông tin công ty) thay vì hardcode thẳng vào code, vì nội dung này (điều kiện bảo hành, chính sách đổi trả) là thông tin nghiệp vụ có thể thay đổi theo thời gian — nhất quán với triết lý "không hardcode" đã áp dụng cho mọi thông tin công ty khác từ Phase 1.6. Nội dung mẫu seed sẵn theo đúng ảnh, có 1 dòng bị cắt ở lề ảnh gốc đã suy đoán lại — cần người dùng xác nhận qua `docs/CURRENT.md`.

## 2026-07-31 — Kiến trúc nền tảng

- Backend: Node.js + Express, 1 process duy nhất, quản lý bằng PM2.
- Database: SQLite qua `better-sqlite3`, bắt buộc `PRAGMA journal_mode=WAL`.
- Schema thay đổi qua migration đánh version (không dùng `CREATE TABLE IF NOT EXISTS` đơn thuần), theo dõi qua bảng `schema_migrations`.
- Tồn kho/công nợ tính từ tổng cộng dồn (`stock_movements`, `debt_ledger`), không lưu số dư cố định.
- Mỗi phiếu nhập/xuất = 1 transaction duy nhất (phiếu + items + movements + debt nếu có).
- In phiếu: HTML + `@media print` + `window.print()`, không dùng PDF/ESC-POS.
- Triển khai: máy chủ IP tĩnh/DHCP reservation, PM2 với `pm2 startup` + `pm2 save` bắt buộc, backup `data.db` định kỳ.

## 2026-07-31 — Xử lý tồn kho không đủ khi xuất kho

**Quyết định**: Mặc định chặn cứng, không cho lập phiếu xuất nếu tồn kho không đủ.
Có cấu hình quản trị cho phép chuyển sang chế độ "xuất trước, nhập bù sau" (cho phép tồn kho âm tạm thời) khi được bật.
**Cập nhật 2026-08-01 — đã chốt phạm vi**: áp dụng **toàn hệ thống** (1 công tắc chung, không theo từng sản phẩm) ở giai đoạn này, vì bảng `products` chưa tồn tại khi làm Phase 1.6 (trước Phase 2). Lưu tại bảng `warehouse_settings` (key-value, key `allow_negative_stock`) — xem `docs/Plan.md` mục 2b/4 (Phase 1.6). Có thể nâng cấp lên cấu hình theo từng sản phẩm ở Phase 2 nếu thực tế cần, không coi đây là quyết định vĩnh viễn.

## 2026-07-31 — Công nợ phát sinh từ phiếu xuất

**Quyết định**: Phiếu xuất chỉ phát sinh dòng `debt_ledger` khi được đánh dấu "chưa thu tiền ngay". Cần thêm cột `payment_status` vào bảng `stock_issues` (chi tiết giá trị cột sẽ chốt khi thiết kế migration Phase 2/3).

## 2026-07-31 — Sửa/hủy phiếu đã tạo

**Quyết định**: Không cho sửa/xóa trực tiếp phiếu nhập/xuất đã tạo. Chỉ cho phép tạo phiếu điều chỉnh bù trừ (phiếu mới ghi ngược dấu) để giữ lịch sử đầy đủ, đúng nguyên tắc ledger đã chọn cho tồn kho/công nợ.

## 2026-07-31 — Cấu trúc tài liệu dự án

- `docs/` chứa toàn bộ tài liệu thiết kế và quản lý dự án: `PRD.md`, `Plan.md`, `erd.mermaid`, `CURRENT.md`, `TASK.md`, `CHANGELOG.md`, `DECISIONS.md`.
- `docs/handoff/` chứa các file handoff giữa các phiên làm việc — chỉ tạo file mới trong thư mục này khi người dùng yêu cầu, không tự động tạo.
- `.claude/docs/inventory-debt-ledger.md` giữ nguyên vị trí vì `CLAUDE.md` tham chiếu trực tiếp.

## 2026-07-31 — Chi tiết kỹ thuật phát sinh khi code Phase 1

- `express` cài về là bản 5.x (Plan.md chưa chốt version, npm lấy bản mới nhất tại thời điểm cài). Không ảnh hưởng các route dạng `:id` dự án dùng.
- Session dùng `express-session` với store mặc định (in-memory, lưu trong RAM của process). **Hạn chế cần lưu ý**: khi PM2 restart server (Phase 5), toàn bộ session đang đăng nhập sẽ mất, người dùng phải đăng nhập lại. Nếu muốn tránh gián đoạn này khi go-live, cần đổi sang session store bền hơn (ví dụ `connect-sqlite3` lưu session vào file) — **chưa chốt, sẽ hỏi lại người dùng khi vào Phase 5**.
- `SESSION_SECRET` đọc từ biến môi trường; nếu chưa cấu hình sẽ tự sinh ngẫu nhiên mỗi lần chạy (chỉ phù hợp dev/demo — khi deploy qua PM2 cần đặt cố định trong biến môi trường của process).

## 2026-07-31 — Chuẩn hóa thiết kế giao diện bằng skill ui-ux-pro-max

- **Quyết định**: từ giờ mọi trang giao diện phải dùng skill `ui-ux-pro-max` để thiết kế/tham khảo, và tuân theo `docs/DESIGN-SYSTEM.md` làm chuẩn chung (màu, font, style, icon) — không tự phá cách theo từng trang.
- Style chọn: **Soft UI Evolution** (hiện đại, chuyên nghiệp, thân thiện). Màu chủ đạo giữ nguyên xanh dương `#2563EB` theo lựa chọn trước đó của người dùng, bổ sung màu accent xanh lá `#059669` (trạng thái tích cực) và đỏ `#DC2626` (cảnh báo/hủy) lấy từ bảng màu "CRM & Client Management" của skill.
- Font tiêu đề ban đầu chọn Poppins nhưng phát hiện **không có subset tiếng Việt đầy đủ** (thiếu `U+1EA0-1EF1`) — đã đổi sang **Be Vietnam Pro** (đã xác minh có subset `vietnamese` đầy đủ `U+1EA0-1EF9`). Body giữ Open Sans (cũng có subset tiếng Việt đầy đủ).
- **Font host offline**: theo yêu cầu người dùng (đồng nhất trên mọi máy, không phụ thuộc internet khi chạy LAN nội bộ), đã tải file `.woff2` (subset vietnamese/latin/latin-ext, các weight đang dùng) về `frontend/assets/fonts/`, nạp qua `fonts.css` tự sinh — không còn gọi ra Google Fonts CDN.
- Icon: bỏ hoàn toàn emoji, dùng SVG outline viết tay (không có build step/npm nên không import package icon) — theo đúng khuyến nghị "no-emoji-icons" của skill.

## 2026-07-31 — Bổ sung Phase 1.5: Quản trị người dùng & Phân quyền

**Quyết định**: chèn thêm một phase mới (Phase 1.5) giữa Phase 1 và Phase 2 để xây dựng chức năng quản lý người dùng (danh sách, tạo tài khoản theo vai trò, khóa/mở) và trang quản trị tương ứng.
**Lý do**: các route `/api/users/*` đã được thiết kế sẵn trong `docs/Plan.md` mục 3 (API Endpoints) nhưng bị bỏ sót, chưa từng gán vào checklist theo phase nào. Hiện tại cách duy nhất để tạo tài khoản là chạy script `seed:admin` qua dòng lệnh (chỉ tạo được role admin) — không đủ để test Phase 2/3 với tài khoản Thủ kho/Kế toán thật theo đúng phân quyền.
**Phạm vi**: xem chi tiết tại `docs/Plan.md` mục 4 (Phase 1.5) và `docs/TASK.md`.
**Sửa thiếu sót**: ban đầu chỉ cập nhật Plan/Task, quên đồng bộ `docs/PRD.md` (tài liệu yêu cầu nghiệp vụ gốc). Đã bổ sung mô tả đầy đủ tính năng "Quản lý tài khoản người dùng" vào PRD mục 4.1, gồm quy tắc không xóa cứng tài khoản (chỉ khóa, để giữ truy vết `created_by` trên phiếu nhập/xuất) và không có self sign-up.

## 2026-08-01 — Bổ sung Phase 1.6: Vai trò động & Cấu hình hệ thống

**Bối cảnh**: người dùng yêu cầu 4 tính năng tiếp theo: (1) phân quyền động (tạo vai trò mới, gán quyền theo vai trò), (2) thông tin công ty (dùng cho mẫu in), (3) menu "Cấu hình kho", (4) menu "Cấu hình bán hàng". Đã hỏi lại 3 điểm mấu chốt trước khi lên kế hoạch:

- **Độ chi tiết phân quyền**: chốt **theo module** (không chi tiết theo hành động xem/tạo/sửa/xóa) — đơn giản, đủ dùng cho quy mô dưới 20 người dùng. Có thể nâng cấp lên chi tiết hơn sau nếu cần.
- **Vai trò Admin**: chốt là vai trò đặc biệt, cố định toàn quyền, không sửa tên/xóa/đổi quyền được (`is_protected` trong DB) — tránh rủi ro tự khóa quyền quản trị hệ thống. Kế toán/Thủ kho vẫn là dữ liệu seed mặc định, sửa/xóa được như vai trò tự tạo.
- **"Cấu hình bán hàng"**: xác nhận đây là **module Bán hàng/POS hoàn toàn mới**, chưa từng mô tả trong PRD gốc. **Quyết định tách phạm vi**: Phase 1.6 chỉ tạo khung menu trống cho mục này; toàn bộ yêu cầu nghiệp vụ của module Bán hàng/POS (có thay thế "xuất kho" không, ai dùng, có giỏ hàng/thanh toán tại quầy không...) sẽ bàn trong một phiên trao đổi yêu cầu riêng, làm sau khi xong Phase 2 (Kho) và Phase 3 (Công nợ) — không đoán/tự suy diễn yêu cầu nghiệp vụ này.

**Phạm vi đã lên kế hoạch**: xem `docs/Plan.md` mục 2b (thiết kế phân quyền động) và mục 4 (Phase 1.6), `docs/PRD.md` mục 4.1/4.7/4.8/4.9.

## 2026-08-01 — Phase 1.6 hoàn thành: bổ sung trường Thông tin công ty + chuẩn hóa UI cấu hình

**Bổ sung trường ngoài phạm vi PRD gốc**: người dùng yêu cầu thêm Email, Website, Chi nhánh ngân hàng, và đổi Số điện thoại từ 1 giá trị sang nhập được nhiều số (từ 2 trở lên). Đã cập nhật `docs/PRD.md` mục 4.7, `docs/Plan.md` mục 2, `docs/erd.mermaid`.
**Quyết định kỹ thuật**: `phones` lưu dạng mảng JSON trong 1 cột TEXT của `company_settings` (không tách bảng `company_phones` riêng) — vì luôn gắn 1-1 với đúng 1 dòng `company_settings` duy nhất, không cần quan hệ/join. Migration `004_company_settings_extra_fields.sql` dùng `ALTER TABLE ... ADD COLUMN` + `DROP COLUMN` trực tiếp (SQLite bundled trong `better-sqlite3` là bản 3.53, hỗ trợ đầy đủ) — không cần tạo bảng mới/copy dữ liệu như cách làm ở migration 002 (khi đó cần đổi kiểu + ràng buộc FK, phức tạp hơn).

**Chuẩn hóa layout trang cấu hình**: sau khi lặp lại nhiều lần trên `warehouse-settings.html` (dòng cấu hình quá to → thu gọn + thêm nhóm tiêu đề → mỗi dòng cần khung viền bo góc riêng để phân định rõ), đã chốt pattern dùng chung cho mọi trang cấu hình sau này — chi tiết xem `docs/DESIGN-SYSTEM.md` mục "Trang cấu hình (settings)". Quy tắc quan trọng nhất: **mọi cấu hình chỉ áp dụng sau khi bấm nút Lưu**, không tự động lưu khi thao tác.

**Bài học lưới chọn nhiều mục**: chip tự co giãn + bo tròn hết cỡ (`border-radius: 999px`) gây lệch hình dạng giữa nhãn ngắn/dài — chốt dùng lưới ô đều nhau (`grid-template-columns: repeat(auto-fill, minmax(...px, 1fr))`) cho mọi trường hợp chọn nhiều mục cùng loại trong tương lai (vd nếu Phase 2 cần chọn nhiều sản phẩm/tag). Chi tiết xem `docs/DESIGN-SYSTEM.md`.

## 2026-08-01 — Gộp bảng `partners` sớm vào migration Phase 2

**Quyết định**: bảng `partners` (đối tác — nhà cung cấp/khách hàng) được tạo **cùng migration Phase 2** (cùng với `products`, `stock_receipts`, `stock_receipt_items`, `stock_issues`, `stock_issue_items`, `stock_movements`) thay vì đợi tới migration Phase 3 như `Plan.md`/`TASK.md` từng ghi.
**Lý do**: `stock_receipts`/`stock_issues` cần FK `partner_id` ngay từ Phase 2 (phiếu nhập gắn nhà cung cấp, phiếu xuất gắn khách hàng) — tạo bảng `partners` cùng lúc tránh phải sửa schema `stock_receipts`/`stock_issues` thêm 1 lần nữa ở Phase 3 chỉ để thêm FK.
**Phạm vi gộp**: chỉ migration (bảng `partners` + FK từ `stock_receipts`/`stock_issues`). **Không** gộp API (`/api/partners`) hay frontend (`partners.html`) — 2 phần đó vẫn ở Phase 3 như kế hoạch gốc, cùng với `debt_ledger` và `debt.service.js`.
**Xác nhận lại 2026-08-01 (phiên sau)**: người dùng xác nhận quyết định này đã chốt đúng như trên, đồng bộ vào `Plan.md`/`TASK.md` trước khi bắt đầu code Phase 2.

## 2026-07-31 — Phase 2: trang Danh mục sản phẩm (vô hiệu hóa/xóa, tồn kho thấp)

**Bối cảnh**: khi làm trang `products.html`, người dùng yêu cầu thêm 3 việc ngoài CRUD cơ bản đã lên kế hoạch: (1) vô hiệu hóa dành cho người dùng thường, xóa cứng chỉ Admin, (2) tìm kiếm + cảnh báo tồn kho thấp + sắp xếp theo tồn kho, (3) trường bắt buộc khi tạo sản phẩm.

- **Trường bắt buộc**: `code`/`name`/`unit`/`sale_price` bắt buộc; `cost_price`/`low_stock_threshold` tùy chọn (mặc định 0).
- **Vô hiệu hóa** (`products.is_active`, migration `006_products_is_active.sql`): quyền module `kho` (không riêng Admin). Sản phẩm vô hiệu hóa **vẫn hiển thị** trong danh sách (kèm badge "Ngừng kinh doanh"), chỉ không chọn được khi lập phiếu nhập/xuất mới (chặn ở cả `stockReceipt.service.js` và `stockIssue.service.js`, không chỉ ẩn ở dropdown frontend).
- **Xóa cứng**: chỉ Admin (`req.session.user.is_protected`), và chỉ khi sản phẩm **chưa từng có dòng nào trong `stock_movements`** — nếu đã có lịch sử, chặn xóa và báo chỉ vô hiệu hóa được (giữ đúng nguyên tắc lịch sử ledger của `CLAUDE.md`).
- **UI**: cảnh báo tồn kho thấp dùng màu amber riêng (`--color-warning: #b45309`) + icon, khác hẳn màu xám của badge "Ngừng kinh doanh" để không lẫn khi cả 2 cùng xuất hiện 1 dòng. Nút "Thêm X" đầu trang đổi từ `.icon-btn` (viền mờ) sang `.btn-add` (nền gradient xanh đậm) — áp dụng đồng bộ cho cả `users.html`/`roles.html` theo yêu cầu người dùng, tránh 3 trang lệch phong cách.

## 2026-07-31 — Phase 2: giá vốn sản phẩm (bình quân gia quyền / FIFO)

**Bối cảnh**: người dùng đặt vấn đề giá vốn thay đổi mỗi lần nhập hàng (giá mua khác nhau giữa các lần) cần giải quyết thế nào cho đúng.

**Quyết định**: hỗ trợ **2 phương pháp**, chọn được qua **Cấu hình kho** (`warehouse_settings.costing_method`, giá trị `'binh_quan_gia_quyen'` mặc định hoặc `'fifo'`):
- **Bình quân gia quyền**: tính **on-the-fly** (không lưu số cố định) từ các lô hàng (`stock_lots`) còn tồn — `SUM(quantity_remaining * unit_cost) / SUM(quantity_remaining)`. Xuất hàng không làm đổi giá bình quân của phần còn lại (perpetual moving average).
- **FIFO**: `stock_lots` theo dõi từng lô nhập riêng (giá + số lượng còn lại), khi xuất kho trừ dần theo lô cũ nhất trước.
- **`stock_lots` luôn được duy trì và trừ dần theo đúng thứ tự cũ nhất trước** (FIFO vật lý) **bất kể đang chọn phương pháp nào** — lô hàng là sự thật vật lý (nhập lúc nào, giá bao nhiêu, còn lại bao nhiêu), còn `costing_method` chỉ quyết định **cách tính** giá vốn ghi vào phiếu xuất để báo cáo (bình quân toàn bộ tồn, hay đúng giá các lô bị trừ).
- **Snapshot giá vốn**: mỗi dòng `stock_movements` lưu `unit_cost` tại đúng thời điểm phát sinh (migration `007_costing_and_product_history.sql`) — không tính lại theo cấu hình hiện tại, tránh báo cáo quá khứ bị đổi ngược khi người dùng đổi `costing_method` sau này.
- **Chiết khấu phiếu nhập ảnh hưởng giá vốn**: chiết khấu theo % từng dòng (migration `008_receipt_discount.sql`, cột `stock_receipt_items.discount_percent`) — giá vốn ghi vào `stock_lots`/`stock_movements` là **giá sau chiết khấu (net)** = `unit_price * (1 - discount_percent/100)`; `unit_price` trong `stock_receipt_items` vẫn giữ giá gốc để đối chiếu hóa đơn NCC. Chiết khấu tổng đơn (áp dụng toàn phiếu, ngoài chiết khấu từng dòng) **để sau, chưa làm**.
- **Thời gian nhập kho tùy chỉnh**: cho phép chọn ngày/giờ khác lúc bấm lưu (ô "Thời gian nhập" trên form) — giá trị này dùng làm `created_at` **thật** cho phiếu + toàn bộ `stock_receipt_items`/`stock_movements`/`stock_lots` liên quan, **ảnh hưởng trực tiếp thứ tự tiêu thụ FIFO và tính bình quân gia quyền** (lô nhập ghi ngày sớm hơn được coi là lô cũ hơn, tiêu thụ trước) — đây là chủ đích, không phải tác dụng phụ, vì phản ánh đúng thời điểm hàng thực tế về kho hơn là thời điểm nhập liệu vào hệ thống.
- **Mã đơn hàng** (`stock_receipts.order_code`, migration `009_receipt_order_code.sql`): trường tự do, không bắt buộc, dùng ghi số hóa đơn/đơn hàng của NCC để đối chiếu — khác với `code` nội bộ hệ thống tự sinh (`PN000001`...).
- Đã test kỹ bằng số liệu thật qua curl + trình duyệt (2 lô giá khác nhau → bình quân đúng công thức; chuyển FIFO → xuất đúng giá lô cũ nhất; chiết khấu 10% → giá vốn giảm đúng tỷ lệ).

## 2026-07-31 — Phase 2: trang chi tiết sản phẩm (lịch sử nhập/xuất + lịch sử chỉnh sửa)

**Quyết định**: thêm trang `product-detail.html` (link từ icon "mắt" trên `products.html`) hiển thị 2 loại lịch sử:
- **Lịch sử nhập/xuất kho**: lấy trực tiếp từ `stock_movements` (đã có sẵn), kèm mã phiếu gốc + giá vốn snapshot từng lần.
- **Lịch sử chỉnh sửa thông tin sản phẩm**: bảng mới `product_change_log` (migration `007`, cùng đợt với giá vốn) — ghi lại field nào đổi, giá trị cũ/mới, ai sửa, lúc nào — chỉ ghi khi `PUT /api/products/:id` thực sự làm thay đổi giá trị (so sánh trước khi update).

## 2026-07-31 — Phase 2: API đối tác rút gọn (quick-add) + quyền tạo đối tác

**Bối cảnh**: form lập phiếu nhập kho cần chọn/thêm nhanh nhà cung cấp, nhưng trang quản lý đối tác đầy đủ vẫn ở Phase 3 (theo quyết định gộp `partners` trước đó — xem mục 2026-08-01 "Gộp bảng `partners`").

**Quyết định**:
- Tạo `backend/routes/partners.routes.js` **phiên bản rút gọn**: chỉ `GET /api/partners?type=` (danh sách) + `POST /api/partners` (tạo nhanh) — CRUD đầy đủ (sửa/xóa, trang `partners.html` quản lý riêng) vẫn để Phase 3.
- **Quyền tạo đối tác**: ban đầu `docs/Plan.md` gán module `cong_no` cho `POST /api/partners`, nhưng người thực hiện thao tác "thêm nhanh NCC" thực tế là thủ kho (quyền `kho`), không phải kế toán. **Chốt lại**: cho phép **1 trong 2 quyền `kho` hoặc `cong_no`** — thêm middleware mới `requireAnyPermission(moduleKeys)` (file `backend/middleware/requirePermission.js`, chỉ thêm hàm mới, không đổi `requirePermission` cũ) để hỗ trợ trường hợp này. Cần cập nhật lại `docs/Plan.md` mục 3 (API Endpoints) cho khớp.

## 2026-07-31 — Quy tắc bố cục form (form-row): ghép trường ngắn theo chiều ngang

**Quyết định**: khi thiết kế form nhập liệu mới, các trường ngắn (ngày giờ, mã, dropdown, text ngắn) nên ghép 2 trường/dòng theo chiều ngang (class `.form-row` mới trong `style.css`) thay vì luôn xếp dọc từng trường — tránh form bị kéo dài quá mức. Chỉ giữ 1 trường/dòng khi nội dung thực sự cần toàn bộ chiều rộng (ghi chú dài, bảng dòng sản phẩm động). Đã áp dụng lại cho `stock-receipts.html` (Nhà cung cấp+Thời gian nhập, Mã đơn hàng+Ghi chú). Áp dụng cho mọi form từ giờ trở đi — chi tiết xem `docs/DESIGN-SYSTEM.md`.

## 2026-07-31 — Phase 2 hoàn thành: Xuất kho, modal xem chi tiết phiếu, sửa/xóa người dùng

- **Xuất kho — đối tác khách hàng**: dùng đúng cơ chế dropdown + "thêm nhanh" giống hệt NCC ở phiếu nhập (chỉ đổi `type='khach_hang'`, dùng chung `GET/POST /api/partners`) — người dùng xác nhận sau 2 lần hỏi.
- **Xuất kho — hiển thị `payment_status`**: chốt dùng 1 toggle đơn "Chưa thu tiền ngay" (mặc định tắt = `da_thu_tien`), tái dùng nguyên pattern `.switch`/`.setting-row` đã có ở trang Cấu hình kho — không dùng 2 radio ngang hàng.
- **Modal xem chi tiết phiếu nhập kho**: thêm theo yêu cầu người dùng (ngoài kế hoạch gốc), gắn ở cả `stock-receipts.html` và `product-detail.html` (bấm mã phiếu **nhập** trong lịch sử). Ban đầu quyết định chưa làm modal tương tự cho phiếu **xuất** — sau đó người dùng yêu cầu bổ sung ngay trong cùng phiên làm việc (trước khi chuyển Phase 3), xem mục "Modal xem chi tiết phiếu xuất kho" bên dưới.

## 2026-07-31 — Bổ sung modal xem chi tiết phiếu xuất kho (đối xứng với phiếu nhập)

**Quyết định**: thêm `frontend/assets/issue-detail.js` (cấu trúc giống hệt `receipt-detail.js`) — gắn ở cả `stock-issues.html` (icon "mắt" trên từng dòng) và `product-detail.html` (bấm mã phiếu **xuất** trong lịch sử, trước đó là text thường). Backend chỉ cần bổ sung `total_amount` vào `GET /api/stock-issues/:id` (route đã có sẵn cấu trúc trả `items`/`adjusts_code`/`adjusted_by` từ trước, chỉ thiếu tổng tiền).
- **Sửa/xóa người dùng**: người dùng ban đầu yêu cầu cả xóa phiếu nhập kho + vô hiệu hóa phiếu nhập kho, nhưng đã rút lại 2 yêu cầu đó sau khi được cảnh báo mâu thuẫn với nguyên tắc "không sửa/xóa trực tiếp phiếu nhập/xuất" ở `CLAUDE.md` và rủi ro dữ liệu khi lô hàng đã bị tiêu thụ một phần qua FIFO — **giữ nguyên nguyên tắc cũ, không code phần này**. Chỉ làm sửa/xóa **người dùng**: sửa (họ tên/vai trò/mật khẩu, không đổi username, chặn tự đổi vai trò chính mình) và xóa cứng (chỉ Admin, chặn nếu tài khoản đã có lịch sử tạo/sửa dữ liệu) — áp dụng đúng nguyên tắc xóa giống hệt cách đã làm với sản phẩm.

## 2026-07-31 — Phase 2 hoàn thành: cơ chế phiếu điều chỉnh bù trừ

**Quyết định**: không tạo bảng/loại phiếu riêng cho "phiếu điều chỉnh" — tận dụng đúng phiếu nhập/xuất đã có (`stock_receipts`/`stock_issues`), thêm 2 cột nullable `adjusts_type` (`'receipt'`/`'issue'`)/`adjusts_id` trên cả 2 bảng (migration `010`) để đánh dấu phiếu này là điều chỉnh cho phiếu nào — đúng tinh thần "phiếu mới ghi ngược dấu" đã chốt trước đó, không sửa/xóa phiếu gốc.

- **Không giới hạn hướng bù trừ**: phiếu nhập sai có thể được bù bằng 1 phiếu nhập khác (nhập thiếu) hoặc 1 phiếu xuất (nhập dư) — và tương tự với phiếu xuất sai. Vì vậy trường "Điều chỉnh cho phiếu" trên cả 2 form lập phiếu đều tìm được cả mã PN lẫn PX (không giới hạn theo loại phiếu đang lập).
- **Quyền**: dùng chung quyền `kho` như lập phiếu bình thường, không thêm quyền riêng.
- **Hiển thị**: badge "Điều chỉnh {mã}" trên danh sách phiếu (cả nhập lẫn xuất); modal chi tiết phiếu nhập (đã có) hiển thị thêm 2 dòng nếu có dữ liệu — "Điều chỉnh cho phiếu" (chiều thuận) và "Được điều chỉnh bởi" (chiều ngược, tra bằng UNION 2 bảng vì không biết trước phiếu điều chỉnh là loại nào). Phiếu xuất không có modal chi tiết nên chưa hiển thị được 2 thông tin này ở trang Xuất kho — chấp nhận giới hạn này, nhất quán với quyết định không mở rộng modal chi tiết sang phiếu xuất ở mục trên.

## 2026-07-31 — Phát hiện lỗ hổng thiết kế trước khi vào Phase 3: thiếu `payment_status` trên `stock_receipts`

**Bối cảnh**: chuẩn bị code Phase 3 (Công nợ), đọc lại `docs/erd.mermaid`/`docs/Plan.md` theo đúng quy trình bắt buộc thì phát hiện bảng `stock_receipts` không có cột `payment_status` như `stock_issues` — nghĩa là schema hiện tại chỉ có chỗ lưu công nợ **phải thu** (khách hàng chưa trả tiền khi mua qua phiếu xuất), chưa có chỗ lưu công nợ **phải trả NCC** (chưa trả tiền khi nhập hàng qua phiếu nhập), dù `docs/PRD.md` mục 4.4 yêu cầu rõ "theo dõi riêng công nợ phải trả (NCC) và phải thu (khách hàng)".

**Trạng thái**: đã chốt và code xong — xem mục "Phase 3 hoàn thành: công nợ phải trả NCC + sổ cái công nợ" bên dưới.

## 2026-07-31 — Phase 3 hoàn thành: công nợ phải trả NCC + sổ cái công nợ

**Bối cảnh**: phát hiện `stock_receipts` thiếu `payment_status` khi chuẩn bị Phase 3 (xem mục "Phát hiện lỗ hổng thiết kế" bên dưới). Đã trình bày hướng xử lý và người dùng xác nhận đúng hướng.

- **`stock_receipts.payment_status`** (migration `011`): giá trị `da_thanh_toan`/`cong_no` — **đặt tên khác** `stock_issues.payment_status` (`da_thu_tien`/`cong_no`) dù cùng ý nghĩa "đã xử lý xong tiền hay chưa", vì đúng ngữ nghĩa chiều tiền khác nhau (mình trả NCC vs khách trả mình), tránh gây hiểu nhầm khi đọc code/dữ liệu.
- **`debt_ledger`** (migration `012`): `type='no'` luôn làm tăng số dư bất kể đối tác là NCC hay khách hàng — không dùng 2 field/2 dấu riêng cho 2 chiều. Ý nghĩa số dư diễn giải theo `partners.type`: NCC → số dư là khoản **mình còn phải trả họ**; khách hàng → số dư là khoản **họ còn phải trả mình**. `type='tra'` luôn làm giảm số dư (thanh toán, dùng chung cho cả 2 chiều).
- **Ghi nợ tự động nằm trong transaction tạo phiếu**: `debt.service.js` không tự mở transaction — hàm `recordDebtFromDocument()` được gọi bên trong transaction có sẵn của `stockReceipt.service.js`/`stockIssue.service.js`, đúng nguyên tắc "1 phiếu = 1 transaction" đã chốt từ đầu dự án (phiếu + items + movements + nợ phát sinh cùng thành công hoặc cùng rollback).
- **Bắt buộc có đối tác khi đánh dấu công nợ**: phiếu nhập/xuất `payment_status='cong_no'` mà không chọn đối tác (`partner_id` rỗng) bị chặn 400 ngay ở service — không thể ghi nợ cho đối tượng không xác định.
- **Ghi nhận thanh toán không gắn với 1 khoản nợ cụ thể**: cho phép trả từng phần tùy ý, không cần chọn đúng phiếu nào đang trả — đúng tinh thần ledger tổng theo đối tác (không theo dõi từng khoản nợ riêng lẻ như hóa đơn).
- **`created_by` trên `debt_ledger`**: bổ sung thêm so với draft gốc trong `docs/Plan.md` mục 2 — để nhất quán với các bảng ghi dữ liệu khác trong dự án (`stock_receipts`, `stock_issues`, `product_change_log` đều có cột này để truy vết).
- **Quyền quản lý đối tác đầy đủ**: `PUT`/`DELETE /api/partners/:id` chỉ quyền `cong_no` (khác `POST` "thêm nhanh" lúc lập phiếu vẫn dùng chung `kho` **hoặc** `cong_no` như đã chốt ở Phase 2) — vì đây là chức năng quản lý dữ liệu gốc đối tác, thuộc phạm vi module Công nợ theo `docs/Plan.md`.
- **Không cho đổi "Loại đối tác" (NCC/khách hàng) sau khi tạo**: tránh đối tác đã có lịch sử phiếu nhập/xuất bị đổi nhập nhằng giữa 2 loại, gây sai lệch báo cáo/diễn giải số dư.

## Open questions — chưa chốt

Xem chi tiết tại `docs/PRD.md` mục 10 và `.claude/docs/inventory-debt-ledger.md` mục "Edge case":

- **Module Bán hàng/POS** — cần buổi trao đổi yêu cầu nghiệp vụ riêng trước khi lên kế hoạch kỹ thuật (xem mục ngay trên). Làm sau Phase 2/3.
- Có cần export báo cáo ra Excel/PDF không, hay xem trực tiếp trên web là đủ?
- Máy chủ có chạy 24/7 thực tế không, hay thường tắt ngoài giờ làm việc?
- Có kế hoạch mở rộng nhiều kho/chi nhánh trong tương lai không?
