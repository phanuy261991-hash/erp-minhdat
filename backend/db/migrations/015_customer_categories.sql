-- Migration 015: Loai khach hang (danh muc phan loai, chi ap dung cho doi tac type='khach_hang').
-- Theo yeu cau nguoi dung 2026-08-01: them "danh muc loai khach hang" trong Cau hinh, kem han
-- muc cong no de canh bao (khong chan cung - xem quyet dinh o docs/DECISIONS.md).

CREATE TABLE customer_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    debt_limit REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Nullable, chi co y nghia voi doi tac type='khach_hang' - khong dat CHECK rang buoc theo type
-- vi SQLite CHECK khong doc duoc cot khac de dieu kien ("category_id chi duoc set khi type=...")
-- mot cach gon, validate o tang API (partners.routes.js) thay vi rang buoc DB.
ALTER TABLE partners ADD COLUMN category_id INTEGER REFERENCES customer_categories(id);
