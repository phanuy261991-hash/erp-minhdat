# Handoff: Kết thúc Phase 1.6 — Hệ thống Quản lý Kho & Công nợ nội bộ

**Ngày**: 2026-08-01
**Giai đoạn**: Phase 1 → 1.6 đã xong (đăng nhập, phân quyền động, quản lý người dùng/vai trò, cấu hình hệ thống). Phase 2 (Kho) **chưa bắt đầu code**.

## 1. Executive Summary

Phase 1, 1.5, 1.6 đã hoàn thành và test qua trình duyệt thật (đăng nhập, phân quyền động theo module, quản lý người dùng/vai trò, thông tin công ty, cấu hình kho, khung menu bán hàng trống). Bước tiếp theo đã thống nhất là **Phase 2 — Kho**, có 1 quyết định mới (gộp bảng `partners` vào Phase 2 thay vì để tới Phase 3) **đã được người dùng chốt trong chat nhưng chưa ghi vào `docs/Plan.md`/`docs/DECISIONS.md`** — cần cập nhật doc này khi/trước khi code Phase 2.

## 2. Session Overview

- Phiên này tập trung hoàn thiện toàn bộ frontend còn lại của Phase 1.6: trang Vai trò, Thông tin công ty, Cấu hình kho, khung Cấu hình bán hàng.
- Người dùng yêu cầu làm từng bước nhỏ, dừng chờ duyệt sau mỗi bước; nhiều vòng chỉnh sửa UI theo phản hồi trực tiếp (xem mục 9 — sở thích làm việc).
- Phát sinh yêu cầu ngoài phạm vi PRD gốc giữa chừng: mở rộng `company_settings` (Email, Website, Chi nhánh ngân hàng, nhiều số điện thoại) — đã làm và cập nhật docs đầy đủ.

## 3. Completed Work

Chi tiết đầy đủ từng mục xem `docs/CHANGELOG.md` (các mục ngày 2026-08-01) và `docs/TASK.md`. Tóm tắt:

| Phase | Nội dung chính |
|---|---|
| Phase 1 | `package.json`, migration runner + `001_init.sql`, đăng nhập + session, `login.html` |
| Phase 1.5 | `users.html`, khung điều hướng dùng chung `layout.js`/`icons.js`, `dashboard.html` |
| Phase 1.6 | Vai trò động theo module (`roles`/`role_permissions`, `requirePermission`), `roles.html`, `company_settings` + `warehouse_settings` (migration + routes + `company-settings.html`/`warehouse-settings.html`), khung `sales-settings.html` |

**File/migration quan trọng mới trong phiên này**:
- `backend/db/migrations/004_company_settings_extra_fields.sql` — thêm `email`/`website`/`bank_branch`, đổi `phone` → `phones` (mảng JSON).
- `frontend/roles.html`/`roles.js`, `frontend/company-settings.html`/`company-settings.js`, `frontend/warehouse-settings.html`/`warehouse-settings.js`, `frontend/sales-settings.html`.
- `frontend/assets/style.css` — bổ sung pattern dùng chung cho **mọi trang cấu hình tương lai**: `.settings-card`/`.settings-section`/`.settings-columns`/`.setting-row`/`.switch`/`.repeatable-list`/`.empty-state` (chi tiết + lý do trong `docs/DESIGN-SYSTEM.md` mục "Trang cấu hình (settings)").

**Test đã làm**: qua API (curl) đầy đủ cho mọi route mới; qua trình duyệt thật cho từng trang với cả 2 vai trò `admin` và `thukho1` (kiểm tra menu ẩn/hiện đúng + chặn URL trực tiếp).

## 4. Current State

