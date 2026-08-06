-- Migration 031: "Thong tin phieu in" cho dot thanh toan du an (theo yeu cau nguoi dung
-- 2026-08-06) - 2 truong khong bat buoc de nguoi dung tu chen vao mau in "Giay de nghi tam ung"
-- (backend/config/printTemplateTokens.js). ADD COLUMN nullable/default rong, dung pattern da
-- dung o migration 010 (ADD COLUMN kem CHECK cho danh sach gia tri co dinh).
ALTER TABLE project_payment_milestones ADD COLUMN recipient_name TEXT NOT NULL DEFAULT '';
ALTER TABLE project_payment_milestones ADD COLUMN recipient_title TEXT NOT NULL DEFAULT ''
  CHECK (recipient_title IN ('', 'anh', 'chi', 'cong_ty', 'don_vi'));
