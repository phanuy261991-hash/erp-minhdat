-- Migration 040: doi co che "Cau hinh mau in" tu contenteditable (header_html/footer_html tach
-- rieng + table_columns JSON bat/tat cot co san) sang 1 khung HTML/CSS THAT duy nhat nguoi dung
-- tu soan (theo yeu cau nguoi dung 2026-08-19, dao nguoc cach tiep can migration 028/029 - xem
-- docs/DECISIONS.md). Ly do: trinh soan thao WYSIWYG cu khong dinh vi tu do duoc, kho chen/tim
-- token; khung HTML/CSS that cho dinh vi tu do bang CSS that (manh hon 1 GUI keo-tha), engine chi
-- con lo thay token + lap dong bang san pham.
--
-- template_html: 1 doan HTML/CSS day du (co the nhung <style> rieng), chua token dang {{TenBien}}
-- (thay cho <span data-token> cu) + khoi lap dong san pham danh dau bang HTML comment
-- <!-- items:start -->...<!-- items:end --> (thay cho table_columns JSON) + khoi dieu kien
-- <!-- if:KEY -->...<!-- endif --> (thay cho thuoc tinh data-token-line cu). Xem
-- frontend/assets/print-template-render.js.
--
-- Bo hoan toan khai niem "cot bang san pham"/"So tien viet bang chu" rieng - gio la token binh
-- thuong (vd {{Item.TenSP}}, {{SoTienBangChu}}) nguoi dung tu dat vi tri trong HTML tu viet, nen
-- khong con can header_html/footer_html/table_columns/show_amount_in_words.
--
-- Chi co dung 2 dong du lieu that (stock_issue, project_payment_advance) - khong viet converter tu
-- dong, dung lai template_html='' mac dinh, du kien dung lai 2 mau nay bang tay qua trang chinh
-- sua mau moi ngay sau khi trien khai (chap nhan duoc, xem docs/DECISIONS.md).
ALTER TABLE print_templates ADD COLUMN template_html TEXT NOT NULL DEFAULT '';

ALTER TABLE print_templates DROP COLUMN header_html;
ALTER TABLE print_templates DROP COLUMN footer_html;
ALTER TABLE print_templates DROP COLUMN table_columns;
ALTER TABLE print_templates DROP COLUMN show_amount_in_words;
