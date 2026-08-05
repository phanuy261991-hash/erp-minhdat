-- Migration 030: mau in thu 2 trong he thong "Cau hinh mau in" (sau Phieu xuat kho, migration
-- 028/029) - "Giay de nghi tam ung" cho tung dot thanh toan theo hop dong trong module Du an
-- (theo yeu cau nguoi dung 2026-08-05, kem mau PDF that tham khao). Loai phieu nay KHONG co bang
-- san pham nen table_columns = '[]', show_amount_in_words = 0 (khong dung toi, xem
-- backend/config/printTemplateTokens.js truong hasTable=false).
--
-- Phan "Dai dien boi: Ong ... Chuc vu: ..." + ten nguoi ky cuoi phieu la VAN BAN TINH go thang
-- trong mau (theo quyet dinh nguoi dung - thong tin nay co dinh, khong them cot rieng vao
-- company_settings).
INSERT INTO print_templates (type, name, orientation, header_html, footer_html, table_columns, show_amount_in_words) VALUES (
'project_payment_advance',
'Giấy đề nghị tạm ứng',
'portrait',
'<div class="print-advance-header">
  <div class="print-company">
    <p class="print-company-name"><span class="pt-token" data-token="company_name" contenteditable="false">Tên công ty</span></p>
    <p>Số: <strong><span class="pt-token" data-token="contract_no" contenteditable="false">Số hợp đồng</span></strong></p>
  </div>
  <div class="print-advance-national">
    <p><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></p>
    <p>Độc lập - Tự do - Hạnh phúc</p>
  </div>
</div>
<h1 class="print-advance-title">GIẤY ĐỀ NGHỊ TẠM ỨNG LẦN <span class="pt-token" data-token="advance_number" contenteditable="false">1</span></h1>
<p>Kính gửi: <strong><span class="pt-token" data-token="customer_name" contenteditable="false">Tên khách hàng</span></strong></p>
<p>Căn cứ theo hợp đồng Số: <strong><span class="pt-token" data-token="contract_no" contenteditable="false">Số hợp đồng</span></strong> ký ngày <strong><span class="pt-token" data-token="contract_date" contenteditable="false">Ngày ký hợp đồng</span></strong> giữa hai bên về việc cung cấp và lắp đặt các giải pháp điện thông minh tại: <strong><span class="pt-token" data-token="site_address" contenteditable="false">Địa chỉ lắp đặt</span></strong>.</p>
<p>Đề nghị Quý Công ty tạm ứng lần <strong><span class="pt-token" data-token="advance_number" contenteditable="false">1</span></strong>, tương ứng <strong><span class="pt-token" data-token="advance_percent" contenteditable="false">30</span></strong>% theo giá trị hợp đồng cho chúng tôi số tiền là:</p>
<p class="print-advance-amount"><strong><span class="pt-token" data-token="advance_amount" contenteditable="false">Số tiền</span></strong></p>',
'<p>Thanh toán bằng chuyển khoản vào tài khoản như sau:</p>
<p>Tên thụ hưởng: <strong><span class="pt-token" data-token="bank_account_holder" contenteditable="false">Tên tài khoản thụ hưởng</span></strong></p>
<p>Số tài khoản: <strong><span class="pt-token" data-token="bank_account_number" contenteditable="false">Số tài khoản</span></strong>&nbsp;&nbsp;Ngân hàng <strong><span class="pt-token" data-token="bank_name_branch" contenteditable="false">Tên ngân hàng - Chi nhánh</span></strong></p>
<p>Đại diện bởi: <strong>.....</strong>&nbsp;&nbsp;&nbsp;Chức vụ: <strong>.....</strong></p>
<p>Trân trọng cảm ơn.</p>
<div class="print-advance-signature">
  <p>Hồ Chí Minh, <span class="pt-token" data-token="print_date" contenteditable="false">ngày ... tháng ... năm ...</span></p>
  <p><strong>.....</strong></p>
  <p class="print-advance-signature-name"><strong>.....</strong></p>
</div>',
'[]',
0
);
