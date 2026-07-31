-- Migration 009: them ma don hang (so hoa don/PO cua nha cung cap, dung de doi chieu) vao
-- stock_receipts - KHAC voi cot "code" noi bo he thong tu sinh (PN000001...). Khong bat buoc
-- nhap, mac dinh rong.

ALTER TABLE stock_receipts ADD COLUMN order_code TEXT NOT NULL DEFAULT '';
