-- Migration 034: "Tra hang nha cung cap" - doi xung "Tra hang xuat" (migration 032/033) nhung
-- theo CHIEU NGUOC LAI: hang tra VE cho NCC lam GIAM ton kho (movement_type='out', giong phieu
-- xuat) va GIAM cong no PHAI TRA NCC. Tai dung stock_issues/stock_issue_items (khong tao bang
-- rieng, cung ly do CHECK constraint tren stock_movements.reference_type nhu da ap dung cho
-- stock_receipts o migration 032 - xem docs/DECISIONS.md) - danh dau is_return=1, quy trinh 2
-- buoc Luu/Tru kho giong het "Tra hang xuat" (status).
--
-- Khong can them cot moi cho stock_issue_items: unit_price da co san dung DE LUU "Gia nhap"
-- (dung y nghia tu nhien cua cot nay o phieu xuat thuong - noi no dang luu "gia ban"), khac voi
-- stock_receipt_items truoc day can them cot sale_price rieng (vi unit_price o do bi dung lai
-- de luu gia von tu dong tinh).
ALTER TABLE stock_issues ADD COLUMN is_return INTEGER NOT NULL DEFAULT 0 CHECK (is_return IN (0, 1));
ALTER TABLE stock_issues ADD COLUMN status TEXT NOT NULL DEFAULT 'da_tru_kho'
  CHECK (status IN ('cho_tru_kho', 'da_tru_kho'));
