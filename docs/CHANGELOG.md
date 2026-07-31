# Lịch sử thay đổi

> Ghi theo thứ tự thời gian, mới nhất ở trên. Cập nhật sau khi hoàn thành mỗi module.

## 2026-08-01 (Phase 1.6 hoàn thành — frontend: Vai trò, Thông tin công ty, Cấu hình kho, Cấu hình bán hàng)

> Người dùng yêu cầu làm theo từng bước nhỏ, dừng chờ duyệt sau mỗi bước, và **gộp cập nhật docs một lần khi xong cả phase** thay vì sau mỗi bước (khác quy trình mặc định ở `CLAUDE.md`) — đây là lần cập nhật docs gộp cho toàn bộ phần còn lại của Phase 1.6.

- **Trang "Vai trò" (`frontend/roles.html`/`frontend/assets/roles.js`)**: danh sách vai trò (tên, chip module, badge "Mặc định hệ thống" cho Admin), modal tạo/sửa dùng chung, chọn module qua lưới ô đều nhau (không phải chip tự co giãn — xem bài học bên dưới), xóa có `confirm()`. Nút sửa/xóa tự vô hiệu hóa cho vai trò `is_protected`. Test qua trình duyệt thật: tạo/sửa/xóa vai trò phản ánh đúng ngay trên bảng; xóa test qua API trực tiếp (curl) vì `confirm()` bị chặn trong môi trường browser test tự động (không phải lỗi ứng dụng).
- **Trang "Thông tin công ty" (`frontend/company-settings.html`/`frontend/assets/company-settings.js`)**: form settings hiển thị trực tiếp (không qua modal), chia 2 card song song "Thông tin chung"/"Thông tin ngân hàng" để lấp đầy chiều ngang trang và tránh phải cuộn (`.settings-columns`, sau khi người dùng phản ánh bản đầu có khoảng trắng bên phải). Thông báo lưu thành công/lỗi rõ ràng (`.alert-success` mới, tái dùng `--color-accent`).
  - **Bổ sung ngoài phạm vi PRD gốc** (theo yêu cầu người dùng giữa chừng): thêm Email, Website, Chi nhánh ngân hàng; đổi Số điện thoại từ 1 giá trị sang danh sách nhập được nhiều số (component `.repeatable-list`, nút thêm/xóa dòng) — xem migration `004_company_settings_extra_fields.sql` và `docs/DECISIONS.md`.
- **Trang "Cấu hình kho" (`frontend/warehouse-settings.html`/`frontend/assets/warehouse-settings.js`)**: toggle switch tự vẽ (`.switch`, không dùng checkbox mặc định) cho `allow_negative_stock`. Đã chỉnh 3 lần theo phản hồi người dùng ngay trong phiên: (1) dòng cấu hình quá to → thêm nhóm tiêu đề "Cấu hình chung" + thu gọn mô tả/padding, (2) vẫn cần phân định rõ hơn → mỗi dòng cấu hình có khung viền bo góc + nền riêng thay vì chỉ kẻ đường phân cách. Kết quả là pattern dùng chung cho mọi trang cấu hình sau này — xem `docs/DESIGN-SYSTEM.md` mục "Trang cấu hình (settings)".
- **Khung "Cấu hình bán hàng" (`frontend/sales-settings.html`)**: đúng theo PRD 4.9 — chỉ khung menu trống, nhưng dùng `.empty-state` (icon + tiêu đề "Chưa có nội dung" + mô tả lý do) thay vì để trang trắng trơn.
- `frontend/assets/style.css`: thêm class dùng chung mới — `.settings-card`/`.settings-section`/`.settings-columns`/`.setting-row`/`.switch`/`.repeatable-list`/`.repeatable-add-btn`/`.repeatable-remove-btn`/`.empty-state`/`.alert-success`; thêm 6 icon mới vào `icons.js` (`shieldCheck`, `building`, `sliders`, `cart`, `pencil`, `trash`, `check`, `close`).
- `frontend/assets/layout.js`: bật `enabled: true` cho cả 4 mục nav còn lại.
- **Bài học UI quan trọng (đã ghi vào `docs/DESIGN-SYSTEM.md` để không lặp lại)**:
  - Lưới chọn nhiều module trong modal "Vai trò" đã thử 3 phiên bản theo phản hồi người dùng: checkbox mặc định (xấu) → chip tự co giãn bo tròn hết cỡ `999px` (kích thước lệch nhau giữa nhãn ngắn/dài, "nhìn ghê") → **chốt**: lưới ô đều nhau (`grid-template-columns: repeat(auto-fill, minmax(126px, 1fr))`), bo góc chuẩn `8px`, chọn thì fill gradient đặc + shadow.
  - Bug CSS specificity thật: `.form-field label { display: block }` (dùng cho tiêu đề trường) vô tình đè `display: flex` của `.module-option` vì cả hai đều là thẻ `<label>` — `.module-option` nằm lồng bên trong `.form-field` nên bị match. Sửa bằng `.form-field > label` (giới hạn con trực tiếp). Khiến checkbox chọn module từng bị đẩy xuống dòng riêng, chồng lên text.
  - Người dùng nhấn mạnh 2 lần: phải dùng skill `ui-ux-pro-max` cho **mọi** pattern UI mới (không chỉ trang mới), và tránh phong cách "nhìn là biết AI làm" (nền pastel nhạt đều màu, lưới cố định không theo nội dung) — ưu tiên chiều sâu thật (fill đặc + shadow rõ) và bố cục co theo nội dung.
