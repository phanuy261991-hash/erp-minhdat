# PRD: Hệ thống Quản lý Kho & Công nợ nội bộ

**Version**: v1.1 — cập nhật 2026-08-01 (bổ sung 4.1/4.7/4.8/4.9)
**Trạng thái**: Đang triển khai (Phase 1/1.5 xong, Phase 1.6 đang làm) — xem trạng thái chính xác tại `docs/CURRENT.md`. Các mục 4.x vẫn có thể bổ sung khi phát sinh nhu cầu mới (xem `docs/DECISIONS.md`).

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
- **Vận hành**: quản lý process bằng PM2, đăng ký `pm2 startup` + `pm2 save` để tự chạy lại khi máy chủ khởi động (không chỉ khi crash).
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

**Quản lý tài khoản người dùng** (bổ sung 2026-07-31 — trước đó chỉ nhắc thoáng qua, chưa mô tả đầy đủ như một tính năng):
- Chỉ **Admin** được xem danh sách tài khoản, tạo tài khoản mới (username, mật khẩu, họ tên, chọn vai trò), và khóa/mở tài khoản.
- Không xóa cứng tài khoản — chỉ khóa (`is_active = false`), vì tài khoản đã gắn với lịch sử phiếu nhập/xuất do người đó tạo (`created_by`), xóa cứng sẽ làm mất khả năng truy vết ai đã lập phiếu.
- Không có cơ chế tự đăng ký (self sign-up) — mọi tài khoản đều do Admin tạo thủ công.

**Quản lý tài khoản người dùng** (bổ sung 2026-07-31 — trước đó chỉ nhắc thoáng qua, chưa mô tả đầy đủ như một tính năng):
- Chỉ **Admin** được xem danh sách tài khoản, tạo tài khoản mới (username, mật khẩu, họ tên, chọn vai trò), và khóa/mở tài khoản.
- Không xóa cứng tài khoản — chỉ khóa (`is_active = false`), vì tài khoản đã gắn với lịch sử phiếu nhập/xuất do người đó tạo (`created_by`), xóa cứng sẽ làm mất khả năng truy vết ai đã lập phiếu.
- Không có cơ chế tự đăng ký (self sign-up) — mọi tài khoản đều do Admin tạo thủ công.

### 4.2 Quản lý hàng tồn kho
- Danh mục sản phẩm: mã, tên, đơn vị tính, giá vốn/giá bán tham chiếu.
- Tồn kho hiện tại **không lưu là số cố định**, mà tính từ tổng cộng dồn các phiếu nhập/xuất — tránh lệch dữ liệu khi có lỗi giữa chừng.
- Tìm kiếm, lọc theo tên/mã, cảnh báo tồn kho thấp (ngưỡng cấu hình theo sản phẩm).

### 4.3 Quản lý xuất/nhập kho
- Lập phiếu nhập kho (theo nhà cung cấp) và phiếu xuất kho (theo khách hàng).
- Mỗi phiếu = 1 transaction SQLite duy nhất (ghi phiếu + cập nhật tồn kho cùng lúc), đảm bảo không lệch dữ liệu nếu có lỗi giữa chừng.
- Lịch sử biến động kho, tra cứu theo sản phẩm/khoảng thời gian.

### 4.4 Quản lý công nợ nhà cung cấp & khách hàng
- Ghi nhận công nợ dạng sổ cái (ledger): mỗi giao dịch nợ/trả là 1 dòng, số dư = tổng cộng dồn — không lưu "số dư hiện tại" như 1 trường cứng.
- Theo dõi riêng công nợ phải trả (NCC) và phải thu (khách hàng).
- Ghi nhận thanh toán từng phần, lịch sử thanh toán theo đối tượng.

### 4.5 In phiếu xuất
- MVP: HTML + CSS `@media print` + `window.print()`, dùng máy in văn phòng thường (A4/A5) đã cài trên máy client — không cần thư viện PDF hay driver máy in nhiệt.
- Nội dung phiếu: thông tin khách hàng, danh sách sản phẩm/số lượng/đơn giá, tổng tiền, người lập.

### 4.6 Báo cáo
- Báo cáo tồn kho hiện tại theo sản phẩm.
- Báo cáo xuất/nhập theo khoảng thời gian.
- Báo cáo công nợ theo đối tượng (NCC/khách hàng), tổng nợ/đã thu-trả.
- Hiển thị dạng bảng; biểu đồ (Chart.js) nếu cần trực quan hóa.

