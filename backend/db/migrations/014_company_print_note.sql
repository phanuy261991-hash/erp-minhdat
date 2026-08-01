-- Migration 014: them ghi chu hien thi duoi bang ke tren mau in phieu xuat kho (xem
-- docs/PRD.md muc 4.5, docs/DECISIONS.md). De trong duoc, sua qua trang Thong tin cong ty
-- (khong hardcode cung trong code) - seed san noi dung mau theo mau phieu thuc te nguoi dung
-- cung cap. Luu y: 1 dong trong noi dung goc bi cat o le anh, da dien lai theo suy doan ngu
-- canh hop ly nhat - can nguoi dung xac nhan/sua lai qua trang Thong tin cong ty.

ALTER TABLE company_settings ADD COLUMN print_note TEXT NOT NULL DEFAULT '';

UPDATE company_settings SET print_note =
'* Không nhận đổi hoặc trả sản phẩm đã lắp đặt
* Đơn giá đối với sản phẩm Lumi đã bao gồm thuế VAT 8%
* Điều kiện bảo hành:
 - Điều kiện 1: Bảo hành 24 tháng với sản phẩm của Lumi, BFT
 - Điều kiện 2: Thanh ray rèm, dây curoa, các phụ kiện thanh rèm bảo hành 12 tháng. Không bảo hành pin cảm biến. Các sản phẩm thương hiệu khác bảo hành theo tiêu chuẩn của nhà sản xuất
 - Điều kiện 3: Sản phẩm được bảo hành trong thời hạn liên quan đến lỗi phần cứng hoặc phần mềm của nhà sản xuất
 - Điều kiện 4: Không nhận bảo hành nếu trong quá trình đang lắp đặt hoặc sử dụng gây cháy, nổ, chập điện, đổ nước, dính sơn.... dẫn đến hỏng thiết bị'
WHERE id = 1;