- **Code**: đầy đủ, chạy được ngay qua `npm start` (xem `docs/DEMO.md`).
- **Database**: `data/data.db` đã áp dụng migration 001–004. Tài khoản demo hiện có:
  - `admin` / `Demo@123456` (vai trò Admin, toàn quyền)
  - `thukho1` / `ThuKho@123` (vai trò Thủ kho, quyền `kho`)
  - `khophu1` / `KhoPhu@123` (vai trò tự tạo "Nhân viên kho phụ", quyền `kho`+`cong_no`)
  - `ketoan1` / `KeToan@123` (vai trò Kế toán, quyền `cong_no`+`bao_cao`)
- **Tests**: không có test tự động (unit/integration) — dự án chỉ test thủ công qua curl + trình duyệt thật, ghi lại kết quả trong `docs/CHANGELOG.md`.
- **Build/CI**: N/A — không có build step (frontend thuần HTML/CSS/JS), không có CI được thiết lập.
- **Cấu hình `allow_negative_stock`**: đã có UI + lưu DB, **nhưng chưa có logic nghiệp vụ nào áp dụng nó** — chưa có bảng/route nào liên quan đến phiếu xuất kho. Sẽ áp dụng thật khi viết `stockIssue.service.js` ở Phase 2.

## 5. Next Steps (theo thứ tự ưu tiên)

1. **Ghi quyết định gộp `partners` vào Phase 2** vào `docs/Plan.md` (checklist Phase 2 + bảng schema) và `docs/DECISIONS.md` — quyết định đã chốt trong chat (gộp bảng `partners` sớm hơn dự kiến vào migration Phase 2, chỉ tạo bảng + FK, **chưa** làm API/frontend quản lý đối tác, phần đó vẫn để Phase 3) nhưng chưa được ghi vào tài liệu.
2. Migration Phase 2: `partners`, `products`, `stock_receipts`, `stock_receipt_items`, `stock_issues` (kèm cột `payment_status`), `stock_issue_items`, `stock_movements`.
3. `backend/services/stockReceipt.service.js` / `stockIssue.service.js` — mỗi phiếu 1 transaction duy nhất (insert phiếu + items + movements, rollback toàn bộ nếu 1 bước lỗi). `stockIssue.service.js` cần đọc `warehouse_settings.allow_negative_stock` để quyết định chặn cứng hay cho phép âm tồn kho.
4. API: `GET/POST /api/products`, `PUT /api/products/:id`, `GET/POST /api/stock-receipts`, `GET/POST /api/stock-issues`, `GET /api/stock-issues/:id/print` (quyền module `kho`).
5. Frontend: danh mục sản phẩm, lập phiếu nhập kho, lập phiếu xuất kho, xem tồn kho (tính từ `SUM(stock_movements)`, dùng lại đúng khung điều hướng + design system hiện có).

## 6. Blockers & Risks

| Rủi ro | Trạng thái | Mitigation |
|---|---|---|
| Quyết định gộp `partners` vào Phase 2 chưa ghi vào doc | Đang mở — xem mục 5.1 | Ghi vào `Plan.md`/`DECISIONS.md` trước/trong lúc code Phase 2 |
| `SESSION_SECRET` chưa cấu hình cố định | Đã biết, chưa xử lý | Chỉ cần xử lý khi vào Phase 5 (go-live qua PM2) — xem `docs/DECISIONS.md` |
| Session lưu in-memory, mất khi restart server | Đã biết, chưa xử lý | Cân nhắc `connect-sqlite3` ở Phase 5, chưa chốt |
| Module Bán hàng/POS chưa có yêu cầu nghiệp vụ | Đang mở | Cần buổi trao đổi riêng sau Phase 2/3, không tự suy diễn |

## 7. Câu hỏi cần người dùng xác nhận (chưa tự giả định)

Từ `docs/DECISIONS.md` mục "Open questions" (vẫn còn mở, chưa liên quan trực tiếp Phase 2 nhưng cần chốt trước khi tới phase tương ứng):
- Có cần export báo cáo ra Excel/PDF không, hay xem trực tiếp trên web là đủ? (liên quan Phase 4)
- Máy chủ có chạy 24/7 thực tế không, hay thường tắt ngoài giờ làm việc? (liên quan Phase 5)
- Có kế hoạch mở rộng nhiều kho/chi nhánh trong tương lai không?
- Yêu cầu nghiệp vụ module Bán hàng/POS (mục 4.9 PRD) — bàn sau Phase 2/3.

