-- Migration 028: cau hinh mau in (bat dau voi Phieu xuat kho, theo yeu cau nguoi dung 2026-08-05).
-- Moi loai phieu (type) chi co DUNG 1 mau, sua truc tiep - khong co khai niem nhieu mau/loai +
-- chon "dang dung" (da chot voi nguoi dung qua AskUserQuestion, xem docs/DECISIONS.md).
-- header_html/footer_html: vung soan thao tu do (WYSIWYG, chua san cac "chip" token dang
-- <span class="pt-token" data-token="...">...</span>), dung truoc/sau bang san pham. Cac dong co
-- the an neu rong (vd khong co du an/ghi chu) danh dau bang thuoc tinh data-token-line="<key>"
-- tren the bao ngoai - xem backend/config/printTemplateTokens.js va frontend/assets/
-- print-template-render.js (noi doc thuoc tinh nay de an/hien dong tuong ung). Bang san pham
-- KHONG soan thao tu do - chi bat/tat + sap xep cot co san, luu trong table_columns (JSON mang
-- cac key cot theo dung thu tu da chon).
--
-- Seed ben duoi dung LAI Y HET cau truc/class CSS cua frontend/print-issue.html truoc khi co
-- migration nay, de khong doi gi ve mat hien thi cho toi khi nguoi dung chu dong sua mau. Ban
-- sao noi dung mac dinh nay cung ton tai trong backend/config/printTemplateTokens.js (dung cho
-- API GET /:type/default va nut "Dat lai" o trang chinh sua) - 2 noi dong nhau tai thoi diem
-- tao migration, khong can dong bo lai sau nay (JS config la "factory default" co dinh, con
-- dong nay trong DB co the bi nguoi dung sua qua PUT).
CREATE TABLE print_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  orientation TEXT NOT NULL DEFAULT 'portrait' CHECK (orientation IN ('portrait', 'landscape')),
  header_html TEXT NOT NULL DEFAULT '',
  footer_html TEXT NOT NULL DEFAULT '',
  table_columns TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by INTEGER REFERENCES users(id)
);

INSERT INTO print_templates (type, name, orientation, header_html, footer_html, table_columns) VALUES (
'stock_issue',
'Mẫu in phiếu xuất kho',
'portrait',
'<div class="print-header">
  <div class="print-company">
    <p class="print-company-name"><span class="pt-token" data-token="company_name" contenteditable="false">Tên công ty</span></p>
    <p data-token-line="company_address"><span class="pt-token" data-token="company_address" contenteditable="false">Địa chỉ công ty</span></p>
    <p data-token-line="company_phones"><span class="pt-token" data-token="company_phones" contenteditable="false">Điện thoại công ty</span></p>
    <p data-token-line="company_tax_code"><span class="pt-token" data-token="company_tax_code" contenteditable="false">Mã số thuế</span></p>
    <p data-token-line="company_contact"><span class="pt-token" data-token="company_contact" contenteditable="false">Email/Website công ty</span></p>
    <p data-token-line="company_bank_info"><span class="pt-token" data-token="company_bank_info" contenteditable="false">Thông tin ngân hàng</span></p>
  </div>
  <div class="print-doc-title">
    <h1>PHIẾU XUẤT KHO</h1>
    <p>Mã phiếu: <strong><span class="pt-token" data-token="issue_code" contenteditable="false">Mã phiếu</span></strong></p>
    <p>Ngày: <span class="pt-token" data-token="issue_date" contenteditable="false">Ngày lập phiếu</span></p>
  </div>
</div>
<div class="print-customer">
  <p>Khách hàng: <strong><span class="pt-token" data-token="customer_name" contenteditable="false">Tên khách hàng</span></strong></p>
  <p>Địa chỉ: <span class="pt-token" data-token="customer_address" contenteditable="false">Địa chỉ khách hàng</span></p>
  <p>Điện thoại: <span class="pt-token" data-token="customer_phone" contenteditable="false">Điện thoại khách hàng</span></p>
  <p data-token-line="project_name">Công trình: <span class="pt-token" data-token="project_name" contenteditable="false">Tên dự án</span></p>
  <p data-token-line="issue_note">Ghi chú: <span class="pt-token" data-token="issue_note" contenteditable="false">Ghi chú phiếu</span></p>
</div>',
'<div class="print-company-note" data-token-line="company_print_note">
  <p class="print-company-note-title">Ghi chú:</p>
  <p class="print-company-note-text"><span class="pt-token" data-token="company_print_note" contenteditable="false">Ghi chú in phiếu</span></p>
</div>
<div class="print-signatures">
  <div>
    <p>Người lập phiếu</p>
    <p class="print-sign-hint">(Ký, ghi rõ họ tên)</p>
    <p class="print-sign-name"><span class="pt-token" data-token="created_by_name" contenteditable="false">Người lập phiếu</span></p>
  </div>
  <div>
    <p>Người nhận hàng</p>
    <p class="print-sign-hint">(Ký, ghi rõ họ tên)</p>
  </div>
</div>',
'["stt","product_code","product_name","unit","quantity","unit_price","discount_percent","net_unit_price","line_total"]'
);
