-- Migration 011: them payment_status vao stock_receipts, doi xung voi stock_issues - can de
-- ghi nhan cong no PHAI TRA nha cung cap (khac voi cong no PHAI THU tu stock_issues.payment_status).
-- Gia tri 'da_thanh_toan' (thanh toan NCC ngay) hoac 'cong_no' (chua thanh toan ngay), khac
-- ten voi 'da_thu_tien' cua stock_issues cho dung ngu nghia chieu tien (tra NCC vs thu khach).

ALTER TABLE stock_receipts ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'da_thanh_toan'
    CHECK (payment_status IN ('da_thanh_toan', 'cong_no'));
