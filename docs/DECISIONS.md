# Quyết định kiến trúc & nghiệp vụ

> Ghi lại các quyết định đã chốt để không thảo luận lại trừ khi có lý do mới. Mỗi mục ghi ngày chốt.

## 2026-08-05 — Sửa trang Báo cáo: chiều cao khung tiền/biểu đồ dùng SVG cố định thay vì CSS stretch

**Bối cảnh**: người dùng phản hồi kèm ảnh chụp 3 lỗi ở `reports.html`: bảng tồn kho quá dài (không phân trang), số tiền lớn ở khung "Mua/Bán hàng tháng này" xuống dòng xấu, khung số tiền và biểu đồ cột cao thấp lệch nhau. Đã dùng skill `ui-ux-pro-max` trước khi code component phân trang (UI pattern mới trong dự án).

**Quyết định kỹ thuật quan trọng nhất — khớp chiều cao khung/biểu đồ**: đã thử lần lượt 2 cách trước khi tìm ra cách đúng:
1. **CSS Grid + `align-items:stretch`** (cách ban đầu) — không hoạt động: `stretch` chỉ kéo box ngoài cùng của `.stat-grid` cao bằng biểu đồ, nhưng bên trong `.stat-grid` là 1 grid con với 1 dòng `auto` không tự giãn theo, để lại khoảng trống mà viền `.stat-card` không phủ tới (đã đo bằng `getBoundingClientRect()` qua CDP xác nhận).
2. **Đổi sang Flexbox lồng nhau + `align-items:stretch`** — vẫn không ổn định: `.report-chart-svg` dùng `height:auto` (giữ tỉ lệ theo viewBox 560×200) nên chiều cao THẬT của `.chart-card` phụ thuộc **bề rộng được cấp**, không cố định. Khi 2 khung cùng stretch lẫn nhau, mỗi lần đo/gán lại tạo ra kết quả khác (đã đo qua CDP thấy số liệu nhảy 108→132→156→86 qua các lần thử, không hội tụ).
3. **Cách đúng, cuối cùng**: đổi `.report-chart-svg` sang chiều cao **cố định 200px** (bỏ hẳn `height:auto`) — SVG tự giữ tỉ lệ viewBox bên trong khung cố định (letterbox nếu cần), không còn phụ thuộc bề rộng màn hình. Khi đó `.chart-card` có chiều cao ổn định tuyệt đối (200 + padding + border = 226px), chỉ cần đặt `min-height: 226px` tĩnh cho `.report-chart-row .stat-grid` là khớp chính xác — không cần JS đo lường, không cần stretch. Đã verify qua CDP: lệch 0px.
- **Bài học chung**: khi 1 phần tử có kích thước phụ thuộc tỉ lệ/nội dung động (SVG giữ aspect ratio, text dài ngắn khác nhau...), đừng cố "stretch" nó khớp phần tử khác bằng CSS suy luận qua nhiều tầng lồng nhau — cách chắc chắn nhất là cố định kích thước phần biến động trước, rồi khớp phần còn lại theo đúng con số cố định đó.

**Các quyết định khác**:
- **Số tiền lớn không xuống dòng**: giảm cỡ chữ `.stat-card-value` xuống 21px (chỉ trong `.report-chart-row`, không ảnh hưởng nơi khác đang dùng cỡ 26px mặc định) + `white-space:nowrap`. Vẫn giữ `overflow:hidden`/`text-overflow:ellipsis` làm lưới an toàn cuối cùng cho trường hợp cực đoan (hàng chục tỷ trở lên) thay vì để tràn/xuống dòng, kèm `title` đầy đủ qua hover — chấp nhận đánh đổi nhỏ (hiếm khi xảy ra ở quy mô doanh nghiệp nhỏ) để đổi lấy bố cục không bao giờ vỡ.
- **Phân trang bảng tồn kho (15 dòng/trang)**: component `.pagination` mới hoàn toàn trong dự án (chưa từng có UI pattern phân trang trước đây) — làm client-side (dữ liệu tải hết 1 lần, chỉ cắt mảng khi đổi trang), không gọi lại API mỗi lần chuyển trang vì số sản phẩm ở quy mô dự án này không lớn tới mức cần phân trang phía server.

## 2026-08-05 — Hệ thống thông báo: tiếp tục sau khi tạm dừng — sinh nhật dùng "Đối tác" (contacts) thay vì "Khách hàng" (partners), bỏ gate quét theo ngày, thêm popup toast realtime giả lập

**Bối cảnh**: sau khi tạm dừng (xem quyết định 7 điểm bên dưới) để ưu tiên làm module "Đối tác" trước, người dùng quay lại yêu cầu làm tiếp với phạm vi cụ thể hơn nhiều so với lúc tạm dừng — không hỏi lại các quyết định đã chốt, chỉ hỏi/quyết thêm phần mới phát sinh:

1. **"Sinh nhật đối tác" dùng bảng `contacts` (module "Đối tác" vừa làm xong), KHÔNG dùng `partners.date_of_birth` như dự tính ban đầu lúc tạm dừng** — vì `contacts` đã có sẵn `date_of_birth` từ trước, không cần thêm migration cho `partners` nữa. Đây là thay đổi tự nhiên phát sinh từ việc module "Đối tác" đã hoàn thành ở giữa 2 lần làm thông báo.
2. **3 loại thông báo cụ thể lần này**: thanh toán công nợ NCC, thanh toán công nợ khách hàng (cả 2 hook vào `debt.service.js#recordPayment()` — điểm chạm duy nhất cho cả 2 hướng NCC/KH), sinh nhật đối tác.
3. **Nhiều mốc nhắc lịch sinh nhật cấu hình được** (không phải 1 số ngày cố định) — vd "trước 3 ngày" + "trước 1 ngày" + "đúng ngày" cùng lúc, lưu dạng CSV (`birthday_reminder_days`, vd `"3,1,0"`) trong `notification_settings`, parse thành mảng khi dùng.
4. **Card "Sinh nhật trong tháng" ở Tổng quan** — mở cho **mọi tài khoản** (không đòi quyền `doi_tac`) vì đây là tiện ích chung, khác hẳn trang danh sách "Đối tác" đầy đủ (đòi quyền `doi_tac`). Route riêng `GET /contacts/birthdays-this-month` tách khỏi `GET /contacts` để phục vụ đúng mức mở này — theo đúng tiền lệ đã dùng ở `/api/partners/staff`/`/api/cash-vouchers/staff` (mở 1 route con hẹp cho mục đích hiển thị, không mở toàn bộ module).
5. **Thêm trường "Sở thích"** cho `contacts` (cùng migration `027`).
6. **Realtime = popup toast + giả lập qua polling** (không có WebSocket, đúng quyết định gốc "không dùng WebSocket" đã chốt lúc tạm dừng) — mỗi vòng polling (20s, rút ngắn từ 45s ban đầu để "thật" hơn) so sánh id thông báo mới nhất đã thấy, thông báo nào mới hơn thì tự bật popup 4 giây góc dưới-phải, đúng NGAY TRÊN chuông (chuông cũng dời xuống góc dưới-phải theo yêu cầu, ban đầu đặt ở trên).
7. **Câu chữ thông báo theo đúng mẫu người dùng đưa ra** ("Thông báo sinh nhật: Sinh nhật đối tác X sẽ diễn ra trong N ngày tới", "Thông báo thanh toán công nợ: Khách hàng X đã thanh toán số tiền Y") — dùng chung 1 nguồn (backend `notification.service.js`) cho cả nội dung trong chuông lẫn popup toast, không định nghĩa 2 lần.

**Quyết định kỹ thuật phát sinh khi hiện thực hóa**:
- **Bỏ hẳn cơ chế "chỉ quét sinh nhật 1 lần/ngày" (`last_birthday_check_date` gate)** đã thiết kế lúc tạm dừng — phát hiện qua test: nếu 1 người dùng mở chuông (kích hoạt quét) TRƯỚC khi Admin thêm 1 đối tác mới có sinh nhật đúng vào 1 trong các mốc nhắc, đối tác đó sẽ **không bao giờ** được nhắc trong năm đó nữa (vì các ngày sau không còn khớp mốc nào). Sửa: quét lại **mỗi lần gọi** `GET /notifications`/`unread-count` — an toàn tuyệt đối nhờ `dedupe_key` UNIQUE (không tạo trùng), chi phí quét lại (SELECT bảng `contacts` nhỏ, <20 người dùng đồng thời) không đáng kể ở quy mô dự án. Cột `last_birthday_check_date` vẫn giữ lại (chỉ mang tính thông tin/debug), không còn dùng để chặn.
- **`server.js` đổi cách mount `/api/contacts`**: trước đây `requirePermission('doi_tac')` gán ở `server.js` cho toàn bộ router — nay chuyển vào kiểm tra riêng từng route bên trong `contacts.routes.js`, để `GET /birthdays-this-month` có thể mở cho mọi tài khoản trong khi các route khác (`GET /`, `POST`, `PUT`, `DELETE`) vẫn giữ nguyên yêu cầu quyền `doi_tac` như cũ.
- **2 lỗi CSS `[hidden]` bị `display` đè phát hiện khi test** (`.notification-panel`, `.notification-badge`) — cùng loại lỗi đã lặp lại nhiều lần trong dự án (`.form-row`, `.modal-card`, `.page-header-actions`...): đặt `display:flex` thẳng lên selector khiến thuộc tính `[hidden]` do JS gán bị ghi đè, phần tử không bao giờ ẩn được thật sự. Sửa bằng `:not([hidden])`, đúng pattern đã áp dụng nhiều lần trước đó — **cần rà lại mọi rule CSS mới có `display:` áp lên phần tử bị JS toggle `hidden`, luôn kèm `:not([hidden])` ngay từ đầu thay vì chờ phát hiện lỗi**.

## 2026-08-05 — Module "Đối tác": tách biệt hoàn toàn với Nhà cung cấp/Khách hàng, xóa chỉ đúng vai trò Admin

**Bối cảnh**: người dùng yêu cầu module quản lý "đối tác" với các trường Họ và tên/SĐT/Địa chỉ/Nghề nghiệp/Ngày sinh/Ghi chú — các trường này (đặc biệt Nghề nghiệp, Ngày sinh) không khớp với khái niệm "Nhà cung cấp"/"Khách hàng" (bảng `partners`) hiện có, vốn gắn chặt với kho/công nợ. Đã hỏi 2 câu qua `AskUserQuestion` trước khi code:

