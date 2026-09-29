# Handoff: Sửa 3 lỗi vận hành Kho/Công nợ + Thiết kế lại 4 trang lập phiếu

**Ngày**: 2026-09-28 → 2026-09-29
**Commit**: `5d883f0` (đã push lên `origin/master`)

## 1. Executive Summary

Phiên này gồm 2 việc độc lập nhưng làm liên tục không dừng: (1) sửa 3 lỗi người dùng báo qua vận hành thật ở module Kho/Công nợ, (2) thiết kế lại 4 trang lập phiếu (Nhập kho/Xuất kho/Trả hàng xuất/Trả hàng NCC) từ popup sang trang riêng bố cục 2 cột theo yêu cầu người dùng. **Cả 2 việc đã code xong, test qua API thật + Chrome headless CDP thật, đã commit + push**. Không có việc gì dang dở — chỉ còn 1 khuyến nghị: người dùng nên tự bấm thử qua trình duyệt thật (không chỉ tin vào CDP headless) trước khi coi là hoàn toàn xong, vì phiên này chưa có ai xác nhận bằng mắt thường ngoài ảnh chụp CDP.

## 2. Session Overview

Người dùng báo lỗi qua vận hành thật → đọc code xác định nguyên nhân → hỏi qua `AskUserQuestion` để chốt hướng sửa trước khi code (đúng quy trình bắt buộc). Giữa chừng, người dùng chuyển hướng sang yêu cầu mới (thiết kế lại giao diện lập phiếu) — cũng đã hỏi `AskUserQuestion` để chốt phạm vi trước khi code. Trong lúc code trang mới, người dùng phản hồi trực tiếp qua ảnh chụp màn hình 3 lần (chuông thông báo che nút, cột Ghi chú quá rộng, muốn nút Lưu cố định, bảng không dùng hết chiều cao) — đều đã sửa ngay trong phiên.

**Điểm quan trọng cần biết**: các phản hồi UI phát sinh giữa chừng được phát hiện qua **ảnh chụp CDP thật** (không phải chỉ đọc code) — bài học lặp lại nhiều lần trong lịch sử dự án là lỗi hiển thị chỉ lộ ra khi nhìn ảnh chụp thật, không đoán được từ code.

## 3. Completed Work

Chi tiết đầy đủ xem `docs/CHANGELOG.md` (2 entry mới nhất), `docs/DECISIONS.md` (2 entry mới nhất), `docs/DESIGN-SYSTEM.md` mục 11.

### Việc 1 — Sửa 3 lỗi vận hành Kho/Công nợ

| Lỗi | Nguyên nhân | Đã sửa |
|---|---|---|
| Gõ nhầm chiết khấu/giá nhập phiếu nhập kho, không sửa được | Nguyên tắc "không sửa phiếu đã tạo" không có ngoại lệ cho giá | `stockReceipt.service.js#updateStockReceiptPricing()` — chỉ mở khóa khi lô hàng CHƯA bị xuất dùng 1 phần nào; tự sửa công nợ NCC (dòng điều chỉnh mới) hoặc phiếu Chi tự động |
| Trả hàng khách "khách lẻ" bị chặn | "Trả hàng xuất" bắt buộc chọn khách hàng, so khớp `partner_id = ?` không bao giờ khớp NULL | Bỏ bắt buộc chọn khách hàng, đổi `= ?` → `IS ?`, `LEFT JOIN partners` (route) |
| Trả hàng NCC/gán khách hàng cho phiếu thiếu đối tác | Phiếu tồn đầu kỳ/phiếu xuất khách lẻ không bắt buộc chọn đối tác từ đầu | `assignStockReceiptPartner()`/`assignStockIssuePartner()` — gán bổ sung khi đang trống |

**File đã sửa**: `backend/services/{stockReceipt,stockIssue,stockReturn}.service.js`, `backend/routes/{stockReceipts,stockIssues,stockReturns}.routes.js`, `frontend/assets/stock-{receipts,issues,returns}.js` (đã bị việc 2 sửa tiếp/thay thế phần lớn — xem dưới).

