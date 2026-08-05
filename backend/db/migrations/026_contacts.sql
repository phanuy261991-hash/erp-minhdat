-- Migration 026: bang "Doi tac" - danh ba lien he ca nhan, HOAN TOAN TACH BIET voi bang
-- partners (Nha cung cap/Khach hang, gan kho/cong no) - theo yeu cau nguoi dung 2026-08-05.
-- Khong co quan he/tham chieu nao voi cac bang khac trong he thong.
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  occupation TEXT,
  date_of_birth TEXT,
  note TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