1. **Hoàn toàn tách biệt với `partners`** — bảng mới `contacts`, không mở rộng thêm trường vào `partners`. Lý do: `partners` đã có ý nghĩa nghiệp vụ rõ ràng (NCC/KH, gắn `stock_receipts`/`stock_issues`/`debt_ledger`), nhồi thêm khái niệm "danh bạ cá nhân" vào sẽ làm mơ hồ ranh giới module.
2. **"Xóa chỉ có admin" = đúng vai trò `is_protected`** (không phải "ai có quyền module `doi_tac` thì xóa được") — đúng pattern đã dùng ở Bảo hành/Người dùng/Sản phẩm.

**Quyết định kỹ thuật khi hiện thực hóa**:
- Bảng `contacts` (migration `026`) không có FK/tham chiếu nào tới `partners` hay bất kỳ bảng nghiệp vụ nào khác — chỉ có `created_by` (FK `users`, không bắt buộc). Không có khái niệm "đã có lịch sử" cần bảo vệ khi xóa.
- Module quyền mới `doi_tac` — nhờ cơ chế đã sửa từ 2026-08-03 (`roles.routes.js#GET /roles/modules` đọc động từ `backend/config/modules.js`), thêm module mới vào `MODULE_KEYS`/`MODULE_LABELS` là đủ để trang "Vai trò" tự hiện checkbox, không cần sửa `roles.js`/`roles.html` — đúng yêu cầu người dùng "nhớ thêm giao diện mới vào chức năng phân quyền vai trò" mà không tốn thêm việc.
- **Xem chi tiết** (bổ sung ngay sau bản đầu theo yêu cầu người dùng): làm trang riêng `contact-detail.html` (không phải modal chỉ-đọc) — nhất quán với pattern "trang chi tiết" đã dùng cho Sản phẩm/Khách hàng/Dự án trong dự án, dù `contacts` không có dữ liệu con nào khác ngoài 6 trường cơ bản. Nút "Sửa" trên trang chi tiết không tự có form riêng — điều hướng về `contacts.html?edit=ID` để tái dùng đúng 1 modal sửa duy nhất (đỡ trùng lặp logic validate/submit), đúng cách `warranty-card-edit` ở `customer-detail.js` đã làm với `warranties.html?edit=`.

## 2026-08-05 — Hệ thống thông báo: TẠM DỪNG, đã chốt 7 quyết định kiến trúc để làm tiếp sau

**Bối cảnh**: người dùng yêu cầu hệ thống thông báo (chuông trong app) cho 3 sự kiện ban đầu: sinh nhật khách hàng, tạo dự án mới, tạo phiếu xuất kho mới. Đã hỏi 7 câu qua `AskUserQuestion` (2 vòng) để chốt kiến trúc trước khi code — **chưa viết dòng code nào**, sau đó người dùng yêu cầu dừng lại để ưu tiên làm module "Đối tác" trước. Ghi lại đầy đủ để phiên sau làm tiếp không phải hỏi lại:

1. **Kênh thông báo**: chuông trong app (icon nổi, có số đếm chưa đọc, polling định kỳ ~vài chục giây — không dùng WebSocket/hạ tầng realtime mới, phù hợp app LAN nội bộ hiện có).
2. **Đối tượng nhận**: mọi tài khoản đang hoạt động (không phân biệt theo quyền module hay người phụ trách/tham gia).
3. **Danh sách loại thông báo KHÔNG cố định** — "sinh nhật khách hàng" chỉ là ví dụ minh họa người dùng đưa ra, không phải yêu cầu cứng. Cần **trang cấu hình động cho Admin bật/tắt riêng từng loại thông báo** (toàn hệ thống, không phải theo từng user).
4. **Số ngày báo trước sinh nhật**: cấu hình được (ô nhập số ngày trong trang cấu hình), không hardcode cố định.
5. **Đánh dấu đã đọc**: riêng từng user (không phải 1 người xem là hết hiện với mọi người) — cần bảng riêng lưu trạng thái đọc theo từng cặp user+thông báo.
6. **Trường ngày sinh khách hàng chưa tồn tại** trong CSDL (`partners` hiện không có) — sẽ cần thêm `partners.date_of_birth` (nullable, chỉ áp dụng khách hàng, theo đúng cách `category_id`/`assigned_user_id` đã làm) khi triển khai tiếp.
7. **Trigger sinh nhật nên quét lười (lazy), không dùng cron/setInterval** — đúng nguyên tắc "tính on-the-fly" xuyên suốt dự án: mỗi khi có request liên quan tới thông báo, kiểm tra đã quét sinh nhật hôm nay (giờ VN) chưa, chưa thì quét luôn.

**Kiến trúc dự kiến khi làm tiếp** (chưa chốt chi tiết từng dòng, chỉ là khung định hướng): bảng `notification_settings` (singleton, bật/tắt từng loại + số ngày báo trước), `notifications` (log sự kiện), `notification_reads` (trạng thái đọc riêng từng user); gọi tạo thông báo dự án/phiếu xuất **ngoài** transaction chính của `project.service.js`/`stockIssue.service.js` (bọc try/catch, không để lỗi ghi thông báo làm hỏng nghiệp vụ chính); chuông nổi thêm thẳng vào `frontend/assets/layout.js` (không tạo file riêng + phải sửa 24 trang HTML, vì `layout.js` đã chạy sẵn trên mọi trang qua `initLayout()`).

## 2026-08-05 — Tự động điền Đơn giá theo Giá bán khi chọn sản phẩm ở phiếu xuất, không áp dụng cho phiếu nhập

**Bối cảnh**: người dùng báo "lỗi" đơn giá không tự điền khi chọn sản phẩm trên phiếu xuất — kiểm tra xác nhận đây là tính năng chưa từng có (không phải regression), nên đã hỏi lại 2 câu trước khi thêm mới (thay đổi hành vi form nhập liệu):