### Việc 2 — Thiết kế lại 4 trang lập phiếu (popup → trang riêng 2 cột)

**4 trang mới**: `frontend/stock-receipt-form.html`, `stock-issue-form.html`, `stock-return-form.html`, `supplier-return-form.html` (+ 4 file JS tương ứng trong `frontend/assets/`).

- Bố cục: cột trái (tìm/thêm sản phẩm — 1 ô tìm kiếm duy nhất, không còn combobox lặp lại từng dòng), cột phải **sticky** (đối tác/thanh toán, tách vùng cuộn `.form-page-side-scroll` + footer cố định `.form-page-side-footer` chứa Tổng tiền + nút Lưu/Hủy — **không bao giờ cuộn mất**, theo yêu cầu trực tiếp của người dùng).
- Chế độ Sửa (phiếu xuất/trả hàng đang nháp) dùng chung 1 trang qua query `?id=`.
- "Trả hàng xuất"/"Trả hàng NCC" **tách 2 file riêng** (quyết định đã hỏi và chốt, xem `docs/DECISIONS.md`).
- 3 trang danh sách cũ (`stock-receipts.js`/`stock-issues.js`/`stock-returns.js`) đã được **viết lại gọn hơn nhiều** — chỉ còn danh sách/xem chi tiết/xử lý nhanh/xóa nháp/gán đối tác, KHÔNG còn logic lập/sửa phiếu (đã chuyển hết sang 4 trang mới).
- CSS mới trong `frontend/assets/style.css`: nhóm class `.form-page-*` (xem `docs/DESIGN-SYSTEM.md` mục 11 để hiểu đầy đủ từng class).

**2 sửa nhỏ phát sinh thêm** (phản hồi trực tiếp khi người dùng xem trang liên quan):
- `stock-receipts.js`: thêm `.note-cell-truncate` cho cột Ghi chú (đồng bộ trang Xuất kho đã có từ trước).
- `stock-returns.html`: thêm `.data-table-wrap--fill` (opt-in, KHÔNG đổi mặc định dùng chung mọi trang) — bảng chiếm hết chiều cao còn lại, tự cuộn riêng, đầu cột dính (`position:sticky` trên `<th>`).

## 4. Current State

- **Git**: đã commit `5d883f0` + push lên `origin/master`. Working tree sạch (không còn gì uncommitted).
- **Database**: KHÔNG có migration mới trong phiên này (chỉ sửa route/service/frontend, không đổi schema).
- **Server dev**: đang chạy nền tại `http://localhost:3000` (khởi động qua background bash trong phiên — sẽ mất khi máy/terminal tắt, cần `npm start` lại ở phiên sau).
- **Dữ liệu test**: đã dọn sạch hoàn toàn qua script dọn trực tiếp (không còn sản phẩm/đối tác/phiếu test nào sót lại trong `data/data.db`).
- **Test đã làm**: API thật (Node `fetch`) cho việc 1; Chrome headless CDP thô tự viết (đăng nhập lấy cookie thật, `Network.setCookie` tiêm vào trình duyệt, `Runtime.evaluate` dispatch `input`/`click` thật, `Page.captureScreenshot` xác nhận trực quan) cho việc 2 — cả 4 trang mới đều đã test luồng tạo mới + sửa (`?id=`) + xử lý (Xuất kho/Trừ kho) thành công, không lỗi console.
- **CHƯA test**: chưa có ai bấm thử qua trình duyệt thật (Chrome bình thường, không headless) — CDP headless mô phỏng khá sát nhưng không thay thế hoàn toàn việc người dùng tự dùng thử.

## 5. Next Steps (không có việc bắt buộc — chờ người dùng chọn hướng)

