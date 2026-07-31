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

## Trang cấu hình (settings) — vd Thông tin công ty, Cấu hình kho

> Mọi trang cấu hình mới trong tương lai phải dùng lại đúng các class dưới đây, không tự vẽ layout riêng (đã chốt với người dùng 2026-08-01 sau khi lặp lại nhiều lần trên `warehouse-settings.html`).

- `.settings-card`: khung card chứa 1 nhóm cấu hình (nền trắng, bo góc lớn, shadow). Nếu trang có nhiều nhóm cần hiển thị song song để tận dụng chiều ngang và tránh cuộn dọc (vd nhiều trường như "Thông tin công ty"), bọc nhiều `.settings-card` trong `.settings-columns` (grid nhiều cột, `align-items: start` để card thấp không bị kéo giãn theo card cao).
- `.settings-section-title`: tiêu đề nhóm cấu hình, đặt là con đầu tiên trong `.settings-card`.
- `.setting-row`: 1 mục cấu hình dạng bật/tắt hoặc thông tin ngắn — **có khung viền bo góc + nền `--color-muted` riêng** (không chỉ kẻ đường phân cách mờ giữa các dòng) để phân biệt rõ từng mục khi số lượng tăng lên, đặc biệt quan trọng vì các trang cấu hình được thiết kế để mở rộng dần theo thời gian (xem `docs/PRD.md` mục 4.8). Nhiều `.setting-row` trong cùng nhóm cách nhau bằng `margin-top`, không dùng border giữa các dòng.
- `.switch`: toggle bật/tắt tự vẽ (không dùng checkbox mặc định của trình duyệt) — track fill gradient (dùng lại đúng gradient `.btn-primary`) + shadow khi bật, có viền + shadow nhẹ khi tắt (tránh nhìn phẳng/nhợt nhạt).
- `.repeatable-list` + `.repeatable-add-btn` + `.repeatable-remove-btn`: danh sách nhập lặp lại (vd nhiều số điện thoại) — nút thêm viền nét đứt, mỗi dòng có nút xóa riêng.
- `.empty-state`: dùng cho trang/khung chưa có nội dung (vd "Cấu hình bán hàng" — khung menu trống theo PRD 4.9) — luôn có icon + tiêu đề + mô tả lý do, không để trắng trơn.
- **Quy tắc lưu bắt buộc**: mọi thay đổi trên trang cấu hình chỉ áp dụng sau khi bấm nút "Lưu thay đổi" (`.settings-actions .btn-primary`) — không tự động lưu khi người dùng bật/tắt hay gõ vào ô nhập.

### Bài học khi làm lưới chọn nhiều mục (vd chọn module cho vai trò)

Đã thử qua 3 phiên bản trước khi chốt (xem `frontend/roles.html`/`roles.js`, class `.module-grid`/`.module-option`):
1. Checkbox mặc định của trình duyệt — quá xấu, không đồng bộ style.
2. Chip tự co theo độ dài tên + bo tròn hết cỡ (`border-radius: 999px`) — chip ngắn ("Kho") bị bo tròn thành khối tròn phồng, chip dài ("Người dùng") mới ra đúng hình viên thuốc — **kích thước lệch nhau, nhìn không chuyên nghiệp**.
3. **Chốt**: lưới ô **đều nhau** (`grid-template-columns: repeat(auto-fill, minmax(126px, 1fr))`), bo góc chuẩn `var(--radius-sm)` (8px, không bo tròn hết cỡ), trạng thái chọn fill gradient đặc + shadow. Checkbox ẩn + icon check hiện qua `:has()` — phải đặt `display: flex; align-items: center; line-height: 1` ngay trên hàng chứa cả icon và text để tránh bị lệch dòng do dấu tiếng Việt, và **cẩn thận CSS selector trùng** (vd `.form-field label { display: block }` từng đè mất `display: flex` của `.module-option` vì cùng là thẻ `<label>` — sửa bằng `.form-field > label` giới hạn con trực tiếp).

**Kết luận dùng chung**: khi cần chọn nhiều mục cùng loại hiển thị theo nhóm, luôn dùng lưới ô đều nhau kiểu trên — không dùng chip tự co giãn bo tròn hết cỡ.

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

- Đã áp dụng: `frontend/login.html`, `frontend/dashboard.html`, `frontend/users.html` (2026-07-31); `frontend/roles.html`, `frontend/company-settings.html`, `frontend/warehouse-settings.html`, `frontend/sales-settings.html` (2026-08-01, Phase 1.6).
- Các trang sau (Phase 2 trở đi) phải dùng lại đúng biến màu, font, spacing, khung điều hướng, class bảng dữ liệu, và các class trang cấu hình (mục "Trang cấu hình") ở trên để đồng bộ toàn hệ thống — không tự tạo style riêng cho từng trang.
