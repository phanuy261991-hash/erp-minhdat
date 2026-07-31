# Handoff: Phase 2 (Kho) — Danh mục sản phẩm + Nhập kho + Giá vốn

**Ngày**: 2026-07-31
**Giai đoạn**: Phase 1 → 1.6 đã xong (từ trước). Phase 2 (Kho) **đang làm dở** — Danh mục sản phẩm + Nhập kho đã xong, test qua trình duyệt thật. **Xuất kho chưa bắt đầu code.**

## 1. Executive Summary

Phase 2 mở rộng đáng kể ngoài phạm vi `docs/Plan.md` gốc theo yêu cầu người dùng (giá vốn bình quân gia quyền/FIFO, chiết khấu, thời gian nhập tùy chỉnh, mã đơn hàng, vô hiệu hóa/xóa sản phẩm, trang chi tiết sản phẩm) — toàn bộ đã code, test qua curl + trình duyệt, và đã git commit. Việc còn treo duy nhất là trang **Xuất kho** (`stock-issues.html`), đang chờ người dùng trả lời 2 câu hỏi nghiệp vụ đã hỏi nhưng bị dismiss (xem mục 7).

## 2. Session Overview

- Làm theo từng trang một, có duyệt lại sau mỗi trang (Danh mục sản phẩm → Nhập kho), đúng yêu cầu người dùng đầu phiên.
- Người dùng đặt thêm 3 quy tắc làm việc mới giữa phiên (đã lưu vào memory hệ thống, áp dụng xuyên suốt phần còn lại và các phiên sau):
  1. Hỏi các trường (fields) của form nhập liệu trước khi thiết kế, không tự suy diễn từ schema.
  2. Giải thích lý do + kiểm tra chéo trước khi sửa file liên quan đã có (tránh phá logic đang chạy).
  3. Form nhập liệu: ghép trường ngắn 2/dòng theo chiều ngang, không xếp dọc từng trường (tránh form quá dài).
- Phát sinh nhiều yêu cầu ngoài phạm vi PRD gốc giữa chừng (giá vốn, chiết khấu, mã đơn hàng...) — đã hỏi lại người dùng từng điểm trước khi code, không tự giả định.

## 3. Completed Work

Chi tiết đầy đủ xem `docs/CHANGELOG.md` mục "2026-07-31 (Phase 2 — ...)" và `docs/TASK.md` mục "Phase 2". Tóm tắt:

| Hạng mục | Trạng thái |
|---|---|
| Migration `005`-`009` (partners/products/stock_receipts.../stock_lots/product_change_log/discount/order_code) | ✅ Xong, đã chạy |
| `stockReceipt.service.js`/`stockIssue.service.js` (transaction) | ✅ Xong, test rollback qua curl |
| `costing.service.js` (bình quân gia quyền + FIFO) | ✅ Xong, verify bằng số liệu thật |
| `products.routes.js` (CRUD + vô hiệu hóa/xóa + chi tiết/lịch sử) | ✅ Xong |
| `partners.routes.js` (rút gọn: GET + POST tạo nhanh) | ✅ Xong |
| `requireAnyPermission` (middleware mới) | ✅ Xong |
| `products.html`/`.js` (danh mục sản phẩm) | ✅ Xong, test trình duyệt |
| `product-detail.html`/`.js` (ngoài kế hoạch gốc) | ✅ Xong, test trình duyệt |
| `warehouse-settings.html`/`.js` (thêm chọn costing_method) | ✅ Xong, test trình duyệt |
| `stock-receipts.html`/`.js` (lập phiếu nhập đầy đủ) | ✅ Xong, test trình duyệt |
| **`stock-issues.html`/`.js` (lập phiếu xuất)** | ❌ **Chưa code** |
| Cơ chế phiếu điều chỉnh bù trừ (sửa/hủy phiếu) | ❌ Chưa làm |

**Git commit trong phiên** (xem `git log` để đối chiếu diff chi tiết):
- `bdae4f5` — Thêm trang Sản phẩm, Nhập kho và giá vốn bình quân gia quyền/FIFO (toàn bộ Phase 2 tới thời điểm đó).
- `9e05d29` — Bố cục lại form Nhập kho: ghép trường ngắn 2/dòng theo chiều ngang.

## 4. Current State

- **Code**: chạy được ngay qua `npm start`, không có lỗi console ở các trang đã làm.
- **Database**: `data/data.db` đã áp dụng migration 001–009. Có dữ liệu test: sản phẩm `SP001`/`SP020` (đã dùng để test giá vốn/chiết khấu), phiếu nhập `PN000001`-`PN000008`, 2 đối tác NCC test.
- **Tests**: không có test tự động — toàn bộ test bằng curl (permission, rollback, công thức giá vốn) + trình duyệt thật (admin + thukho1), kết quả ghi trong `docs/CHANGELOG.md`.
- **Cấu hình `costing_method`**: đã đặt lại về mặc định `binh_quan_gia_quyen` sau khi test xong (không để sót ở trạng thái test).
- **Chưa có gì uncommitted** — làm việc gì tiếp cũng nên commit lại theo đúng thói quen (chỉ commit khi người dùng yêu cầu, theo Git Safety Protocol).

## 5. Next Steps (theo thứ tự ưu tiên)

