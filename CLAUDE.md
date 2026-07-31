# CLAUDE.md

> Giới hạn dòng: mặc định 150 (chưa được người dùng chốt số khác).
> **Trạng thái hiện tại**: đang code (không còn ở giai đoạn khởi tạo/design-only). Xem chính xác đang ở đâu, đã xong gì, còn gì tại [docs/CURRENT.md](docs/CURRENT.md) — đọc file đó trước khi làm bất cứ việc gì, đừng suy đoán từ file này.

## Project Overview

Web app nội bộ chạy trên một máy chủ LAN, phục vụ dưới ~20 người dùng đồng thời. Nhận thao tác qua giao diện HTML/CSS/JS (đăng nhập, lập phiếu nhập/xuất kho, ghi nhận công nợ, in phiếu, xem báo cáo), xử lý qua API Express ghi vào SQLite trong transaction, xuất ra: tồn kho sản phẩm và số dư công nợ (tính từ tổng cộng dồn, không phải số lưu cố định), trang in phiếu HTML, và báo cáo tổng hợp.

## Tech Stack

- Backend: Node.js + Express 5.x
- Database: SQLite3 qua `better-sqlite3`, bắt buộc `PRAGMA journal_mode=WAL` + `foreign_keys=ON`
- Frontend: HTML/CSS/JS thuần, không framework, không build step. Icon dùng chung qua `frontend/assets/icons.js`, khung sidebar/điều hướng qua `frontend/assets/layout.js` (xem [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md))
- Font: Be Vietnam Pro + Open Sans, host offline tại `frontend/assets/fonts/` (không phụ thuộc Google Fonts CDN)
- Process manager: PM2 (production, chưa cấu hình — thuộc Phase 5)
- Package manager: npm (đã xác nhận, xem `package.json`)

## Dev Commands

```
npm install                                    # cai dependencies
npm run migrate                                # chay cac migration chua ap dung (backend/db/migrations/)
npm run seed:admin                             # tao tai khoan admin dau tien (doc ADMIN_USERNAME/ADMIN_PASSWORD tu bien moi truong)
npm start                                      # chay server (node backend/server.js), mac dinh port 3000
pm2 start backend/server.js --name kho-app     # chay production (Phase 5, chua thiet lap)
pm2 startup && pm2 save                        # bat buoc sau lan start dau, de tu chay lai khi may khoi dong
```

Không có build step (frontend không qua bundler). Xem [docs/DEMO.md](docs/DEMO.md) để biết cách chạy demo đầy đủ, gồm cả mô hình nhiều máy trong LAN.

## Core Logic Summary

Tồn kho sản phẩm và số dư công nợ không lưu dưới dạng 1 cột số cố định — luôn tính bằng `SUM` cộng dồn từ bảng `stock_movements` và `debt_ledger`. Mỗi phiếu nhập/xuất kho là một transaction `better-sqlite3` duy nhất, ghi đồng thời phiếu + dòng chi tiết + movement. Chi tiết công thức, ví dụ query, và edge case xem [.claude/docs/inventory-debt-ledger.md](.claude/docs/inventory-debt-ledger.md).

## Key Constraints

- Không thêm cột tồn kho/số dư công nợ cố định vào bảng `products`/`partners` — luôn tính từ `stock_movements`/`debt_ledger`.
- Không dùng `CREATE TABLE IF NOT EXISTS` làm cơ chế thay đổi schema duy nhất — mọi thay đổi schema phải qua file migration đánh version mới trong `backend/db/migrations/`, và cập nhật bảng `schema_migrations`.
- Không tạo/sửa phiếu nhập hoặc xuất kho ngoài transaction — insert phiếu + items + movements phải nằm trong cùng 1 transaction, rollback toàn bộ nếu 1 bước lỗi.
- Không tắt `PRAGMA journal_mode=WAL`.
- Sau khi thay đổi process list trong PM2, luôn chạy `pm2 save` — chỉ `pm2 start` là không đủ để tự khởi động lại khi máy chủ reboot.
- Không tự thêm HTTPS/reverse proxy — dự án chỉ chạy trong LAN nội bộ theo thiết kế hiện tại, trừ khi người dùng đổi yêu cầu.
- Phiếu xuất khi tồn kho không đủ: mặc định **chặn cứng**. Chỉ cho phép "xuất trước, nhập bù sau" khi bật cấu hình `allow_negative_stock` trong `warehouse_settings` (áp dụng toàn hệ thống ở giai đoạn hiện tại, xem `docs/DECISIONS.md`).
- Phiếu xuất chỉ phát sinh dòng `debt_ledger` khi được đánh dấu "chưa thu tiền ngay" (`payment_status`) — không tự động ghi nợ cho mọi phiếu xuất.
- Không sửa/xóa trực tiếp phiếu nhập/xuất đã tạo — chỉ tạo phiếu điều chỉnh bù trừ (ghi ngược dấu) để giữ lịch sử.
- Không hardcode thông tin tài khoản (username/password/API key/secret...) vào code — dùng biến môi trường, seed script, hoặc file cấu hình ngoài repo.
- **Phân quyền là vai trò động theo module** (từ 2026-08-01, thay cho danh sách role cố định ban đầu) — không hardcode tên vai trò trong code kiểm tra quyền. Dùng `requirePermission(module_key)` (`backend/middleware/requirePermission.js`), tra bảng `role_permissions`; vai trò `is_protected` (Admin) luôn được cho qua không cần tra bảng. Danh sách `module_key` hợp lệ nằm ở `backend/config/modules.js` — thêm module mới thì sửa ở đây, đồng thời cập nhật `frontend/assets/layout.js` (`NAV_GROUPS`).
- Vai trò `is_protected=1` (mặc định chỉ có Admin) không được sửa tên/quyền/xóa qua API — validate ở `roles.routes.js`, không bỏ qua dù ai gọi.

