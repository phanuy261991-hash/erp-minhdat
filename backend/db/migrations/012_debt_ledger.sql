-- Migration 012: Phase 3 - so cai cong no. So du = SUM cong don theo partner_id, khong luu so
-- co dinh (dung nguyen tac ledger da chon cho ton kho - xem .claude/docs/inventory-debt-ledger.md).
-- type='no': phat sinh nghia vu no (tang so du) - vd phieu nhap/xuat danh dau chua thanh toan
-- ngay. type='tra': thanh toan/tra no (giam so du) - ghi nhan thu cong qua trang Cong no.
-- Chieu dien giai so du phu thuoc partners.type: NCC = so du la khoan MINH con phai tra ho;
-- khach hang = so du la khoan HO con phai tra minh - khong can 2 truong rieng, UI tu dien giai.
CREATE TABLE debt_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER NOT NULL REFERENCES partners(id),
    type TEXT NOT NULL CHECK (type IN ('no', 'tra')),
    amount REAL NOT NULL CHECK (amount > 0),
    reference_type TEXT CHECK (reference_type IN ('receipt', 'issue', 'payment')),
    reference_id INTEGER,
    note TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_debt_ledger_partner ON debt_ledger(partner_id);
