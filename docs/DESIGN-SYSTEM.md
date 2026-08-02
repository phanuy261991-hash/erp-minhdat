# Design System

> Tạo bằng skill `ui-ux-pro-max` (2026-07-31). Đây là chuẩn tham chiếu bắt buộc cho **mọi trang giao diện** từ Phase 1 trở đi — không tự ý phá cách khi làm trang mới, trừ khi người dùng yêu cầu đổi.

## Style

**Soft UI Evolution** — hiện đại, chuyên nghiệp, thân thiện. Có chiều sâu nhẹ (soft shadow), bo góc vừa phải, tương phản tốt (WCAG AA+). Tránh: trang trí thừa, shadow phức tạp, hiệu ứng 3D.

## Màu sắc (CSS variables — định nghĩa tại `frontend/assets/style.css`)

| Vai trò | Hex | Biến CSS | Dùng cho |
|---|---|---|---|
| Primary | `#2563EB` | `--color-primary` | Nút chính, link, focus ring |
| Primary Dark | `#1D4ED8` | `--color-primary-dark` | Hover/active của primary |
| Secondary | `#3B82F6` | `--color-secondary` | Nhấn phụ, gradient |
| Accent | `#059669` | `--color-accent` | Trạng thái tích cực: còn hàng, đã thanh toán, thành công |
| Destructive | `#DC2626` | `--color-destructive` | Cảnh báo, hủy, nợ quá hạn, xóa |
| Background | `#F8FAFC` | `--color-background` | Nền trang |
| Foreground | `#0F172A` | `--color-foreground` | Chữ chính |
| Muted | `#F1F5FD` | `--color-muted` | Nền phụ, hàng xen kẽ trong bảng |
| Muted Foreground | `#64748B` | `--color-muted-foreground` | Chữ phụ, label, placeholder |
| Border | `#E4ECFC` | `--color-border` | Viền input, card, divider |
| Ring | `#2563EB` | `--color-ring` | Focus ring (accessibility) |

**Nguyên tắc**: không dùng màu chỉ để truyền đạt thông tin (vd trạng thái nợ) — luôn kèm icon/chữ. Không hardcode mã hex trực tiếp trong component — luôn qua biến CSS ở trên.

## Typography

- **Heading**: Be Vietnam Pro (500/600/700)
- **Body**: Open Sans (400/500/600/700)
- **Host offline**: file `.woff2` tải sẵn tại `frontend/assets/fonts/`, nạp qua `frontend/assets/fonts/fonts.css` (được `style.css` `@import`). Không phụ thuộc internet khi dùng thật trong LAN.
- **Lý do đổi từ Poppins sang Be Vietnam Pro**: bản Poppins do Google Fonts phục vụ **không có subset tiếng Việt đầy đủ** (thiếu dải `U+1EA0–U+1EF1`, chứa phần lớn ký tự có dấu như ạ, ậ, ợ, ữ) — nếu dùng sẽ bị lẫn font khi hiển thị chữ có dấu. Be Vietnam Pro và Open Sans đều có subset `vietnamese` đầy đủ (`U+1EA0-1EF9`), đã xác minh trực tiếp từ file CSS Google Fonts trước khi tải về.
- Cỡ chữ cơ bản: 16px, line-height 1.5. Thang chữ: 13 / 14 / 16 / 20 / 24 / 32px.
- **Lưu ý khi thêm font mới sau này**: luôn kiểm tra subset `vietnamese` có tồn tại và bao phủ `U+1EA0-1EF9` trước khi chọn, tránh lặp lại lỗi Poppins.

## Icon

- **Không dùng emoji làm icon chức năng.** Dùng SVG outline, stroke-width nhất quán (1.8px), kích thước chuẩn 16/18/20/24px.
- Vì frontend không có build step/npm package cho icon (theo `CLAUDE.md`), icon dùng chung được định nghĩa 1 lần tại `frontend/assets/icons.js` (hàm `icon(name, size)`), gọi lại ở mọi trang thay vì lặp lại markup SVG. `login.html` (trang đầu tiên, viết trước khi có `icons.js`) vẫn giữ SVG inline — không bắt buộc refactor lại trừ khi tiện thể sửa trang đó.

