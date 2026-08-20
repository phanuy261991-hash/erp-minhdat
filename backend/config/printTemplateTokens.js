// Nguon du lieu duy nhat cho he thong "Cau hinh mau in" (migration 028, mo rong lai hoan toan o
// migration 040 theo yeu cau nguoi dung 2026-08-19 - xem docs/DECISIONS.md): danh sach token kha
// dung + duong dan file mau khoi diem ("factory default", dung cho nut "Dat lai" o trang chinh
// sua va API GET /:type/default) cho tung loai phieu (type). Them mau in moi (vd Phieu nhap kho
// sau nay) thi chi can them 1 entry moi vao PRINT_TEMPLATE_TYPES + 1 file .html trong thu muc
// print-template-defaults/ + 1 trang render tuong ung (giong print-issue.html) - dung nguyen tac
// "them 1 cho" da dung cho MODULE_KEYS/MODULE_LABELS (backend/config/modules.js).
//
// Token dung cu phap {{TenBien}} (khong con la <span data-token> DOM nua - xem
// frontend/assets/print-template-render.js). group: 'document' (token cap ca phieu, dat duoc bat
// ky dau trong template_html) hoac 'item' (chi dung DUOC BEN TRONG khoi lap
// <!-- items:start -->...<!-- items:end -->, prefix rieng "Item." de phan biet). hideable=true
// nghia la token nay CO THE boc trong khoi dieu kien <!-- if:KEY -->...<!-- endif --> de an ca
// khoi neu gia tri rong (vd khong co dia chi/ghi chu) - hoan toan tuy chon, nguoi dung tu quyet
// dinh co dung khoi dieu kien hay khong khi tu soan mau, khong bat buoc nhu co che
// data-token-line cu.

const path = require('path');

const PRINT_TEMPLATE_DEFAULTS_DIR = path.join(__dirname, 'print-template-defaults');

const STOCK_ISSUE_DOCUMENT_TOKENS = [
  { key: 'CompanyName', label: 'Tên công ty', hideable: false },
  { key: 'CompanyAddress', label: 'Địa chỉ công ty', hideable: true },
  { key: 'CompanyPhones', label: 'Điện thoại công ty', hideable: true },
  { key: 'CompanyTaxCode', label: 'Mã số thuế công ty', hideable: true },
  { key: 'CompanyContact', label: 'Email/Website công ty', hideable: true },
  { key: 'CompanyBankInfo', label: 'Thông tin ngân hàng', hideable: true },
  { key: 'IssueCode', label: 'Mã phiếu xuất', hideable: false },
  { key: 'IssueDate', label: 'Ngày lập phiếu', hideable: false },
  { key: 'CustomerName', label: 'Tên khách hàng', hideable: false },
  { key: 'CustomerAddress', label: 'Địa chỉ khách hàng', hideable: false },
  { key: 'CustomerPhone', label: 'Điện thoại khách hàng', hideable: false },
  { key: 'ProjectName', label: 'Tên dự án/công trình', hideable: true },
  { key: 'IssueNote', label: 'Ghi chú phiếu', hideable: true },
  { key: 'CompanyPrintNote', label: 'Ghi chú in phiếu (cấu hình công ty)', hideable: true },
  { key: 'CreatedByName', label: 'Người lập phiếu', hideable: false },
  { key: 'TotalAmount', label: 'Tổng cộng (số)', hideable: false },
  { key: 'AmountInWords', label: 'Tổng cộng bằng chữ', hideable: false },
];

// Token cap TUNG DONG san pham - chi dung duoc BEN TRONG khoi lap
// <!-- items:start -->...<!-- items:end -->, prefix "Item." bat buoc trong template_html (vd
// {{Item.ProductName}}) de phan biet voi token cap phieu o tren.
const STOCK_ISSUE_ITEM_TOKENS = [
  { key: 'Item.Stt', label: 'STT', hideable: false },
  { key: 'Item.ProductCode', label: 'Mã sản phẩm', hideable: false },
  { key: 'Item.ProductName', label: 'Tên hàng hóa', hideable: false },
  { key: 'Item.Unit', label: 'Đơn vị tính', hideable: false },
  { key: 'Item.Quantity', label: 'Số lượng', hideable: false },
  { key: 'Item.UnitPrice', label: 'Đơn giá', hideable: false },
  { key: 'Item.DiscountPercent', label: 'Chiết khấu', hideable: false },
  { key: 'Item.NetUnitPrice', label: 'Đơn giá sau chiết khấu', hideable: false },
  { key: 'Item.LineTotal', label: 'Thành tiền', hideable: false },
];

const PROJECT_ADVANCE_DOCUMENT_TOKENS = [
  { key: 'CompanyName', label: 'Tên công ty', hideable: false },
  { key: 'ContractNo', label: 'Số hợp đồng dự án', hideable: false },
  { key: 'ContractDate', label: 'Ngày ký hợp đồng', hideable: false },
  { key: 'CustomerName', label: 'Tên khách hàng', hideable: false },
  { key: 'SiteAddress', label: 'Địa chỉ lắp đặt/công trình', hideable: false },
  { key: 'AdvanceNumber', label: 'Lần tạm ứng', hideable: false },
  { key: 'AdvancePercent', label: 'Tỉ lệ % tạm ứng', hideable: false },
  { key: 'AdvanceAmount', label: 'Số tiền tạm ứng', hideable: false },
  { key: 'AdvanceAmountWords', label: 'Số tiền tạm ứng bằng chữ', hideable: false },
  // "Thong tin phieu in" tren dot thanh toan (migration 031, theo yeu cau nguoi dung 2026-08-06) -
  // rieng cho phieu nay, khac CustomerName (ten khach hang tren hop dong) vi nguoi nhan phieu
  // tam ung co the la 1 nguoi cu the khac (vd ke toan/dai dien) chu khong phai ten khach hang.
  { key: 'RecipientTitle', label: 'Danh xưng người nhận', hideable: false },
  { key: 'RecipientName', label: 'Gửi đến (người nhận phiếu)', hideable: false },
  { key: 'BankAccountHolder', label: 'Tên tài khoản thụ hưởng', hideable: false },
  { key: 'BankAccountNumber', label: 'Số tài khoản', hideable: false },
  { key: 'BankNameBranch', label: 'Ngân hàng - Chi nhánh', hideable: false },
  { key: 'PrintDate', label: 'Ngày in phiếu', hideable: false },
];

