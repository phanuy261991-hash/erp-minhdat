-- Migration 008: chiet khau tung dong san pham trong phieu nhap kho (theo %). Gia von ghi
-- vao stock_lots/stock_movements la GIA SAU CHIET KHAU (net) - xem docs/DECISIONS.md muc
-- "Chiet khau phieu nhap". unit_price trong stock_receipt_items van giu gia GOC (truoc chiet
-- khau) de doi chieu dung hoa don NCC.

ALTER TABLE stock_receipt_items ADD COLUMN discount_percent REAL NOT NULL DEFAULT 0
  CHECK (discount_percent >= 0 AND discount_percent <= 100);
