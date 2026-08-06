-- Migration 032: "Tra hang xuat" (khach hang tra lai hang da mua). Tai su dung co che
-- stock_receipts/stock_receipt_items/stock_movements/stock_lots hien co (KHONG tao bang rieng)
-- vi stock_movements.reference_type co CHECK IN ('receipt','issue') - day la so cai ton kho
-- quan trong nhat he thong, khong the ALTER CHECK ma khong dung lai bang (rui ro khong chap
-- nhan duoc). 1 phieu tra hang = 1 dong stock_receipts danh dau is_return=1, ma rieng prefix
-- TH... (xem stockReturn.service.js), tach biet hoan toan khoi danh sach "Phieu nhap kho".
--
-- Phan cong no KHONG di qua recordDebtFromDocument() (luon ghi tang no, sai chieu cho hang
-- tra) - ghi truc tiep 1 dong debt_ledger type='tra', reference_type='receipt' qua ham moi
-- debt.service.js#recordReturnCredit(). Xem docs/DECISIONS.md.
ALTER TABLE stock_receipts ADD COLUMN is_return INTEGER NOT NULL DEFAULT 0 CHECK (is_return IN (0, 1));

-- sale_price: "Gia ban" nguoi dung nhap tren tung dong hang tra, dung de tinh so tien giam
-- cong no - khac unit_price (cot nay o phieu tra van dung dung y nghia cu: gia von cua lo hang,
-- nhung tu dong lay tu getWeightedAverageCost() thay vi nguoi dung nhap). NULL voi phieu nhap
-- thuong (is_return=0).
ALTER TABLE stock_receipt_items ADD COLUMN sale_price REAL;
