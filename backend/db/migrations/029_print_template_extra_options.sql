-- Migration 029: 2 tuy chinh them cho mau in (theo yeu cau nguoi dung 2026-08-05, ngay sau khi
-- xong migration 028) - (1) cho phep hien dong "So tien viet bang chu" duoi dong Tong cong cua
-- bang san pham, (2) cho phep chinh do rong tung cot (khac phuc o qua rong/chu chay dong).
--
-- (2) KHONG can them cot moi - van luu trong table_columns (JSON) da co san, chi doi hinh dang
-- tu mang chuoi ["key",...] sang mang object [{"key":"...", "width": N}, ...]. Du lieu cu (mang
-- chuoi, tu migration 028) van doc duoc binh thuong - code frontend/backend tu quy doi ve do
-- rong deu nhau neu gap dinh dang cu (xem normalizeTableColumns trong
-- frontend/assets/print-template-render.js), khong can migrate du lieu cu trong migration nay.
ALTER TABLE print_templates ADD COLUMN show_amount_in_words INTEGER NOT NULL DEFAULT 1;