## Quy trình làm việc bắt buộc

- Trước khi bắt đầu bất kỳ công việc nào, phải đọc qua `docs/PRD.md`, `docs/Plan.md`,
  `docs/erd.mermaid`, `docs/CURRENT.md`, `docs/TASK.md`, `docs/CHANGELOG.md`,
  `docs/DECISIONS.md` để nắm bối cảnh, tránh code sai hướng hoặc lệch với quyết định
  đã chốt.
- Sau khi hoàn thành một module: cập nhật `docs/CURRENT.md` (trạng thái hiện tại),
  `docs/TASK.md` (việc đã xong/còn lại), `docs/CHANGELOG.md` (lịch sử thay đổi),
  và `docs/DECISIONS.md` nếu có quyết định kiến trúc mới phát sinh.
- File Handoff chỉ tạo khi người dùng yêu cầu, lưu tại `docs/handoff/`.
- Mọi thay đổi phát sinh ngoài phạm vi đã thống nhất (kiến trúc, schema, luồng
  nghiệp vụ, phạm vi tính năng) phải hỏi ý kiến người dùng trước khi thực hiện.
- Tuyệt đối không tự động sửa code hoặc file khi chưa có sự đồng ý của người dùng.
- Phải đọc file liên quan trước khi code — không tự suy diễn logic nghiệp vụ hay
  cấu trúc dữ liệu chưa được xác nhận.
- Các quyết định thay đổi lớn đều phải được người dùng đồng ý trước khi triển khai.
- Không hardcode thông tin tài khoản (username/password/API key/secret...) vào
  code — dùng biến môi trường, seed script, hoặc file cấu hình ngoài repo.
- Code phải chuẩn, sạch, comment bằng tiếng Việt rõ ràng (giải thích "vì sao" khi
  logic không hiển nhiên, không comment thừa).

## Additional Documentation

- [docs/PRD.md](docs/PRD.md) — đọc để hiểu yêu cầu nghiệp vụ, vai trò người dùng, phạm vi MVP, success metrics.
- [docs/Plan.md](docs/Plan.md) — đọc để biết cấu trúc thư mục đầy đủ, danh sách API endpoint theo module, schema chi tiết, checklist triển khai theo phase.
- [docs/erd.mermaid](docs/erd.mermaid) — đọc để xem quan hệ giữa các bảng trước khi thêm bảng/cột mới.
- [.claude/docs/inventory-debt-ledger.md](.claude/docs/inventory-debt-ledger.md) — đọc trước khi sửa bất kỳ logic nào liên quan đến tính tồn kho hoặc công nợ.
- [docs/CURRENT.md](docs/CURRENT.md) — trạng thái hiện tại của dự án.
- [docs/TASK.md](docs/TASK.md) — danh sách công việc theo phase.
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — lịch sử thay đổi.
- [docs/DECISIONS.md](docs/DECISIONS.md) — các quyết định kiến trúc/nghiệp vụ đã chốt.
- [docs/DEMO.md](docs/DEMO.md) — hướng dẫn chạy demo trên máy, kể cả mô hình nhiều máy trong LAN.
- [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) — chuẩn thiết kế giao diện (màu, font, style, icon). Mọi trang UI mới phải dùng skill `ui-ux-pro-max` và tuân theo tài liệu này để đồng bộ.
- [docs/handoff/](docs/handoff/) — các file handoff giữa các phiên làm việc (chỉ tạo khi có yêu cầu).
