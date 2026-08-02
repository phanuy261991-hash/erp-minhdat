# PRD: Hệ thống Quản lý Kho & Công nợ nội bộ

**Version**: v1.5 — cập nhật 2026-08-02 (bổ sung 4.2 mục Import/Export Excel)
**Trạng thái**: Phase 1 → 4 đã hoàn thành toàn bộ (nền tảng, kho, công nợ, in phiếu, báo cáo) + nhiều mở rộng ngoài phase (Bảo hành, tách Khách hàng, Điều chỉnh công nợ, đóng gói portable, Sổ quỹ, Import/Export Excel sản phẩm). Phase 5 (Vận hành & Go-live) đang làm — xem trạng thái chính xác tại `docs/CURRENT.md`. Các mục 4.x vẫn có thể bổ sung khi phát sinh nhu cầu mới (xem `docs/DECISIONS.md`).

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
- **Tồn đầu kỳ**: dùng cơ chế phiếu nhập kho thông thường, không chọn nhà cung cấp, ghi chú rõ là "Nhập tồn đầu kỳ".
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

### 4.5 In phiếu xuất (bổ sung 2026-08-01 — hoàn thành)
- MVP: HTML + CSS `@media print` + `window.print()`, dùng máy in văn phòng thường (A4/A5) đã cài trên máy client — không cần thư viện PDF hay driver máy in nhiệt. Trang in (`print-issue.html`) độc lập, không dùng khung điều hướng chung.
- Nội dung phiếu: **toàn bộ thông tin công ty** đã cấu hình (tên, địa chỉ, điện thoại, mã số thuế, email, website, thông tin ngân hàng), thông tin khách hàng (tên, địa chỉ, điện thoại), danh sách sản phẩm/số lượng/đơn giá/chiết khấu/**đơn giá sau chiết khấu** (bổ sung 2026-08-01, tính bằng đơn giá × (1 − % chiết khấu) — chỉ hiển thị tính toán, không đổi cách lưu `unit_price` gốc), tổng tiền, người lập phiếu, chỗ ký người giao/người nhận hàng.
- **Ghi chú in phiếu** (bổ sung 2026-08-01, theo yêu cầu người dùng kèm mẫu phiếu thật): 1 đoạn văn bản tự do hiển thị dưới bảng kê sản phẩm (vd điều kiện bảo hành, chính sách đổi/trả hàng) — cấu hình được qua trang Thông tin công ty (mục 4.7), không hardcode.

### 4.6 Báo cáo (bổ sung 2026-08-01 — hoàn thành)
- Báo cáo tồn kho hiện tại theo sản phẩm, kèm giá vốn (bình quân gia quyền) và giá trị tồn, tổng giá trị toàn kho.
- Báo cáo mua hàng (nhập kho)/bán hàng (xuất kho) theo tháng — 6 tháng gần nhất, kèm % tăng trưởng so với tháng trước.
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
- Vô hiệu hóa/mở lại: mọi người có quyền module `cong_no`. **Xóa cứng chỉ Admin** — khác các đối tượng khác trong hệ thống vốn thường cho phép xóa nếu chưa có lịch sử, ở đây xóa luôn bị giới hạn Admin theo đúng yêu cầu.
- **Giao diện chi tiết khách hàng** (trang mới `customer-detail.html`, chưa có trước đây): hiển thị thông tin cơ bản khách hàng + toàn bộ bản ghi bảo hành của khách hàng đó dưới dạng **Card**, mỗi card hiện "Số ngày còn lại" (số lớn, đổi màu theo mức độ khẩn cấp: còn nhiều — xanh, ≤30 ngày — cam, đã hết hạn — đỏ) và "Ngày hết hạn" cụ thể, lấy trực tiếp từ dữ liệu bảo hành (không lưu số ngày còn lại cố định — luôn tính lại từ ngày hết hạn tại thời điểm xem, đúng nguyên tắc không lưu giá trị suy ra được của dự án).

### 4.11 Sổ quỹ (bổ sung 2026-08-02, theo yêu cầu người dùng)
- Quản lý dòng tiền mặt của doanh nghiệp qua **phiếu thu** và **phiếu chi**, độc lập hoàn toàn với module Công nợ (mục 4.4) — không tự động ghi/giảm công nợ đối tác nào, không liên kết danh sách Nhà cung cấp/Khách hàng có sẵn (trường "Đối tượng nộp/nhận" chỉ là tên tự do).
- Mỗi phiếu gồm: mã tự sinh (`PT000001...` cho phiếu thu, `PC000001...` cho phiếu chi, riêng từng loại), thời gian (chỉnh được, quyết định phiếu thuộc tháng nào), Loại thu/chi (chọn từ danh mục "Loại thu chi" — có thể tạo nhanh ngay trên form lập phiếu, không cần rời sang trang riêng), Người thu/chi (chọn 1 tài khoản người dùng, mặc định tài khoản đang đăng nhập), Tên người nộp/nhận (tự do, không bắt buộc), Số tiền, Ghi chú, cờ "Hạch toán kết quả kinh doanh" (hiện chỉ lưu, chưa có báo cáo lãi/lỗ nào dùng đến).
- **Quỹ đầu kỳ**: nhập 1 lần duy nhất (số dư tiền mặt thực tế lúc bắt đầu dùng module) — các tháng sau tự động cộng dồn từ lịch sử phiếu, không nhập lại từng tháng.
- Danh sách phiếu mặc định hiển thị **tháng hiện tại** (tự làm mới khi sang tháng mới, không cần thao tác), xem lại tháng cũ qua bộ lọc Tháng/Năm. Thanh tổng hợp Quỹ đầu kỳ/Tổng thu/Tổng chi/Tồn quỹ của đúng tháng đang xem — tất cả tính trực tiếp từ tổng cộng dồn (đúng nguyên tắc ledger xuyên suốt dự án), không lưu số dư cố định.
- **Phiếu thu/chi không sửa được sau khi tạo, chỉ xóa cứng** (khác nguyên tắc "chỉ tạo phiếu điều chỉnh bù trừ" của Kho/Công nợ — vì module này không có gì tham chiếu ngược, không cần giữ vết như ledger). Quyền tạo/xóa chỉ cần quyền module `so_quy`, không phân biệt theo hành động (đúng triết lý phân quyền theo module, mục 4.1).
- Danh mục "Loại thu chi": quản lý riêng (thêm/sửa/xóa), mỗi loại gắn cố định 1 chiều (Thu hoặc Chi); không xóa được nếu đã có phiếu dùng loại đó.

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

**Bảng dữ liệu chính (draft):** `users`, `roles`, `role_permissions`, `products`, `stock_movements`, `stock_receipts` (phiếu nhập), `stock_issues` (phiếu xuất), `partners` (NCC + khách hàng), `customer_categories` (loại khách hàng, 2026-08-01), `debt_ledger`, `warranties` (bảo hành, 2026-08-01), `cash_vouchers`/`cash_categories`/`cash_book_settings` (Sổ quỹ, 2026-08-02, độc lập với `debt_ledger`), `company_settings`, `warehouse_settings`, `schema_migrations`.
