-- Migration 021: Dot 1 module "Quan ly du an" - nen tang: danh muc Giai doan mau, du an,
-- nguoi tham gia du an, giai doan cua tung du an. Theo yeu cau nguoi dung 2026-08-04, da chot
-- 14 quyet dinh nghiep vu/ky thuat truoc khi code - xem docs/DECISIONS.md muc 2026-08-04,
-- docs/PRD.md muc 4.12, docs/Plan.md.
--
-- Nguyen tac quan trong nhat: SO CAI CONG NO VAN THUOC KHACH HANG - du an KHONG co so cong no
-- rieng o migration nay (cot project_id tren debt_ledger de o migration 023, ADD COLUMN nullable,
-- khong dung lai bang debt_ledger dang co du lieu that).

-- Danh muc "Giai doan mau" (menu Cau hinh) - dung de copy vao du an moi tao, sau do moi du an
-- tu tach roi hoan toan (sua danh muc mau ve sau khong anh huong du an da tao).
CREATE TABLE project_phase_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO project_phase_templates (name, sort_order) VALUES
    ('Khảo sát', 1),
    ('Thiết kế', 2),
    ('Chuẩn bị vật tư', 3),
    ('Thi công', 4),
    ('Nghiệm thu', 5),
    ('Bàn giao & Bảo hành', 6);

-- Du an = cong trinh (cau truc 1 cap, da chot). partner_id BAT BUOC va phai la type='khach_hang'
-- (validate o tang API, khong CHECK o DB - giong cach lam voi customer_categories.category_id).
-- KHONG luu % tien do, gia tri hop dong thuc te, vat tu da xuat, cong no - tat ca tinh on-the-fly
-- tu cac bang lien quan (dung nguyen tac ledger xuyen suot du an, xem CLAUDE.md).
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    partner_id INTEGER NOT NULL REFERENCES partners(id),
    contract_no TEXT NOT NULL DEFAULT '',
    contract_date TEXT,
    site_address TEXT NOT NULL DEFAULT '',
    contract_value REAL NOT NULL DEFAULT 0,
    start_date TEXT,
    planned_end_date TEXT,
    actual_end_date TEXT,
    status TEXT NOT NULL DEFAULT 'chuan_bi' CHECK (status IN ('chuan_bi', 'dang_thuc_hien', 'tam_dung', 'hoan_thanh', 'huy')),
    manager_id INTEGER REFERENCES users(id),
    note TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_projects_partner ON projects(partner_id);

-- Nguoi tham gia du an - role_in_project la o chu TU DO (khong co danh muc rieng, da chot).
-- Dung de gioi han dropdown "Nguoi phu trach" khi giao cong viec (migration 022).
CREATE TABLE project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    role_in_project TEXT NOT NULL DEFAULT '',
    UNIQUE (project_id, user_id)
);

-- Giai doan cua tung du an - copy tu project_phase_templates luc tao du an (cung transaction voi
-- INSERT projects), sau do TACH ROI hoan toan khoi mau.
CREATE TABLE project_phases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    planned_start TEXT,
    planned_end TEXT,
    actual_start TEXT,
    actual_end TEXT,
    status TEXT NOT NULL DEFAULT 'chua_bat_dau' CHECK (status IN ('chua_bat_dau', 'dang_lam', 'hoan_thanh')),
    note TEXT NOT NULL DEFAULT ''
);

-- Khong seed quyen 'du_an' cho vai tro mac dinh nao (khac 'so_quy' o migration 019 - module do
-- ro rang thuoc Ke toan). Module Du an lien quan ca Kho/Cong no/dieu phoi nhan su, khong gan
-- ro rang voi 1 vai tro mac dinh nao - de Admin tu cap quyen qua trang "Vai tro" khi can. Admin
-- (is_protected) luon co san moi module, khong can seed. Them 'du_an' vao MODULE_KEYS o
-- backend/config/modules.js (code, khong phai DB).