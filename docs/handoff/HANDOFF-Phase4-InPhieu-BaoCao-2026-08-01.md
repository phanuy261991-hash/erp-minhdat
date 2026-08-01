# Handoff: Phase 2 hoàn tất → Phase 3 (Công nợ) → Phase 4 (In phiếu & Báo cáo)

**Ngày**: 2026-08-01
**Giai đoạn**: Phase 1 → 4 **đã hoàn thành toàn bộ**. Dự án đã có đủ chức năng nghiệp vụ cốt lõi (đăng nhập/phân quyền động, kho, công nợ, in phiếu, báo cáo). Còn lại Phase 5 (Vận hành & Go-live) và các module ngoài kế hoạch gốc (Bán hàng/POS).

## 1. Executive Summary

Từ handoff trước (`HANDOFF-Phase2-SanPham-NhapKho-2026-07-31.md`, lúc đó Xuất kho chưa code) đến nay, dự án đã đi hết: hoàn thành Xuất kho + cơ chế phiếu điều chỉnh bù trừ, toàn bộ Phase 3 (Công nợ — cả phải thu lẫn phải trả), rồi Phase 4 (in phiếu xuất kho + trang Báo cáo có biểu đồ). Toàn bộ đã code, test kỹ qua trình duyệt thật (không chỉ chạy code), và đã git commit. **Không có việc gì đang dang dở** — chỉ còn 1 điểm cần người dùng xác nhận lại nội dung (xem mục 7) và các việc thuộc Phase 5/module mới chưa bắt đầu.

## 2. Session Overview

Chuỗi phiên làm việc liên tục, người dùng chỉ đạo theo từng bước ngắn gọn ("tiếp tục theo kế hoạch", "oki", xác nhận nhanh các đề xuất). Các điểm quan trọng phát sinh giữa chừng:
- Phát hiện và tự sửa 1 lỗ hổng thiết kế trước khi vào Phase 3: `stock_receipts` thiếu `payment_status` (chỉ `stock_issues` có) — đã hỏi và được xác nhận bổ sung.
- Người dùng rút lại 1 yêu cầu giữa chừng (xóa/vô hiệu hóa phiếu nhập kho) sau khi được cảnh báo mâu thuẫn với nguyên tắc ledger đã chốt trong `CLAUDE.md` — **quyết định giữ nguyên**, không code phần đó.
- Người dùng gửi ảnh mẫu phiếu in thật của công ty (Minh Đạt) — đã dùng làm cơ sở thiết kế `print-issue.html`, và **được phép** lấy nguyên văn nội dung ghi chú trong ảnh (đã seed vào DB, xem mục 7 về 1 dòng bị cắt ảnh).
- Quyết định kỹ thuật quan trọng: **không dùng Chart.js/thư viện biểu đồ ngoài** cho trang Báo cáo — tự vẽ SVG tay, nhất quán với nguyên tắc không phụ thuộc CDN/build step đã áp dụng cho font/icon từ đầu dự án. Đã tham khảo skill `dataviz` trước khi code.

## 3. Completed Work

Chi tiết đầy đủ từng mục xem `docs/CHANGELOG.md` (3 entry mới nhất: "Phase 4 hoàn thành", "Phase 3 hoàn thành", "Phase 2 hoàn thành — Xuất kho..."). Tóm tắt:

| Hạng mục | Trạng thái |
|---|---|
| Xuất kho (`stock-issues.html`) — lập phiếu, chiết khấu, thời gian xuất, hiển thị liên hệ khách hàng | ✅ Xong |
| Modal xem chi tiết phiếu nhập + phiếu xuất (`receipt-detail.js`/`issue-detail.js`) | ✅ Xong |
| Cơ chế phiếu điều chỉnh bù trừ (migration `010`, trường "Điều chỉnh cho phiếu") | ✅ Xong |
| Sửa/xóa tài khoản người dùng (giống nguyên tắc xóa sản phẩm) | ✅ Xong |
| Công nợ: `payment_status` trên `stock_receipts` (migration `011`), `debt_ledger` (migration `012`), `debt.service.js` | ✅ Xong |
| CRUD đối tác đầy đủ (`partners.html`), trang Công nợ (`debts.html`, số dư + lịch sử + ghi nhận thanh toán) | ✅ Xong |
| Chiết khấu phiếu xuất (migration `013`, đối xứng phiếu nhập) | ✅ Xong |
| In phiếu xuất kho (`print-issue.html`, trang độc lập) | ✅ Xong |
| Ghi chú in phiếu cấu hình được (`company_settings.print_note`, migration `014`) | ✅ Xong |
| Trang Báo cáo (`reports.html`) — tồn kho, mua/bán theo tháng (biểu đồ SVG), công nợ tổng hợp | ✅ Xong |
| Phiếu điều chỉnh cho `debt_ledger` (sửa 1 dòng công nợ ghi sai) | ❌ Chưa làm, chưa có yêu cầu cụ thể |
| Phase 5 (PM2, IP tĩnh, backup, `SESSION_SECRET` cố định) | ❌ Chưa bắt đầu |
| Module Bán hàng/POS | ❌ Chưa bắt đầu, cần buổi trao đổi riêng |