1. **Phiếu xuất tự điền Đơn giá theo `sale_price`** của sản phẩm ngay khi chọn — vẫn sửa tay được bình thường sau đó (chỉ là giá trị gợi ý ban đầu, không khóa).
2. **Không áp dụng cho phiếu nhập kho** — giá mua từ nhà cung cấp thường thay đổi theo từng lần nhập (khác giá bán cố định theo sản phẩm), tự điền theo `cost_price` cũ có thể gây nhầm lẫn hơn là hữu ích.

Chi tiết đầy đủ: `docs/CHANGELOG.md` 2026-08-05.

## 2026-08-05 — Module "Quản lý dự án" — Đợt 5: bố cục và phạm vi Báo cáo dự án

**Bối cảnh**: Đợt 5 (PRD 4.12, `docs/Plan.md`) chỉ ghi "tùy chọn... tiến độ, công nợ, chênh lệch vật tư toàn bộ dự án", chưa nằm trong 14 quyết định đã chốt ngày 2026-08-04. Đã hỏi 3 câu qua `AskUserQuestion` trước khi code:

1. **Thẻ tổng hợp + bảng chi tiết** (không chỉ bảng đơn thuần) — nhất quán với 2 phần Kho/Công nợ đã có sẵn trên cùng trang Báo cáo.
2. **Chỉ tính dự án đang hoạt động** (Chuẩn bị/Đang thực hiện/Tạm dừng) — loại Hoàn thành/Hủy, vì trang này dùng để theo dõi dự án đang cần quản lý, không phải lưu trữ lịch sử.
3. **Cột "Chênh lệch vật tư" hiện số dòng sản phẩm vượt dự toán** (vd "2 SP vượt"), bấm vào điều hướng thẳng sang đúng tab "Vật tư" của dự án đó — không chỉ hiện cờ đúng/sai.

**Quyết định kỹ thuật**: `GET /api/reports/projects` tính gộp 1 lần cho toàn bộ dự án đang hoạt động (không N+1 query lặp từng dự án) nhưng vẫn tái dùng nguyên công thức đã có ở `project.service.js`/`projects.routes.js`/`projectMaterials.routes.js` — không phát minh cách tính mới. `project-detail.js` bổ sung hỗ trợ mở sẵn 1 tab cụ thể qua query string (`?tab=...`) để phục vụ link điều hướng từ Báo cáo. Chi tiết đầy đủ: `docs/CHANGELOG.md` 2026-08-05.

## 2026-08-05 — Định dạng dấu chấm phân cách hàng nghìn ngay trong ô nhập số tiền

**Bối cảnh**: người dùng yêu cầu mọi ô nhập số tiền hiện dấu phân cách hàng nghìn khi gõ. Đã hỏi lại 1 câu qua `AskUserQuestion` trước khi code vì câu chữ gốc ghi "dấu phẩy" trong khi toàn bộ hệ thống đang hiển thị số tiền (chỉ đọc) bằng `toLocaleString('vi-VN')` — dùng **dấu chấm**. Người dùng làm rõ ý chính là "dấu phân cách" nói chung phải hiện **ngay trong ô nhập lúc đang gõ** (không phải chỉ nơi hiển thị) — đã chốt dùng dấu chấm để đồng bộ toàn hệ thống, không tạo 2 chuẩn khác nhau.

**Quyết định kỹ thuật**: xem chi tiết đầy đủ tại `docs/DESIGN-SYSTEM.md` mục "Ô nhập số tiền có dấu chấm phân cách hàng nghìn (money-input.js)" và `docs/CHANGELOG.md` 2026-08-05.

## 2026-08-04 — Module "Quản lý dự án": bỏ tab "Công việc" riêng, gộp vào tab "Giai đoạn"; công việc dùng ngày thực tế nhập tay thay `completed_at` tự động

**Bối cảnh**: người dùng muốn bấm vào 1 dòng giai đoạn thì xổ ra danh sách công việc của giai đoạn đó ngay tại chỗ (mỗi công việc 1 dòng, có ô ngày thực tế nhập tay + chọn Trạng thái + nút Lưu cập nhật ngay không cần mở modal), đồng bộ với biểu đồ Gantt (bấm giai đoạn cũng xổ ra danh sách công việc), và "nếu được" bỏ hẳn tab "Công việc" riêng. Đã hỏi 3 câu qua `AskUserQuestion` trước khi code (theo đúng quy trình bắt buộc — đây là thay đổi phạm vi tính năng/schema):

1. **`project_tasks.completed_at` (tự động, Đợt 2) → thay thế hoàn toàn bằng `actual_start_date`/`actual_end_date` nhập tay** — người dùng chọn phương án nhất quán với `project_phases` (vốn đã có `actual_start`/`actual_end` nhập tay từ Đợt 1), thay vì giữ song song 2 cơ chế. Cảnh báo "Trễ tiến độ" của công việc nay so `due_date` với `actual_end_date` (nhập tay) thay vì `completed_at` (mốc hệ thống) — **hệ quả cần nhớ**: công việc đánh dấu "Hoàn thành" nhưng chưa điền `actual_end_date` sẽ vẫn báo trễ nếu quá hạn (dùng "hôm nay" làm mốc so sánh tạm, giống hệt cách đã sửa cho giai đoạn ngày 2026-08-04 — xem mục "Sửa lỗi cảnh báo Trễ tiến độ" bên dưới), không phải lỗi.
2. **Bỏ hẳn tab "Công việc"** — toàn bộ CRUD công việc (xem/thêm/sửa/xóa/cập nhật trạng thái) chuyển vào tab "Giai đoạn": bấm 1 dòng giai đoạn xổ ra bảng công việc con ngay dưới.
3. **Gantt hiển thị danh sách công việc dạng text ngắn gọn khi mở rộng** (không vẽ thêm thanh SVG riêng cho từng công việc) — người dùng chọn phương án đơn giản hơn, giữ Gantt không bị rối.

