# Inventory & Debt Ledger Pattern

Tài liệu này mô tả cách tính tồn kho và công nợ. Đọc trước khi sửa bất kỳ code nào chạm vào `stock_movements`, `debt_ledger`, hoặc service tạo phiếu nhập/xuất.

## Nguyên tắc cốt lõi

Tồn kho và công nợ **không phải là 1 số lưu sẵn** trong bảng `products`/`partners`. Chúng luôn được **tính lại** từ tổng cộng dồn các dòng ledger. Lý do: nếu lưu số cố định, một lần update thất bại giữa chừng (crash, lỗi mạng) sẽ làm số liệu lệch vĩnh viễn mà không có cách đối chiếu lại. Với ledger, số liệu luôn suy ra được từ lịch sử — sai ở đâu có thể truy ngược lại.

## Công thức tồn kho

```sql
SELECT product_id,
       SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE -quantity END) AS ton_kho
FROM stock_movements
WHERE product_id = ?
GROUP BY product_id;
```

`movement_type` chỉ nhận 2 giá trị: `in` (nhập) hoặc `out` (xuất). Mỗi dòng trong `stock_movements` phải có `reference_type` (`receipt` hoặc `issue`) và `reference_id` trỏ về `stock_receipts.id` hoặc `stock_issues.id` tương ứng, để truy ngược được phiếu gốc khi cần đối chiếu.

**Giá vốn** (bổ sung Phase 2, xem `docs/DECISIONS.md` mục "giá vốn"): mỗi dòng `stock_movements` có thêm cột `unit_cost` — snapshot giá vốn tại đúng thời điểm phát sinh, tính theo `costing_method` đang chọn (`backend/services/costing.service.js`), **không tính lại** khi cấu hình đổi sau này. Bảng `stock_lots` theo dõi từng lô hàng nhập (giá + số lượng còn lại), luôn được tạo khi nhập và trừ dần theo thứ tự cũ nhất trước (FIFO vật lý) khi xuất — bất kể `costing_method` đang chọn là bình quân gia quyền hay FIFO (costing_method chỉ quyết định cách TÍNH giá ghi sổ, không quyết định lô nào bị trừ).

## Công thức số dư công nợ

```sql
SELECT partner_id,
       SUM(CASE WHEN type = 'no' THEN amount ELSE -amount END) AS so_du
FROM debt_ledger
WHERE partner_id = ?
GROUP BY partner_id;
```

`type = 'no'` (phát sinh nợ, ví dụ xuất hàng cho khách hàng chưa thu tiền ngay) làm tăng số dư; `type = 'tra'` (thanh toán/trả nợ) làm giảm số dư. Số dư dương nghĩa là đối tượng còn nợ.

## Quy tắc transaction khi tạo phiếu

Khi tạo phiếu nhập hoặc phiếu xuất, các bước sau **bắt buộc nằm trong cùng 1 transaction** (dùng `db.transaction(...)` của `better-sqlite3`):

1. Insert vào `stock_receipts`/`stock_issues`.
2. Insert từng dòng vào `stock_receipt_items`/`stock_issue_items`.
3. Insert dòng tương ứng vào `stock_movements` cho mỗi sản phẩm trong phiếu (kèm `unit_cost` snapshot). Với phiếu nhập, tạo thêm 1 dòng `stock_lots` cho mỗi sản phẩm; với phiếu xuất, trừ dần `quantity_remaining` của các lô liên quan theo FIFO (xem `costing.service.js`).
4. Nếu phiếu phát sinh công nợ (ví dụ xuất hàng nhưng khách chưa trả tiền), insert dòng vào `debt_ledger` (**Phase 3, chưa code** — cột `stock_issues.payment_status` đã có sẵn từ Phase 2 để chuẩn bị cho việc này).

Nếu bất kỳ bước nào lỗi, toàn bộ transaction phải rollback — không được để phiếu tồn tại mà thiếu movement, hoặc ngược lại. Đã test qua curl: sản phẩm không tồn tại giữa transaction → rollback đúng, không tạo phiếu.

## Các quy tắc nghiệp vụ đã chốt (trước đây ghi "edge case chưa chốt" — đã cập nhật 2026-07-31 cho khớp thực tế)

- **Tồn kho không đủ khi xuất**: mặc định chặn cứng; có cấu hình `warehouse_settings.allow_negative_stock` cho phép xuất trước nhập bù sau (đã code + test trong `stockIssue.service.js`).
- **Công nợ từ phiếu xuất**: chỉ phát sinh khi `stock_issues.payment_status = 'cong_no'` (cột đã có từ migration Phase 2) — việc thực sự ghi `debt_ledger` là **Phase 3, chưa code**.
- **Sửa/hủy phiếu đã tạo**: không cho sửa/xóa trực tiếp — chỉ tạo phiếu điều chỉnh bù trừ (phiếu mới ghi ngược dấu) để giữ lịch sử. **Đã code** (migration `010_receipt_issue_adjustment.sql`): phiếu nhập/xuất mới có thể đánh dấu `adjusts_type`/`adjusts_id` trỏ về phiếu gốc (không giới hạn hướng — nhập có thể bù bằng nhập hoặc xuất, và ngược lại), không sửa/xóa phiếu gốc, chỉ ghi liên kết để truy vết cả 2 chiều.
- **Sửa số dư `debt_ledger` sai** (vd nhập nhầm giá vốn phiếu nhập → công nợ NCC sai theo): cơ chế "phiếu điều chỉnh bù trừ" ở trên **KHÔNG dùng được cho công nợ** — `recordDebtFromDocument()` luôn ghi `type='no'` (tăng nợ) bất kể phiếu nhập hay xuất, nên 1 phiếu bù trừ sẽ cộng thêm nợ chứ không trừ. **Đã code** (migration `016_debt_adjustment.sql`, `docs/DECISIONS.md` mục cùng ngày): `debt.service.js#recordDebtAdjustment()` ghi thêm 1 dòng `debt_ledger` riêng (`is_adjustment=1`), tự chọn chiều tăng/giảm (`type`), bắt buộc ghi lý do, tùy chọn liên kết về đúng phiếu gốc (validate đúng đối tác) — không sửa/xóa dòng ledger gốc, đúng nguyên tắc append-only của toàn bộ pattern này.
