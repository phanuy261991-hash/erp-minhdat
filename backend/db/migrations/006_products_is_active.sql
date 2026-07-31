-- Migration 006: them cot is_active vao products. Vo hieu hoa (is_active=0) danh cho nguoi
-- dung co quyen 'kho', xoa cung chi danh cho Admin va chi khi san pham chua co lich su
-- stock_movements (xem docs/PRD.md - trang Danh muc san pham). Mac dinh 1 (dang kinh doanh)
-- cho san pham da co tu truoc.

ALTER TABLE products ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