### 4.7 Thông tin công ty (bổ sung 2026-08-01, mở rộng trường 2026-08-01)
- Trang cấu hình cho phép nhập: Tên công ty, Địa chỉ, Mã số thuế, Email, Website, **Số điện thoại (nhập được từ 2 số trở lên)**, Tên ngân hàng, Chi nhánh, Số tài khoản, Tên chủ tài khoản.
- Chỉ có **1 bộ thông tin duy nhất** cho toàn hệ thống (đúng với thiết kế "1 văn phòng/kho duy nhất" ở mục 1) — không phải danh sách nhiều công ty.
- Dùng để hiển thị trên mẫu in phiếu xuất kho (mục 4.5) và các mẫu in khác phát sinh sau này.
- Thuộc module "Cấu hình" — quyền chỉnh sửa theo phân quyền vai trò (mục 4.1), Admin luôn có quyền.
- Giao diện chia 2 nhóm hiển thị song song: "Thông tin chung" và "Thông tin ngân hàng" — xem chi tiết layout tại `docs/DESIGN-SYSTEM.md` mục "Trang cấu hình (settings)".

### 4.8 Cấu hình kho (bổ sung 2026-08-01)
- Menu tổng hợp các cấu hình liên quan đến quy trình nghiệp vụ kho, mở để bổ sung dần khi phát sinh nhu cầu — không phải danh sách đóng.
- Mục đầu tiên: bật/tắt chế độ **"xuất trước, nhập bù sau"** (cho phép tồn kho âm tạm thời khi lập phiếu xuất) — xem chi tiết quyết định gốc tại `docs/DECISIONS.md` (2026-07-31).
  - **Phạm vi áp dụng ở giai đoạn này: toàn hệ thống** (1 công tắc chung cho mọi sản phẩm), vì bảng `products` chưa tồn tại (chưa tới Phase 2 Kho) nên chưa thể cấu hình theo từng sản phẩm. Có thể nâng cấp lên cấu hình theo từng sản phẩm khi làm Phase 2, nếu thực tế cần.
- Quyền truy cập theo phân quyền vai trò — module "Cấu hình".

### 4.9 Cấu hình bán hàng (khung menu, bổ sung 2026-08-01)
- **Chỉ tạo khung menu trống ở giai đoạn này** — chưa có nội dung bên trong.
- Lý do: người dùng xác nhận đây sẽ là một **module Bán hàng/POS hoàn toàn mới**, chưa từng được mô tả trong PRD trước đây (PRD gốc chỉ có "xuất kho theo khách hàng" ở mục 4.3, không phải màn hình bán hàng/POS riêng). Cần một buổi trao đổi yêu cầu nghiệp vụ riêng (quy trình bán hàng có khác "xuất kho" không, ai dùng, có giỏ hàng/thanh toán tại quầy không...) trước khi mô tả chi tiết và lên kế hoạch kỹ thuật — xem mục 10 (Open Questions).

## 5. Success Metrics

| Mục tiêu | Chỉ số | Ngưỡng |
|---|---|---|
| Ngừng dùng sổ sách song song | % phiếu xuất/nhập ghi qua hệ thống | 100% sau tuần đầu go-live |
| Độ chính xác tồn kho | Sai lệch giữa hệ thống và kiểm kê thực tế | < 1% sau 1 tháng |
| Tốc độ lập phiếu | Thời gian lập 1 phiếu xuất | < 2 phút |
| Ổn định hệ thống trong giờ làm việc | Uptime nhờ PM2 auto-restart | > 99% trong giờ hành chính |

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
| Phase 5 | Deploy PM2, cấu hình IP tĩnh, backup tự động, đào tạo người dùng, go-live |

*Chưa có ngày cụ thể — cần bổ sung theo nguồn lực thực tế (bao nhiêu người code, làm full-time hay part-time).*

## 8. Dependencies

- Không phụ thuộc dịch vụ bên ngoài (không API thanh toán, không cloud).
- Phụ thuộc hạ tầng nội bộ: máy chủ (chạy 24/7 hoặc bật/tắt theo giờ làm việc + PM2), mạng LAN ổn định, máy in văn phòng đã cài driver trên các máy client.

## 9. Risks & Mitigation

| Rủi ro | Mitigation |
|---|---|
| SQLite khóa khi nhiều người ghi đồng thời (`SQLITE_BUSY`) | Bật WAL mode, dùng `better-sqlite3` với transaction rõ ràng cho mỗi phiếu |
| Máy chủ tắt/crash → mất truy cập toàn bộ | PM2 + `pm2 startup`/`pm2 save` để tự chạy lại; chấp nhận gián đoạn khi máy tắt hẳn, không có failover |
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

**Bảng dữ liệu chính (draft):** `users`, `roles`, `role_permissions`, `products`, `stock_movements`, `stock_receipts` (phiếu nhập), `stock_issues` (phiếu xuất), `partners` (NCC + khách hàng), `debt_ledger`, `company_settings`, `warehouse_settings`, `schema_migrations`.
