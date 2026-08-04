-- Migration 023: them actual_start_date/actual_end_date nhap tay cho project_tasks, thay the
-- hoan toan co che completed_at tu dong (chot Dot 2) - dong bo cach lam voi project_phases
-- (actual_start/actual_end da la truong nhap tay tu Dot 1). Theo yeu cau nguoi dung 2026-08-04:
-- gop tab "Cong viec" vao tab "Giai doan" (moi dong giai doan bam vao xo ra danh sach cong viec,
-- co truong ngay thuc te + trang thai sua duoc ngay tai cho).
--
-- KHONG xoa cot completed_at (van giu nguyen du lieu lich su cac dong da tao truoc do de khong
-- rui ro ALTER TABLE tren bang dang co du lieu that) - chi khong con doc/ghi cot nay tu code moi
-- tro di, canh bao tre tien do cua cong viec chuyen sang dung actual_end_date thay cho completed_at.
ALTER TABLE project_tasks ADD COLUMN actual_start_date TEXT;
ALTER TABLE project_tasks ADD COLUMN actual_end_date TEXT;
