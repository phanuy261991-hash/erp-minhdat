# Quyết định kiến trúc & nghiệp vụ

> Ghi lại các quyết định đã chốt để không thảo luận lại trừ khi có lý do mới. Mỗi mục ghi ngày chốt.

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

## Open questions — chưa chốt

Xem chi tiết tại `docs/PRD.md` mục 10 và `.claude/docs/inventory-debt-ledger.md` mục "Edge case":

- **Module Bán hàng/POS** — cần buổi trao đổi yêu cầu nghiệp vụ riêng trước khi lên kế hoạch kỹ thuật (xem mục ngay trên). Làm sau Phase 2/3.
- Có cần export báo cáo ra Excel/PDF không, hay xem trực tiếp trên web là đủ?
- Máy chủ có chạy 24/7 thực tế không, hay thường tắt ngoài giờ làm việc?
- Có kế hoạch mở rộng nhiều kho/chi nhánh trong tương lai không?
