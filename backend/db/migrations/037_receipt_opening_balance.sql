-- Migration 037: co "Nhap ton dau ky" cho phieu nhap kho (is_opening_balance) - theo yeu cau
-- nguoi dung 2026-08-15. Phieu duoc danh dau se KHONG phat sinh debt_ledger (cong no NCC) va
-- KHONG tao cash_vouchers tu dong (phieu Chi tra tien ngay) du payment_status la gi - xem
-- stockReceipt.service.js#createStockReceipt(). Chi thay doi so luong ton kho (stock_movements/
-- stock_lots nhu phieu thuong, van can unit_price de tinh gia von cho lan xuat sau).
ALTER TABLE stock_receipts ADD COLUMN is_opening_balance INTEGER NOT NULL DEFAULT 0
    CHECK (is_opening_balance IN (0, 1));