**Git commit trong khoảng thời gian này** (mới nhất trước):
- `1865c92` — Hoàn thành Phase 4: in phiếu xuất kho và báo cáo.
- `e7290ea` — Hoàn thành Phase 3 (Công nợ) và bổ sung Xuất kho (gồm cả phần Xuất kho + cơ chế điều chỉnh bù trừ + chiết khấu phiếu xuất, bundle chung 1 commit vì làm liên tục không dừng).
- `5c85051` — Thêm sửa/xóa tài khoản người dùng.
- `ec25118` — Thêm modal xem chi tiết phiếu nhập kho.

## 4. Current State

- **Code**: chạy được ngay qua `npm start`, không lỗi console ở mọi trang đã làm/test.
- **Database**: `data/data.db` đã áp dụng migration `001`–`014`. Rất nhiều dữ liệu test tích lũy (sản phẩm, phiếu nhập/xuất PN/PX, đối tác, dòng `debt_ledger`) — **không xóa được** theo đúng nguyên tắc ledger của dự án, chấp nhận để lại làm dữ liệu demo.
- **`company_settings`**: đã điền đầy đủ dữ liệu test (email/website/ngân hàng) để demo trang in phiếu — có thể cần người dùng điền lại thông tin thật trước khi dùng thật.
- **Tests**: không có test tự động — toàn bộ test bằng gọi API trực tiếp qua `javascript_exec` trong trình duyệt (tương đương curl) + click qua UI thật (cả admin và `thukho1`), kết quả ghi chi tiết trong `docs/CHANGELOG.md`.
- **Không có gì uncommitted** — mọi thay đổi trong phiên đã được commit theo yêu cầu người dùng.
- **Server phải restart thủ công sau khi sửa file backend** — dự án chưa dùng nodemon/hot-reload (đã ghi chú trong `docs/CHANGELOG.md`, từng gây 1 lần test sai kết quả do quên restart).

## 5. Next Steps (theo thứ tự ưu tiên, không có việc bắt buộc — chờ người dùng chọn hướng)

1. **Ưu tiên**: xác nhận lại nội dung "Ghi chú in phiếu" (xem mục 7) — việc nhỏ, làm được ngay đầu phiên sau.
2. Hỏi người dùng chọn hướng tiếp theo — các lựa chọn hợp lý:
   - **Phase 5** (Vận hành & Go-live): cấu hình PM2, IP tĩnh, script backup `data.db`, đặt `SESSION_SECRET` cố định — cần thiết trước khi dùng thật lâu dài.
   - Mở rộng nhỏ: in phiếu **nhập** kho (hiện chỉ có phiếu xuất, đúng phạm vi PRD gốc).
   - Module Bán hàng/POS — cần buổi trao đổi yêu cầu nghiệp vụ riêng, chưa có mô tả kỹ thuật.
   - Phiếu điều chỉnh cho `debt_ledger` — chỉ làm khi phát sinh nhu cầu thực tế (ghi nợ/thanh toán nhầm số tiền).

## 6. Blockers & Risks