**Quyết định kỹ thuật khi hiện thực hóa**:
- Migration `023_project_task_actual_dates.sql`: `ADD COLUMN actual_start_date`/`actual_end_date` (nullable) cho `project_tasks` — **không xóa cột `completed_at` cũ** (giữ nguyên dữ liệu lịch sử các dòng đã tạo trước đó, chỉ không còn đọc/ghi từ code mới, đúng nguyên tắc tránh `ALTER TABLE` rủi ro trên bảng đang có dữ liệu thật). Migration `023` này ngoài kế hoạch ban đầu (dự tính dành cho `project_material_plan`, Đợt 3) — đã **lùi số các migration kế hoạch còn lại**: `project_material_plan` chuyển từ `023` sang `024`, `project_payment_milestones`/`project_variations` từ `024` sang `025` (xem `docs/Plan.md`).
- Trạng thái "giai đoạn nào đang mở rộng" (`expandedPhaseIds`, biến JS cấp module ở `project-detail.js`) dùng **chung** cho cả bảng "Danh sách giai đoạn" lẫn biểu đồ Gantt — bấm mở/đóng ở 1 trong 2 nơi luôn đồng bộ cả 2, không cần đồng bộ thủ công 2 trạng thái riêng.
- Nút "Thêm công việc" đặt ngay trong panel mở rộng của từng giai đoạn (không còn nút cấp trang) — mở modal có sẵn với giai đoạn được chọn trước (`presetPhaseId`), người dùng vẫn đổi được sang giai đoạn khác trong modal nếu cần (không khóa cứng).
- Modal Thêm/Sửa công việc (vẫn giữ nguyên, chỉ đổi điểm kích hoạt) bổ sung thêm 2 trường "Bắt đầu thực tế"/"Kết thúc thực tế" — cho phép chỉnh đầy đủ ở cả 2 nơi (modal lẫn dòng bảng nhanh), giống hệt cách `project_phases` đã có cả modal lẫn... (giai đoạn chỉ có modal, không có dòng nhanh vì giai đoạn không lồng bên trong gì khác cần mở rộng).
- Test qua API (curl, file UTF-8 + `--data-binary`, không gõ tiếng Việt trực tiếp vào `-d`) + trình duyệt thật (Chrome headless CDP thô, 3 script test riêng): mở/đóng đồng bộ đúng cả bảng lẫn Gantt, lưu nhanh qua UI thật cập nhật đúng (xác nhận lại qua API sau khi bấm nút trên trình duyệt), nút Thêm/Sửa mở đúng modal với dữ liệu đúng, giai đoạn chưa có việc hiện đúng thông báo rỗng ở cả 2 nơi, không lỗi console, chỉ còn 2 tab (Tổng quan/Giai đoạn). **Dữ liệu thật của dự án "Villa Kỳ Duyên" bị đổi tạm thời trong lúc test qua trình duyệt (1 công việc) đã khôi phục đúng nguyên trạng ngay sau đó.**

## 2026-08-04 — Module "Quản lý dự án": sổ cái công nợ vẫn thuộc khách hàng, dự án chỉ gắn nhãn

**Bối cảnh**: người dùng yêu cầu module mới quản lý toàn bộ quá trình dự án — theo giai đoạn, thời gian, khách hàng và công trình cụ thể; quản lý số lượng hàng và công nợ theo dự án; timeline tiến độ; nhập công việc; ghi nhận phát sinh; cập nhật giai đoạn thanh toán. Đây là module lớn nhất kể từ Phase 2 và đụng trực tiếp vào 2 module đang chạy (Kho, Công nợ), nên đã hỏi và chốt **14 quyết định** qua 3 vòng `AskUserQuestion` trước khi lên kế hoạch, **chưa viết dòng code nào ở phiên chốt kế hoạch**.

### Quyết định nghiệp vụ (người dùng chốt)

