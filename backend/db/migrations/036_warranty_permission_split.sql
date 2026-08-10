-- Migration 036: tach quyen module "Bao hanh" (bao_hanh) ra khoi "Cong no" (cong_no) - theo yeu
-- cau nguoi dung 2026-08-08. Truoc day warranties.routes.js dung chung requirePermission('cong_no')
-- (gan voi nhom menu Khach hang), nay co checkbox rieng o trang "Vai tro" (backend/config/modules.js).
--
-- Backfill: vai tro nao dang co quyen 'cong_no' duoc cap them 'bao_hanh' - giu nguyen quyen truy
-- cap hien tai ngay sau khi trien khai (khong ai bi mat quyen dot ngot vi tach module), tu do ve
-- sau Admin/nguoi co quyen 'cau_hinh' tu do bat/tat rieng tung quyen o trang "Vai tro".
INSERT INTO role_permissions (role_id, module_key)
    SELECT role_id, 'bao_hanh' FROM role_permissions WHERE module_key = 'cong_no';