- **Test qua trình duyệt thật (tổng hợp cả 4 trang)**: đăng nhập `admin` → cả 4 trang hoạt động đúng, dữ liệu load/lưu chính xác qua API sau mỗi lần đổi cấu trúc HTML; đăng nhập `thukho1` (chỉ quyền `kho`) → cả 4 mục nav đều ẩn, vào thẳng URL đều bị chuyển hướng về `dashboard.html`.
- Dọn dữ liệu test (vai trò/role tạo để test) qua API sau khi test xong, không để lại rác trong `data/data.db` ngoài các tài khoản demo đã ghi trong `docs/CURRENT.md`.
- Cập nhật đồng bộ `docs/PRD.md` (mục 4.7), `docs/Plan.md` (mục 2, cấu trúc thư mục, checklist Phase 1.6), `docs/erd.mermaid` (`COMPANY_SETTINGS`), `docs/DESIGN-SYSTEM.md`, `docs/DECISIONS.md`, `docs/DEMO.md`, `docs/CURRENT.md`, `docs/TASK.md`.

## 2026-08-01 (Phase 1.6 — sửa layout.js/users.html/users.js theo schema vai trò động)

- **Bối cảnh**: `docs/DESIGN-SYSTEM.md` đã ghi nhận từ trước — `layout.js` (viết ở Phase 1.5) lọc menu bằng `item.roles.includes(user.role)`, nhưng backend Phase 1.6 đổi sang trả `role_id`/`role_name`/`permissions` (không còn `user.role`) nên cơ chế lọc này đã hỏng thật. Người dùng yêu cầu làm frontend Phase 1.6 theo từng bước nhỏ, dừng chờ duyệt sau mỗi bước — đây là bước 1.
- `frontend/assets/layout.js`: đổi từng mục `NAV_GROUPS` từ `roles: []` (tên vai trò cố định) sang `module: '<module_key>'` (hoặc `null` nếu hiện với mọi tài khoản đã đăng nhập, áp dụng cho "Tổng quan"); lọc bằng `user.permissions.includes(item.module)`; sidebar hiển thị `user.role_name` thay vì tra `ROLE_LABELS[user.role]` (đã xóa hằng số `ROLE_LABELS`, không còn cần). Thêm sẵn 3 mục nav mới vào nhóm "Quản trị" (Vai trò) và nhóm mới "Cấu hình" (Thông tin công ty, Cấu hình kho, Cấu hình bán hàng) — để `enabled: false` tới khi xây xong từng trang.
- `frontend/assets/icons.js`: thêm icon `shieldCheck`, `building`, `sliders`, `cart` cho 4 mục nav mới.
- `frontend/users.html`/`frontend/assets/users.js`: dropdown "Vai trò" trong form tạo tài khoản không còn hardcode 3 `<option>` cố định — tải động qua `GET /api/roles` (hàm `loadRoles()`), gửi `role_id` (số) thay vì `role` (chuỗi) khi submit; cột "Vai trò" trong bảng danh sách đọc thẳng `user.role_name` (đã có sẵn từ JOIN ở backend) thay vì tra `ROLE_LABELS`.
- `docs/DESIGN-SYSTEM.md`: gỡ cảnh báo "đang dở dang" ở mục Khung điều hướng, thay bằng mô tả đúng cơ chế hiện tại (lọc theo `module`/`permissions`).
- **Test qua trình duyệt thật**: đăng nhập `admin` → sidebar đúng menu (Tổng quan, Người dùng) + tên vai trò "Admin"; vào trang Người dùng, dropdown vai trò hiện đúng 4 vai trò lấy từ API; tạo tài khoản mới `ketoan1` (vai trò Kế toán) qua UI thành công, hiện đúng trong bảng; đăng xuất, đăng nhập `thukho1` → sidebar chỉ còn "Tổng quan" (ẩn "Người dùng" vì không có quyền `nguoi_dung`); cố truy cập thẳng URL `/users.html` → tự động chuyển hướng về `dashboard.html`.
- **Lưu ý phát hiện khi test (không phải lỗi mới)**: tài khoản `khophu1`/vai trò "Nhân viên kho phụ" tạo ở phiên trước (test qua curl) đang lưu thiếu dấu tiếng Việt trong DB (`Nhan vien kho phu`, `Le Thi Phu`) — dữ liệu test cũ, không thuộc phạm vi sửa lần này.
- **Còn lại của Phase 1.6**: trang "Vai trò", trang "Thông tin công ty", trang "Cấu hình kho", khung "Cấu hình bán hàng".

