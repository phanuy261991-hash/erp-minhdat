-- Migration 022: Dot 2 module "Quan ly du an" - cong viec thuoc tung giai doan + timeline.
-- Theo docs/DECISIONS.md muc 2026-08-04, docs/PRD.md muc 4.12, docs/Plan.md.
--
-- CHI luu phase_id, KHONG luu them project_id trung lap - lay du an qua JOIN project_phases.
-- Luu ca 2 se nhanh hon 1 chut nhung tao nguy co lech du lieu khi chuyen cong viec sang giai
-- doan khac (phai nho cap nhat dong bo 2 cot, de sai sot).
--
-- status la nguon DUY NHAT de tinh % tien do giai doan/du an (project.service.js
-- getProjectProgress) - khong luu % rieng, luon tinh lai tu SUM cong viec hoan_thanh / tong so
-- cong viec, dung nguyen tac "khong luu gia tri suy ra duoc" xuyen suot du an.
CREATE TABLE project_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phase_id INTEGER NOT NULL REFERENCES project_phases(id),
    name TEXT NOT NULL,
    assigned_user_id INTEGER REFERENCES users(id),
    start_date TEXT,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'chua_lam' CHECK (status IN ('chua_lam', 'dang_lam', 'hoan_thanh')),
    completed_at TEXT,
    note TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_project_tasks_phase ON project_tasks(phase_id);
