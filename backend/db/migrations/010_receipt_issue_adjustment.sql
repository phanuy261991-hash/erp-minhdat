-- Migration 010: co che phieu dieu chinh bu tru (xem docs/DECISIONS.md muc "Sua/huy phieu
-- da tao" va ".claude/docs/inventory-debt-ledger.md"). Khong tao bang/loai phieu rieng - tan
-- dung dung phieu nhap/xuat da co, danh dau phieu nay la dieu chinh cho phieu nao qua 2 cot
-- polymorphic (giong cach stock_movements.reference_type/reference_id da lam). Khong gioi han
-- huong: phieu nhap sai co the duoc bu bang 1 phieu nhap khac (nhap thieu) hoac 1 phieu xuat
-- (nhap du), va tuong tu voi phieu xuat sai.

ALTER TABLE stock_receipts ADD COLUMN adjusts_type TEXT CHECK (adjusts_type IN ('receipt', 'issue'));
ALTER TABLE stock_receipts ADD COLUMN adjusts_id INTEGER;

ALTER TABLE stock_issues ADD COLUMN adjusts_type TEXT CHECK (adjusts_type IN ('receipt', 'issue'));
ALTER TABLE stock_issues ADD COLUMN adjusts_id INTEGER;