## Khung điều hướng (áp dụng cho mọi trang sau khi đăng nhập)

- `frontend/assets/layout.js` là nguồn cấu hình duy nhất cho sidebar: mảng `NAV_GROUPS` (nhóm menu + từng mục kèm `enabled` — trang chưa xây xong thì để `enabled: false`, phase sau chỉ cần đổi thành `true`).
- Mỗi trang (`dashboard.html`, `users.html`, ...) có khung tối thiểu: `<aside id="sidebar">` (được `layout.js` tự render) + `<main class="app-content">` (nội dung riêng của trang), nạp theo thứ tự `api.js` → `icons.js` → `layout.js` → script riêng của trang, rồi gọi `initLayout('key-cua-trang')`.
- Sidebar lọc menu, thu gọn được (chỉ còn icon), lưu trạng thái qua `localStorage`.
- `initLayout` tự chuyển hướng về `dashboard.html` nếu user hiện tại không có quyền vào trang đang truy cập — đây **chỉ là cải thiện trải nghiệm phía client**, không thay thế cho việc chặn thật ở API (`requireAuth` + `requirePermission` phải luôn có ở backend cho mọi route nhạy cảm).
- `login.html` chỉ còn là màn hình đăng nhập thuần — đăng nhập xong luôn chuyển hướng sang `dashboard.html`, không hiển thị nội dung sau đăng nhập ngay trong trang login.
- Mỗi mục `NAV_GROUPS` khai báo 1 `module` (module_key, hoặc `null` nếu hiện với mọi tài khoản đã đăng nhập như "Tổng quan") — lọc menu bằng `user.permissions.includes(item.module)` (permissions lấy từ `GET /api/auth/me`). Đã sửa 2026-08-01, thay cho cơ chế cũ `item.roles.includes(user.role)` (hỏng từ khi Phase 1.6 đổi backend sang trả `role_id`/`permissions`, không còn `user.role`).

## Bảng dữ liệu (dùng cho mọi danh sách: người dùng, sản phẩm, phiếu, công nợ...)

- Dùng class `.data-table-wrap` + `.data-table` đã định nghĩa sẵn trong `style.css`.
- Ô dữ liệu dùng `white-space: nowrap` — **không để chữ tự xuống dòng trong bảng** (từng gây lỗi hiển thị xấu khi test thực tế), nếu nội dung quá dài thì cắt bằng `text-overflow: ellipsis` kèm `title` thay vì để wrap.
- Trạng thái dùng `.badge`/`.badge-active`/`.badge-inactive` (có màu + chữ, không dùng màu đơn thuần).
- Nút hành động trong bảng dùng `.icon-btn` (kèm `.icon-btn-danger` cho hành động phá hủy/khóa, `:disabled` khi không được phép thao tác — ví dụ tự khóa chính mình).
- **Nút hành động chính đầu trang** (vd "Thêm sản phẩm"/"Thêm tài khoản"/"Thêm vai trò"/"Lập phiếu nhập"): dùng `.btn-add` (nền gradient xanh đậm + shadow, giống độ nổi bật của `.btn-primary`) — **không dùng `.icon-btn`** cho nút này (`.icon-btn` chỉ dành cho hành động nhỏ trong bảng như Sửa/Khóa, quá mờ nhạt cho hành động chính của cả trang). Đã chốt 2026-07-31 sau khi người dùng phản hồi nút "Thêm sản phẩm" không nổi bật — áp dụng đồng bộ lại cho cả `users.html`/`roles.html`.
- **Tìm kiếm + sắp xếp trong bảng** (bổ sung 2026-07-31, `products.html`): ô tìm kiếm dùng `.search-box`/`.search-input` (icon kính lúp trong input, tái dùng cấu trúc `.input-wrap`/`.input-icon` của `login.html`) đặt trong `.page-header-actions` cùng hàng với nút `.btn-add`. Cột có thể sắp xếp dùng `.sortable-th` (con trỏ pointer, icon mũi tên `chevronUp`/`chevronDown` đổi theo chiều, mờ khi chưa active).
- **Cảnh báo tồn kho thấp** (`products.html`): dùng class `.stock-low` (chữ đậm + icon tam giác cảnh báo, màu `--color-warning: #b45309` — tông amber riêng, **khác hẳn** màu xám của `.badge-inactive` và xanh của `.badge-active` để không lẫn khi cả 2 loại cảnh báo cùng xuất hiện trên 1 dòng). Không dùng nền pastel nhạt cho cảnh báo này — cần nổi bật hơn badge trạng thái thông thường vì mang tính hành động (cần nhập thêm hàng).