1. **Hỏi lại người dùng 2 câu hỏi còn treo** (xem mục 7) trước khi code `stock-issues.html` — đã hỏi 1 lần nhưng bị dismiss (chưa trả lời), không tự giả định.
2. Code `stock-issues.html`/`stock-issues.js` theo đúng pattern đã dùng ở `stock-receipts.html`: combobox tìm sản phẩm, `.form-row` (bố cục ngang), tổng thành tiền. Backend (`stockIssue.service.js`/`stockIssues.routes.js`) **đã có sẵn và test qua curl từ trước** (chặn tồn kho không đủ, `allow_negative_stock`, tính giá vốn theo `costing_method`) — chỉ còn thiếu giao diện, không cần sửa backend trừ khi phát sinh yêu cầu mới từ 2 câu hỏi ở mục 7.
3. Bật `enabled: true` cho mục `stock-issues` trong `frontend/assets/layout.js` (`NAV_GROUPS`) sau khi trang xong.
4. Sau khi `stock-issues.html` xong: coi như Phase 2 phần cơ bản hoàn thành (trừ phiếu điều chỉnh bù trừ, có thể để sau) — cập nhật gộp `docs/CURRENT.md`/`TASK.md`/`CHANGELOG.md` 1 lần nữa, rồi hỏi người dùng có muốn làm phiếu điều chỉnh bù trừ ngay hay chuyển sang Phase 3 (Công nợ).

## 6. Blockers & Risks

| Rủi ro | Trạng thái | Mitigation |
|---|---|---|
| 2 câu hỏi nghiệp vụ cho Xuất kho chưa có trả lời | Đang mở — xem mục 7 | Hỏi lại đầu phiên sau, không tự giả định |
| Session in-memory, mất khi restart server | Đã biết từ trước, chưa xử lý | Xử lý ở Phase 5 |
| `SESSION_SECRET` chưa cấu hình cố định | Đã biết từ trước, chưa xử lý | Xử lý ở Phase 5 |
| Module Bán hàng/POS chưa có yêu cầu nghiệp vụ | Đang mở, không liên quan Phase 2 | Bàn riêng sau Phase 2/3 |
| `.claude/docs/inventory-debt-ledger.md` mục "Edge case" ghi thông tin lỗi thời (nói "chưa chốt" nhưng thực ra đã chốt từ 2026-07-31/08-01) | Phát hiện phiên này, **chưa sửa** | Nên sửa lại mục đó cho khớp `CLAUDE.md`/`DECISIONS.md` khi có dịp, tránh gây hiểu nhầm ở phiên sau |

## 7. Câu hỏi cần người dùng xác nhận (đã hỏi, chưa có trả lời)

Nguyên văn 2 câu hỏi đã đặt ra cho Xuất kho, người dùng đã dismiss (không trả lời) — **phải hỏi lại trước khi code**:

1. **Đối tác khách hàng trong phiếu xuất**: dùng đúng cơ chế dropdown + "thêm nhanh" giống hệt NCC ở phiếu nhập (chỉ đổi `type='khach_hang'`, gọi `GET/POST /api/partners`), hay xử lý khác đi?
2. **`payment_status`** (`da_thu_tien`/`cong_no`) hiển thị trên form dạng gì:
   - Toggle đơn "Chưa thu tiền ngay" (mặc định tắt = `da_thu_tien`), hay
   - 2 nút radio ngang hàng, bắt buộc chọn 1 trong 2, không mặc định option nào là "bình thường hơn".

## 8. Setup & Resources

- Chạy demo: `docs/DEMO.md` (đã cập nhật mục 6 — menu "Kho" giờ có Sản phẩm/Nhập kho).
- Ràng buộc bắt buộc khi code: `CLAUDE.md` (gốc repo) + `.claude/docs/inventory-debt-ledger.md` (lưu ý mục Edge case lỗi thời, xem mục 6 ở trên).
- Chuẩn UI bắt buộc: `docs/DESIGN-SYSTEM.md` — đã bổ sung nhiều pattern mới phiên này (mục "Form nhiều dòng động", "Chọn 1 trong nhiều phương án", "Bố cục ngang cho form") — dùng lại cho `stock-issues.html`, không tự vẽ lại.
- Thứ tự đọc tài liệu khi bắt đầu phiên mới (bắt buộc theo `CLAUDE.md`): `docs/PRD.md` → `docs/Plan.md` → `docs/erd.mermaid` → `docs/CURRENT.md` → `docs/TASK.md` → `docs/CHANGELOG.md` → `docs/DECISIONS.md`.

## 9. Notes for Next Session

- **File handoff này không thay thế việc đọc đủ bộ tài liệu gốc** — đây chỉ là điểm khởi động nhanh, chi tiết đầy đủ nằm trong `CURRENT.md`/`TASK.md`/`CHANGELOG.md`/`DECISIONS.md`/`DESIGN-SYSTEM.md` đã cập nhật đồng bộ trong phiên này.
- **Memory hệ thống** (`C:\Users\Administrator\.claude\projects\...\memory\`) đã lưu các thói quen làm việc mới của người dùng phát sinh phiên này — sẽ tự động áp dụng ở phiên sau: hỏi trường form trước khi thiết kế, giải thích + kiểm tra chéo trước khi sửa file liên quan, bố cục form ngang 2 trường/dòng.
- Khi bắt đầu code `stock-issues.html`, nhớ đọc lại `frontend/stock-receipts.html`/`frontend/assets/stock-receipts.js` làm mẫu — cấu trúc combobox/chiết khấu/form-row nên tái dùng nguyên, chỉ đổi phần đặc thù của phiếu xuất (khách hàng thay NCC, `payment_status` thay vì không có, kiểm tra tồn kho đủ/không đủ tùy `allow_negative_stock`).