| Rủi ro | Trạng thái | Mitigation |
|---|---|---|
| Nội dung "Ghi chú in phiếu" mặc định có 1 dòng suy đoán lại (ảnh mẫu gốc bị cắt lề) | Đang mở — xem mục 7 | Người dùng xác nhận/sửa qua trang Thông tin công ty, không cần sửa code |
| Session in-memory, mất khi restart server | Đã biết từ đầu, chưa xử lý | Xử lý ở Phase 5 |
| `SESSION_SECRET` chưa cấu hình cố định | Đã biết từ đầu, chưa xử lý | Xử lý ở Phase 5 |
| Server không tự reload khi sửa code backend | Đã từng gây 1 lần test sai (không phải bug thật) | Luôn restart thủ công sau khi sửa `.routes.js`/`.service.js`/`server.js` trước khi test qua trình duyệt |
| Module Bán hàng/POS chưa có yêu cầu nghiệp vụ | Đang mở, không liên quan Phase 1-4 | Bàn riêng khi người dùng sẵn sàng |
| `company_settings` đang có dữ liệu test (không phải thông tin công ty thật) | Không phải lỗi, chỉ là dữ liệu demo | Người dùng tự cập nhật khi dùng thật |

## 7. Câu hỏi cần người dùng xác nhận

**Nội dung "Ghi chú in phiếu" mặc định** (seed trong migration `014`, sửa được qua trang Thông tin công ty): ảnh mẫu phiếu thật người dùng gửi bị cắt ở lề tại dòng "Điều kiện 2" — đoạn "Các sản phẩm thương [...] hành theo tiêu chuẩn của nhà sản xuất". Đã tự điền phần bị cắt thành **"Các sản phẩm thương hiệu khác bảo hành theo tiêu chuẩn của nhà sản xuất"** (suy đoán theo ngữ cảnh hợp lý nhất). Cần người dùng vào **Thông tin công ty → Ghi chú in phiếu** kiểm tra lại và sửa cho đúng nguyên văn nếu cần — không cần sửa code, chỉ sửa dữ liệu qua UI.

## 8. Setup & Resources

- Chạy demo: `docs/DEMO.md` (đã cập nhật — menu đầy đủ Kho/Công nợ/Báo cáo).
- Tài khoản demo: `admin`/`Demo@123456` (Admin, toàn quyền), `thukho1`/`ThuKho@123` (chỉ quyền `kho`, dùng để test phân quyền).
- Ràng buộc bắt buộc khi code: `CLAUDE.md` (gốc repo) + `.claude/docs/inventory-debt-ledger.md`.
- Chuẩn UI bắt buộc: `docs/DESIGN-SYSTEM.md` — đã bổ sung nhiều pattern mới (modal chỉ đọc, toggle tái dùng trong form, trang in độc lập không dùng sidebar, biểu đồ SVG tự vẽ) — dùng lại, không tự vẽ lại từ đầu.
- Thứ tự đọc tài liệu khi bắt đầu phiên mới (bắt buộc theo `CLAUDE.md`): `docs/PRD.md` → `docs/Plan.md` → `docs/erd.mermaid` → `docs/CURRENT.md` → `docs/TASK.md` → `docs/CHANGELOG.md` → `docs/DECISIONS.md`.
- Skill đã dùng trong phiên: `ui-ux-pro-max` (mọi UI mới), `dataviz` (trước khi code biểu đồ báo cáo) — tiếp tục dùng cho các trang/pattern mới sau này.

## 9. Notes for Next Session

- **File handoff này không thay thế việc đọc đủ bộ tài liệu gốc** — chi tiết đầy đủ nằm trong `CURRENT.md`/`TASK.md`/`CHANGELOG.md`/`DECISIONS.md`/`DESIGN-SYSTEM.md`, đã cập nhật đồng bộ đầy đủ.
- **Memory hệ thống** đã lưu các thói quen làm việc của người dùng (hỏi trường form trước khi thiết kế, giải thích + kiểm tra chéo trước khi sửa file liên quan, bố cục form ngang 2 trường/dòng) — tự động áp dụng ở phiên sau, không cần nhắc lại.
- Dự án hiện đã có đầy đủ chức năng nghiệp vụ cốt lõi theo `docs/PRD.md` (trừ Bán hàng/POS) — phiên sau nên **hỏi người dùng muốn làm gì tiếp** thay vì tự suy đoán, vì không còn 1 "phase kế tiếp" rõ ràng duy nhất như các phiên trước (giờ có nhiều lựa chọn ngang hàng: Phase 5, mở rộng nhỏ, hoặc module mới).
