-- Migration 035: Sổ quỹ tự động ghi nhận dòng tiền thật - đảo ngược 1 phần quyết định "hoàn toàn
-- độc lập với Công nợ" của migration 019 (xem docs/DECISIONS.md 2026-08-02 và mục mới cùng ngày
-- với migration này). Theo yêu cầu người dùng: mọi lần thanh toán công nợ (KH/NCC) và mọi phiếu
-- nhập/xuất kho đánh dấu "trả tiền ngay" (không công nợ) sẽ tự động tạo 1 phiếu thu/chi tương ứng.
-- "Trả hàng" (stockReturn.service.js/supplierReturn.service.js) KHÔNG tạo phiếu - 2 service đó
-- không đi qua createStockReceipt()/createStockIssue()/recordPayment() nên tự động không bị ảnh
-- hưởng, không cần thêm điều kiện gì ở đây.

-- reference_type/reference_id: polymorphic, tro toi debt_ledger/stock_issues/stock_receipts tuy
-- gia tri - khong dung REFERENCES (giong debt_ledger.reference_id, khong the REFERENCES 3 bang
-- cung luc). NULL o ca 2 cot = phieu thu/chi thu cong (hanh vi cu, khong doi).
ALTER TABLE cash_vouchers ADD COLUMN reference_type TEXT;
ALTER TABLE cash_vouchers ADD COLUMN reference_id INTEGER;

-- partner_id: denormalize truc tiep (giong debt_ledger.partner_id) de phieu tu dong hien duoc
-- "Doi tac lien ket" ma khong can join vong qua reference_id (vd phieu tu xuat kho thu tien ngay
-- co the khong co doi tac nao - khach le - partner_id NULL trong truong hop do).
ALTER TABLE cash_vouchers ADD COLUMN partner_id INTEGER REFERENCES partners(id);

-- system_key: danh dau danh muc "he thong" (chi phieu tu dong duoc gan, khong cho sua/xoa qua
-- cashCategories.routes.js bat ke co dang duoc dung hay khong - xem doan INSERT ben duoi). NULL =
-- danh muc thu cong binh thuong (6 dong seed cu tu migration 019 KHONG doi, van dung tu do).
-- SQLite khong cho ADD COLUMN kem UNIQUE truc tiep - tach thanh CREATE UNIQUE INDEX rieng (van
-- cho phep nhieu dong NULL, chi ep unique voi gia tri khac NULL - dung y muon).
ALTER TABLE cash_categories ADD COLUMN system_key TEXT;
CREATE UNIQUE INDEX idx_cash_categories_system_key ON cash_categories(system_key);

INSERT INTO cash_categories (name, type, system_key) VALUES
    ('Thu hồi công nợ khách hàng', 'thu', 'thu_cong_no_kh'),
    ('Thu theo đợt thanh toán dự án', 'thu', 'thu_dot_thanh_toan_du_an'),
    ('Thu bán hàng trả ngay', 'thu', 'thu_ban_hang'),
    ('Chi trả công nợ nhà cung cấp', 'chi', 'chi_cong_no_ncc'),
    ('Chi mua hàng trả ngay', 'chi', 'chi_mua_hang');
