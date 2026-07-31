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
3. Insert dòng tương ứng vào `stock_movements` cho mỗi sản phẩm trong phiếu.
4. Nếu phiếu phát sinh công nợ (ví dụ xuất hàng nhưng khách chưa trả tiền), insert dòng vào `debt_ledger`.

Nếu bất kỳ bước nào lỗi, toàn bộ transaction phải rollback — không được để phiếu tồn tại mà thiếu movement, hoặc ngược lại.

## Edge case — chưa chốt, cần xác nhận trước khi code Phase 2/3

Các điểm sau **chưa được thảo luận** trong quá trình thiết kế, không tự giả định khi implement:

- Có cho phép lập phiếu xuất khi tồn kho không đủ không, hay phải chặn cứng? (ảnh hưởng validation trong `stockIssue.service.js`)
- Phiếu xuất có luôn phát sinh công nợ, hay chỉ khi người dùng chọn "chưa thu tiền ngay"? (ảnh hưởng có cần thêm cột `payment_status` vào `stock_issues` hay để người dùng tạo dòng `debt_ledger` thủ công)
- Có cho phép sửa/hủy phiếu đã tạo không, hay chỉ tạo phiếu điều chỉnh bù trừ (phiếu mới ghi ngược dấu)? Cách phổ biến trong kế toán là dùng phiếu điều chỉnh thay vì sửa/xóa để giữ lịch sử — nhưng cần người dùng xác nhận trước khi code.

Khi gặp các case này lúc code Phase 2/3 (theo `Plan.md`), hỏi lại người dùng thay vì tự quyết định — vì đây là quy tắc nghiệp vụ ảnh hưởng trực tiếp đến độ chính xác số liệu công nợ/tồn kho.