1. **Cấu trúc 1 cấp: Dự án = Công trình** — mỗi bản ghi dự án gắn trực tiếp 1 khách hàng, địa chỉ công trình là 1 trường thông tin. Không tách bảng "Công trình" riêng chứa nhiều dự án con (đã cân nhắc và loại bỏ vì phức tạp hơn đáng kể, chưa cần ở quy mô hiện tại).
2. **Vật tư và công nợ theo dự án = gắn trường "Dự án" vào phiếu nhập/xuất kho hiện có**, không tạo sổ vật tư/công nợ riêng cho dự án. Chỉ nhập 1 lần tại phiếu, số liệu dự án là kết quả lọc cộng dồn — đúng nguyên tắc ledger xuyên suốt dự án, không rủi ro double-booking.
3. **Giai đoạn: danh mục mẫu + sửa riêng từng dự án** — có danh mục "Giai đoạn mẫu" ở menu Cấu hình, tạo dự án mới thì copy toàn bộ mẫu vào dự án, sau đó mỗi dự án tự thêm/sửa/xóa/đổi ngày độc lập (bản copy **tách rời hoàn toàn** khỏi mẫu, sửa mẫu về sau không ảnh hưởng dự án đã tạo).
4. **Đợt thanh toán = kế hoạch thu tiền**; bấm "Ghi nhận đã thu" trên đợt sẽ mở **đúng form thanh toán công nợ khách hàng** đang có, đồng thời gắn nhãn đợt để biết đợt nào đã thu/thu một phần/quá hạn. Không có luồng nhập tiền thứ hai.
5. **Công việc thuộc 1 giai đoạn cụ thể** (không phẳng theo dự án, không có công việc con): tên việc, người phụ trách, ngày bắt đầu, hạn hoàn thành, trạng thái (Chưa làm/Đang làm/Hoàn thành), ghi chú.
6. **% tiến độ tự tính từ tỷ lệ công việc hoàn thành**, không nhập tay, không lưu số cố định — đúng nguyên tắc "không lưu giá trị suy ra được".
7. **Phát sinh dùng 1 bảng chung, phân biệt bằng trường "Loại phát sinh"**: loại `chi_phi` (có tiền, khi được duyệt thì cộng vào giá trị hợp đồng) và loại `van_de` (nhật ký sự cố, không gắn tiền).
8. **Vật tư có bảng dự toán** cho từng dự án, trang dự án so sánh Dự toán / Đã xuất / Còn lại / Vượt dự toán.
9. **Công nợ tính theo phiếu xuất** (không theo giá trị hợp đồng). **Toàn bộ công nợ quản lý qua khách hàng** — dự án chỉ đọc và hiển thị, không có sổ công nợ riêng.
10. **Dòng công nợ có nhãn dự án** (`project_id`, không bắt buộc) — nhờ vậy tính được "Còn phải thu của dự án" chính xác kể cả khi 1 khách hàng có nhiều dự án. Sổ cái vẫn thuộc về khách hàng đúng như yêu cầu, `project_id` chỉ là chiều phân tích thêm.
11. **Người tham gia dự án kèm vai trò nhập tự do** (ô chữ, vd "Giám sát", "Kỹ thuật") — không tạo danh mục "Vai trò trong dự án" riêng ở giai đoạn này.
12. **Giao việc chỉ chọn được người trong danh sách tham gia dự án** — tránh giao nhầm, đồng thời làm danh sách tham gia có ý nghĩa thực sự chứ không chỉ để xem.
13. **Ô "Dự án" có ở cả form Ghi nhận thanh toán lẫn form Điều chỉnh công nợ** (không bắt buộc, chỉ hiện ở trang Công nợ khách hàng vì dự án chỉ gắn khách hàng). Mở từ trang dự án thì tự chọn sẵn và **khóa không cho đổi**. Điều chỉnh công nợ cũng cần ô này, nếu không mỗi lần sửa sai số liệu sẽ làm lệch "Còn phải thu của dự án".
14. **Phiếu xuất kho khi in có hiện tên dự án/công trình** — thêm 1 dòng "Công trình: …", tự ẩn nếu phiếu không gắn dự án.

### Quyết định kỹ thuật (lý do chọn, cần giữ khi hiện thực hóa)

- **Tuyệt đối không dựng lại bảng `debt_ledger`.** Cột `reference_type` có `CHECK (reference_type IN ('receipt','issue','payment'))`; SQLite không sửa được CHECK bằng `ALTER TABLE`, muốn thêm giá trị `'project_milestone'` sẽ phải tạo bảng mới → copy → xóa → đổi tên, **trên bảng sổ cái đang chứa dữ liệu công nợ thật** — thao tác rủi ro cao nhất có thể làm trong dự án này. Thay vào đó: thu tiền theo đợt bản chất vẫn là thanh toán (`type='tra'`, `reference_type='payment'`), chỉ thêm 2 cột phụ `project_id`/`milestone_id` bằng `ALTER TABLE ADD COLUMN` (an toàn tuyệt đối). Đây đúng cách đã dùng thành công ở migration `016` khi thêm `is_adjustment`.
- **`ALTER TABLE ... ADD COLUMN ... REFERENCES`**: dự án bắt buộc `PRAGMA foreign_keys=ON`, SQLite chỉ cho phép thêm cột có khóa ngoại khi cột đó **mặc định NULL** — nên mọi cột `project_id`/`milestone_id` thêm vào bảng cũ đều phải nullable, không `NOT NULL`, không `DEFAULT` khác NULL.
- **Công nợ dự án dùng cột riêng, không suy ra bằng JOIN**: nếu suy ra thì dòng "nợ" phải JOIN qua `stock_issues`, dòng "trả" JOIN qua đợt thanh toán, còn dòng **điều chỉnh công nợ thủ công thì không cách nào gắn được** vào dự án. Có cột `debt_ledger.project_id` thì chỉ cần 1 truy vấn `SUM` duy nhất và điều chỉnh được công nợ dự án. Không sợ dữ liệu lệch vì phiếu đã tạo không sửa được (nguyên tắc ledger sẵn có).
- **`project_tasks` chỉ lưu `phase_id`, không lưu thêm `project_id`** — lấy dự án qua JOIN giai đoạn. Lưu cả 2 sẽ nhanh hơn 1 chút nhưng tạo nguy cơ lệch dữ liệu khi chuyển công việc sang giai đoạn khác.
- **"Đã xuất cho dự án" phải trừ đi phiếu nhập có gắn cùng dự án** — nếu chỉ cộng phiếu xuất sẽ báo sai khi trả vật tư thừa về kho qua phiếu nhập bù trừ. Đây là lý do gắn `project_id` cho **cả** `stock_receipts` chứ không riêng `stock_issues`.
- **Không lưu trạng thái đợt thanh toán** — suy ra từ số tiền đã thu (`SUM debt_ledger WHERE milestone_id`) so với số tiền của đợt: Chưa thu / Thu một phần / Đã thu đủ / Quá hạn (quá `due_date` mà chưa thu đủ).
- **Giai đoạn chưa có công việc nào hiển thị `—` chứ không phải `0%`** — 0% gây hiểu nhầm là đã bắt đầu nhưng chưa làm được gì.
- **Xóa dự án**: chặn cứng nếu đã có phiếu nhập/xuất hoặc dòng công nợ gắn vào — chỉ cho chuyển trạng thái "Hủy". Nhất quán với nguyên tắc đang áp dụng cho đối tác/sản phẩm.
- **Biểu đồ timeline Gantt tự vẽ bằng SVG tay**, không dùng thư viện ngoài — nhất quán với quyết định đã chốt ở trang Báo cáo (2026-08-01) và nguyên tắc không phụ thuộc CDN/build step của dự án.
- **Trang chi tiết dự án dạng tab là pattern giao diện mới**, chưa từng có trong dự án (mọi trang chi tiết hiện tại đều cuộn dọc 1 mạch) — bắt buộc dùng skill `ui-ux-pro-max` và bổ sung vào `docs/DESIGN-SYSTEM.md` trước khi viết CSS.
- **Thứ tự đợt có chủ đích**: cột `debt_ledger.project_id` đặt ở Đợt 3 (cùng lúc phiếu xuất bắt đầu gắn dự án) để dòng công nợ tự có nhãn ngay từ đầu, **không phải vá dữ liệu ngược về sau**. Nhưng tab "Thanh toán & Công nợ" trên trang dự án chỉ bật ở Đợt 4 — vì trong khoảng giữa 2 đợt, nợ đã gắn dự án còn tiền thu thì chưa, hiển thị lúc đó sẽ ra số sai lệch.