## Form nhiều dòng động + tìm kiếm gợi ý (dùng cho phiếu nhập/xuất kho)

> Bổ sung 2026-07-31 khi làm `stock-receipts.html`. Áp dụng cho mọi phiếu có danh sách dòng sản phẩm động (Nhập kho, Xuất kho, sau này có thể cả module Bán hàng).

- **Modal rộng cho form nhiều cột**: dùng `class="modal-card modal-card-lg"` (880px, thay vì mặc định 420px của `.modal-card`) khi form có bảng dòng động hoặc nhiều trường — không tự chỉnh width riêng lẻ cho từng trang.
- **Combobox tìm sản phẩm** (`.combobox`/`.combobox-suggestions`/`.combobox-option`): thay cho `<select>` thường vì danh mục sản phẩm có thể nhiều — gõ để lọc theo mã/tên, click chọn từ danh sách gợi ý (tối đa ~8 kết quả), tự đóng khi bấm ra ngoài. Chỉ hiện sản phẩm `is_active=1`.
- **Bảng dòng động** (`.item-rows-header`/`.item-rows`/`.item-row`, grid nhiều cột cố định theo px + 1 cột `1fr` cho tên sản phẩm): mỗi dòng có nút xóa riêng (`.item-row-remove`, giữ tối thiểu 1 dòng), nút `.btn-add-row` để thêm dòng mới. Trường chỉ-đọc tự động điền (vd đơn vị tính lấy từ hồ sơ sản phẩm khi chọn) hiển thị bằng `<div>` tĩnh (`.item-unit-display`), không phải `<input readonly>`, để không tạo cảm giác có thể sửa.
- **Tính tổng trực tiếp**: thành tiền từng dòng (`.item-line-total`) và tổng thành tiền toàn phiếu (`.receipt-total-row`, chữ lớn + màu primary để nổi bật) cập nhật ngay khi người dùng gõ số lượng/đơn giá/chiết khấu — không chờ submit mới tính.

## Chọn 1 trong nhiều phương án có mô tả dài (khác với lưới chọn nhiều mục ngắn)

> Bổ sung 2026-07-31 khi làm phần chọn phương pháp tính giá vốn (`warehouse-settings.html`). **Khác với** mục "Bài học khi làm lưới chọn nhiều mục" bên dưới (dùng cho chip ngắn gọn kiểu tên module) — pattern này dành cho khi mỗi lựa chọn cần kèm 1-2 dòng mô tả giải thích, và chỉ chọn được 1 trong nhiều.

- Dùng `.method-group` (card xếp dọc, không phải lưới ngang) chứa các `.method-option` (radio ẩn + `.method-option-radio` vẽ tay dạng chấm tròn + tiêu đề đậm + mô tả màu muted bên dưới). Trạng thái chọn: viền + nền `--color-muted` + chấm radio fill màu primary (qua `:has()`), không fill toàn bộ card bằng gradient như `.module-option` — vì card ở đây chứa nhiều chữ, fill đặc cả nền sẽ giảm độ tương phản đọc mô tả.

## Bố cục ngang cho form (form-row) — ghép trường ngắn thay vì xếp dọc

> Bổ sung 2026-07-31 theo phản hồi người dùng sau khi xem `stock-receipts.html` — form xếp toàn bộ trường theo chiều dọc (mỗi trường 1 dòng) làm modal bị kéo dài không cần thiết.