## 2026-08-01 (Phase 1.6 — company_settings/warehouse_settings, backend)

- **Migration `003_company_warehouse_settings.sql`**: bảng `company_settings` (`id` PK `CHECK (id = 1)`, các cột thông tin công ty theo PRD 4.7, seed sẵn 1 dòng rỗng để `GET` luôn có dữ liệu trả về); bảng `warehouse_settings` (key-value: `key` PK, `value` TEXT, `updated_at`), seed `allow_negative_stock = '0'`.
- `backend/routes/companySettings.routes.js` (mới) — `GET /api/company-settings` mở cho mọi tài khoản đã đăng nhập (cần để render mẫu in sau này), `PUT` chỉ cho ai có quyền module `cau_hinh`, cập nhật cả 7 cột cùng lúc.
- `backend/routes/warehouseSettings.routes.js` (mới) — cùng nguyên tắc GET/PUT như trên. Có danh sách `BOOLEAN_KEYS` cứng trong file để chặn ghi key tùy ý vào bảng (hiện chỉ `allow_negative_stock`); trả `value` dạng boolean qua JSON dù lưu trong DB là TEXT `'0'`/`'1'`.
- `server.js`: mount `/api/company-settings`, `/api/warehouse-settings` với `requireAuth` ở tầng mount (áp dụng cho GET), còn `requirePermission('cau_hinh')` gắn riêng trên route PUT bên trong từng file — khác cách mount `/api/users`/`/api/roles` (chặn permission cho toàn bộ route ngay ở `server.js`) vì GET/PUT ở 2 API này có yêu cầu quyền khác nhau.
- **Test qua API (curl)**: admin đọc/ghi được cả 2 API; `thukho1` (chỉ quyền `kho`) đọc được (200) nhưng ghi bị chặn (403); chưa đăng nhập bị chặn 401; gửi key cấu hình kho không hợp lệ (`khong_hop_le`) bị chặn 400, không ghi vào DB.
- **Còn lại của Phase 1.6**: toàn bộ frontend (trang Vai trò, Thông tin công ty, Cấu hình kho, khung Cấu hình bán hàng, cập nhật `layout.js`/`users.html`/`users.js` dùng `permissions`/`role_id`) — chưa test qua trình duyệt.

## 2026-08-01 (Phase 1.6 — backend vai trò động, đang làm)