## 2026-08-04 — Cảnh báo "Trễ tiến độ" cho giai đoạn/công việc: tính cả đang trễ lẫn xong trễ, chỉ hiện nhãn (không đổi màu Gantt)

**Bối cảnh**: người dùng yêu cầu thêm cảnh báo màu sắc khi ngày thực tế trễ hơn ngày dự kiến, cho cả giai đoạn (`project_phases`) và công việc (`project_tasks`). Đã hỏi 2 câu qua `AskUserQuestion` trước khi code:

1. **"Trễ" tính cho cả 2 trường hợp** (người dùng chọn phương án đầy đủ hơn): (a) chưa xong mà đã qua ngày dự kiến (so với hôm nay) → **đang trễ**; (b) đã xong nhưng ngày thực tế xong trễ hơn ngày dự kiến → **xong trễ**. Không chỉ dừng ở trường hợp (b) sát nghĩa câu yêu cầu gốc — vì (a) mới là cái giúp phát hiện vấn đề sớm, đúng mục đích thực tế của cảnh báo tiến độ.
2. **Chỉ hiện nhãn cảnh báo kèm icon** (badge đỏ dưới badge Trạng thái) — **không** đổi màu thanh trên biểu đồ Gantt (người dùng không chọn phương án này khi được hỏi).

**Quyết định kỹ thuật khi hiện thực hóa**:
- Tính ở **backend** (`computeDelay()` trong `project.service.js`, dùng chung cho cả giai đoạn lẫn công việc qua tham số `plannedEnd`/`actualEnd`/`isDone`), không tính ở frontend — nhất quán với cách `progress_percent` đã tính backend từ Đợt 2, tránh 2 nơi tự suy luận cùng 1 logic ngày tháng theo 2 cách khác nhau.
- **Mốc "hôm nay" theo giờ Việt Nam (UTC+7 cố định)**, tái dùng đúng nguyên tắc đã chốt ở `cashVoucher.service.js` (`VN_OFFSET_MS`) — không dùng giờ server hay UTC thô, vì người dùng luôn ở VN. Áp dụng cho `todayVN()` mới thêm trong `project.service.js`.
- Không lưu `is_late`/`late_days` — luôn tính lại mỗi lần trả API (`getPhases()` trong `projects.routes.js`, `withDelay()` trong `projectTasks.routes.js`), đúng nguyên tắc "không lưu giá trị suy ra được" xuyên suốt dự án.
- Không có `planned_end`/`due_date` thì không tính được, luôn trả `is_late: false` — không suy đoán.

**Sự cố phát sinh khi test (đã xử lý ngay)**: trong lúc điều tra 1 báo cáo lỗi liên quan (giai đoạn cập nhật ngày thực tế nhưng trạng thái không lưu), gõ trực tiếp tiếng Việt có dấu vào tham số `curl -d` qua Git Bash **lần thứ 2** trong dự án, lần này ghi đè lên dữ liệu thật của người dùng (dự án "Villa Kỳ Duyên") — đã khôi phục đúng nguyên trạng ngay bằng file JSON UTF-8 thật. Ghi nhận lại rõ ràng để không tái phạm lần 3: **tuyệt đối không gõ tiếng Việt có dấu trực tiếp vào lệnh `curl -d` qua Git Bash trên Windows**, luôn dùng file UTF-8 (Write tool) + `--data-binary`.

