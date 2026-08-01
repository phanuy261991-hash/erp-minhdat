-- Migration 018: cau hinh duong dan luu backup data.db (Phase 5, xem docs/Plan.md muc 4).
-- Nguoi dung tu chon duong dan qua trang Cau hinh kho thay vi hardcode co dinh trong script -
-- de trong (chua cau hinh) neu chua chon, script backend/scripts/backup.js se bao loi ro rang
-- neu chay khi chua co gia tri.

INSERT INTO warehouse_settings (key, value) VALUES ('backup_path', '');
