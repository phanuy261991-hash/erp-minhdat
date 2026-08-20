// Danh sach hang so module dung cho he thong phan quyen dong (xem docs/PRD.md muc 4.1,
// docs/Plan.md muc 2b). Them module moi (vd 'ban_hang' khi lam module Ban hang/POS) thi chi
// can them vao day - nho dong bo voi cac item trong frontend/assets/layout.js (NAV_GROUPS).
//
// MODULE_LABELS (2026-08-03): nguon duy nhat cho nhan tieng Viet cua tung module - truoc day
// frontend/assets/roles.js tu hardcode rieng 1 danh sach nhan+thu tu, bi quen cap nhat khi them
// module 'so_quy' (Sổ quỹ) nen o giao dien "Vai tro" khong hien checkbox chon duoc, dan toi mat
// quyen 'so_quy' khoi vai tro moi khi luu (checkbox khong ton tai thi khong the gui len). Tu nay
// frontend goi GET /api/roles/modules de lay dong danh sach nay, khong con hardcode trung lap.
// bao_hanh (2026-08-08): tach rieng khoi 'cong_no' theo yeu cau nguoi dung - truoc day module
// "Bao hanh" dung chung quyen 'cong_no' (gan voi nhom menu Khach hang), nay co checkbox rieng o
// trang "Vai tro". Migration 036 backfill role_permissions: vai tro nao dang co 'cong_no' duoc
// cap luon 'bao_hanh' de khong mat quyen dang co ngay sau khi trien khai - xem docs/DECISIONS.md.
// khach_hang (2026-08-19): tach tiep "Khach hang" + "Cong no khach hang" ra khoi 'cong_no' - tu
// nay 'cong_no' chi con gan voi "Nha cung cap" + "Cong no NCC". Cung pattern migration 036,
// backfill o migration 039. Xem debts.routes.js/partners.routes.js: enforcement theo dung TYPE
// cua doi tac (nha_cung_cap -> 'cong_no', khach_hang -> 'khach_hang'), khong con 1 quyen chung.
// nghiem_thu (2026-08-19, "Nghiem thu theo giai phap"): quyen THAO TAC rieng cho tab "Nghiem thu"
// trong Chi tiet du an - khac cac module khac o cho AI co quyen 'du_an' deu XEM duoc tab nay (gan
// o tang mount /api/projects), nhung chi ai co THEM 'nghiem_thu' moi tao/sua/xoa giai phap/gan
// thiet bi - kiem tra thu cong trong tung route handler (xem projectAcceptanceSolutions.routes.js),
// khong gan qua requirePermission() khi mount.
const MODULE_KEYS = ['kho', 'cong_no', 'khach_hang', 'bao_cao', 'nguoi_dung', 'cau_hinh', 'so_quy', 'du_an', 'doi_tac', 'bao_hanh', 'nghiem_thu'];

const MODULE_LABELS = {
  kho: 'Kho',
  cong_no: 'Nhà cung cấp',
  khach_hang: 'Khách hàng',
  bao_cao: 'Báo cáo',
  nguoi_dung: 'Người dùng',
  cau_hinh: 'Cấu hình',
  so_quy: 'Sổ quỹ',
  du_an: 'Dự án',
  doi_tac: 'Đối tác',
  bao_hanh: 'Bảo hành',
  nghiem_thu: 'Nghiệm thu',
};

module.exports = { MODULE_KEYS, MODULE_LABELS };
