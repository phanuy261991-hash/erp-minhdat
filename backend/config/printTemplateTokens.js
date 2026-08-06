// Nguon du lieu duy nhat cho he thong "Cau hinh mau in" (migration 028, theo yeu cau nguoi dung
// 2026-08-05): danh sach token kha dung + noi dung mac dinh ("factory default", dung cho nut
// "Dat lai" o trang chinh sua va API GET /:type/default) cho tung loai phieu (type). Them mau in
// moi (vd Phieu nhap kho sau nay) thi chi can them 1 entry moi vao PRINT_TEMPLATE_TYPES + lam 1
// trang render tuong ung (giong print-issue.html) - dung nguyen tac "them 1 cho" da dung cho
// MODULE_KEYS/MODULE_LABELS (backend/config/modules.js).
//
// hideLineIfEmpty=true: token dai dien cho CA 1 dong co the an neu gia tri rong (vd khong co du
// an/ghi chu/dia chi cong ty) - dong seed tuong ung phai boc token trong the co
// data-token-line="<key>" de frontend (print-template-render.js) biet phan tu nao can an. Neu
// nguoi dung tu sua mau va xoa mat the boc nay, token se khong con tu an dong nua - chap nhan
// duoc vi do la mau tuy chinh cua ho, khong anh huong ban seed goc.

const STOCK_ISSUE_HEADER_TOKENS = [
  { key: 'company_name', label: 'Tên công ty', hideLineIfEmpty: false },
  { key: 'company_address', label: 'Địa chỉ công ty', hideLineIfEmpty: true },
  { key: 'company_phones', label: 'Điện thoại công ty', hideLineIfEmpty: true },
  { key: 'company_tax_code', label: 'Mã số thuế công ty', hideLineIfEmpty: true },
  { key: 'company_contact', label: 'Email/Website công ty', hideLineIfEmpty: true },
  { key: 'company_bank_info', label: 'Thông tin ngân hàng', hideLineIfEmpty: true },
  { key: 'issue_code', label: 'Mã phiếu xuất', hideLineIfEmpty: false },
  { key: 'issue_date', label: 'Ngày lập phiếu', hideLineIfEmpty: false },
  { key: 'customer_name', label: 'Tên khách hàng', hideLineIfEmpty: false },
  { key: 'customer_address', label: 'Địa chỉ khách hàng', hideLineIfEmpty: false },
  { key: 'customer_phone', label: 'Điện thoại khách hàng', hideLineIfEmpty: false },
  { key: 'project_name', label: 'Tên dự án/công trình', hideLineIfEmpty: true },
  { key: 'issue_note', label: 'Ghi chú phiếu', hideLineIfEmpty: true },
];

const STOCK_ISSUE_FOOTER_TOKENS = [
  { key: 'company_print_note', label: 'Ghi chú in phiếu (cấu hình công ty)', hideLineIfEmpty: true },
  { key: 'created_by_name', label: 'Người lập phiếu', hideLineIfEmpty: false },
];

const STOCK_ISSUE_TABLE_COLUMNS = [
  { key: 'stt', label: 'STT', numeric: false },
  { key: 'product_code', label: 'Mã sản phẩm', numeric: false },
  { key: 'product_name', label: 'Tên hàng hóa', numeric: false },
  { key: 'unit', label: 'ĐVT', numeric: false },
  { key: 'quantity', label: 'Số lượng', numeric: true },
  { key: 'unit_price', label: 'Đơn giá', numeric: true },
  { key: 'discount_percent', label: 'Chiết khấu', numeric: true },
  { key: 'net_unit_price', label: 'Đơn giá sau CK', numeric: true },
  { key: 'line_total', label: 'Thành tiền', numeric: true },
];

// Noi dung mac dinh phai KHOP DUNG voi phan seed trong migration 028_print_templates.sql (chi
// dung 1 lan khi tao migration - tu day ve sau day la "factory default" co dinh dung cho nut
// "Dat lai", khong tu dong cap nhat theo du lieu nguoi dung da sua trong bang print_templates).
const STOCK_ISSUE_DEFAULT_HEADER_HTML = `<div class="print-header">
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
</div>`;

const STOCK_ISSUE_DEFAULT_FOOTER_HTML = `<div class="print-company-note" data-token-line="company_print_note">
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
</div>`;

// width: ti le tuong doi giua cac cot (khong bat buoc phai tong dung 100 - luon duoc quy doi ve
// % thuc su luc render, xem normalizeTableColumns trong frontend/assets/print-template-render.js).
const STOCK_ISSUE_DEFAULT_TABLE_COLUMNS = [
  { key: 'stt', width: 5 },
  { key: 'product_code', width: 10 },
  { key: 'product_name', width: 22 },
  { key: 'unit', width: 8 },
  { key: 'quantity', width: 9 },
  { key: 'unit_price', width: 12 },
  { key: 'discount_percent', width: 9 },
  { key: 'net_unit_price', width: 12 },
  { key: 'line_total', width: 13 },
];