// Token cap PHIEU cho "Bien ban nghiem thu theo giai phap" (migration 041, 2026-08-19) - tai su
// dung nhom token cong ty giong stock_issue, them token rieng cua giai phap/du an.
const ACCEPTANCE_SOLUTION_DOCUMENT_TOKENS = [
  { key: 'CompanyName', label: 'Tên công ty', hideable: false },
  { key: 'CompanyAddress', label: 'Địa chỉ công ty', hideable: true },
  { key: 'CompanyPhones', label: 'Điện thoại công ty', hideable: true },
  { key: 'CompanyTaxCode', label: 'Mã số thuế công ty', hideable: true },
  { key: 'CompanyContact', label: 'Email/Website công ty', hideable: true },
  { key: 'CompanyBankInfo', label: 'Thông tin ngân hàng', hideable: true },
  { key: 'ProjectName', label: 'Tên dự án/công trình', hideable: false },
  { key: 'ContractNo', label: 'Số hợp đồng dự án', hideable: true },
  { key: 'CustomerName', label: 'Tên khách hàng', hideable: false },
  { key: 'SiteAddress', label: 'Địa chỉ lắp đặt/công trình', hideable: false },
  { key: 'SolutionName', label: 'Tên giải pháp', hideable: false },
  { key: 'SolutionNote', label: 'Ghi chú giải pháp', hideable: true },
  { key: 'AcceptanceDate', label: 'Ngày lập biên bản', hideable: false },
  { key: 'TotalQuantity', label: 'Tổng số lượng thiết bị', hideable: false },
  { key: 'TotalAmount', label: 'Tổng cộng (số)', hideable: false },
  { key: 'AmountInWords', label: 'Tổng cộng bằng chữ', hideable: false },
  { key: 'CreatedByName', label: 'Người tạo giải pháp', hideable: false },
];

// Token cap TUNG DONG thiet bi - chi dung duoc BEN TRONG khoi lap
// <!-- items:start -->...<!-- items:end -->, prefix "Item." bat buoc (vd {{Item.ProductName}}).
const ACCEPTANCE_SOLUTION_ITEM_TOKENS = [
  { key: 'Item.Stt', label: 'STT', hideable: false },
  { key: 'Item.ProductCode', label: 'Mã sản phẩm', hideable: false },
  { key: 'Item.ProductName', label: 'Tên hàng hóa', hideable: false },
  { key: 'Item.Unit', label: 'Đơn vị tính', hideable: false },
  { key: 'Item.Quantity', label: 'Số lượng', hideable: false },
  { key: 'Item.UnitPrice', label: 'Đơn giá', hideable: false },
  { key: 'Item.LineTotal', label: 'Thành tiền', hideable: false },
];

const PRINT_TEMPLATE_TYPES = {
  stock_issue: {
    name: 'Mẫu in phiếu xuất kho',
    hasItems: true,
    tokens: {
      document: STOCK_ISSUE_DOCUMENT_TOKENS,
      item: STOCK_ISSUE_ITEM_TOKENS,
    },
    defaultOrientation: 'portrait',
    defaultTemplatePath: path.join(PRINT_TEMPLATE_DEFAULTS_DIR, 'stock_issue.html'),
  },
  project_payment_advance: {
    name: 'Giấy đề nghị tạm ứng',
    hasItems: false,
    tokens: {
      document: PROJECT_ADVANCE_DOCUMENT_TOKENS,
      item: [],
    },
    defaultOrientation: 'portrait',
    defaultTemplatePath: path.join(PRINT_TEMPLATE_DEFAULTS_DIR, 'project_payment_advance.html'),
  },
  acceptance_solution: {
    name: 'Biên bản nghiệm thu theo giải pháp',
    hasItems: true,
    tokens: {
      document: ACCEPTANCE_SOLUTION_DOCUMENT_TOKENS,
      item: ACCEPTANCE_SOLUTION_ITEM_TOKENS,
    },
    defaultOrientation: 'portrait',
    defaultTemplatePath: path.join(PRINT_TEMPLATE_DEFAULTS_DIR, 'acceptance_solution.html'),
  },
  // "Phieu xac nhan don hang" (2026-08-20, theo yeu cau nguoi dung) - in cho phieu xuat kho dang
  // NHAP ("Luu tam") de khach hang xem/chot truoc khi xuat kho that. Tai dung DUNG bo token cua
  // stock_issue (khong tao mang token moi) vi du lieu can hien thi giong het phieu xuat kho, chi
  // khac tieu de/van phong khi in - xem backend/config/print-template-defaults/order_confirmation.html.
  order_confirmation: {
    name: 'Phiếu xác nhận đơn hàng',
    hasItems: true,
    tokens: {
      document: STOCK_ISSUE_DOCUMENT_TOKENS,
      item: STOCK_ISSUE_ITEM_TOKENS,
    },
    defaultOrientation: 'portrait',
    defaultTemplatePath: path.join(PRINT_TEMPLATE_DEFAULTS_DIR, 'order_confirmation.html'),
  },
};

module.exports = { PRINT_TEMPLATE_TYPES };
