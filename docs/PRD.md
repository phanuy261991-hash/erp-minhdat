# PRD: Hệ thống Quản lý Kho & Công nợ nội bộ

**Version**: v1.8 — cập nhật 2026-08-07 (mục 4.11 Sổ quỹ: tự động ghi nhận dòng tiền thật từ Công nợ + Kho, không còn độc lập hoàn toàn)
**Trạng thái**: Phase 1 → 4 đã hoàn thành toàn bộ (nền tảng, kho, công nợ, in phiếu, báo cáo) + nhiều mở rộng ngoài phase (Bảo hành, tách Khách hàng, Điều chỉnh công nợ, đóng gói portable, Sổ quỹ, Import/Export Excel sản phẩm). Phase 5 (Vận hành & Go-live) đang làm; **module Quản lý dự án (4.12) đã chốt kế hoạch 2026-08-04, chưa bắt đầu code** — xem trạng thái chính xác tại `docs/CURRENT.md`. Các mục 4.x vẫn có thể bổ sung khi phát sinh nhu cầu mới (xem `docs/DECISIONS.md`).

> Tên dự án là working title. Đổi tên theo tên công ty/thương hiệu thực tế khi cần.

---

## 1. Overview

Ứng dụng web nội bộ, gọn nhẹ, phục vụ quản lý hàng tồn kho, xuất nhập kho, công nợ nhà cung cấp/khách hàng, in phiếu xuất và báo cáo cho một văn phòng/kho duy nhất. Chạy trên một máy tính (máy chủ), các máy khác trong cùng mạng LAN truy cập qua IP nội bộ, không cần expose ra internet.

**Mục tiêu:** thay thế quy trình quản lý thủ công (Excel/sổ sách) bằng một hệ thống tập trung, giảm sai lệch số liệu tồn kho và công nợ, tăng tốc độ lập phiếu và tra cứu.

## 2. Problem Statement

- Tồn kho và công nợ hiện quản lý rời rạc (Excel/sổ sách), dễ sai lệch khi nhiều người cùng cập nhật, khó đối chiếu nhanh.
- Không có cơ chế phân quyền — ai cũng có thể sửa mọi dữ liệu, không kiểm soát được ai làm gì.
- Lập phiếu xuất/nhập và tra cứu công nợ tốn thời gian thủ công, không có báo cáo tổng hợp nhanh.

**Đối tượng sử dụng:** nhân viên thủ kho, kế toán/công nợ, quản lý/chủ doanh nghiệp — trong 1 văn phòng, quy mô dưới ~20 người dùng đồng thời.

## 3. Solution Overview

Web app nội bộ, kiến trúc đơn giản (không microservices, không cloud):

- **Frontend**: HTML/CSS/JS thuần, gọi API qua `fetch`.
- **Backend**: Node.js + Express, chạy như một process duy nhất trên máy chủ.
- **Database**: SQLite3 qua `better-sqlite3`, bật `PRAGMA journal_mode=WAL` để giảm lỗi khóa khi ghi đồng thời.
- **Vận hành**: 2 cách triển khai (xem `docs/DEPLOY.md`) — (1) đóng gói thành thư mục portable tự chứa `node.exe`, tự khởi động cùng Windows qua Task Scheduler (đơn giản hơn, không cần cài Node/npm trên máy đích, khuyến nghị cho hầu hết trường hợp), hoặc (2) PM2 thủ công (`pm2 startup`/`pm2 save`) cho trường hợp cần công cụ theo dõi process nâng cao. Cả 2 đều đảm bảo tự chạy lại khi máy chủ khởi động, không chỉ khi crash.
- **Truy cập**: các máy khác vào bằng `http://<IP-máy-chủ>:<port>` trong LAN. Máy chủ cần IP tĩnh hoặc DHCP reservation.
- **Schema**: khởi tạo qua migration có đánh version (`001_init.sql`, `002_...`), lưu version đã áp dụng trong bảng `schema_migrations` — không dùng `CREATE TABLE IF NOT EXISTS` đơn thuần, vì cần xử lý thay đổi schema an toàn sau khi đã có dữ liệu thật.

## 4. Detailed Requirements (theo feature)

### 4.1 Phân quyền người dùng theo vai trò
- Đăng nhập bằng tài khoản (username/password, hash bằng bcrypt).
- Middleware kiểm tra quyền trên từng route, không xử lý phân quyền ở frontend (frontend chỉ ẩn/hiện menu để tăng trải nghiệm, không thay thế kiểm tra ở backend).

**Vai trò động (bổ sung 2026-08-01 — thay cho danh sách 3 vai trò cố định ban đầu):**
- Admin tạo được vai trò mới tùy ý (đặt tên, chọn các module được phép truy cập) — không giới hạn cứng 3 vai trò như bản đầu.
- **Phân quyền theo module** (không chi tiết theo từng hành động xem/tạo/sửa/xóa): mỗi vai trò được cấp quyền truy cập vào các module nào (Kho, Công nợ, Báo cáo, Người dùng, Cấu hình...) — trong module đã được cấp, làm được mọi thao tác thuộc module đó.
- **Vai trò Admin là vai trò đặc biệt, cố định**: luôn có toàn quyền mọi module, không thể đổi tên/xóa/sửa quyền — đảm bảo hệ thống luôn có ít nhất 1 tài khoản quản trị đầy đủ, tránh trường hợp thao tác nhầm làm mất quyền quản trị.
- Hệ thống vẫn seed sẵn 2 vai trò mặc định để dùng ngay: **Kế toán** (Công nợ + Báo cáo), **Thủ kho** (Kho) — nhưng đây chỉ là dữ liệu khởi tạo, Admin có thể sửa tên/đổi quyền/xóa 2 vai trò này như vai trò tự tạo bất kỳ.

**Quản lý tài khoản người dùng** (bổ sung 2026-07-31, cập nhật 2026-07-31 phiên sau — thêm sửa/xóa cứng):
- Chỉ **Admin** được xem danh sách tài khoản, tạo tài khoản mới (username, mật khẩu, họ tên, chọn vai trò), sửa (họ tên/vai trò/đặt lại mật khẩu — không đổi được username), và khóa/mở tài khoản.
- **Xóa cứng** chỉ Admin, và chỉ khi tài khoản **chưa từng** tạo phiếu nhập/xuất hoặc sửa thông tin sản phẩm (`created_by`/`changed_by`) — nếu đã có lịch sử, chỉ khóa được (giữ nguyên khả năng truy vết ai đã lập phiếu), đúng nguyên tắc áp dụng cho xóa sản phẩm (mục 4.2).
- Không tự đổi được vai trò của chính tài khoản đang đăng nhập (tránh tự khóa quyền quản trị của chính mình).
- Không có cơ chế tự đăng ký (self sign-up) — mọi tài khoản đều do Admin tạo thủ công.

