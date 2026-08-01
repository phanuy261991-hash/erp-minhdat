-- Migration 013: chiet khau tung dong san pham trong phieu xuat kho (theo %), doi xung
-- migration 008 (chiet khau phieu nhap). unit_price trong stock_issue_items van giu gia GOC
-- (truoc chiet khau) - thanh tien sau chiet khau tinh o tang hien thi/tinh tong, khong luu cot
-- rieng (giong het cach lam voi stock_receipt_items).

ALTER TABLE stock_issue_items ADD COLUMN discount_percent REAL NOT NULL DEFAULT 0
  CHECK (discount_percent >= 0 AND discount_percent <= 100);
