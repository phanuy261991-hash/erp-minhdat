// Logic RENDER dung CHUNG giua trang in that (print-issue.js/print-project-advance.js) va khung
// xem truoc cua trang chinh sua mau in (print-template-edit.js) - chi 1 noi tinh toan gia tri
// token + lap dong bang san pham, tranh 2 noi trien khai le nhau ve sau (migration 028, mo rong
// lai hoan toan o migration 040 theo yeu cau nguoi dung 2026-08-19 - xem docs/DECISIONS.md).
//
// Tu migration 040: template_html la 1 doan HTML/CSS THAT DUY NHAT (khong con tach header/
// footer/table_columns). Engine render la STRING-BASED (khong con DOM-walk nhu ban cu dung
// <span data-token>) vi khong con "chip" DOM nao de tim - token gio la van ban tho dang
// {{TenBien}} nam thang trong chuoi HTML nguoi dung tu go.

function formatMoneyVN(value) {
  return Number(value).toLocaleString('vi-VN');
}

function formatDateVN(sqliteDateTime) {
  const iso = sqliteDateTime.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Dinh dang dai "DD tháng MM năm YYYY" (dung cho Giay de nghi tam ung) - nhan ca chuoi
// 'YYYY-MM-DD' (tu cot DATE trong DB, vd projects.contract_date) lan doi tuong Date (vd ngay in
// hom nay). Them "T00:00:00" khi parse chuoi de ep gio dia phuong, tranh lech 1 ngay do
// "YYYY-MM-DD" thuan bi trinh duyet hieu la nua dem UTC.
function formatDateVNLong(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(`${dateInput}T00:00:00`);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())} tháng ${pad(d.getMonth() + 1)} năm ${d.getFullYear()}`;
}

function buildCompanyAddressLine(company) {
  return company.address || '';
}

function buildCompanyPhonesLine(company) {
  const phones = Array.isArray(company.phones) ? company.phones : [];
  return phones.length > 0 ? phones.join(' - ') : '';
}

function buildCompanyTaxCodeLine(company) {
  return company.tax_code || '';
}

function buildCompanyContactLine(company) {
  const parts = [];
  if (company.email) parts.push(`Email: ${company.email}`);
  if (company.website) parts.push(`Web: ${company.website}`);
  return parts.join(' - ');
}

function buildBankNameBranchLine(company) {
  if (!company.bank_name) return '';
  return company.bank_branch ? `${company.bank_name} – ${company.bank_branch}` : company.bank_name;
}

function buildCompanyBankLine(company) {
  const parts = [];
  if (company.bank_account_number) {
    let line = `STK: ${company.bank_account_number}`;
    const nameBranch = buildBankNameBranchLine(company);
    if (nameBranch) line += ` - ${nameBranch}`;
    parts.push(line);
  }
  if (company.bank_account_holder) parts.push(`Chủ TK: ${company.bank_account_holder}`);
  return parts.join(' - ');
}

// Gia tri token CAP PHIEU (khong phai token cap tung dong san pham - xem
// buildStockIssueItemTokenValues ben duoi) - dung cho ca phieu that (issue/company tu API) lan
// du lieu mau co dinh trong khung xem truoc.
function buildStockIssueTokenValues(issue, company) {
  const totalAmount = Math.round(issue.total_amount);
  return {
    CompanyName: company.company_name || '(Chưa cấu hình tên công ty)',
    CompanyAddress: buildCompanyAddressLine(company),
    CompanyPhones: buildCompanyPhonesLine(company),
    CompanyTaxCode: buildCompanyTaxCodeLine(company),
    CompanyContact: buildCompanyContactLine(company),
    CompanyBankInfo: buildCompanyBankLine(company),
    IssueCode: issue.code,
    IssueDate: formatDateVN(issue.created_at),
    CustomerName: issue.partner_name || 'Khách lẻ',
    CustomerAddress: issue.partner_address || '-',
    CustomerPhone: issue.partner_phone || '-',
    ProjectName: issue.project_name || '',
    IssueNote: issue.note || '',
    CompanyPrintNote: company.print_note && company.print_note.trim() ? company.print_note : '',
    CreatedByName: issue.created_by_name || '',
    TotalAmount: formatMoneyVN(totalAmount),
    AmountInWords: numberToVietnameseWords(totalAmount),
  };
}

// Gia tri token CAP TUNG DONG san pham (prefix "Item." trong template_html, vd
// {{Item.ProductName}}) - chi co y nghia BEN TRONG khoi lap <!-- items:start -->...<!-- items:end -->.
function buildStockIssueItemTokenValues(item, index) {
  const netUnitPrice = Math.round(item.unit_price * (1 - (item.discount_percent || 0) / 100));
  return {
    Stt: String(index + 1),
    ProductCode: item.product_code,
    ProductName: item.product_name,
    Unit: item.unit,
    Quantity: formatMoneyVN(item.quantity),
    UnitPrice: formatMoneyVN(item.unit_price),
    DiscountPercent: item.discount_percent ? `${item.discount_percent}%` : '-',
    NetUnitPrice: formatMoneyVN(netUnitPrice),
    LineTotal: formatMoneyVN(Math.round(item.quantity * netUnitPrice)),
  };
}

// Doc so tien thanh chu tieng Viet (vd 125000 -> "Một trăm hai mươi lăm nghìn đồng") - thuan JS,
// khong dung thu vien ngoai. Quy tac: nhom 3 chu so tu phai sang, moi nhom KHONG PHAI nhom dau
// tien (cao nhat) luon doc du "tram"/"linh" du hang tram la 0 (vd "khong tram linh nam"); nhom
// gia tri 0 thi BO QUA hoan toan (khong doc ten don vi cua nhom do).
const VN_DIGIT_WORDS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const VN_GROUP_UNITS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ', 'tỷ tỷ'];

function readVietnameseGroupOfThree(num, forceFullBlock) {
  const hundred = Math.floor(num / 100);
  const rest = num % 100;
  const ten = Math.floor(rest / 10);
  const unit = rest % 10;
  const parts = [];

  if (hundred > 0 || forceFullBlock) {
    parts.push(`${VN_DIGIT_WORDS[hundred]} trăm`);
  }

  if (ten === 0) {
    if (unit > 0) {
      if (hundred > 0 || forceFullBlock) parts.push('linh');
      parts.push(VN_DIGIT_WORDS[unit]);
    }
  } else if (ten === 1) {
    parts.push('mười');
    if (unit === 1) parts.push('một');
    else if (unit === 5) parts.push('lăm');
    else if (unit > 0) parts.push(VN_DIGIT_WORDS[unit]);
  } else {
    parts.push(`${VN_DIGIT_WORDS[ten]} mươi`);
    if (unit === 1) parts.push('mốt');
    else if (unit === 5) parts.push('lăm');
    else if (unit > 0) parts.push(VN_DIGIT_WORDS[unit]);
  }

  return parts.join(' ');
}

function numberToVietnameseWords(amount) {
  const value = Math.round(Math.abs(Number(amount) || 0));
  if (value === 0) return 'Không đồng';

  const groups = [];
  let remaining = value;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const words = [];
  let hasEmittedLeading = false;
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const group = groups[i];
    if (group === 0) continue;
    const groupWords = readVietnameseGroupOfThree(group, hasEmittedLeading);
    const unitLabel = VN_GROUP_UNITS[i] || '';
    words.push(unitLabel ? `${groupWords} ${unitLabel}` : groupWords);
    hasEmittedLeading = true;
  }

  const sentence = `${words.join(' ')} đồng`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

// ---- Giay de nghi tam ung ----

// Danh xung "Thong tin phieu in" cua dot thanh toan (migration 031) - khop dung danh sach CHECK
// o backend (project_payment_milestones.recipient_title), chi hien nhan doc duoc khi in.
const RECIPIENT_TITLE_LABELS = { anh: 'Khách hàng', chi: 'Chị', cong_ty: 'Công Ty', don_vi: 'Đơn vị' };

// Dung cho ca phieu that (project/milestone/company tu API) lan du lieu mau co dinh trong khung
// xem truoc. PrintDate luon la NGAY IN THAT (luc bam in/xem truoc), khong phai ngay tao dot
// thanh toan trong DB.
function buildProjectAdvanceTokenValues(project, milestone, company) {
  return {
    CompanyName: company.company_name || '(Chưa cấu hình tên công ty)',
    ContractNo: project.contract_no || '',
    ContractDate: project.contract_date ? formatDateVNLong(project.contract_date) : '',
    CustomerName: project.partner_name || '',
    SiteAddress: project.site_address || '-',
    AdvanceNumber: milestone.sort_order !== null && milestone.sort_order !== undefined ? String(milestone.sort_order) : '',
    AdvancePercent: milestone.percent !== null && milestone.percent !== undefined ? String(milestone.percent) : '',
    AdvanceAmount: `${formatMoneyVN(Math.round(milestone.amount))} VNĐ`,
    AdvanceAmountWords: numberToVietnameseWords(milestone.amount),
    BankAccountHolder: company.bank_account_holder || '',
    BankAccountNumber: company.bank_account_number || '',
    BankNameBranch: buildBankNameBranchLine(company),
    PrintDate: `ngày ${formatDateVNLong(new Date())}`,
    RecipientTitle: RECIPIENT_TITLE_LABELS[milestone.recipient_title] || '',
    RecipientName: milestone.recipient_name || '',
  };
}

// ---- Bien ban nghiem thu theo giai phap (migration 041, 2026-08-19) ----

// Gia tri token CAP GIAI PHAP - dung cho ca bien ban that (project/solution/company tu API) lan
// du lieu mau co dinh trong khung xem truoc. AcceptanceDate luon la NGAY IN THAT (luc bam in/xem
// truoc), khong phai ngay tao giai phap trong DB - dung nguyen tac PrintDate cua giay tam ung.
function buildAcceptanceSolutionTokenValues(project, solution, company) {
  const totalAmount = Math.round(solution.total_value);
  return {
    CompanyName: company.company_name || '(Chưa cấu hình tên công ty)',
    CompanyAddress: buildCompanyAddressLine(company),
    CompanyPhones: buildCompanyPhonesLine(company),
    CompanyTaxCode: buildCompanyTaxCodeLine(company),
    CompanyContact: buildCompanyContactLine(company),
    CompanyBankInfo: buildCompanyBankLine(company),
    ProjectName: project.name || '',
    ContractNo: project.contract_no || '',
    CustomerName: project.partner_name || '',
    SiteAddress: project.site_address || '-',
    SolutionName: solution.name || '',
    SolutionNote: solution.note || '',
    AcceptanceDate: formatDateVNLong(new Date()),
    TotalQuantity: formatMoneyVN(solution.total_quantity),
    TotalAmount: formatMoneyVN(totalAmount),
    AmountInWords: numberToVietnameseWords(totalAmount),
    CreatedByName: solution.created_by_name || '',
  };
}

// Gia tri token CAP TUNG DONG thiet bi (prefix "Item." trong template_html) - khac
// buildStockIssueItemTokenValues o cho khong co chiet khau (giai phap nghiem thu khong co khai
// niem nay), unit_price/line_total da tinh san o backend (serializeSolution() trong
// projectAcceptanceSolutions.routes.js, binh quan gia quyen theo gia ban).
function buildAcceptanceSolutionItemTokenValues(item, index) {
  return {
    Stt: String(index + 1),
    ProductCode: item.product_code,
    ProductName: item.product_name,
    Unit: item.unit,
    Quantity: formatMoneyVN(item.quantity),
    UnitPrice: formatMoneyVN(item.unit_price),
    LineTotal: formatMoneyVN(item.line_total),
  };
}

// ==== Render engine string-based (thay DOM-walk cu) ====

function escapeHtml(value) {
  const text = value === undefined || value === null ? '' : String(value);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const TOKEN_PATTERN = /\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g;
const CONDITIONAL_BLOCK_PATTERN = /<!--\s*if:([A-Za-z0-9_.]+)\s*-->([\s\S]*?)<!--\s*endif\s*-->/g;
const ITEMS_BLOCK_PATTERN = /<!--\s*items:start\s*-->([\s\S]*?)<!--\s*items:end\s*-->/;

// Thay toan bo {{Key}} trong 1 doan HTML bang gia tri da escape tu `values`. Token khong co trong
// `values` duoc thay bang chuoi rong (khong phai loi render - viec bat token la khong hop le da
// lam o buoc validate luc Luu, xem backend/routes/printTemplates.routes.js).
function substituteTokens(html, values) {
  return html.replace(TOKEN_PATTERN, (match, key) => escapeHtml(values[key]));
}

// Boc dieu kien <!-- if:KEY -->...<!-- endif --> - giu noi dung neu gia tri KEY truthy (khac
// rong/0/undefined), xoa ca khoi neu khong. Chi 1 cap, khong ho tro long nhau (dung muc hien tai
// cua data-token-line cu).
function applyConditionalBlocks(html, values) {
  return html.replace(CONDITIONAL_BLOCK_PATTERN, (match, key, inner) => (values[key] ? inner : ''));
}

// Tach + lap khoi <!-- items:start -->...<!-- items:end --> theo so luong `items`, thay token
// {{Item.Xxx}} rieng cho tung dong bang `itemTokenBuilder(item, index)`. Neu template khong co
// khoi nay (vd loai phieu hasItems=false) thi tra nguyen ham khong doi.
function expandItemsBlock(html, items, itemTokenBuilder) {
  const match = html.match(ITEMS_BLOCK_PATTERN);
  if (!match) return html;

  const rowTemplate = match[1];
  const list = Array.isArray(items) ? items : [];
  const rowsHtml = list
    .map((item, index) => {
      const itemValues = itemTokenBuilder(item, index);
      // Token cap dong dung prefix "Item." trong template (vd {{Item.ProductName}}) nhung
      // itemTokenBuilder tra ve key KHONG co prefix (vd ProductName) - ghep lai truoc khi thay.
      const prefixedValues = {};
      Object.keys(itemValues).forEach((key) => {
        prefixedValues[`Item.${key}`] = itemValues[key];
      });
      return substituteTokens(rowTemplate, prefixedValues);
    })
    .join('');

  return html.replace(ITEMS_BLOCK_PATTERN, rowsHtml);
}

// Ham render trung tam - dung CHUNG cho ca khung xem truoc (print-template-edit.js) lan trang in
// that (print-issue.js/print-project-advance.js). `templateHtml` la template_html tho tu DB (co
// the chua <style> nhung + token + khoi dieu kien/lap). `tokenValues` la object token CAP TAI
// LIEU da tinh san (xem buildStockIssueTokenValues/buildProjectAdvanceTokenValues). `items` +
// `itemTokenBuilder` chi can khi loai phieu co bang san pham (hasItems=true).
function renderPrintTemplate({ templateHtml, tokenValues, items, itemTokenBuilder }) {
  let html = templateHtml || '';
  html = applyConditionalBlocks(html, tokenValues);
  if (itemTokenBuilder) {
    html = expandItemsBlock(html, items, itemTokenBuilder);
  }
  html = substituteTokens(html, tokenValues);
  return html;
}

// ==== Du lieu mau CO DINH (khong goi API) dung cho khung xem truoc o trang chinh sua mau in ====

const SAMPLE_STOCK_ISSUE_DATA = {
  company: {
    company_name: 'Công ty TNHH Minh Đạt',
    address: '123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    phones: ['0901 234 567', '028 3822 1234'],
    tax_code: '0312345678',
    email: 'info@minhdat.vn',
    website: 'www.minhdat.vn',
    bank_name: 'Vietcombank',
    bank_branch: 'PGD An Nhơn',
    bank_account_number: '0071001234567',
    bank_account_holder: 'CÔNG TY TNHH MINH ĐẠT',
    print_note: 'Hàng đã xuất kho miễn đổi trả, vui lòng kiểm tra kỹ trước khi ký nhận.',
  },
  issue: {
    code: 'PX000123',
    created_at: '2026-08-05 09:30:00',
    partner_name: 'Nguyễn Văn A',
    partner_address: '45 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
    partner_phone: '0909 888 777',
    project_name: 'Công trình Villa Kỳ Duyên',
    note: 'Giao hàng trong giờ hành chính',
    created_by_name: 'Trần Thị B',
    total_amount: 19030000,
    items: [
      { product_code: 'SP001', product_name: 'Xi măng Hà Tiên PCB40', unit: 'bao', quantity: 100, unit_price: 95000, discount_percent: 0 },
      { product_code: 'SP002', product_name: 'Gạch ống 8x8x18', unit: 'viên', quantity: 2000, unit_price: 1200, discount_percent: 5 },
      { product_code: 'SP003', product_name: 'Sắt phi 10', unit: 'cây', quantity: 50, unit_price: 145000, discount_percent: 0 },
    ],
  },
};

const SAMPLE_PROJECT_ADVANCE_DATA = {
  company: {
    company_name: 'Công ty TNHH Kỹ Thuật Công Nghệ Minh Đạt',
    bank_name: 'ACB',
    bank_branch: 'PGD Tân Chánh Hiệp',
    bank_account_number: '204.020.649',
    bank_account_holder: 'CÔNG TY TNHH KỸ THUẬT CÔNG NGHỆ MINH ĐẠT',
  },
  project: {
    contract_no: 'MD/HDMB060426',
    contract_date: '2026-04-06',
    partner_name: 'Công ty Cổ Phần Kiến Trúc Xây Dựng Kim Long',
    site_address: 'Khu Dân Cư Saigon Mystery Villas, P. Bình Trưng, Tp. Hồ Chí Minh',
  },
  milestone: {
    sort_order: 1,
    percent: 30,
    amount: 78357435,
    recipient_title: 'anh',
    recipient_name: 'Nguyễn Văn A',
  },
};

const SAMPLE_ACCEPTANCE_SOLUTION_DATA = {
  company: SAMPLE_STOCK_ISSUE_DATA.company,
  project: {
    name: 'Nhà máy Thành Phát – Khu B',
    contract_no: 'MD/HDMB060426',
    partner_name: 'Công ty Cổ Phần Kiến Trúc Xây Dựng Kim Long',
    site_address: 'Khu Dân Cư Saigon Mystery Villas, P. Bình Trưng, Tp. Hồ Chí Minh',
  },
  solution: {
    name: 'Giải pháp Camera an ninh',
    note: 'Khu vực nhà xưởng và cổng bảo vệ',
    total_quantity: 62,
    total_value: 132000000,
    created_by_name: 'Trần Thị B',
    items: [
      { product_code: 'SP00045', product_name: 'Camera IP 4MP Dome', unit: 'Cái', quantity: 40, unit_price: 1850000, line_total: 74000000 },
      { product_code: 'SP00046', product_name: 'Camera IP 4MP Thân trụ', unit: 'Cái', quantity: 20, unit_price: 1650000, line_total: 33000000 },
      { product_code: 'SP00052', product_name: 'Đầu ghi hình NVR 32 kênh', unit: 'Cái', quantity: 2, unit_price: 12500000, line_total: 25000000 },
    ],
  },
};

// ---- Registry tong quat: loai phieu -> du lieu mau + ham tinh token - de print-template-edit.js
// dung CHUNG 1 logic cho moi loai phieu (khong hardcode rieng tung loai), them mau in moi sau nay
// chi can them 1 entry o day. ----
const PRINT_TYPE_HANDLERS = {
  stock_issue: {
    sampleData: SAMPLE_STOCK_ISSUE_DATA,
    buildTokenValues: (data) => buildStockIssueTokenValues(data.issue, data.company),
    items: SAMPLE_STOCK_ISSUE_DATA.issue.items,
    itemTokenBuilder: buildStockIssueItemTokenValues,
  },
  project_payment_advance: {
    sampleData: SAMPLE_PROJECT_ADVANCE_DATA,
    buildTokenValues: (data) => buildProjectAdvanceTokenValues(data.project, data.milestone, data.company),
    items: null,
    itemTokenBuilder: null,
  },
  acceptance_solution: {
    sampleData: SAMPLE_ACCEPTANCE_SOLUTION_DATA,
    buildTokenValues: (data) => buildAcceptanceSolutionTokenValues(data.project, data.solution, data.company),
    items: SAMPLE_ACCEPTANCE_SOLUTION_DATA.solution.items,
    itemTokenBuilder: buildAcceptanceSolutionItemTokenValues,
  },
  // "Phieu xac nhan don hang" (2026-08-20) - tai dung DUNG du lieu mau + ham build token cua
  // stock_issue (khong viet moi), vi day cung dung 1 bo token voi phieu xuat kho.
  order_confirmation: {
    sampleData: SAMPLE_STOCK_ISSUE_DATA,
    buildTokenValues: (data) => buildStockIssueTokenValues(data.issue, data.company),
    items: SAMPLE_STOCK_ISSUE_DATA.issue.items,
    itemTokenBuilder: buildStockIssueItemTokenValues,
  },
};