### 4.2 Quản lý hàng tồn kho (bổ sung 2026-07-31 — giá vốn, vô hiệu hóa, lịch sử)
- Danh mục sản phẩm: mã, tên, đơn vị tính bắt buộc; giá bán bắt buộc; giá vốn tham chiếu và ngưỡng cảnh báo tồn kho thấp tùy chọn (mặc định 0).
- Tồn kho hiện tại **không lưu là số cố định**, mà tính từ tổng cộng dồn các phiếu nhập/xuất — tránh lệch dữ liệu khi có lỗi giữa chừng.
- Tìm kiếm theo tên/mã, sắp xếp theo tồn kho, cảnh báo rõ ràng (icon + màu riêng, không chỉ dựa màu) khi tồn kho ≤ ngưỡng cấu hình của sản phẩm.
- **Giá vốn sản phẩm**: hệ thống chọn giữa 2 phương pháp tính, cấu hình chung toàn hệ thống tại "Cấu hình kho":
  - **Bình quân gia quyền** (mặc định): giá vốn = trung bình có trọng số của các lô hàng còn tồn, tự động tính lại mỗi lần nhập hàng mới, không đổi khi xuất kho.
  - **FIFO** (nhập trước, xuất trước): xuất kho được tính đúng theo giá của lô hàng nhập sớm nhất còn tồn.
  - Mỗi lần xuất/nhập đều lưu lại giá vốn tại đúng thời điểm đó (không tính lại theo cấu hình hiện tại nếu sau này đổi phương pháp).
- **Vô hiệu hóa sản phẩm**: người dùng có quyền module Kho có thể ngừng kinh doanh 1 sản phẩm (vẫn hiển thị trong danh mục kèm nhãn rõ ràng, chỉ không chọn được khi lập phiếu mới). **Xóa cứng** chỉ dành cho Admin, và chỉ khi sản phẩm chưa từng có trong phiếu nhập/xuất nào — nếu đã có lịch sử, chỉ được vô hiệu hóa.
- **Trang chi tiết sản phẩm**: xem lịch sử nhập/xuất kho (kèm mã phiếu, giá vốn từng lần) và lịch sử chỉnh sửa thông tin sản phẩm (ai sửa, lúc nào, giá trị cũ/mới).
- **Import/Export Excel (bổ sung 2026-08-02, theo yêu cầu người dùng)**: trang Sản phẩm cho phép nhập hàng loạt qua file `.xlsx` (có file mẫu tải sẵn, kèm hướng dẫn) và xuất dữ liệu ra `.xlsx`.
  - **Import**: toàn bộ file phải hợp lệ mới được nhập (nếu có bất kỳ dòng lỗi nào, không nhập gì cả) — báo lỗi rõ ràng theo từng dòng (số dòng + nội dung lỗi cụ thể). Mã sản phẩm trùng với hệ thống hoặc trùng nhau trong file bị báo lỗi, không tự động cập nhật (không ghi đè sản phẩm đã có).
  - **Export**: xuất đúng theo danh sách đang hiển thị trên giao diện (tôn trọng ô tìm kiếm đang áp dụng), không phải toàn bộ danh mục không điều kiện.

### 4.3 Quản lý xuất/nhập kho (bổ sung 2026-07-31 — chiết khấu, thời gian nhập, mã đơn hàng)
- Lập phiếu nhập kho (theo nhà cung cấp) và phiếu xuất kho (theo khách hàng). Có thể chọn đối tác có sẵn hoặc thêm nhanh đối tác mới ngay tại form (chưa cần vào trang quản lý đối tác riêng).
- Mỗi phiếu = 1 transaction SQLite duy nhất (ghi phiếu + cập nhật tồn kho cùng lúc), đảm bảo không lệch dữ liệu nếu có lỗi giữa chừng.
- **Thời gian nhập kho** có thể chỉnh khác thời điểm lập phiếu thực tế (vd nhập bổ sung dữ liệu trễ, hoặc nhập tồn đầu kỳ theo đúng ngày quá khứ) — dùng làm mốc thời gian thật cho tồn kho/giá vốn, ảnh hưởng đúng thứ tự tính FIFO/bình quân gia quyền.
- **Chiết khấu**: mỗi dòng sản phẩm trong phiếu nhập có thể nhập % chiết khấu riêng — giá vốn ghi nhận là giá sau chiết khấu, số tiền gốc trên hóa đơn vẫn giữ nguyên để đối chiếu. Tổng thành tiền (sau chiết khấu) hiển thị trực tiếp trên form khi lập phiếu.
- **Mã đơn hàng**: trường tự do (không bắt buộc) ghi số hóa đơn/đơn hàng của nhà cung cấp, khác với mã phiếu nội bộ hệ thống tự sinh — dùng để đối chiếu sau này.
- **Tồn đầu kỳ** (bổ sung 2026-08-15): công tắc riêng "Nhập tồn đầu kỳ" trên form lập phiếu nhập — phiếu được đánh dấu chỉ thay đổi số lượng tồn kho (vẫn ghi giá vốn theo lô để tính đúng FIFO/bình quân gia quyền cho lần xuất sau), **không** phát sinh công nợ nhà cung cấp dù chọn đối tác, và **không** tự tạo phiếu Chi trong Sổ quỹ (khác phiếu nhập thường mặc định luôn tạo phiếu Chi — xem mục 4.11). Loại khỏi biểu đồ "Tổng mua hàng theo tháng" (mục 4.6) vì không phải chi tiêu mua hàng thực sự.
- Lịch sử biến động kho, tra cứu theo sản phẩm/khoảng thời gian.
- **Sửa/hủy phiếu đã lập** (bổ sung 2026-07-31): không cho sửa/xóa trực tiếp phiếu nhập/xuất đã tạo — chỉ tạo được **phiếu điều chỉnh bù trừ** (1 phiếu nhập hoặc xuất mới, ghi ngược dấu, liên kết ngược lại phiếu gốc để truy vết) nhằm giữ lịch sử ledger đầy đủ. Không giới hạn hướng bù trừ (phiếu nhập sai có thể bù bằng phiếu nhập khác hoặc phiếu xuất, và ngược lại).

### 4.4 Quản lý công nợ nhà cung cấp & khách hàng (bổ sung 2026-07-31 — hoàn thành)
- Ghi nhận công nợ dạng sổ cái (ledger): mỗi giao dịch nợ/trả là 1 dòng, số dư = tổng cộng dồn — không lưu "số dư hiện tại" như 1 trường cứng.
- Theo dõi riêng công nợ phải trả (NCC, phát sinh từ phiếu nhập đánh dấu "chưa thanh toán ngay") và phải thu (khách hàng, phát sinh từ phiếu xuất đánh dấu "chưa thu tiền ngay") — cả phiếu nhập và phiếu xuất đều có trường đánh dấu trạng thái thanh toán, tự động ghi 1 dòng công nợ ngay khi lập phiếu (trong cùng transaction, không phải bước riêng).
- Phiếu đánh dấu chưa thanh toán/thu tiền ngay **bắt buộc phải chọn đối tác** — không ghi được công nợ cho đối tượng không xác định.
- Ghi nhận thanh toán từng phần (không cần khớp đúng 1 khoản nợ/1 phiếu cụ thể), lịch sử giao dịch (cả phát sinh nợ lẫn thanh toán) xem theo từng đối tượng.
- Quản lý danh sách đối tác (NCC/khách hàng) đầy đủ: thêm/sửa/xóa — không đổi được loại đối tác sau khi tạo, không xóa được nếu đối tác đã có lịch sử phiếu hoặc công nợ.