- Dùng `.form-row` (flex row, gap 16px) bọc 2 `.form-field` ngắn (ngày giờ, mã, dropdown, text ngắn) để chúng nằm cùng 1 hàng, giãn theo chiều ngang thay vì xếp chồng theo chiều dọc.
- **Chỉ áp dụng cho trường ngắn.** Giữ nguyên 1 trường/dòng (không bọc `.form-row`) cho nội dung cần toàn bộ chiều rộng: ghi chú nhiều chữ, bảng dòng sản phẩm động, danh sách chọn nhiều mục.
- Áp dụng cho **mọi form nhập liệu mới từ giờ trở đi** (Xuất kho, Đối tác, Công nợ...), không chỉ riêng phiếu nhập kho.

## Modal xem chi tiết (chỉ đọc) — vd chi tiết phiếu nhập/xuất kho

> Bổ sung 2026-07-31 khi làm modal xem chi tiết phiếu nhập/xuất kho (`receipt-detail.js`/`issue-detail.js`, dùng chung giữa trang danh sách phiếu và trang chi tiết sản phẩm).

- `.detail-info-grid`/`.detail-info-item` (lưới 2 cột, `.detail-label` chữ nhỏ viết hoa màu muted + `.detail-value` chữ thường): hiển thị thông tin chỉ đọc dạng label-value — cố ý **không** dùng khung `<input>` như `.form-field`, để người dùng không nhầm là có thể sửa được (nguyên tắc "read-only phải khác biệt rõ với input"). `.full-width` cho trường cần chiếm cả 2 cột (ghi chú, liên kết phiếu điều chỉnh dài).
- `.table-link-btn`: nút dạng link (không viền/nền, chỉ đổi màu primary + gạch chân khi hover) dùng trong ô bảng để mở modal chi tiết — vd bấm mã phiếu trong cột "Mã phiếu" ở lịch sử nhập/xuất của trang chi tiết sản phẩm.
- Modal dùng `.modal-card-lg` (giống form lập phiếu) + bảng dòng sản phẩm tái dùng `.data-table` thường (khác `.item-row` của form lập phiếu vì không cần chỉnh sửa) + `.receipt-total-row` cho tổng tiền.
- Đóng bằng nút "Đóng" (`.btn-secondary`) trong `.modal-actions` — không dùng nút X góc trên, nhất quán với mọi modal khác trong dự án.
- **Số liệu cần nổi bật trong modal chỉ đọc** (bổ sung 2026-07-31, vd "Cần thanh toán"/"Cần thu" ở modal lịch sử công nợ): dùng `.stat-card`/`.stat-grid` (chữ lớn 26px, giống trang Tổng quan) thay vì `.detail-info-item` (chữ thường) cho con số quan trọng nhất màn hình — kèm modifier `.stat-card-value--warning` (màu `--color-warning`) khi số liệu cần chú ý ngay (còn nợ > 0). Đặt cạnh 1 số liệu tham chiếu khác (vd tổng tiền đã giao dịch) trong cùng `.stat-grid` để so sánh trực quan, không tách riêng từng số 1 hàng.

## Toggle switch tái dùng trong form nhập liệu (không chỉ trang cấu hình)

> Bổ sung 2026-07-31 khi làm toggle `payment_status` ở phiếu nhập/xuất kho. Tái dùng nguyên `.switch`/`.setting-row` đã chốt ở mục "Trang cấu hình" bên dưới — **không tạo pattern mới** dù ngữ cảnh khác (trong 1 phiếu đang lập, không phải trang cấu hình riêng). Khác biệt duy nhất: giá trị áp dụng cùng lúc khi submit cả phiếu, không có nút "Lưu" riêng cho từng mục.
>
> **Sửa lỗi spacing (2026-07-31, phát hiện khi dùng lại `.setting-row` trong form)**: `.setting-row` ban đầu không có `margin-bottom`, chỉ dựa vào `.setting-row + .setting-row { margin-top: 10px }` để tách các dòng liên tiếp trong trang cấu hình — nên khi đặt 1 `.setting-row` đơn lẻ ngay trước 1 `.form-field` khác (như trong form phiếu), 2 phần tử dính sát nhau (0px). Đã thêm `margin-bottom: 14px` trực tiếp vào `.setting-row` để tự đủ khoảng cách trong mọi ngữ cảnh, không phụ thuộc phần tử liền sau là gì.

## Trang in (print-issue.html) — độc lập, không dùng khung điều hướng chung

