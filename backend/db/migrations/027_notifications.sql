-- Migration 027: he thong thong bao (chuong trong app) - thanh toan cong no NCC/KH, sinh nhat
-- doi tac. Them truong "So thich" cho contacts (theo yeu cau nguoi dung 2026-08-05).
ALTER TABLE contacts ADD COLUMN hobby TEXT;

-- Cau hinh thong bao (singleton, giong cash_book_settings) - Admin bat/tat tung loai + cau hinh
-- danh sach moc nhac lich sinh nhat (CSV so ngay, vd '3,1,0' = nhac truoc 3 ngay, nhac lai truoc
-- 1 ngay, nhac dung ngay). last_birthday_check_date danh dau ngay (gio VN) da quet gan nhat,
-- tranh quet trung nhieu lan/ngay khi nhieu nguoi cung mo chuong thong bao.
CREATE TABLE notification_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  supplier_payment_enabled INTEGER NOT NULL DEFAULT 1,
  customer_payment_enabled INTEGER NOT NULL DEFAULT 1,
  birthday_enabled INTEGER NOT NULL DEFAULT 1,
  birthday_reminder_days TEXT NOT NULL DEFAULT '3,1,0',
  last_birthday_check_date TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO notification_settings (id) VALUES (1);

-- Log su kien thong bao. dedupe_key (nullable, UNIQUE khi co gia tri) dung cho cac su kien co
-- the bi quet lai nhieu lan (vd sinh nhat) de tranh tao trung.
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('supplier_payment', 'customer_payment', 'birthday')),
  title TEXT NOT NULL,
  message TEXT,
  reference_type TEXT,
  reference_id INTEGER,
  dedupe_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_notifications_dedupe ON notifications(dedupe_key) WHERE dedupe_key IS NOT NULL;

-- Trang thai da doc RIENG TUNG USER cho cung 1 thong bao (theo yeu cau nguoi dung 2026-08-05).
CREATE TABLE notification_reads (
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (notification_id, user_id)
);
