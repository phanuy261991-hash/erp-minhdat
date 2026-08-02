-- Migration 019: Module "So quy" - quan ly phieu thu/phieu chi tien mat.
-- Theo yeu cau nguoi dung 2026-08-02. Quyet dinh kien truc (xem docs/DECISIONS.md):
-- (1) So quy HOAN TOAN DOC LAP voi module Cong no - khong ghi vao debt_ledger, khong lien ket
--     doi tac co san (truong "doi tuong nop/nhan" chi la ten tu do).
-- (2) Quy dau ky tu dong cong don qua cac thang - chi nhap 1 lan (cash_book_settings.opening_balance),
--     "Quy dau ky" cua 1 thang = opening_balance + SUM(phieu truoc thang do), khong luu rieng tung thang.
-- (3) Phieu thu/chi KHONG sua duoc, chi tao va xoa cung (khong co phieu dieu chinh bu tru nhu
--     Kho/Cong no vi module nay khong co gi tham chieu nguoc, khong can giu vet nhu ledger).

-- Gia tri quy goc, nhap 1 lan duy nhat - cac thang sau tu tinh cong don tu cash_vouchers, khong
-- nhap lai. Mirror dung pattern singleton cua company_settings (id=1), khac warehouse_settings
-- (key-value) vi chi co dung 1 gia tri.
CREATE TABLE cash_book_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    opening_balance REAL NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO cash_book_settings (id, opening_balance) VALUES (1, 0);

-- Danh muc "Loai thu"/"Loai chi", quan ly qua trang rieng (Cau hinh > Quy).
CREATE TABLE cash_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('thu', 'chi')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (name, type)
);

INSERT INTO cash_categories (name, type) VALUES
    ('Thu bán hàng', 'thu'),
    ('Thu hồi công nợ', 'thu'),
    ('Thu khác', 'thu'),
    ('Chi mua hàng', 'chi'),
    ('Chi phí vận hành', 'chi'),
    ('Chi khác', 'chi');

-- Phieu thu/chi. code tu sinh PT000001.../PC000001... (rieng tung type, xem cashVoucher.service.js).
-- category_id NOT NULL REFERENCES + PRAGMA foreign_keys=ON (bat buoc theo CLAUDE.md) -> SQLite
-- tu chan xoa 1 danh muc dang co phieu dung, khong can code kiem tra rieng o tang ung dung.
-- handled_by (nguoi thu/chi - nhan vien xu ly, chon duoc, mac dinh la nguoi dang dang nhap) khac
-- created_by (nguoi tao ban ghi trong he thong, luon la tai khoan dang dang nhap luc luu) - 2 FK
-- rieng toi users vi co the khac nhau (vd ke toan tao ho phieu cho thu quy khac dung xu ly tien).
-- created_at nhan gia tri tuy chinh tu truong "Thoi gian" tren form (giong receiptDate cua
-- stockReceipt.service.js) - khong tach cot rieng, dung lam moc tinh "thang nao".
-- record_business_result: chi luu co, CHUA co bao cao lai/lo nao trong du an dung den o giai
-- doan nay (da grep toan repo xac nhan) - de danh cho tinh nang tuong lai.
CREATE TABLE cash_vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('thu', 'chi')),
    category_id INTEGER NOT NULL REFERENCES cash_categories(id),
    counterpart_name TEXT NOT NULL DEFAULT '',
    handled_by INTEGER REFERENCES users(id),
    amount REAL NOT NULL CHECK (amount > 0),
    note TEXT NOT NULL DEFAULT '',
    record_business_result INTEGER NOT NULL DEFAULT 1 CHECK (record_business_result IN (0, 1)),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_cash_vouchers_created_at ON cash_vouchers(created_at);
CREATE INDEX idx_cash_vouchers_category ON cash_vouchers(category_id);

-- Seed quyen module 'so_quy' mac dinh cho vai tro Ke toan (Admin luon co san qua is_protected,
-- khong can seed). Them 'so_quy' vao MODULE_KEYS o backend/config/modules.js (code, khong phai DB).
INSERT INTO role_permissions (role_id, module_key)
    SELECT id, 'so_quy' FROM roles WHERE name = 'Kế toán';