## 8. Setup & Resources

- Chạy demo: `docs/DEMO.md` (cài đặt, migrate, seed admin, chạy server, mô hình LAN nhiều máy).
- Ràng buộc bắt buộc khi code: `CLAUDE.md` (gốc repo) + `.claude/docs/inventory-debt-ledger.md` (công thức tồn kho/công nợ, edge case).
- Chuẩn UI bắt buộc: `docs/DESIGN-SYSTEM.md` — đặc biệt mục "Trang cấu hình (settings)" (mới thêm, dùng cho mọi trang cấu hình tương lai) và bài học về lưới chọn nhiều mục.
- Thứ tự đọc tài liệu khi bắt đầu phiên mới: `docs/PRD.md` → `docs/Plan.md` → `docs/erd.mermaid` → `docs/CURRENT.md` → `docs/TASK.md` → `docs/CHANGELOG.md` → `docs/DECISIONS.md` (bắt buộc theo `CLAUDE.md`, xem mục 9 bên dưới).

## 9. Notes for Next Session

**Về việc chỉ đọc file handoff này có đủ không**: **Không đủ.** `CLAUDE.md` (luôn được nạp tự động mỗi phiên vì là file chỉ dẫn dự án) quy định rõ: *"Trước khi bắt đầu bất kỳ công việc nào, phải đọc qua `docs/PRD.md`, `docs/Plan.md`, `docs/erd.mermaid`, `docs/CURRENT.md`, `docs/TASK.md`, `docs/CHANGELOG.md`, `docs/DECISIONS.md` để nắm bối cảnh, tránh code sai hướng hoặc lệch với quyết định đã chốt."* File handoff này chỉ là điểm khởi động nhanh (tóm tắt + con trỏ tới các quyết định mới nhất), không thay thế các tài liệu gốc — phiên sau vẫn nên đọc đủ bộ tài liệu trên trước khi code, đặc biệt vì handoff không lặp lại toàn bộ chi tiết đã có sẵn trong `CURRENT.md`/`TASK.md`/`CHANGELOG.md`.

**Sở thích làm việc của người dùng** (quan trọng, nên giữ nhất quán):
- Làm từng bước nhỏ, dừng chờ duyệt sau mỗi bước khi được yêu cầu — không tự ý làm nhiều bước liên tiếp.
- Chỉ gộp cập nhật `docs/CURRENT.md`/`TASK.md`/`CHANGELOG.md` **1 lần khi xong cả phase/bước lớn**, không cập nhật sau mỗi bước nhỏ — nhưng vẫn phải kiểm tra `docs/DEMO.md` mỗi lần và cập nhật nếu có thông tin liên quan.
- **Bắt buộc dùng skill `ui-ux-pro-max`** cho MỌI pattern UI mới, kể cả pattern nhỏ trong 1 trang đã có sẵn design system — không tự viết CSS tùy hứng dù là chỉnh nhỏ.
- Tránh giao diện "nhìn là biết AI làm": nền pastel nhạt đều màu, thiếu chiều sâu — ưu tiên fill đặc + shadow rõ ràng cho trạng thái active/selected.
- Khi cần chọn nhiều mục cùng loại (checkbox nhóm), dùng lưới ô **đều nhau kích thước** (`grid-template-columns: repeat(auto-fill, minmax(...px, 1fr))`), không dùng chip tự co giãn bo tròn hết cỡ (gây lệch hình dạng giữa nhãn ngắn/dài).
- Mọi trang cấu hình mới: dùng lại `.settings-card`/`.settings-section`/`.setting-row`/`.switch`, và **luôn yêu cầu bấm nút Lưu tường minh** — không tự động lưu khi thao tác.
