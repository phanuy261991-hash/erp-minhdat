-- Migration 003: company_settings (thong tin cong ty, 1 dong duy nhat) va warehouse_settings
-- (cau hinh kho dang key-value, mo rong dan). Xem docs/PRD.md muc 4.7/4.8, docs/Plan.md muc 2/4 (Phase 1.6).

CREATE TABLE company_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    company_name TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    tax_code TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    bank_name TEXT NOT NULL DEFAULT '',
    bank_account_number TEXT NOT NULL DEFAULT '',
    bank_account_holder TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO company_settings (id) VALUES (1);

CREATE TABLE warehouse_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO warehouse_settings (key, value) VALUES ('allow_negative_stock', '0');