## 2026-08-02 — Import/Export Excel cho Sản phẩm: all-or-nothing, không upsert, export theo danh sách hiển thị

**Bối cảnh**: người dùng yêu cầu import/export Excel tại trang Sản phẩm — import cho tải file mẫu, báo lỗi rõ dòng nào/lỗi gì. Trước khi code đã hỏi 3 câu hỏi qua AskUserQuestion:

1. **Mã sản phẩm trùng khi import → báo lỗi, bỏ qua dòng đó** (không tự động cập nhật/upsert sản phẩm hiện có). Lý do người dùng chọn: đơn giản, tránh rủi ro ghi đè nhầm dữ liệu nếu file cũ hoặc sai.
2. **File có cả dòng hợp lệ và dòng lỗi → không nhập gì cả** cho tới khi sửa hết lỗi (khác với "nhập dòng đúng, báo lỗi dòng sai") — an toàn hơn, tránh tình trạng import dở dang khó kiểm soát và khó biết dòng nào đã vào hệ thống dòng nào chưa.
3. **Export xuất đúng theo danh sách đang hiển thị trên giao diện** (tôn trọng ô tìm kiếm hiện tại), không phải toàn bộ danh mục không điều kiện — người dùng muốn xuất đúng cái đang xem.

**Quyết định kỹ thuật khi hiện thực hóa**:

- **Thư viện Excel: `exceljs`, không dùng `xlsx` (SheetJS)** — bản `xlsx` trên npm registry có các lỗ hổng bảo mật đã công khai (prototype pollution/ReDoS) mà maintainer không còn vá qua npm (chỉ vá ở bản host trực tiếp trên site riêng, ngoài luồng cài đặt `npm install` bình thường của dự án). `exceljs` được bảo trì tích cực, đọc/ghi `.xlsx` tốt, MIT license.
- **`multer` để nhận file upload** — chuẩn de-facto cho Express, dùng `memoryStorage()` (không ghi file tạm ra đĩa vì file danh mục sản phẩm nhỏ, xử lý xong là vứt luôn, tránh phải dọn file tạm).
- **`npm audit` báo 2 lỗ hổng mức trung bình** (`uuid@8.3.2`, dependency gián tiếp của `exceljs`, liên quan tới trường hợp caller tự truyền `buf` cho hàm `v3/v5/v6` — `exceljs` không dùng theo cách đó nội bộ nên rủi ro thực tế thấp) — **chấp nhận, không chạy `npm audit fix --force`** vì sẽ ép hạ `exceljs` xuống bản rất cũ (`3.4.0`), mất nhiều năm bugfix chỉ để né 1 advisory ít liên quan tới cách dự án dùng thư viện.
- **Chỉ hỗ trợ `.xlsx`, không hỗ trợ `.xls` cũ** — `exceljs` không đọc được định dạng binary `.xls` cũ, và Excel hiện đại mặc định lưu `.xlsx` nên không phải hạn chế thực tế.
- **3 route mới đặt TRƯỚC `router.get('/:id', ...)`** trong `products.routes.js` — Express khớp `/:id` với bất kỳ đoạn đường dẫn 1 từ nào (kể cả `import-template`), nếu đăng ký các route Excel sau `GET /:id` thì request `GET /api/products/import-template` sẽ bị hiểu nhầm thành `GET /api/products/:id` với `id="import-template"`.
- **Validate import mirror đúng rule của `POST /` hiện có** (mã/tên/đơn vị/giá bán bắt buộc) — **nhưng nghiêm ngặt hơn với 2 trường tùy chọn** (Giá vốn, Ngưỡng cảnh báo tồn kho thấp): form thêm/sửa hiện tại âm thầm quy giá trị không phải số về `0` (`Number(x) || 0`), còn với import từ file thì báo lỗi rõ ràng nếu ô đó có nội dung nhưng không phải số hợp lệ — vì lỗi gõ nhầm trong Excel (vd dán nhầm text vào ô số) dễ xảy ra hơn khi nhập tay qua form, và người dùng đã yêu cầu rõ "báo lỗi dòng nào lỗi gì" nên im lặng quy về 0 sẽ phản tác dụng.
- **`POST /export` mở cho mọi tài khoản đã đăng nhập, không giới hạn quyền `kho`** — giống mức mở của `GET /products` hiện có (dùng cho dropdown chọn sản phẩm ở nhiều nơi khác), vì export chỉ là xem/tải lại dữ liệu đã xem được, không phải hành động ghi. `GET /import-template` và `POST /import` vẫn giữ quyền `kho` như `POST/PUT /products` vì đây là hành động ghi dữ liệu.
- **Export nhận `ids` từ frontend, không tự suy luận bộ lọc ở backend** — frontend gửi đúng danh sách id đang hiển thị (`getVisibleProducts()`, hàm lọc/sắp xếp theo ô tìm kiếm đã có sẵn), backend chỉ query đúng các id đó và giữ đúng thứ tự đã gửi lên — tránh có 2 nơi tự định nghĩa "danh sách đang hiển thị" theo 2 cách khác nhau (giống lý do đã áp dụng cho `month` ở module Sổ quỹ).
- Test qua API (curl) + trình duyệt thật (Chrome headless điều khiển CDP thô, kèm `DOM.setFileInputFiles` giả lập chọn file qua input thật và `Browser.setDownloadBehavior` bắt file tải về) — chi tiết đầy đủ `docs/CHANGELOG.md`.

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