1. **Khuyến nghị đầu tiên**: người dùng tự mở `stock-receipts.html`/`stock-issues.html`/`stock-returns.html`, bấm "+ Lập phiếu" thử luồng thật, xác nhận giao diện/thao tác đúng ý trước khi coi việc 2 là xong hẳn.
2. Nếu muốn đồng bộ tiếp: các trang danh sách khác (Sản phẩm, Đối tác, Công nợ, Người dùng...) hiện chưa dùng `.data-table-wrap--fill` — có thể áp dụng thêm nếu người dùng thích kiểu "chiếm hết chiều cao, tự cuộn" này ở nơi khác (hiện chỉ mới làm cho `stock-returns.html`, có chủ đích để opt-in từng trang).
3. Các việc còn treo từ trước, không liên quan phiên này: **Phase 5** (PM2, IP tĩnh, backup, go-live trên máy chủ thật), **Giao diện di động Đợt 2-4** (Tra cứu/Dự án tại công trường/Nghiệp vụ ghi — xem `docs/TASK.md`).

## 6. Blockers & Risks

| Rủi ro | Trạng thái | Mitigation |
|---|---|---|
| Chưa test bằng trình duyệt thật (chỉ CDP headless) | Đang mở | Người dùng tự bấm thử theo mục 5.1 |
| Server dev sẽ tắt khi kết thúc phiên/terminal đóng | Bình thường, đã biết | Chạy lại `npm start` ở phiên sau |
| Không có hot-reload backend | Đã biết từ đầu dự án | Luôn restart server sau khi sửa `.routes.js`/`.service.js` |
| `.data-table-wrap--fill` mới chỉ áp dụng 1 trang (`stock-returns.html`) | Có chủ đích (opt-in, tránh phá vỡ trang khác chưa test) | Không phải bug — chỉ mở rộng khi người dùng yêu cầu thêm |

## 7. Setup & Resources

- Chạy server: `npm start` (cổng 3000). Tài khoản demo: `admin` / `Demo@123456` (Admin, toàn quyền) — xem `docs/DEMO.md`.
- Ràng buộc bắt buộc: `CLAUDE.md` (gốc repo) + `.claude/docs/inventory-debt-ledger.md`.
- Chuẩn UI bắt buộc: `docs/DESIGN-SYSTEM.md` — **mục 11 (mới thêm phiên này)** mô tả đầy đủ pattern "trang lập phiếu 2 cột", đọc trước khi làm thêm trang lập phiếu tương tự (nếu sau này có module Bán hàng/POS chẳng hạn).
- Quyết định kiến trúc chi tiết: `docs/DECISIONS.md` mục "2026-09-28 — Vận hành báo lỗi" và "2026-09-28/29 — Thiết kế lại trang lập phiếu".
- Thứ tự đọc tài liệu khi bắt đầu phiên mới (bắt buộc theo `CLAUDE.md`): `docs/PRD.md` → `docs/Plan.md` → `docs/erd.mermaid` → `docs/CURRENT.md` → `docs/TASK.md` → `docs/CHANGELOG.md` → `docs/DECISIONS.md`.

## 8. Notes for Next Session

- File handoff này không thay thế việc đọc đủ bộ tài liệu gốc — chi tiết đầy đủ đã đồng bộ vào `CURRENT.md`/`TASK.md`/`CHANGELOG.md`/`DECISIONS.md`/`DESIGN-SYSTEM.md`.
- Nếu người dùng báo thêm lỗi hiển thị ở 1 trong 4 trang lập phiếu mới, khả năng cao là do khác biệt giữa CDP headless (viewport 1600×1000 cố định trong lúc test) và màn hình thật của người dùng — kiểm tra trước bằng cách hỏi kích thước màn hình/độ phóng đại trình duyệt.
- Memory hệ thống đã ghi các thói quen làm việc liên quan (hỏi trước khi đụng ledger, dùng CDP đo thật thay vì đoán, dọn dữ liệu test bằng script trực tiếp vì phiếu `da_tru_kho` không xóa được qua API) — tự động áp dụng ở phiên sau.
