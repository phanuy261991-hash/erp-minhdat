-- Migration 017: Bao hanh - quan ly thong tin bao hanh gan voi 1 khach hang cu the (khong
-- ap dung cho NCC). Theo yeu cau nguoi dung 2026-08-01: lien ket khach hang, hien thi "con lai
-- bao nhieu ngay" tren giao dien chi tiet khach hang.
--
-- acceptance_date/expiry_date: chi luu ngay (khong gio), dang 'YYYY-MM-DD', vi nghiep vu bao
-- hanh tinh theo don vi ngay/thang/nam, khong can chinh xac gio phut.
-- duration_value/duration_unit: luu lai LUA CHON cua nguoi dung (vd "2 nam") de hien thi dung
-- lai khi mo sua, khong tu suy dien lai tu so ngay moi lan hien thi (tranh sai lech lam tron
-- 2 chieu). expiry_date la nguon du lieu chinh dung de tinh "con lai bao nhieu ngay" (khong
-- phu thuoc duration_unit).
CREATE TABLE warranties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER NOT NULL REFERENCES partners(id),
    phone TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    acceptance_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    duration_value REAL NOT NULL,
    duration_unit TEXT NOT NULL CHECK (duration_unit IN ('ngay', 'thang', 'nam')),
    note TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_warranties_partner ON warranties(partner_id);