> Bổ sung 2026-08-01 khi làm trang in phiếu xuất kho (Phase 4). Khác với mọi trang khác trong dự án — không có `<aside id="sidebar">`, không gọi `initLayout()`, vì mục đích là tạo bản in sạch để đưa ra máy in, không phải điều hướng trong ứng dụng.

- `.print-body`/`.print-sheet`: khung trang giả lập tờ giấy (nền trắng, bo góc, shadow nhẹ trên màn hình) — khi in (`@media print`) bỏ hết bo góc/shadow/nền xám, chỉ còn nội dung.
- `.no-print`: đánh dấu phần tử chỉ hiện trên màn hình (nút "In phiếu", nút "Quay lại", thông báo lỗi) — ẩn hoàn toàn khi in (`display: none !important` trong `@media print`).
- Không ép khổ giấy cụ thể qua `@page { size }` — chỉ đặt `margin`, để trình duyệt/máy in dùng đúng khổ giấy người dùng đã chọn (A4/A5 tùy máy in thực tế, đúng PRD 4.5).
- Nút "In phiếu" gọi thẳng `window.print()` — không dùng thư viện PDF nào.
- Thông tin công ty hiển thị **từng dòng ẩn riêng nếu trống** (không để dòng trắng thừa nếu chưa cấu hình email/website/ngân hàng...) — dùng hàm dùng chung `renderCompanyLine()` set `hidden` theo có/không có dữ liệu, không phải ẩn cả khối.

## Biểu đồ báo cáo (reports.html) — cột SVG tự vẽ tay, không dùng thư viện ngoài

> Bổ sung 2026-08-01 khi làm trang Báo cáo (Phase 4). Quyết định có chủ đích không dùng Chart.js hay bất kỳ thư viện biểu đồ nào — nhất quán với nguyên tắc dự án không phụ thuộc CDN/build step (đã áp dụng cho font từ Phase 1, icon từ `icons.js`). Đã tham khảo skill `dataviz` trước khi thiết kế.

- Mỗi biểu đồ chỉ vẽ **1 chuỗi số liệu** (1 màu, không cần chú thích/legend — theo skill `dataviz`: "1 chuỗi không cần legend"). Nếu cần so sánh 2 chỉ số khác nhau (vd mua hàng vs bán hàng), dùng **2 biểu đồ riêng** đặt cạnh nhau thay vì gộp chung 1 biểu đồ 2 màu — tránh vi phạm quy tắc "không dùng 2 trục y" khi 2 chỉ số có thang giá trị khác nhau.
- Cột bo góc **chỉ ở đỉnh, vuông ở đáy** (chạm baseline) — `<rect rx>` của SVG bo tất cả 4 góc nên không dùng được, phải tự vẽ `<path>` (xem hàm `roundedTopBarPath()` trong `reports.js`).
- Nhãn giá trị rút gọn (vd "2.2tr", "1.5 tỷ") chỉ hiện ở cột cuối cùng (kỳ hiện tại) để tránh rối mắt — các cột khác xem qua `<title>` (tooltip gốc trình duyệt khi hover), không cần xây dựng tooltip HTML riêng cho biểu đồ đơn giản này.
- `.stat-delta`/`.stat-delta--up`/`.stat-delta--down`: nhãn % tăng/giảm so với kỳ trước, luôn kèm icon mũi tên (`chevronUp`/`chevronDown`) — không dựa màu sắc đơn thuần (đúng nguyên tắc accessibility, xem skill `dataviz`).
- Màu cột lấy trực tiếp từ CSS variable đã có (`var(--color-primary)` cho "mua hàng", `var(--color-accent)` cho "bán hàng") qua thuộc tính `fill` — không định nghĩa màu biểu đồ riêng, để đổi theme sau này (nếu có) tự động áp dụng.

## Trang cấu hình (settings) — vd Thông tin công ty, Cấu hình kho

> Mọi trang cấu hình mới trong tương lai phải dùng lại đúng các class dưới đây, không tự vẽ layout riêng (đã chốt với người dùng 2026-08-01 sau khi lặp lại nhiều lần trên `warehouse-settings.html`).