// ---- Giay de nghi tam ung (migration 030, theo yeu cau nguoi dung 2026-08-05) - mau in THU 2,
// khong co bang san pham (hasTable:false). Phan "Dai dien boi"/ten nguoi ky la van ban tinh go
// thang trong mau (theo quyet dinh nguoi dung), khong phai token.
const PROJECT_ADVANCE_HEADER_TOKENS = [
  { key: 'company_name', label: 'Tên công ty', hideLineIfEmpty: false },
  { key: 'contract_no', label: 'Số hợp đồng dự án', hideLineIfEmpty: false },
  { key: 'contract_date', label: 'Ngày ký hợp đồng', hideLineIfEmpty: false },
  { key: 'customer_name', label: 'Tên khách hàng', hideLineIfEmpty: false },
  { key: 'site_address', label: 'Địa chỉ lắp đặt/công trình', hideLineIfEmpty: false },
  { key: 'advance_number', label: 'Lần tạm ứng', hideLineIfEmpty: false },
  { key: 'advance_percent', label: 'Tỉ lệ % tạm ứng', hideLineIfEmpty: false },
  { key: 'advance_amount', label: 'Số tiền tạm ứng', hideLineIfEmpty: false },
  { key: 'advance_amount_words', label: 'Số tiền tạm ứng bằng chữ', hideLineIfEmpty: false },
  // "Thong tin phieu in" tren dot thanh toan (migration 031, theo yeu cau nguoi dung 2026-08-06) -
  // rieng cho phieu nay, khac customer_name (ten khach hang tren hop dong) vi nguoi nhan phieu
  // tam ung co the la 1 nguoi cu the khac (vd ke toan/dai dien) chu khong phai ten khach hang.
  { key: 'recipient_title', label: 'Danh xưng người nhận', hideLineIfEmpty: false },
  { key: 'recipient_name', label: 'Gửi đến (người nhận phiếu)', hideLineIfEmpty: false },
];

const PROJECT_ADVANCE_FOOTER_TOKENS = [
  { key: 'bank_account_holder', label: 'Tên tài khoản thụ hưởng', hideLineIfEmpty: false },
  { key: 'bank_account_number', label: 'Số tài khoản', hideLineIfEmpty: false },
  { key: 'bank_name_branch', label: 'Ngân hàng - Chi nhánh', hideLineIfEmpty: false },
  { key: 'print_date', label: 'Ngày in phiếu', hideLineIfEmpty: false },
];

const PROJECT_ADVANCE_DEFAULT_HEADER_HTML = `<div class="print-advance-header">
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
<p class="print-advance-amount"><strong><span class="pt-token" data-token="advance_amount" contenteditable="false">Số tiền</span></strong></p>
<p class="print-advance-amount-words"><strong><em>(Bằng chữ: <span class="pt-token" data-token="advance_amount_words" contenteditable="false">Số tiền bằng chữ</span>)</em></strong></p>`;

const PROJECT_ADVANCE_DEFAULT_FOOTER_HTML = `<p>Thanh toán bằng chuyển khoản vào tài khoản như sau:</p>
<p>Tên thụ hưởng: <strong><span class="pt-token" data-token="bank_account_holder" contenteditable="false">Tên tài khoản thụ hưởng</span></strong></p>
<p>Số tài khoản: <strong><span class="pt-token" data-token="bank_account_number" contenteditable="false">Số tài khoản</span></strong>&nbsp;&nbsp;Ngân hàng <strong><span class="pt-token" data-token="bank_name_branch" contenteditable="false">Tên ngân hàng - Chi nhánh</span></strong></p>
<p>Đại diện bởi: <strong>.....</strong>&nbsp;&nbsp;&nbsp;Chức vụ: <strong>.....</strong></p>
<p>Trân trọng cảm ơn.</p>
<div class="print-advance-signature">
  <p>Hồ Chí Minh, <span class="pt-token" data-token="print_date" contenteditable="false">ngày ... tháng ... năm ...</span></p>
  <p><strong>.....</strong></p>
  <p class="print-advance-signature-name"><strong>.....</strong></p>
</div>`;

const PRINT_TEMPLATE_TYPES = {
  stock_issue: {
    name: 'Mẫu in phiếu xuất kho',
    hasTable: true,
    tokens: {
      header: STOCK_ISSUE_HEADER_TOKENS,
      footer: STOCK_ISSUE_FOOTER_TOKENS,
    },
    tableColumns: STOCK_ISSUE_TABLE_COLUMNS,
    defaultOrientation: 'portrait',
    defaultHeaderHtml: STOCK_ISSUE_DEFAULT_HEADER_HTML,
    defaultFooterHtml: STOCK_ISSUE_DEFAULT_FOOTER_HTML,
    defaultTableColumns: STOCK_ISSUE_DEFAULT_TABLE_COLUMNS,
    defaultShowAmountInWords: true,
  },
  project_payment_advance: {
    name: 'Giấy đề nghị tạm ứng',
    hasTable: false,
    tokens: {
      header: PROJECT_ADVANCE_HEADER_TOKENS,
      footer: PROJECT_ADVANCE_FOOTER_TOKENS,
    },
    tableColumns: [],
    defaultOrientation: 'portrait',
    defaultHeaderHtml: PROJECT_ADVANCE_DEFAULT_HEADER_HTML,
    defaultFooterHtml: PROJECT_ADVANCE_DEFAULT_FOOTER_HTML,
    defaultTableColumns: [],
    defaultShowAmountInWords: false,
  },
};

module.exports = { PRINT_TEMPLATE_TYPES };
