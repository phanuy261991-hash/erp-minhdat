-- Migration 025: Dot 4 module "Quan ly du an" - Dot thanh toan theo hop dong, Cong no du an
-- & Phat sinh. Theo ke hoach da chot: docs/DECISIONS.md muc 2026-08-04, docs/PRD.md muc 4.12,
-- docs/Plan.md.
--
-- milestone_id tren debt_ledger la ADD COLUMN nullable (khong dung lai bang, giong project_id
-- o migration 024) - thu tien theo dot ve ban chat van la 1 dong thanh toan binh thuong
-- (type='tra', reference_type='payment'), chi gan them nhan de biet dot nao da thu.

-- Dot thanh toan theo hop dong - KHONG luu so tien da thu hay trang thai, suy ra tu
-- SUM(debt_ledger WHERE milestone_id=...) so voi amount (xem project.service.js).
CREATE TABLE project_payment_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    amount REAL NOT NULL DEFAULT 0,
    percent REAL,
    due_date TEXT,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Phat sinh du an - dung 1 bang chung, phan biet bang type: 'chi_phi' (co tien, khi status=
-- 'da_duyet' thi cong vao gia tri hop dong thuc te = contract_value + SUM cac dong da duyet)
-- hoac 'van_de' (nhat ky su co, khong gan tien, amount=0).
CREATE TABLE project_variations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    type TEXT NOT NULL CHECK (type IN ('chi_phi', 'van_de')),
    title TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    occurred_date TEXT,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'cho_duyet' CHECK (status IN ('cho_duyet', 'da_duyet', 'tu_choi')),
    resolution TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE debt_ledger ADD COLUMN milestone_id INTEGER REFERENCES project_payment_milestones(id);
