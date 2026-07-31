-- Migration 007: gia von san pham (binh quan gia quyen mac dinh, hoac FIFO) + lich su
-- chinh sua thong tin san pham. Xem docs/DECISIONS.md muc "Gia von san pham".
--
-- stock_lots theo doi tung lo hang nhap (nguon goc vat ly: nhap luc nao, gia bao nhieu, con
-- lai bao nhieu) - LUON duoc duy tri bat ke costing_method dang chon la gi, vi day la su that
-- vat ly chu khong phai lua chon ke toan. costing_method chi quyet dinh CACH TINH gia von ghi
-- lai cho phieu xuat (binh quan gia quyen cua toan bo ton, hay gia cua dung cac lo bi tru).

INSERT INTO warehouse_settings (key, value) VALUES ('costing_method', 'binh_quan_gia_quyen');

CREATE TABLE stock_lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    receipt_id INTEGER NOT NULL REFERENCES stock_receipts(id),
    unit_cost REAL NOT NULL CHECK (unit_cost >= 0),
    quantity_received REAL NOT NULL CHECK (quantity_received > 0),
    quantity_remaining REAL NOT NULL CHECK (quantity_remaining >= 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_stock_lots_product ON stock_lots(product_id, created_at);

-- Snapshot gia von tai thoi diem phat sinh moi dong movement - khong tinh lai theo cau hinh
-- hien tai, tranh bao cao qua khu bi doi khi nguoi dung doi costing_method sau nay.
ALTER TABLE stock_movements ADD COLUMN unit_cost REAL;

CREATE TABLE product_change_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    changed_by INTEGER NOT NULL REFERENCES users(id),
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_product_change_log_product ON product_change_log(product_id, created_at);
