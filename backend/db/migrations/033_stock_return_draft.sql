-- Migration 033: quy trinh 2 buoc cho "Tra hang" (migration 032), theo yeu cau nguoi dung
-- 2026-08-06 - tach rieng buoc "Luu" (chi ghi lai thong tin da nhap, CHUA tru kho/tru cong no)
-- va buoc "Tru kho" (thuc su ghi stock_movements/stock_lots/debt_ledger, dung nguyen quy trinh
-- nghiep vu cu, khong doi - xem stockReturn.service.js#applyProcessing()).
--
-- Chi anh huong phieu is_return=1. Phieu nhap thuong (is_return=0) luon mac dinh 'da_tru_kho'
-- (coi nhu da xu ly xong ngay khi tao, dung hanh vi cu, khong bao gio o trang thai cho).
ALTER TABLE stock_receipts ADD COLUMN status TEXT NOT NULL DEFAULT 'da_tru_kho'
  CHECK (status IN ('cho_tru_kho', 'da_tru_kho'));