**Tách riêng menu Khách hàng khỏi Nhà cung cấp (bổ sung 2026-08-01, theo yêu cầu người dùng)**:
- Trang "Đối tác" (nay đổi tên hiển thị "Nhà cung cấp") chỉ còn quản lý NCC; trang "Công nợ" (nay "Công nợ NCC") chỉ còn công nợ NCC.
- Khách hàng có menu riêng hoàn toàn: trang "Khách hàng" (quản lý danh sách) + "Công nợ khách hàng" (số dư/lịch sử/ghi nhận thanh toán) — cùng chức năng như trước, chỉ tách UI, dùng chung API `/api/partners`, `/api/debts`.
- **Loại khách hàng** (danh mục mới, thuộc menu Cấu hình): Admin/người có quyền `cau_hinh` định nghĩa các nhóm khách hàng tùy ý (vd VIP, Đại lý, Khách lẻ), mỗi nhóm có thể đặt **hạn mức công nợ** (không bắt buộc). Gán loại khi thêm/sửa khách hàng (không bắt buộc, chỉ áp dụng cho khách hàng — không áp dụng cho NCC). Khi số dư công nợ của khách hàng vượt hạn mức của loại đang gán, trang "Công nợ khách hàng" hiển thị cảnh báo rõ ràng (icon + màu) — **chỉ cảnh báo, không chặn** việc lập phiếu xuất công nợ mới cho khách hàng đó.
- **Người phụ trách** (bổ sung 2026-08-03, theo yêu cầu người dùng): form thêm/sửa khách hàng có ô chọn 1 tài khoản người dùng làm "người phụ trách" (gõ ký tự gợi ý tìm theo tên, không bắt buộc). Chỉ áp dụng ở giao diện Khách hàng, chưa áp dụng cho Nhà cung cấp.