- `.settings-card`: khung card chứa 1 nhóm cấu hình (nền trắng, bo góc lớn, shadow). Nếu trang có nhiều nhóm cần hiển thị song song để tận dụng chiều ngang và tránh cuộn dọc (vd nhiều trường như "Thông tin công ty"), bọc nhiều `.settings-card` trong `.settings-columns` (grid nhiều cột, `align-items: start` để card thấp không bị kéo giãn theo card cao).
- `.settings-section-title`: tiêu đề nhóm cấu hình, đặt là con đầu tiên trong `.settings-card`.
- `.setting-row`: 1 mục cấu hình dạng bật/tắt hoặc thông tin ngắn — **có khung viền bo góc + nền `--color-muted` riêng** (không chỉ kẻ đường phân cách mờ giữa các dòng) để phân biệt rõ từng mục khi số lượng tăng lên, đặc biệt quan trọng vì các trang cấu hình được thiết kế để mở rộng dần theo thời gian (xem `docs/PRD.md` mục 4.8). Nhiều `.setting-row` trong cùng nhóm cách nhau bằng `margin-top`, không dùng border giữa các dòng.
- `.switch`: toggle bật/tắt tự vẽ (không dùng checkbox mặc định của trình duyệt) — track fill gradient (dùng lại đúng gradient `.btn-primary`) + shadow khi bật, có viền + shadow nhẹ khi tắt (tránh nhìn phẳng/nhợt nhạt).
- `.repeatable-list` + `.repeatable-add-btn` + `.repeatable-remove-btn`: danh sách nhập lặp lại (vd nhiều số điện thoại) — nút thêm viền nét đứt, mỗi dòng có nút xóa riêng.
- `.empty-state`: dùng cho trang/khung chưa có nội dung (vd "Cấu hình bán hàng" — khung menu trống theo PRD 4.9) — luôn có icon + tiêu đề + mô tả lý do, không để trắng trơn.
- `textarea` trong `.form-field` (bổ sung 2026-08-01, vd "Ghi chú in phiếu" ở Thông tin công ty): dùng chung style với `input`/`select` (`.form-field input, .form-field select, .form-field textarea`), chỉ thêm `resize: vertical` (không cho kéo giãn ngang, phá bố cục) — không tạo class riêng cho textarea.
- **Quy tắc lưu bắt buộc**: mọi thay đổi trên trang cấu hình chỉ áp dụng sau khi bấm nút "Lưu thay đổi" (`.settings-actions .btn-primary`) — không tự động lưu khi người dùng bật/tắt hay gõ vào ô nhập.

### Bài học khi làm lưới chọn nhiều mục (vd chọn module cho vai trò)

Đã thử qua 3 phiên bản trước khi chốt (xem `frontend/roles.html`/`roles.js`, class `.module-grid`/`.module-option`):
1. Checkbox mặc định của trình duyệt — quá xấu, không đồng bộ style.
2. Chip tự co theo độ dài tên + bo tròn hết cỡ (`border-radius: 999px`) — chip ngắn ("Kho") bị bo tròn thành khối tròn phồng, chip dài ("Người dùng") mới ra đúng hình viên thuốc — **kích thước lệch nhau, nhìn không chuyên nghiệp**.
3. **Chốt**: lưới ô **đều nhau** (`grid-template-columns: repeat(auto-fill, minmax(126px, 1fr))`), bo góc chuẩn `var(--radius-sm)` (8px, không bo tròn hết cỡ), trạng thái chọn fill gradient đặc + shadow. Checkbox ẩn + icon check hiện qua `:has()` — phải đặt `display: flex; align-items: center; line-height: 1` ngay trên hàng chứa cả icon và text để tránh bị lệch dòng do dấu tiếng Việt, và **cẩn thận CSS selector trùng** (vd `.form-field label { display: block }` từng đè mất `display: flex` của `.module-option` vì cùng là thẻ `<label>` — sửa bằng `.form-field > label` giới hạn con trực tiếp).

**Kết luận dùng chung**: khi cần chọn nhiều mục cùng loại hiển thị theo nhóm, luôn dùng lưới ô đều nhau kiểu trên — không dùng chip tự co giãn bo tròn hết cỡ.

