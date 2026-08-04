-- Migration 024: Dot 3 module "Quan ly du an" - Vat tu & gan du an vao phieu nhap/xuat.
-- Theo ke hoach da chot: docs/DECISIONS.md muc 2026-08-04 (quyet dinh ky thuat #2,3,10),
-- docs/PRD.md muc 4.12, docs/Plan.md. Day la migration nhay cam nhat cua du an: ADD COLUMN
-- nullable len 3 bang dang co du lieu that (stock_receipts, stock_issues, debt_ledger) -
-- KHONG dung lai bang nao, chi them cot.
--
-- project_id o ca 3 bang deu NULLABLE, khong DEFAULT khac NULL (bat buoc vi PRAGMA foreign_keys=ON
-- chi cho phep ADD COLUMN co REFERENCES khi cot do mac dinh NULL - xem docs/DECISIONS.md).

-- Du toan vat tu cua tung du an - "Da xuat"/"Con lai" KHONG luu o day, tinh on-the-fly tu
-- stock_issue_items TRU stock_receipt_items cung project_id (xem project.service.js Dot 3).
CREATE TABLE project_material_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (project_id, product_id)
);

-- Gan phieu nhap/xuat voi 1 du an (khong bat buoc). "Da xuat cho du an" phai tru di phieu nhap
-- gan cung du an (truong hop tra vat tu thua ve kho) - vi vay can project_id tren CA 2 bang.
ALTER TABLE stock_receipts ADD COLUMN project_id INTEGER REFERENCES projects(id);
ALTER TABLE stock_issues ADD COLUMN project_id INTEGER REFERENCES projects(id);

-- Nhan du an tren dong cong no - dat tu Dot 3 (cung luc phieu xuat bat dau gan du an) de dong
-- cong no tu co nhan ngay tu dau, khong phai va du lieu nguoc ve sau (xem docs/DECISIONS.md).
-- Dung cot rieng, khong suy ra bang JOIN, vi dong "dieu chinh cong no" thu cong khong the JOIN
-- qua stock_issues/stock_receipts duoc.
ALTER TABLE debt_ledger ADD COLUMN project_id INTEGER REFERENCES projects(id);
