-- Migration 002: Vai tro dong theo module - thay cho cot users.role (TEXT co dinh 3 gia tri).
-- Xem docs/PRD.md muc 4.1 va docs/Plan.md muc 2b.

CREATE TABLE roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    is_protected INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- module_key la hang so co dinh trong code (kho, cong_no, bao_cao, nguoi_dung, cau_hinh, ...),
-- khong luu thanh bang rieng vi day la tap module do ung dung dinh nghia, khong phai du lieu
-- nguoi dung tu tao.
CREATE TABLE role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL,
    PRIMARY KEY (role_id, module_key)
);

-- Seed 3 vai tro mac dinh. Admin la vai tro dac biet (is_protected) - luon toan quyen,
-- khong luu dong nao trong role_permissions cho Admin (middleware cho qua thang neu is_protected).
INSERT INTO roles (name, is_protected) VALUES ('Admin', 1);
INSERT INTO roles (name, is_protected) VALUES ('Kế toán', 0);
INSERT INTO roles (name, is_protected) VALUES ('Thủ kho', 0);

INSERT INTO role_permissions (role_id, module_key)
    SELECT id, 'cong_no' FROM roles WHERE name = 'Kế toán';
INSERT INTO role_permissions (role_id, module_key)
    SELECT id, 'bao_cao' FROM roles WHERE name = 'Kế toán';
INSERT INTO role_permissions (role_id, module_key)
    SELECT id, 'kho' FROM roles WHERE name = 'Thủ kho';

-- Chuyen bang users tu cot "role" (TEXT co dinh) sang "role_id" (FK toi roles).
-- SQLite khong ho tro doi kieu/rang buoc cot truc tiep - tao bang moi, copy du lieu giu nguyen id,
-- roi thay the bang cu. Chua co bang nao khac tham chieu users(id) o thoi diem nay nen an toan.
CREATE TABLE users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO users_new (id, username, password_hash, full_name, role_id, is_active, created_at)
SELECT
    u.id,
    u.username,
    u.password_hash,
    u.full_name,
    (SELECT r.id FROM roles r WHERE r.name = CASE u.role
        WHEN 'admin' THEN 'Admin'
        WHEN 'ke_toan' THEN 'Kế toán'
        WHEN 'thu_kho' THEN 'Thủ kho'
    END),
    u.is_active,
    u.created_at
FROM users u;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
