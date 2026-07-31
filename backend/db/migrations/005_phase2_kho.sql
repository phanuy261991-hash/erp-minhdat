-- Migration 005: Phase 2 - Kho. Them doi tac (partners, gop som theo docs/DECISIONS.md
-- muc "Gop bang partners som vao migration Phase 2"), san pham, phieu nhap/xuat va ledger
-- bien dong kho. Xem docs/Plan.md muc 2/4 (Phase 2), .claude/docs/inventory-debt-ledger.md.

-- Doi tac: nha cung cap hoac khach hang. Chi tao bang o day - API/frontend quan ly doi tac
-- van o Phase 3 (cung debt_ledger).
CREATE TABLE partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('nha_cung_cap', 'khach_hang')),
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- San pham: khong luu ton kho o day - ton kho luon tinh tu SUM(stock_movements).
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    cost_price REAL NOT NULL DEFAULT 0,
    sale_price REAL NOT NULL DEFAULT 0,
    low_stock_threshold REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Phieu nhap kho. partner_id la nha cung cap (nullable - cho phep nhap khong gan doi tac,
-- vd hang tra ve/kiem ke). created_by giu vet nguoi lap phieu, khong cho null vi luon dang nhap moi tao duoc.
CREATE TABLE stock_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    partner_id INTEGER REFERENCES partners(id),
    created_by INTEGER NOT NULL REFERENCES users(id),
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE stock_receipt_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER NOT NULL REFERENCES stock_receipts(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0)
);

-- Phieu xuat kho. payment_status quyet dinh co phat sinh dong debt_ledger hay khong
-- (chi 'cong_no' moi ghi no - xem CLAUDE.md muc Key Constraints va DECISIONS.md).
CREATE TABLE stock_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    partner_id INTEGER REFERENCES partners(id),
    created_by INTEGER NOT NULL REFERENCES users(id),
    note TEXT NOT NULL DEFAULT '',
    payment_status TEXT NOT NULL DEFAULT 'da_thu_tien' CHECK (payment_status IN ('da_thu_tien', 'cong_no')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE stock_issue_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id INTEGER NOT NULL REFERENCES stock_issues(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0)
);

-- Ledger bien dong kho - ton kho cua 1 san pham = SUM(quantity, dau +/- theo movement_type).
-- reference_type/reference_id tro nguoc ve phieu goc (stock_receipts/stock_issues) de doi chieu,
-- khong dat FK cung vi reference_type quyet dinh bang dich (polymorphic, SQLite khong ho tro FK dieu kien).
CREATE TABLE stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out')),
    quantity REAL NOT NULL CHECK (quantity > 0),
    reference_type TEXT NOT NULL CHECK (reference_type IN ('receipt', 'issue')),
    reference_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_receipt_items_receipt ON stock_receipt_items(receipt_id);
CREATE INDEX idx_stock_issue_items_issue ON stock_issue_items(issue_id);
