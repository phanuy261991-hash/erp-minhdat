-- Migration 039: tach quyen module "Khach hang" (khach_hang, gom "Khach hang" + "Cong no khach
-- hang") ra khoi "Cong no" (cong_no, tu nay chi con "Nha cung cap" + "Cong no NCC") - theo yeu
-- cau nguoi dung 2026-08-19. Truoc day 4 trang Nha cung cap/Cong no NCC/Khach hang/Cong no khach
-- hang deu dung chung 1 quyen 'cong_no' (frontend/assets/layout.js NAV_GROUPS), nen khong the cap
-- rieng "chi xem Khach hang, khong xem NCC" cho 1 vai tro. Cung pattern voi migration 036
-- (bao_hanh tach khoi cong_no).
--
-- Backfill: vai tro nao dang co quyen 'cong_no' duoc cap them 'khach_hang' - giu nguyen quyen
-- truy cap hien tai ngay sau khi trien khai (khong ai bi mat quyen dot ngot vi tach module), tu
-- do ve sau Admin/nguoi co quyen 'cau_hinh' tu do bat/tat rieng tung quyen o trang "Vai tro".
INSERT INTO role_permissions (role_id, module_key)
    SELECT role_id, 'khach_hang' FROM role_permissions WHERE module_key = 'cong_no';