## Trang Tổng quan (dashboard.html) — hero chào + card "bento" + truy cập nhanh

> Bổ sung 2026-08-01, thiết kế lại bằng skill `ui-ux-pro-max` theo yêu cầu người dùng ("sinh động và hiện đại hơn").

- **`.dashboard-hero`**: icon vuông bo góc lớn (56px, gradient primary→secondary, giống `.btn-add`) + lời chào động (`Xin chào {buổi sáng/chiều/tối}, {họ tên}!` — tính theo giờ **hệ thống máy chủ**, không phải giờ trình duyệt) + ngày tháng tiếng Việt đầy đủ thứ (vd "Thứ Bảy, 01/08/2026"). Icon đổi mặt trời/mặt trăng theo khung giờ.
- **`.dashboard-card`** (thay `.stat-card` cho trang Tổng quan): card **bấm được**, điều hướng thẳng sang trang danh sách tương ứng (Sản phẩm/Khách hàng/Nhà cung cấp) — icon vuông màu riêng từng thẻ (`--primary`/`--accent`/`--warning`, nền pha loãng 10%), số liệu lớn, dòng link kèm mũi tên trượt nhẹ khi hover (`transform: translateX`), card nổi lên (`translateY(-3px)`) + đậm shadow khi hover. Số liệu lấy trực tiếp từ API danh sách đã có (`GET /products`, `GET /partners?type=`), không thêm API riêng vì chỉ là đếm số lượng.
- **`.quick-links`**: lưới nút link nhanh tới các thao tác hay dùng (Nhập kho, Xuất kho, Bảo hành, Báo cáo) — **lọc theo đúng quyền module** của tài khoản đang đăng nhập (giống cách `layout.js` lọc `NAV_GROUPS`), tự ẩn cả tiêu đề "Truy cập nhanh" nếu tài khoản không có quyền nào trong danh sách.
- Vẫn dùng đúng token màu/font/radius/shadow đã chốt — không thêm màu mới, chỉ dùng lại `--color-primary`/`--color-accent`/`--color-warning` với nền pha loãng cho icon.

## Trang "Thông tin phần mềm" (about.html) — card trung tâm nổi bật

> Bổ sung 2026-08-01, thiết kế bằng skill `ui-ux-pro-max` theo yêu cầu người dùng.

- `.about-card`: 1 card **trung tâm duy nhất** (max-width 480px, `margin: auto`) thay vì trình bày dạng danh sách text — icon app lớn (72px, gradient giống `.dashboard-hero-icon`) ở trên, tên phần mềm, mô tả ngắn, badge phiên bản (pill nền `--color-accent` pha loãng), `<hr>` phân cách, rồi đến khối bản quyền (chữ nhỏ, muted, tên người giữ bản quyền in đậm nổi bật).
- Vào menu qua nhóm "Cấu hình" (`about.html`), `module: null` trong `layout.js` — mở cho **mọi tài khoản đã đăng nhập**, không giới hạn quyền vì chỉ là thông tin tĩnh, không nhạy cảm.
- Dòng bản quyền ngắn (`© {năm} Bản quyền thuộc về ...`) còn lặp lại ở **footer sidebar** (`.sidebar-copyright`, render 1 lần trong `layout.js` nên tự có mặt trên mọi trang) — tự ẩn khi thu gọn sidebar (dùng chung class `.label` như các mục menu khác).

### Sự cố phát sinh khi thêm dòng bản quyền vào sidebar (đáng lưu ý)