- **Migration `002_roles_permissions.sql`**: bảng `roles` (Admin/Kế toán/Thủ kho, Admin đánh dấu `is_protected`), `role_permissions`; chuyển `users.role` (TEXT) sang `users.role_id` (FK) — tạo bảng `users_new`, copy dữ liệu, xóa bảng cũ, đổi tên (SQLite không hỗ trợ đổi kiểu cột trực tiếp). Verify: tài khoản `admin`/`thukho1` giữ đúng `id` và đúng vai trò sau migrate, `PRAGMA foreign_key_check` sạch, chạy lại migrate idempotent.
- `backend/config/modules.js` — danh sách hằng số module (`kho`, `cong_no`, `bao_cao`, `nguoi_dung`, `cau_hinh`).
- `backend/middleware/requirePermission.js` thay cho `requireRole` (đã xóa file cũ) — Admin (`is_protected`) luôn qua, vai trò khác tra `role_permissions`.
- `backend/routes/auth.routes.js`: login/`/me` trả thêm `role_id`, `role_name`, `is_protected`, `permissions`. Thiết kế: session chỉ lưu `role_id`, `permissions` luôn tính lại từ DB mỗi lần gọi — nghĩa là sửa quyền 1 vai trò có hiệu lực **ngay lập tức** cho user đang đăng nhập, không cần đăng nhập lại (tốt hơn dự tính ban đầu).
- `backend/routes/roles.routes.js` (mới) — CRUD vai trò, chặn sửa/xóa vai trò `is_protected`, chặn xóa vai trò đang có tài khoản dùng.
- Sửa `backend/routes/users.routes.js` cho khớp schema mới (dùng `role_id`, JOIN `roles`) — bị lỗi 500 tạm thời sau migration, đã sửa trong bước này.
- `server.js`: mount `/api/roles`, đổi `/api/users` sang `requirePermission('nguoi_dung')`.
- **Test qua API (curl)**: login/`/me` trả đúng `permissions` cho từng vai trò; tạo vai trò mới ("Nhân viên kho phụ", quyền `kho`), tạo tài khoản dùng vai trò đó, đăng nhập xác nhận đúng quyền; sửa quyền vai trò → phản ánh ngay; chặn đúng khi sửa/xóa vai trò Admin (400), xóa vai trò đang có user dùng (400), vai trò không đủ quyền gọi `/api/roles`/`/api/users` (403).
- **Còn lại của Phase 1.6**: `company_settings`/`warehouse_settings` (migration + routes), toàn bộ frontend (trang Vai trò, Thông tin công ty, Cấu hình kho, khung Cấu hình bán hàng, cập nhật `layout.js`/`users.html` dùng `permissions`/`role_id`) — chưa test qua trình duyệt vì frontend hiện vẫn dùng schema `role` cũ.

## 2026-08-01 (bổ sung plan — Phase 1.6)

- Người dùng yêu cầu 4 tính năng tiếp theo: phân quyền động theo vai trò, thông tin công ty, menu "Cấu hình kho", menu "Cấu hình bán hàng". Đã hỏi lại 3 điểm mấu chốt (độ chi tiết phân quyền, bảo vệ vai trò Admin, phạm vi "Cấu hình bán hàng") trước khi lên kế hoạch — xem `docs/DECISIONS.md`.
- Xác nhận "Cấu hình bán hàng" thực chất là module Bán hàng/POS mới hoàn toàn, chưa có trong PRD — đã tách phạm vi: Phase 1.6 chỉ tạo khung menu trống, yêu cầu nghiệp vụ đầy đủ sẽ bàn riêng sau Phase 2/3 (theo đề nghị của người dùng, tránh tự suy diễn quy trình bán hàng).
- Cập nhật `docs/PRD.md`: viết lại mục 4.1 (vai trò động, Admin cố định toàn quyền), thêm mục 4.7 (Thông tin công ty), 4.8 (Cấu hình kho — chốt phạm vi "xuất trước nhập bù sau" là toàn hệ thống), 4.9 (Cấu hình bán hàng — khung, chưa mô tả chi tiết); cập nhật mục 10 (Open Questions) và Appendix (bảng dữ liệu mới: `roles`, `role_permissions`, `company_settings`, `warehouse_settings`).
- Cập nhật `docs/Plan.md`: thêm mục 2b (thiết kế phân quyền theo module), cập nhật bảng schema + API endpoints (cột "Role" cố định đổi thành "Quyền (module)"), chèn **Phase 1.6 — Vai trò động & Cấu hình hệ thống** vào checklist (giữa Phase 1.5 và Phase 2), cập nhật mục kiểm thử.
- Cập nhật `docs/TASK.md` (thêm checklist Phase 1.6, bỏ mục "chốt cấu hình xuất trước nhập bù sau" ở Phase 2 vì đã giải quyết), `docs/DECISIONS.md`.
- **Chưa code gì ở bước này** — chỉ cập nhật tài liệu kế hoạch, chờ triển khai theo từng bước nhỏ như các phase trước.

