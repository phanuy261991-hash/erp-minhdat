# Handoff: Giai đoạn lên kế hoạch — Hệ thống Quản lý Kho & Công nợ nội bộ

**Ngày**: 2026-07-31
**Giai đoạn**: Planning (chưa viết code)

## 1. Executive Summary

Đã hoàn tất toàn bộ tài liệu thiết kế (PRD, Plan kỹ thuật, ERD, CLAUDE.md) cho một web app nội bộ quản lý kho/công nợ chạy trên Node.js + Express + SQLite, một máy chủ LAN duy nhất; chưa có dòng code nào được viết — bước tiếp theo là bắt đầu Phase 1 theo `Plan.md`.

## 2. Session Overview

- Trao đổi qua nhiều lượt để chốt: ý tưởng ban đầu → đánh giá tính khả thi kiến trúc → PRD → Plan kỹ thuật + ERD → CLAUDE.md.
- Không có deadline/timeline cụ thể được xác nhận (ghi trong PRD mục Open Questions).
- Không có team size cụ thể được xác nhận.

## 3. Completed Work

Tài liệu đã tạo (tất cả ở dạng Markdown, đọc được trực tiếp trong repo khi khởi tạo):

| File | Nội dung |
|---|---|
| `PRD.md` | Yêu cầu nghiệp vụ, 6 feature MVP, success metrics, risks, open questions |
| `Plan.md` | Cấu trúc thư mục, schema chi tiết, danh sách API endpoint, checklist theo 5 phase |
| `erd.mermaid` | Sơ đồ quan hệ 10 bảng (users, products, partners, stock_receipts/issues + items, stock_movements, debt_ledger, schema_migrations) |
| `CLAUDE.md` | Index kỹ thuật cho agent — tech stack, dev commands, constraints |
| `.claude/docs/inventory-debt-ledger.md` | Công thức tính tồn kho/công nợ từ ledger, quy tắc transaction, edge case chưa chốt |

**Quyết định kiến trúc đã chốt** (không thảo luận lại trừ khi có lý do mới):
- Backend: Node.js + Express, 1 process duy nhất, quản lý bằng PM2.
- Database: SQLite qua `better-sqlite3`, bắt buộc `PRAGMA journal_mode=WAL` để giảm lỗi khóa khi ghi đồng thời.
- Schema thay đổi qua migration đánh version (không dùng `CREATE TABLE IF NOT EXISTS` đơn thuần).
- Tồn kho/công nợ tính từ tổng cộng dồn (`stock_movements`, `debt_ledger`), không lưu số dư cố định.
- Mỗi phiếu nhập/xuất = 1 transaction duy nhất.
- In phiếu: HTML + `@media print` + `window.print()`, không dùng PDF/ESC-POS (máy in văn phòng thường).
- Triển khai: máy chủ IP tĩnh/DHCP reservation, PM2 với `pm2 startup` + `pm2 save` bắt buộc (không chỉ `pm2 start`), backup `data.db` định kỳ.

## 4. Current State

- **Code**: chưa có — chưa khởi tạo `package.json`, chưa có repo Git.
- **Database**: chưa tồn tại, chỉ có schema thiết kế trong `Plan.md`/`erd.mermaid`.
- **Tests**: N/A, chưa có code để test.
- **Build/CI**: N/A.

## 5. Next Steps (theo thứ tự ưu tiên)

1. **Xác nhận 3 câu hỏi mở trước khi code Phase 2/3** (xem mục 7) — trả lời trước khi implement service xuất/nhập kho, vì ảnh hưởng trực tiếp logic transaction.
2. Khởi tạo repo, `package.json`, cài `express`, `better-sqlite3`, `bcrypt` — Phase 1 theo `Plan.md`.
3. Viết `001_init.sql` (bảng `users`, `schema_migrations`) + migration runner.
4. API đăng nhập + middleware phân quyền + trang login.
5. Từ Phase 2 trở đi: bám theo checklist trong `Plan.md` mục 4.

## 6. Blockers & Risks

| Rủi ro | Trạng thái | Mitigation đã chốt |
|---|---|---|
| SQLite khóa khi ghi đồng thời | Chưa xảy ra (chưa có code) | WAL mode + `better-sqlite3` transaction |
| Máy chủ tắt/crash mất truy cập | Chưa xảy ra | PM2 + `pm2 startup`/`pm2 save` |
| Mất dữ liệu do không backup | Chưa có script | Cần viết script backup ở Phase 5 — **chưa làm** |
| 3 câu hỏi nghiệp vụ chưa chốt (mục 7) | Đang mở | Cần hỏi người dùng trước khi code phần liên quan |

## 7. Câu hỏi cần người dùng xác nhận (chưa tự giả định)

- Có cho phép lập phiếu xuất khi tồn kho không đủ, hay chặn cứng?
- Phiếu xuất luôn phát sinh công nợ, hay chỉ khi chọn "chưa thu tiền ngay"?
- Sửa/hủy phiếu đã tạo: cho phép sửa trực tiếp, hay bắt buộc tạo phiếu điều chỉnh bù trừ để giữ lịch sử?

Đồng thời các mục Open Questions trong `PRD.md` (mục 10) vẫn chưa có câu trả lời: danh sách vai trò đã đủ chưa, có cần export báo cáo ra Excel/PDF không, khả năng chạy 24/7 thực tế của máy chủ, kế hoạch mở rộng nhiều kho/chi nhánh.

## 8. Setup & Resources

Chưa có bước setup vì chưa có code. Khi bắt đầu Phase 1, thứ tự đọc tài liệu nên là: `PRD.md` (bối cảnh) → `Plan.md` (chi tiết kỹ thuật) → `erd.mermaid` (schema) → `CLAUDE.md` + `.claude/docs/inventory-debt-ledger.md` (quy tắc bắt buộc khi code).

## 9. Notes for Next Session

Toàn bộ quyết định kiến trúc trong mục 3 đã được thảo luận kỹ và có lý do cụ thể (không phải mặc định) — không đổi lại (ví dụ chuyển sang Postgres, bỏ WAL mode, bỏ migration versioned) trừ khi có lý do mới phát sinh. Nếu người tiếp theo không phải người đã trao đổi trực tiếp, nên đọc `PRD.md` mục 9 (Risks) và `Plan.md` mục 5 (Kiểm thử) trước khi code để hiểu vì sao các ràng buộc trong `CLAUDE.md` tồn tại.