- **Sidebar tràn khỏi màn hình khi menu dài**: `.sidebar` trước đây chỉ có `display:flex; flex-direction:column` không có `height` riêng, dựa vào `.app-layout{min-height:100vh}` để "stretch" — nhưng stretch chỉ set kích thước ban đầu, nội dung dài hơn 100vh (nay đã hơn 20 mục menu) vẫn tự tràn ra ngoài, đẩy phần footer (thông tin user + bản quyền) ra ngoài vùng nhìn thấy mà không cuộn tới được. Đã sửa: `.sidebar{height:100vh; position:sticky; top:0}` + `.sidebar-nav{flex:1; min-height:0; overflow-y:auto}` — menu tự cuộn riêng, footer luôn cố định hiện đủ.
- **Icon menu biến mất khi thu gọn sidebar**: sau khi thêm `overflow-y:auto` ở trên, thanh cuộn dọc xuất hiện chiếm bớt bề ngang vốn đã rất hẹp (60px khi thu gọn) — SVG icon trong `.nav-item` (không có CSS `width` riêng, chỉ có attribute `width`/`height`) bị thuật toán flexbox shrink về `0px` khi container hết chỗ. Sửa bằng `.nav-item svg{flex-shrink:0}` — icon luôn giữ đúng kích thước dù container hẹp. **Bài học**: SVG đặt trong flex container hẹp luôn cần `flex-shrink:0` tường minh, không thể tin tưởng kích thước mặc định.
- **`.stat-grid` dính sát `.data-table-wrap` phía sau** (vd trang Báo cáo, mục "Tồn kho hiện tại" không có `.section-heading` chen giữa 2 khối): `.stat-grid` chưa từng có `margin-bottom`, các trang khác "vô tình" không lộ bug vì luôn có `.section-heading` (đã có `margin-top`) ngay sau. Đã thêm `margin-bottom: 24px` cho `.stat-grid` — an toàn vì margin dọc giữa 2 sibling tự collapse lấy giá trị lớn hơn, không cộng dồn với margin-top của phần tử theo sau.

## Hiệu ứng & Animation

- Border-radius: 8–12px cho input/button, 16–20px cho card lớn.
- Shadow: mềm, nhiều lớp nhẹ (không đổ bóng gắt).
- Transition: 150–300ms, ease-out khi xuất hiện.
- Tôn trọng `prefers-reduced-motion`.

## Nguyên tắc khả dụng (bắt buộc theo checklist skill)

- Tương phản chữ tối thiểu 4.5:1.
- Focus ring rõ ràng cho điều hướng bàn phím.
- `cursor: pointer` cho mọi phần tử có thể click.
- Label rõ ràng cho input (không chỉ dựa vào placeholder).
- Nút bấm có trạng thái loading/disabled rõ ràng khi xử lý bất đồng bộ.
- Vì chỉ tối ưu desktop (theo quyết định đã chốt), không bắt buộc responsive mobile, nhưng vẫn cần hoạt động tốt ở nhiều độ phân giải desktop phổ biến (1280px trở lên).

## Áp dụng

> Danh sách dưới đây chỉ để tra cứu nhanh trang nào đã áp dụng pattern nào — nguồn chính xác nhất luôn là đọc trực tiếp thư mục `frontend/`. Mọi trang trong dự án (kể cả trang mới nhất) đều đã áp dụng design system này, không có ngoại lệ.

- **2026-07-31**: `login.html`, `dashboard.html`, `users.html` (Phase 1/1.5); `products.html`, `product-detail.html`, `stock-receipts.html` (Phase 2 — pattern mới: `.btn-add`, `.search-box`/`.sortable-th`, `.stock-low`, `.method-group`, `.item-rows`/`.combobox`, `.form-row`); `stock-issues.html`, `partners.html`, `debts.html` (hoàn thiện Phase 2 + Phase 3).
- **2026-08-01**: `roles.html`, `company-settings.html`, `warehouse-settings.html`, `sales-settings.html` (Phase 1.6); `print-issue.html` (trang in độc lập, không dùng sidebar), `reports.html` (biểu đồ SVG tự vẽ) (Phase 4); `customers.html`, `customer-debts.html`, `customer-categories.html`, `customer-detail.html` (tách Khách hàng khỏi Đối tác); `warranties.html` (module Bảo hành, modal thêm/sửa); `dashboard.html` (redesign — hero chào + card bento + truy cập nhanh), `about.html` (Thông tin phần mềm); `setup.html` (thiết lập lần đầu qua giao diện, tái dùng CSS `.login-card`).
- Mọi trang mới từ giờ trở đi phải dùng lại đúng biến màu, font, spacing, khung điều hướng, class bảng dữ liệu, các class trang cấu hình, và các pattern form/bảng động ở trên để đồng bộ toàn hệ thống — không tự tạo style riêng cho từng trang.