## 2026-07-31 (Phase 1.5 — Quản trị người dùng & Phân quyền)

- **Backend**: `backend/routes/users.routes.js` — `GET/POST /api/users`, `PATCH /api/users/:id/{deactivate,activate}` (Admin-only, mount kèm `requireAuth`+`requireRole('admin')` ở `server.js`). Validation username trùng, role hợp lệ, chặn tự khóa chính tài khoản đang đăng nhập.
- **Khung điều hướng dùng chung** (áp dụng cho mọi trang từ giờ, theo skill `ui-ux-pro-max`): `frontend/assets/icons.js` (bộ icon SVG outline viết tay), `frontend/assets/layout.js` (sidebar chia nhóm menu, lọc theo role qua cấu hình `NAV_GROUPS`, thu gọn được và lưu trạng thái qua `localStorage`, tự chuyển hướng về `dashboard.html` nếu vào trang không đúng quyền).
- `frontend/dashboard.html` — trang chủ mới sau đăng nhập (thay cho màn hình chào cũ nhúng trong `login.html`).
- `frontend/users.html` + `frontend/assets/users.js` — bảng danh sách, modal tạo tài khoản, nút khóa/mở.
- `login.html`/`auth.js`: bỏ hẳn phần "welcome" inline, đăng nhập xong `window.location.href` sang `dashboard.html`.
- Bổ sung nhiều class mới vào `style.css`: `.sidebar`, `.nav-item`, `.stat-card`, `.data-table`, `.modal-overlay`, `.form-field`...
- **Lỗi phát hiện qua test trình duyệt thật, đã sửa**:
  - `.modal-overlay { display: flex }` ghi đè thuộc tính `hidden` (lặp lại đúng lỗi đã gặp ở `.alert` trước đó) — modal "Thêm tài khoản" hiện sẵn ngay khi tải trang. Sửa bằng `:not([hidden])`.
  - Bảng dữ liệu bị bó hẹp gây xuống dòng xấu (kể cả trong badge) khi người dùng yêu cầu không gian hiển thị rộng hơn — thêm `white-space: nowrap` cho ô bảng.
  - Nút "Khóa" không có style rõ ràng khi bị disable (tự khóa chính mình) — bổ sung `.icon-btn:disabled`.
- **Test qua trình duyệt thật (đầy đủ, không chỉ chạy code)**: đăng nhập Admin → tạo tài khoản `thukho1` (role thu_kho) → khóa/mở tài khoản → đăng xuất → đăng nhập bằng `thukho1` → xác nhận sidebar chỉ hiện "Tổng quan" (ẩn hoàn toàn nhóm "Quản trị") → cố truy cập thẳng URL `/users.html` → tự động chuyển hướng về dashboard → xác nhận `/api/users` trả 403 ở tầng backend (an toàn dữ liệu thật, không chỉ ẩn giao diện).
- Cập nhật `docs/TASK.md` (đánh dấu Phase 1.5 hoàn thành), `docs/CURRENT.md`.

## 2026-07-31 (bổ sung plan)

- Người dùng phát hiện khoảng trống trong kế hoạch: route `/api/users/*` (quản lý người dùng) đã thiết kế trong `docs/Plan.md` mục 3 nhưng chưa từng gán vào phase nào. Đã chèn **Phase 1.5 — Quản trị người dùng & Phân quyền** vào `docs/Plan.md`, `docs/TASK.md` giữa Phase 1 và Phase 2, ghi quyết định vào `docs/DECISIONS.md`.
- Người dùng chỉ ra thiếu sót tiếp theo: quên đồng bộ `docs/PRD.md`. Đã bổ sung mục "Quản lý tài khoản người dùng" đầy đủ vào PRD 4.1 (trước đó chỉ nhắc thoáng qua trong ngoặc).

## 2026-07-31