### 4.5 In phiếu xuất (bổ sung 2026-08-01 — hoàn thành)
- MVP: HTML + CSS `@media print` + `window.print()`, dùng máy in văn phòng thường (A4/A5) đã cài trên máy client — không cần thư viện PDF hay driver máy in nhiệt. Trang in (`print-issue.html`) độc lập, không dùng khung điều hướng chung. **Mở dạng popup ngay trên trang đang đứng** (bổ sung 2026-08-06, áp dụng cho mọi mẫu in — không mở tab trình duyệt mới), tự ẩn khi bấm "Quay lại" hoặc ngay sau khi đóng hộp thoại in.
- Nội dung phiếu: **toàn bộ thông tin công ty** đã cấu hình (tên, địa chỉ, điện thoại, mã số thuế, email, website, thông tin ngân hàng), thông tin khách hàng (tên, địa chỉ, điện thoại), danh sách sản phẩm/số lượng/đơn giá/chiết khấu/**đơn giá sau chiết khấu** (bổ sung 2026-08-01, tính bằng đơn giá × (1 − % chiết khấu) — chỉ hiển thị tính toán, không đổi cách lưu `unit_price` gốc), tổng tiền, người lập phiếu, chỗ ký người giao/người nhận hàng.
- **Ghi chú in phiếu** (bổ sung 2026-08-01, theo yêu cầu người dùng kèm mẫu phiếu thật): 1 đoạn văn bản tự do hiển thị dưới bảng kê sản phẩm (vd điều kiện bảo hành, chính sách đổi/trả hàng) — cấu hình được qua trang Thông tin công ty (mục 4.7), không hardcode.
- **Cấu hình mẫu in** (bổ sung 2026-08-05, theo yêu cầu người dùng — hoàn thành, bắt đầu với phiếu xuất kho): trang "Mẫu in" (menu Cấu hình, thuộc quyền `cau_hinh`) liệt kê các **loại phiếu** đã có mẫu trong hệ thống (mỗi loại phiếu cần có sẵn 1 trang render tương ứng trong code mới dùng được, không phải mẫu người dùng tự tạo/đặt tên tùy ý), bấm vào để mở trình soạn thảo. Trình soạn thảo cho phép: soạn thảo tự do (WYSIWYG) phần đầu trang/chân trang, chèn "trường thông tin" (token, vd tên công ty/mã phiếu/tên khách hàng...) vào bất kỳ vị trí nào trong văn bản; với loại phiếu có bảng sản phẩm — bật/tắt, sắp xếp thứ tự và chỉnh độ rộng các cột (**không** tự vẽ bảng tự do — giữ đúng cấu trúc bảng để tránh hỏng khi in thật), tùy chọn hiện thêm dòng "Số tiền viết bằng chữ"; chọn khổ giấy A4 dọc/ngang; xem trước trực quan trước khi lưu. Mỗi loại phiếu chỉ có **đúng 1 mẫu, sửa trực tiếp** — không có khái niệm nhiều mẫu/loại + chọn "đang dùng". **Từ 2026-08-05 hỗ trợ cả loại phiếu KHÔNG có bảng sản phẩm** (vd "Giấy đề nghị tạm ứng", mục 4.12) — trình soạn thảo tự ẩn phần cấu hình bảng khi không cần. **Từ 2026-08-06**: có thể tải lên và chèn tự do 1 hoặc nhiều hình ảnh (vd mã QR chuyển khoản) vào bất kỳ vị trí nào trong đầu trang/chân trang, dùng chung cho mọi loại mẫu in.

### 4.6 Báo cáo (bổ sung 2026-08-01 — hoàn thành)
- Báo cáo tồn kho hiện tại theo sản phẩm, kèm giá vốn (bình quân gia quyền) và giá trị tồn, tổng giá trị toàn kho.
- Báo cáo mua hàng (nhập kho)/bán hàng (xuất kho) theo tháng — 6 tháng gần nhất, kèm % tăng trưởng so với tháng trước. Phiếu nhập đánh dấu "Nhập tồn đầu kỳ" (mục 4.3, bổ sung 2026-08-15) loại khỏi tổng mua hàng — không phải chi tiêu mua hàng thực sự.
- Báo cáo công nợ tổng hợp toàn hệ thống: tổng phải thu (khách hàng), tổng phải trả (NCC) — chi tiết theo từng đối tác xem trang Công nợ (mục 4.4).
- Hiển thị dạng thẻ số liệu (card) cho các số tổng + bảng; **biểu đồ cột** cho xu hướng mua/bán hàng theo tháng — tự vẽ bằng SVG, không dùng thư viện ngoài (Chart.js) để giữ đúng nguyên tắc không phụ thuộc CDN/build step của dự án.

### 4.7 Thông tin công ty (bổ sung 2026-08-01, mở rộng trường 2026-08-01, thêm ghi chú in phiếu 2026-08-01)
- Trang cấu hình cho phép nhập: Tên công ty, Địa chỉ, Mã số thuế, Email, Website, **Số điện thoại (nhập được từ 2 số trở lên)**, Tên ngân hàng, Chi nhánh, Số tài khoản, Tên chủ tài khoản, **Ghi chú in phiếu** (đoạn văn bản tự do, nhiều dòng).
- Chỉ có **1 bộ thông tin duy nhất** cho toàn hệ thống (đúng với thiết kế "1 văn phòng/kho duy nhất" ở mục 1) — không phải danh sách nhiều công ty.
- Dùng để hiển thị trên mẫu in phiếu xuất kho (mục 4.5) và các mẫu in khác phát sinh sau này.
- Thuộc module "Cấu hình" — quyền chỉnh sửa theo phân quyền vai trò (mục 4.1), Admin luôn có quyền.
- Giao diện chia 2 nhóm hiển thị song song: "Thông tin chung" và "Thông tin ngân hàng", cộng thêm khối riêng "Ghi chú in phiếu" — xem chi tiết layout tại `docs/DESIGN-SYSTEM.md` mục "Trang cấu hình (settings)".

### 4.8 Cấu hình kho (bổ sung 2026-08-01)
- Menu tổng hợp các cấu hình liên quan đến quy trình nghiệp vụ kho, mở để bổ sung dần khi phát sinh nhu cầu — không phải danh sách đóng.
- Mục đầu tiên: bật/tắt chế độ **"xuất trước, nhập bù sau"** (cho phép tồn kho âm tạm thời khi lập phiếu xuất) — xem chi tiết quyết định gốc tại `docs/DECISIONS.md` (2026-07-31).
  - **Phạm vi áp dụng ở giai đoạn này: toàn hệ thống** (1 công tắc chung cho mọi sản phẩm), vì bảng `products` chưa tồn tại (chưa tới Phase 2 Kho) nên chưa thể cấu hình theo từng sản phẩm. Có thể nâng cấp lên cấu hình theo từng sản phẩm khi làm Phase 2, nếu thực tế cần.
- Quyền truy cập theo phân quyền vai trò — module "Cấu hình".

### 4.9 Cấu hình bán hàng (khung menu, bổ sung 2026-08-01)
- **Chỉ tạo khung menu trống ở giai đoạn này** — chưa có nội dung bên trong.
- Lý do: người dùng xác nhận đây sẽ là một **module Bán hàng/POS hoàn toàn mới**, chưa từng được mô tả trong PRD trước đây (PRD gốc chỉ có "xuất kho theo khách hàng" ở mục 4.3, không phải màn hình bán hàng/POS riêng). Cần một buổi trao đổi yêu cầu nghiệp vụ riêng (quy trình bán hàng có khác "xuất kho" không, ai dùng, có giỏ hàng/thanh toán tại quầy không...) trước khi mô tả chi tiết và lên kế hoạch kỹ thuật — xem mục 10 (Open Questions).

### 4.10 Bảo hành (bổ sung 2026-08-01, theo yêu cầu người dùng)
- Quản lý thông tin bảo hành gắn với **1 khách hàng cụ thể** (không áp dụng cho NCC) — chọn khách hàng từ danh mục Khách hàng, số điện thoại/địa chỉ tự điền theo khách hàng đã chọn (vẫn sửa được, lưu dạng snapshot riêng trên từng bản ghi bảo hành — không tự đổi theo nếu sau này sửa hồ sơ khách hàng).
- Mỗi bản ghi bảo hành gồm: khách hàng, số điện thoại, địa chỉ, ngày nghiệm thu, ngày hết hạn, thời gian bảo hành, ghi chú.
- **Ngày hết hạn** và **Thời gian bảo hành** tương tác 2 chiều: nhập thời gian bảo hành (số + đơn vị Ngày/Tháng/Năm) → tự tính ngày hết hạn theo lịch (cộng đúng số năm/tháng/ngày từ ngày nghiệm thu); ngược lại sửa trực tiếp ngày hết hạn → tự suy ra thời gian bảo hành hiển thị theo số ngày chênh lệch: **trên 365 ngày** hiện theo năm, **từ 30 đến 365 ngày** hiện theo tháng, **dưới 30 ngày** hiện đúng theo ngày.
- Thêm mới/sửa thông tin bảo hành qua **popup (modal)** trên trang danh sách Bảo hành — nhất quán với cách nhập liệu của mọi danh mục khác trong hệ thống (đối tác, sản phẩm, khách hàng...). Bấm "+ Thêm bảo hành" từ trang chi tiết khách hàng hoặc icon sửa trên card sẽ mở sẵn đúng popup tương ứng (chọn sẵn khách hàng, hoặc điền sẵn dữ liệu cần sửa).
- Vô hiệu hóa/mở lại: mọi người có quyền module `bao_hanh` (module riêng từ 2026-08-08 — trước đó dùng chung `cong_no`, xem `docs/DECISIONS.md`). **Xóa cứng chỉ Admin** — khác các đối tượng khác trong hệ thống vốn thường cho phép xóa nếu chưa có lịch sử, ở đây xóa luôn bị giới hạn Admin theo đúng yêu cầu.
- **Giao diện chi tiết khách hàng** (trang mới `customer-detail.html`, chưa có trước đây): hiển thị thông tin cơ bản khách hàng + toàn bộ bản ghi bảo hành của khách hàng đó dưới dạng **Card**, mỗi card hiện "Số ngày còn lại" (số lớn, đổi màu theo mức độ khẩn cấp: còn nhiều — xanh, ≤30 ngày — cam, đã hết hạn — đỏ) và "Ngày hết hạn" cụ thể, lấy trực tiếp từ dữ liệu bảo hành (không lưu số ngày còn lại cố định — luôn tính lại từ ngày hết hạn tại thời điểm xem, đúng nguyên tắc không lưu giá trị suy ra được của dự án).

### 4.11 Sổ quỹ (bổ sung 2026-08-02, theo yêu cầu người dùng; **mở rộng lớn 2026-08-07**: tự động ghi nhận dòng tiền thật từ Công nợ + Kho)
- Quản lý dòng tiền mặt của doanh nghiệp qua **phiếu thu** và **phiếu chi**. **Từ 2026-08-07, KHÔNG còn độc lập hoàn toàn với Công nợ/Kho** — xem mục "Phiếu tự động" bên dưới. Phiếu thủ công vẫn không liên kết danh sách Nhà cung cấp/Khách hàng có sẵn (trường "Đối tượng nộp/nhận" chỉ là tên tự do).
- Mỗi phiếu gồm: mã tự sinh (`PT000001...` cho phiếu thu, `PC000001...` cho phiếu chi, riêng từng loại, dùng chung 1 dãy số cho cả phiếu thủ công lẫn tự động), thời gian (chỉnh được với phiếu thủ công, quyết định phiếu thuộc tháng nào), Loại thu/chi (chọn từ danh mục "Loại thu chi"), Người thu/chi (chọn 1 tài khoản người dùng, mặc định tài khoản đang đăng nhập — phiếu tự động không có), Tên người nộp/nhận (tự do với phiếu thủ công; tự điền tên đối tác với phiếu tự động), Số tiền, Ghi chú, cờ "Hạch toán kết quả kinh doanh" (hiện chỉ lưu, chưa có báo cáo lãi/lỗ nào dùng đến).
- **Quỹ đầu kỳ**: nhập 1 lần duy nhất (số dư tiền mặt thực tế lúc bắt đầu dùng module) — các tháng sau tự động cộng dồn từ lịch sử phiếu (cả thủ công lẫn tự động), không nhập lại từng tháng.
- Danh sách phiếu mặc định hiển thị **tháng hiện tại** (tự làm mới khi sang tháng mới, không cần thao tác), xem lại tháng cũ qua bộ lọc Tháng/Năm. Thanh tổng hợp Quỹ đầu kỳ/Tổng thu/Tổng chi/Tồn quỹ của đúng tháng đang xem — tất cả tính trực tiếp từ tổng cộng dồn (đúng nguyên tắc ledger xuyên suốt dự án), không lưu số dư cố định.
- **Phiếu thu/chi thủ công** không sửa được sau khi tạo, chỉ xóa cứng (khác nguyên tắc "chỉ tạo phiếu điều chỉnh bù trừ" của Kho/Công nợ — vì module này không có gì tham chiếu ngược, không cần giữ vết như ledger). Quyền tạo/xóa chỉ cần quyền module `so_quy`, không phân biệt theo hành động (đúng triết lý phân quyền theo module, mục 4.1).
- Danh mục "Loại thu chi": quản lý riêng (thêm/sửa/xóa), mỗi loại gắn cố định 1 chiều (Thu hoặc Chi); không xóa được nếu đã có phiếu dùng loại đó. **5 danh mục "hệ thống"** (xem bên dưới) khóa Sửa/Xóa tuyệt đối, không hiện trong dropdown lập phiếu thủ công.

**Phiếu tự động (bổ sung 2026-08-07, theo yêu cầu người dùng)**: mỗi khi có 1 khoản tiền mặt/chuyển khoản THẬT ra/vào công ty, hệ thống tự tạo 1 phiếu thu/chi tương ứng, gắn kèm nguồn gốc (đối tác, chứng từ gốc, dự án/đợt thanh toán nếu có) — **không cần nhân viên tự nhập tay 2 nơi**:
- **Thu**: thanh toán công nợ khách hàng (danh mục "Thu hồi công nợ khách hàng" hoặc "Thu theo đợt thanh toán dự án" nếu gắn đợt thanh toán dự án), xuất hàng bán đánh dấu thu tiền ngay (không công nợ) — danh mục "Thu bán hàng trả ngay".
- **Chi**: thanh toán công nợ nhà cung cấp — danh mục "Chi trả công nợ nhà cung cấp"; nhập hàng đánh dấu thanh toán ngay (không công nợ, **là trạng thái mặc định của mọi phiếu nhập kho thường**) — danh mục "Chi mua hàng trả ngay". **Ngoại lệ**: phiếu đánh dấu "Nhập tồn đầu kỳ" (mục 4.3) không tạo phiếu Chi này dù thanh toán ngay hay công nợ.
- **"Trả hàng" (mục 4.15) KHÔNG tạo phiếu tự động** — chỉ giảm công nợ, không coi là dòng tiền thật chắc chắn.
- **Phiếu tự động khóa vĩnh viễn** (không xóa được, kể cả Admin) — muốn điều chỉnh phải sửa đúng ở nghiệp vụ gốc (Công nợ/Kho).
- Dữ liệu lịch sử trước 2026-08-07 đã được backfill (tạo lại phiếu cho toàn bộ thanh toán công nợ + phiếu nhập/xuất trả tiền ngay đã có từ trước) — "Tồn quỹ" các tháng đã qua có thể khác so với lần đối chiếu tiền mặt thật trước thời điểm này.

### 4.12 Quản lý dự án (bổ sung 2026-08-04, theo yêu cầu người dùng — đã chốt kế hoạch, chưa code)

Quản trị toàn bộ quá trình một dự án/công trình: theo giai đoạn, theo thời gian, theo từng khách hàng và công trình cụ thể; theo dõi vật tư và công nợ phát sinh; timeline tiến độ; công việc; phát sinh; đợt thanh toán theo hợp đồng.

**Hồ sơ dự án**
- Mỗi bản ghi dự án **chính là 1 công trình**, gắn trực tiếp **1 khách hàng** (không áp dụng cho nhà cung cấp). 1 khách hàng có thể có nhiều dự án.
- Thông tin: mã dự án tự sinh, tên dự án, khách hàng, **số hợp đồng**, **ngày ký hợp đồng**, địa chỉ công trình, giá trị hợp đồng, ngày bắt đầu, **ngày hoàn thành dự kiến**, ngày hoàn thành thực tế, trạng thái (Chuẩn bị / Đang thực hiện / Tạm dừng / Hoàn thành / Hủy), **người phụ trách**, ghi chú.
- **Danh sách người tham gia dự án**: chọn nhiều tài khoản người dùng, mỗi người kèm **vai trò trong dự án** (ô chữ tự do, vd "Giám sát", "Kỹ thuật").
- Không xóa được dự án đã có phiếu nhập/xuất hoặc công nợ gắn vào — chỉ chuyển trạng thái "Hủy".

**Giai đoạn & tiến độ**
- Có danh mục **"Giai đoạn mẫu"** (thuộc menu Cấu hình) do Admin định nghĩa, vd Khảo sát → Thiết kế → Chuẩn bị vật tư → Thi công → Nghiệm thu → Bàn giao & Bảo hành.
- Tạo dự án mới sẽ **copy toàn bộ danh mục mẫu** vào dự án; sau đó mỗi dự án tự thêm/sửa/xóa/đổi ngày giai đoạn **độc lập hoàn toàn** — sửa danh mục mẫu về sau không ảnh hưởng các dự án đã tạo.
- Mỗi giai đoạn có: tên, thứ tự, ngày bắt đầu/kết thúc kế hoạch, ngày thực tế, trạng thái, ghi chú.
- **Timeline tiến độ**: biểu đồ dạng thanh ngang theo trục thời gian cho các giai đoạn của dự án.
- **% hoàn thành luôn được tính lại** từ tỷ lệ công việc đã hoàn thành (không nhập tay, không lưu số cố định — đúng nguyên tắc không lưu giá trị suy ra được). Giai đoạn chưa có công việc nào hiển thị `—`, không hiển thị `0%`.
- **Cảnh báo "Trễ tiến độ"** (bổ sung 2026-08-04, theo yêu cầu người dùng): áp dụng cho cả giai đoạn và công việc, so sánh ngày kết thúc dự kiến (`planned_end`/`due_date`) với ngày kết thúc thực tế (`actual_end`/`completed_at`) nếu đã hoàn thành, hoặc với ngày hiện tại nếu chưa hoàn thành — cả 2 trường hợp đều tính là trễ nếu vượt mốc dự kiến. Hiển thị bằng nhãn cảnh báo kèm icon (không dùng màu đơn thuần), đặt ngay dưới trạng thái trong bảng danh sách giai đoạn và bảng công việc. Không lưu cố định, luôn tính lại theo thời điểm xem.

**Công việc**
- Mỗi công việc thuộc **1 giai đoạn cụ thể** của dự án, gồm: tên việc, người phụ trách, ngày bắt đầu, hạn hoàn thành, trạng thái (Chưa làm / Đang làm / Hoàn thành), ghi chú.
- Ô "Người phụ trách" **chỉ chọn được người có trong danh sách tham gia dự án** — tránh giao việc nhầm cho người ngoài dự án.

**Vật tư theo dự án**
- Mỗi dự án có **bảng dự toán vật tư** (sản phẩm + số lượng dự kiến).
- Phiếu nhập kho và phiếu xuất kho có thêm trường **"Dự án"** (không bắt buộc) — chọn khi lập phiếu. Không nhập lại số liệu ở đâu khác.
- Trang dự án hiển thị bảng đối chiếu **Dự toán / Đã xuất / Còn lại**, cảnh báo rõ khi **vượt dự toán**. "Đã xuất" tính bằng phiếu xuất gắn dự án **trừ đi** phiếu nhập gắn dự án (trường hợp trả vật tư thừa về kho).
- Phiếu xuất kho khi in ra có hiện dòng "Công trình: …" (tự ẩn nếu phiếu không gắn dự án).

**Công nợ theo dự án**
- **Toàn bộ công nợ vẫn quản lý qua khách hàng** (mục 4.4) — dự án **không có sổ công nợ riêng**, chỉ đọc và hiển thị lại. Công nợ tính theo phiếu xuất như hiện tại, không tính theo giá trị hợp đồng.
- Trang dự án hiển thị: danh sách phiếu xuất đã gắn dự án, công nợ phát sinh, đã thu, còn phải thu của riêng dự án.
- Nút "Ghi nhận thanh toán" trên trang dự án **mở đúng form thanh toán công nợ khách hàng** đang dùng, tự chọn sẵn dự án đang xem và khóa lại không cho đổi.
- Form **Ghi nhận thanh toán** và **Điều chỉnh công nợ** ở trang Công nợ khách hàng có thêm ô **"Dự án"** (không bắt buộc), chỉ liệt kê dự án của đúng khách hàng đó; ẩn hẳn ô này nếu khách hàng chưa có dự án nào. Không áp dụng cho Công nợ NCC.

**Đợt thanh toán theo hợp đồng**
- Mỗi dự án có danh sách đợt thanh toán: tên đợt, số tiền (hoặc % giá trị hợp đồng), ngày dự kiến, thứ tự.
- Bấm **"Ghi nhận đã thu"** trên 1 đợt sẽ mở đúng form thanh toán công nợ khách hàng, đồng thời gắn nhãn đợt đó.
- **Trạng thái đợt luôn được suy ra** từ số tiền đã thu so với số tiền của đợt: Chưa thu / Thu một phần / Đã thu đủ / **Quá hạn** — không lưu trạng thái cố định.
- **In "Giấy đề nghị tạm ứng"** (bổ sung 2026-08-05, theo yêu cầu người dùng kèm mẫu thật — hoàn thành): mỗi đợt thanh toán có nút in ra văn bản đề nghị tạm ứng theo đúng mẫu công ty đang dùng, cấu hình được qua "Cấu hình mẫu in" (mục 4.5) — số hợp đồng/ngày ký lấy từ thông tin dự án, tên khách hàng/địa chỉ công trình, lần tạm ứng/tỉ lệ %/số tiền lấy từ đợt thanh toán, thông tin chuyển khoản lấy từ Thông tin công ty.

**Phát sinh dự án**
- Dùng chung 1 danh sách, phân biệt bằng trường **"Loại phát sinh"**:
  - **Chi phí** (có tiền): nội dung, số tiền, ngày, lý do, trạng thái duyệt. Khi được duyệt thì **cộng vào giá trị hợp đồng** của dự án (Giá trị hợp đồng thực tế = giá trị gốc + phát sinh đã duyệt).
  - **Vấn đề** (không tiền): nhật ký sự cố phát sinh trong quá trình (chậm tiến độ, thiếu vật tư, khách đổi yêu cầu...) kèm cách xử lý.

**Phân quyền**: module mới `du_an` (mục 4.1) — vai trò nào được cấp module này thì thao tác được mọi chức năng thuộc dự án, đúng triết lý phân quyền theo module.

### 4.13 Đối tác (bổ sung 2026-08-05, theo yêu cầu người dùng — hoàn thành)

Danh bạ liên hệ cá nhân, **hoàn toàn tách biệt** với "Nhà cung cấp"/"Khách hàng" (mục 4.4) — không gắn kho, không gắn công nợ, không tham chiếu tới bảng nào khác trong hệ thống.

- Thông tin lưu trữ: Họ và tên (bắt buộc), Số điện thoại, Địa chỉ, Nghề nghiệp, Ngày tháng năm sinh, Sở thích, Ghi chú.
- Thêm mới/chỉnh sửa: mọi tài khoản có quyền module `doi_tac`. **Xóa: chỉ tài khoản vai trò Admin** (`is_protected`), bất kể vai trò đó có quyền `doi_tac` hay không — khác nguyên tắc chung "quyền module áp dụng đều cho mọi hành động" của các module khác, vì người dùng yêu cầu rõ ràng giới hạn riêng cho hành động xóa.
- Trang "Xem chi tiết" riêng (`contact-detail.html`) hiển thị đầy đủ thông tin, có nút Sửa/Xóa.
- **Phân quyền**: module mới `doi_tac` (mục 4.1) — tự động xuất hiện ở trang "Vai trò" (nguồn `backend/config/modules.js`), không seed sẵn cho vai trò mặc định nào. Riêng route `GET /birthdays-this-month` (phục vụ card sinh nhật ở Tổng quan, mục 4.14) mở cho **mọi** tài khoản, không đòi quyền `doi_tac`.

### 4.14 Hệ thống thông báo (bổ sung 2026-08-05, theo yêu cầu người dùng — hoàn thành phiên bản đầu)

Chuông thông báo nổi ở mọi trang (góc dưới-phải màn hình), mọi tài khoản đang hoạt động đều nhận. "Realtime" là **giả lập qua polling định kỳ** (không dùng WebSocket) — khi phát hiện thông báo mới, tự động hiện thêm popup toast (tự ẩn sau 4 giây) ngay trên chuông, kèm số đếm chưa đọc trên icon chuông.

- **3 loại thông báo**: (1) thanh toán công nợ nhà cung cấp, (2) thanh toán công nợ khách hàng — cả 2 phát sinh khi ghi nhận thanh toán ở mục 4.4; (3) sinh nhật đối tác — dựa trên `contacts.date_of_birth` (mục 4.13).
- **Cấu hình thông báo** (trang riêng, menu Cấu hình, chỉ Admin sửa được — quyền `cau_hinh`): bật/tắt riêng từng loại trong 3 loại trên; **danh sách nhiều mốc nhắc lịch sinh nhật** tự thêm/xóa được (vd nhắc trước 3 ngày, nhắc lại khi còn 1 ngày, nhắc đúng ngày sinh nhật) — không giới hạn cố định 1 mốc.
- **Đánh dấu đã đọc riêng từng tài khoản** — cùng 1 thông báo, người này đã xem không ảnh hưởng trạng thái của người khác.
- **Card "Sinh nhật trong tháng"** ở trang Tổng quan (mở cho mọi tài khoản): liệt kê đối tác có sinh nhật trong tháng hiện tại kèm ngày sinh, tô đỏ khi còn ≤3 ngày nữa tới sinh nhật.
- **Phân quyền**: không cần module riêng — mọi tài khoản đăng nhập đều xem/đánh dấu đã đọc được thông báo của chính mình; chỉ trang cấu hình đòi quyền `cau_hinh`.

### 4.15 Trả hàng (bổ sung 2026-08-06, theo yêu cầu người dùng — hoàn thành, bổ sung quy trình 2 bước + "Trả hàng nhà cung cấp" cùng ngày)

Trang "Trả hàng" (menu Kho) quản lý **chung 1 danh sách** cho 2 loại phiếu trả, phân biệt bằng cột "Loại": **"Trả hàng xuất"** (khách hàng trả lại hàng đã mua) và **"Trả hàng nhà cung cấp"** (cửa hàng trả hàng về NCC). Nút "+ Lập phiếu trả hàng" xổ ra dropdown 2 lựa chọn, chọn loại nào mở đúng form loại đó.

**"Trả hàng xuất" (khách hàng)** — hàng cộng lại vào tồn kho, công nợ phải thu của khách hàng giảm tương ứng, tách biệt hoàn toàn khỏi danh sách "Phiếu nhập kho" thông thường (mã phiếu riêng, prefix `TH...`).

- **Thông tin phiếu**: Khách hàng (bắt buộc, cho phép thêm nhanh khách hàng mới ngay tại form giống phiếu nhập/xuất), Công trình (không bắt buộc — **tự động lọc chỉ hiện các công trình của đúng khách hàng đang chọn**, không phải toàn bộ dự án hệ thống), Thời gian trả, Ghi chú.
- **Từng dòng hàng trả**: Mã SP/Tên SP/ĐVT (tự điền khi chọn sản phẩm qua ô tìm kiếm gợi ý), **Số lượng đã xuất** (hệ thống tự tính — tổng đã xuất cho đúng khách hàng + sản phẩm đó, trừ đi số đã trả ở các phiếu **đã trừ kho** trước đó, khoanh vùng theo đúng công trình nếu có chọn — chỉ hiển thị tham khảo, không nhập tay được), **Số lượng trả lại** (nhập tay), **Giá bán** (tự điền theo giá bán hiện tại của sản phẩm, sửa tay được — dùng để tính số tiền giảm công nợ = Giá bán × Số lượng trả lại).
- **Quy trình 2 bước**: nút **"Lưu"** chỉ ghi lại thông tin đã nhập (trạng thái "Chờ trừ kho") — **chưa** đụng tới tồn kho/công nợ, phiếu ở trạng thái này vẫn **sửa được** toàn bộ (icon "Sửa" trên danh sách). Nút **"Trừ kho"** (cả trong form lẫn icon duyệt nhanh ngay trên danh sách) mới thực sự cộng tồn kho + giảm công nợ theo đúng quy trình nghiệp vụ — **chặn cứng** tại bước này nếu "Số lượng trả lại" vượt quá số đã xuất còn có thể trả. Sau khi trừ kho thành công, phiếu chuyển trạng thái "Đã trừ kho" và **khóa vĩnh viễn** (không còn sửa/trừ kho lại được).
- Khi trừ kho: tồn kho **cộng thêm đúng "Số lượng trả lại"** (không phải "Số lượng đã xuất"); công nợ khách hàng **giảm** đúng tổng giá trị hàng trả, tự động ghi 1 dòng vào lịch sử giao dịch công nợ (nhãn riêng "Trả hàng", gắn kèm mã phiếu trả); giá vốn của lô hàng trả về kho lấy tự động theo **giá vốn bình quân gia quyền hiện tại** của sản phẩm (không dùng giá bán làm giá vốn, tránh làm lệch giá vốn bình quân).
- **Tra cứu**: trang danh sách tìm kiếm được theo mã phiếu, tên khách hàng, số điện thoại khách hàng; hiển thị rõ trạng thái "Chờ trừ kho"/"Đã trừ kho" từng phiếu.
- Phiếu có gắn công trình sẽ tự động xuất hiện trong tab "Vật tư" của dự án đó (mục "Danh sách phiếu nhập/xuất đã gắn dự án"), với nhãn riêng "Trả hàng" để phân biệt với phiếu nhập mua hàng từ NCC.

**"Trả hàng nhà cung cấp"** — chiều **ngược lại** "Trả hàng xuất": hàng trả về NCC làm **giảm** tồn kho (giống phiếu xuất), công nợ **phải trả** NCC giảm tương ứng, tách biệt hoàn toàn khỏi danh sách "Phiếu xuất kho" thông thường (mã phiếu riêng, prefix `TN...`). Các trường/hành vi hoàn toàn tương tự "Trả hàng xuất" (thay Khách hàng/Công trình bằng Nhà cung cấp, không có Công trình; "Số lượng đã nhập" tự tính thay "Số lượng đã xuất"; cùng quy trình 2 bước Lưu/Trừ kho) — **riêng 1 điểm khác**: ô "Giá nhập" từng dòng — hệ thống tự tra cứu lịch sử giá đã từng mua sản phẩm đó từ đúng NCC đang chọn: **chỉ 1 giá** thì tự điền luôn; **từ 2 giá trở lên** (từng mua với giá khác nhau ở các lần nhập khác nhau) thì hiện gợi ý liệt kê từng mức giá dạng nút bấm được ngay dưới ô, người dùng chọn giá nào thì giá đó tự điền vào ô.
- Cả 2 loại phiếu **không thuộc quyền module riêng** — dùng chung quyền `kho` như phiếu nhập/xuất kho.

### 4.16 Giao diện di động (bổ sung 2026-08-06, theo yêu cầu người dùng — đã chốt kế hoạch, CHƯA CODE)

Một **giao diện riêng dành cho điện thoại và tablet**, bố cục và cách thao tác giống ứng dụng native — **không phải** bản web hiện tại thu nhỏ lại. Truy cập cùng địa chỉ máy chủ trong LAN, tự nhận diện thiết bị và chuyển hướng, dùng chung tài khoản/phiên đăng nhập với bản máy tính (đăng nhập 1 lần, không có hệ thống tài khoản thứ 2).

**Đối tượng & tình huống sử dụng**: nhân viên đứng tại kho hoặc tại công trường cần tra cứu nhanh (tồn kho, công nợ, thông tin khách hàng, liên hệ) và cập nhật tiến độ dự án ngay tại chỗ, thay vì phải quay về máy tính.

**Phạm vi giai đoạn đầu (đã chốt)** — làm trước 2 nhóm, nhóm nghiệp vụ ghi để ngỏ đánh giá lại sau khi dùng thật:

- **Tra cứu (chỉ đọc)**: Sản phẩm + chi tiết tồn kho, Khách hàng + chi tiết, Nhà cung cấp, Công nợ khách hàng, Công nợ NCC, Đối tác (danh bạ), Bảo hành. Tìm kiếm theo tên/mã/số điện thoại như bản máy tính.
- **Dự án tại công trường**: danh sách dự án kèm tiến độ; trang chi tiết đủ các nhóm thông tin (Tổng quan / Giai đoạn / Vật tư / Thanh toán / Phát sinh); **cập nhật trạng thái và ngày thực tế của công việc ngay tại chỗ**; **ghi nhận phát sinh (vấn đề) ngay khi xảy ra**. Vật tư và Thanh toán chỉ đọc.
- **Chung**: Trang chủ tóm tắt, Thông báo (dùng chung hệ thống thông báo 4.14), Đăng nhập.
- **Chưa làm ở giai đoạn này** (đánh giá lại sau): lập phiếu nhập/xuất/trả hàng, phiếu thu chi sổ quỹ, ghi nhận thanh toán công nợ.

**Không có bản di động** (luôn dùng máy tính khi cần): các trang Cấu hình, Vai trò, Người dùng, Mẫu in và trình soạn thảo mẫu in, Import/Export Excel, Báo cáo đầy đủ (chỉ có bản tóm tắt ở Trang chủ), trang In phiếu.

**Yêu cầu về trải nghiệm**:
- Thanh điều hướng dạng **tab cố định phía dưới màn hình** (thay sidebar), tự lọc theo quyền của tài khoản đang đăng nhập.
- Mọi danh sách hiển thị dạng **thẻ** (mỗi bản ghi 1 thẻ, hiện 3–4 thông tin quan trọng, bấm vào mở chi tiết) — **không dùng bảng nhiều cột cuộn ngang**.
- Form nhập liệu mở dạng **tấm trượt từ đáy màn hình**, kéo xuống để đóng (thay popup giữa màn hình).
- Vùng chạm tối thiểu 44×44px; kéo danh sách xuống để làm mới; giữ nguyên vị trí đang xem khi quay lại danh sách.
- Tính năng chỉ có trên bản di động: **bấm số điện thoại để gọi trực tiếp**, bấm địa chỉ công trình để mở ứng dụng bản đồ, chia sẻ nhanh thông tin công nợ.
- Luôn có nút **"Dùng bản máy tính"** để thoát về giao diện đầy đủ khi cần.

**Giới hạn đã biết và được chấp nhận** (do hệ thống chạy trong LAN không có HTTPS — xem `docs/DECISIONS.md`):
- **iPhone/iPad**: thêm vào màn hình chính sẽ mở **toàn màn hình, không thanh địa chỉ** — gần như ứng dụng thật.
- **Android**: vẫn mở trong trình duyệt Chrome, **còn thanh địa chỉ** phía trên.
- **Cả hai**: không chạy được khi mất kết nối (không có chế độ offline), không có thông báo đẩy ngoài ứng dụng. Có thể bổ sung sau nếu chấp nhận bật HTTPS nội bộ, **không phải làm lại giao diện**.
- Thiết bị phải kết nối WiFi cùng mạng LAN với máy chủ — không dùng được qua mạng 4G ngoài văn phòng.

**Phân quyền**: không có module quyền mới — bản di động dùng đúng quyền module hiện có của tài khoản (`kho`, `cong_no`, `du_an`...), chỉ hiển thị đúng những mục người dùng vốn đã được phép xem trên bản máy tính.

## 5. Success Metrics

| Mục tiêu | Chỉ số | Ngưỡng |
|---|---|---|
| Ngừng dùng sổ sách song song | % phiếu xuất/nhập ghi qua hệ thống | 100% sau tuần đầu go-live |
| Độ chính xác tồn kho | Sai lệch giữa hệ thống và kiểm kê thực tế | < 1% sau 1 tháng |
| Tốc độ lập phiếu | Thời gian lập 1 phiếu xuất | < 2 phút |
| Ổn định hệ thống trong giờ làm việc | Uptime nhờ auto-restart (Task Scheduler hoặc PM2, xem mục 4 "Vận hành") | > 99% trong giờ hành chính |

## 6. Technical Constraints

- Node.js + Express, SQLite3 (`better-sqlite3`, WAL mode).
- Không có API/dịch vụ bên thứ 3 nào cần tích hợp.
- Chạy trong LAN nội bộ, không cần HTTPS ở giai đoạn đầu (không expose internet).
- Trình duyệt: không giới hạn cụ thể, giả định Chrome/Edge trên máy văn phòng thông thường — cần xác nhận nếu có máy dùng trình duyệt khác.
- Cần backup định kỳ file `data.db` (script copy sang ổ khác/cloud hàng ngày) — chưa có cơ chế này sẽ là rủi ro mất dữ liệu công nợ.

## 7. Timeline & Milestones (đề xuất, cần điền ngày cụ thể)

| Giai đoạn | Nội dung |
|---|---|
| Phase 1 | Schema (migration có version) + đăng nhập + phân quyền |
| Phase 2 | Quản lý hàng tồn kho + xuất/nhập kho |
| Phase 3 | Công nợ nhà cung cấp & khách hàng |
| Phase 4 | In phiếu xuất + báo cáo |
| Phase 5 | Đóng gói/deploy (portable + Task Scheduler hoặc PM2), cấu hình IP tĩnh, backup tự động, đào tạo người dùng, go-live |

*Chưa có ngày cụ thể — cần bổ sung theo nguồn lực thực tế (bao nhiêu người code, làm full-time hay part-time).*

## 8. Dependencies

- Không phụ thuộc dịch vụ bên ngoài (không API thanh toán, không cloud).
- Phụ thuộc hạ tầng nội bộ: máy chủ (chạy 24/7 hoặc bật/tắt theo giờ làm việc, tự khởi động lại qua Task Scheduler hoặc PM2), mạng LAN ổn định, máy in văn phòng đã cài driver trên các máy client.

## 9. Risks & Mitigation

| Rủi ro | Mitigation |
|---|---|
| SQLite khóa khi nhiều người ghi đồng thời (`SQLITE_BUSY`) | Bật WAL mode, dùng `better-sqlite3` với transaction rõ ràng cho mỗi phiếu |
| Máy chủ tắt/crash → mất truy cập toàn bộ | Tự khởi động lại qua Task Scheduler (bản đóng gói) hoặc PM2 (`pm2 startup`/`pm2 save`); chấp nhận gián đoạn khi máy tắt hẳn, không có failover |
| IP máy chủ đổi do DHCP → máy khác mất kết nối | Đặt IP tĩnh hoặc DHCP reservation |
| Mất dữ liệu do không backup | Script backup tự động định kỳ (hàng ngày), lưu ngoài máy chủ |
| Thay đổi schema sau khi đã có dữ liệu thật gây lệch/mất dữ liệu | Migration đánh version từ đầu, bảng `schema_migrations` theo dõi version đã áp dụng |

## 10. Open Questions

- ~~Danh sách vai trò (4.1) đã đủ chưa~~ — **đã giải quyết 2026-08-01**: chuyển sang vai trò động, Admin tự tạo vai trò mới tùy nhu cầu thực tế (vd "Nhân viên bán hàng" có thể tạo sau khi module Bán hàng/POS được lên kế hoạch).
- **Module Bán hàng/POS (mục 4.9) — cần buổi trao đổi yêu cầu riêng trước khi lên kế hoạch kỹ thuật**: quy trình bán hàng có thay thế "xuất kho" (4.3) hay là luồng riêng song song? Ai sử dụng (Thủ kho, hay vai trò mới)? Có giỏ hàng/thanh toán tại quầy, quét mã vạch không? Làm sau khi xong Kho (Phase 2) và Công nợ (Phase 3).
- Có cần xuất báo cáo ra file Excel/PDF để gửi ngoài hệ thống không, hay xem trực tiếp trên web là đủ?
- Máy chủ có khả năng chạy 24/7 thực tế, hay thường xuyên tắt ngoài giờ làm việc (ảnh hưởng kỳ vọng về uptime)?
- Có kế hoạch mở rộng nhiều kho/chi nhánh trong tương lai không? (Nếu có, cần tính trước ở schema, dù chưa làm ngay.)

## 11. Appendix

**Component boundaries:**
```
frontend/  → HTML/CSS/JS, gọi API qua fetch
backend/
  routes/       → định tuyến theo module (auth, kho, xuất-nhập, công-nợ, báo-cáo)
  middleware/   → auth + kiểm tra role
  services/     → logic nghiệp vụ (transaction cho xuất/nhập kho)
  db/           → better-sqlite3, WAL, migrations có version
  data.db       → file SQLite (backup định kỳ)
```

**Bảng dữ liệu chính (draft):** `users`, `roles`, `role_permissions`, `products`, `stock_movements`, `stock_receipts` (phiếu nhập), `stock_issues` (phiếu xuất), `partners` (NCC + khách hàng), `customer_categories` (loại khách hàng, 2026-08-01), `debt_ledger`, `warranties` (bảo hành, 2026-08-01), `cash_vouchers`/`cash_categories`/`cash_book_settings` (Sổ quỹ, 2026-08-02, độc lập với `debt_ledger`), `projects`/`project_members`/`project_phases`/`project_tasks`/`project_material_plan`/`project_payment_milestones`/`project_variations`/`project_phase_templates` (Quản lý dự án, 2026-08-04, chưa tạo), `company_settings`, `warehouse_settings`, `schema_migrations`.
