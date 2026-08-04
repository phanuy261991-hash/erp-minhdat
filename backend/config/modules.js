// Danh sach hang so module dung cho he thong phan quyen dong (xem docs/PRD.md muc 4.1,
// docs/Plan.md muc 2b). Them module moi (vd 'ban_hang' khi lam module Ban hang/POS) thi chi
// can them vao day - nho dong bo voi cac item trong frontend/assets/layout.js (NAV_GROUPS).
//
// MODULE_LABELS (2026-08-03): nguon duy nhat cho nhan tieng Viet cua tung module - truoc day
// frontend/assets/roles.js tu hardcode rieng 1 danh sach nhan+thu tu, bi quen cap nhat khi them
// module 'so_quy' (Sổ quỹ) nen o giao dien "Vai tro" khong hien checkbox chon duoc, dan toi mat
// quyen 'so_quy' khoi vai tro moi khi luu (checkbox khong ton tai thi khong the gui len). Tu nay
// frontend goi GET /api/roles/modules de lay dong danh sach nay, khong con hardcode trung lap.
const MODULE_KEYS = ['kho', 'cong_no', 'bao_cao', 'nguoi_dung', 'cau_hinh', 'so_quy', 'du_an'];

const MODULE_LABELS = {
  kho: 'Kho',
  cong_no: 'Công nợ',
  bao_cao: 'Báo cáo',
  nguoi_dung: 'Người dùng',
  cau_hinh: 'Cấu hình',
  so_quy: 'Sổ quỹ',
  du_an: 'Dự án',
};

module.exports = { MODULE_KEYS, MODULE_LABELS };