- Khởi tạo cấu trúc dự án tại `C:\Projects\ERP_MinhDat`: chuyển tài liệu thiết kế (`PRD.md`, `Plan.md`, `erd.mermaid`) vào `docs/`, `inventory-debt-ledger.md` vào `.claude/docs/`, handoff cũ vào `docs/handoff/`.
- Tạo `docs/CURRENT.md`, `docs/TASK.md`, `docs/CHANGELOG.md`, `docs/DECISIONS.md`.
- Cập nhật `CLAUDE.md`: sửa lại đường dẫn tài liệu, bổ sung mục "Quy trình làm việc bắt buộc" và các ràng buộc nghiệp vụ mới chốt (tồn kho không đủ, công nợ tự động, sửa/hủy phiếu, không hardcode tài khoản).
- Chốt 4 quyết định nghiệp vụ với người dùng (chi tiết xem `docs/DECISIONS.md`).
- **Hoàn thành Phase 1 — Nền tảng** (từng bước nhỏ, có duyệt lại từng bước):
  - Khởi tạo `package.json`, cài `express` (5.x), `better-sqlite3`, `bcrypt`, `express-session`; dựng khung `backend/server.js`.
  - `backend/db/database.js` (WAL + foreign_keys ON), `backend/db/migrations/001_init.sql` (bảng `users`, `schema_migrations`), `backend/db/migrate.js` (runner, đã test idempotent).
  - `backend/db/seedAdmin.js` — seed tài khoản admin qua biến môi trường, không hardcode credential.
  - `backend/middleware/auth.js` (`requireAuth`), `backend/middleware/requireRole.js`, `backend/routes/auth.routes.js` (`login`/`logout`/`me`).
  - `frontend/login.html` + `frontend/assets/{style.css,api.js,auth.js}` — giao diện hiện đại, nhiều màu sắc, tông xanh dương, tối ưu desktop.
  - Test thực tế qua curl (6 tình huống auth) và qua trình duyệt thật (login sai/đúng, giữ session khi reload, logout). Phát hiện và sửa lỗi thiếu dấu tiếng Việt ở vài chuỗi hiển thị trong `auth.js`/`seedAdmin.js`.
  - Viết `docs/DEMO.md` hướng dẫn chạy demo trên máy theo mô hình LAN.
  - Người dùng test thực tế mô hình nhiều máy trong LAN: gặp lỗi truy cập được dù ping thấy máy chủ — nguyên nhân do Windows Firewall chặn TCP port 3000 (mạng ở chế độ Public). Đã hướng dẫn tạo Inbound Rule (`New-NetFirewallRule ... -LocalPort 3000`) và xác nhận kết nối thành công. Đã ghi lại cách xử lý vào `docs/DEMO.md` để dùng lại ở Phase 5.
- **Redesign giao diện bằng skill `ui-ux-pro-max`** (theo yêu cầu người dùng, áp dụng làm chuẩn cho mọi trang từ giờ):
  - Tạo `docs/DESIGN-SYSTEM.md` — style Soft UI Evolution, màu xanh dương + accent xanh lá/đỏ, typography Be Vietnam Pro + Open Sans, quy tắc icon SVG (không emoji).
  - Đổi font tiêu đề từ Poppins sang **Be Vietnam Pro** sau khi phát hiện Poppins thiếu subset tiếng Việt đầy đủ (thiếu `U+1EA0-1EF1`).
  - Tải font `.woff2` về host offline tại `frontend/assets/fonts/` theo yêu cầu người dùng (đồng nhất, không phụ thuộc internet); loại bỏ hoàn toàn phụ thuộc Google Fonts CDN.
  - Redesign `frontend/login.html`: thay emoji bằng icon SVG outline, thêm icon trong input, thêm nút hiện/ẩn mật khẩu, tách hiển thị tên + vai trò ở màn hình chào, cập nhật `style.css` với token màu/spacing/shadow mới.
  - Test qua trình duyệt thật: phát hiện và sửa 2 lỗi — (1) `display: flex` trên `.alert` ghi đè thuộc tính `hidden` khiến khung lỗi hiện sẵn dù chưa submit; (2) sau đăng xuất, ô mật khẩu không tự reset về `type="password"`. Cả 2 đã sửa và verify lại.
