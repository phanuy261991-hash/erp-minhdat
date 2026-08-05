// Logic RENDER dung CHUNG giua trang in that (print-issue.js) va khung xem truoc cua trang
// chinh sua mau in (print-template-edit.js) - chi 1 noi tinh toan gia tri token + dung bang san
// pham, tranh 2 noi trien khai le nhau ve sau (migration 028, theo yeu cau nguoi dung 2026-08-05).

function formatMoneyVN(value) {
  return Number(value).toLocaleString('vi-VN');
}

function formatDateVN(sqliteDateTime) {
  const iso = sqliteDateTime.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Dinh dang dai "DD tháng MM năm YYYY" (dung cho Giay de nghi tam ung - migration 030) - nhan
// ca chuoi 'YYYY-MM-DD' (tu cot DATE trong DB, vd projects.contract_date) lan doi tuong Date
// (vd ngay in hom nay). Them "T00:00:00" khi parse chuoi de ep gio dia phuong, tranh lech 1 ngay
// do "YYYY-MM-DD" thuan bi trinh duyet hieu la nua dem UTC.
function formatDateVNLong(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(`${dateInput}T00:00:00`);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())} tháng ${pad(d.getMonth() + 1)} năm ${d.getFullYear()}`;
}

// Cac dong cong ty co the RONG (an ca dong neu khong co du lieu, xem token registry
// hideLineIfEmpty trong backend/config/printTemplateTokens.js) - dung chuoi da ghep san
// nhan+gia tri, giong het logic cu cua print-issue.js truoc migration 028.
function buildCompanyAddressLine(company) {
  return company.address ? `Địa chỉ: ${company.address}` : '';
}

function buildCompanyPhonesLine(company) {
  const phones = Array.isArray(company.phones) ? company.phones : [];
  return phones.length > 0 ? `Điện thoại: ${phones.join(' - ')}` : '';
}

function buildCompanyTaxCodeLine(company) {
  return company.tax_code ? `MST: ${company.tax_code}` : '';
}

function buildCompanyContactLine(company) {
  const parts = [];
  if (company.email) parts.push(`Email: ${company.email}`);
  if (company.website) parts.push(`Web: ${company.website}`);
  return parts.join(' - ');
}

function buildCompanyBankLine(company) {
  const parts = [];
  if (company.bank_account_number) {
    let line = `STK: ${company.bank_account_number}`;
    if (company.bank_name) line += ` - ${company.bank_name}`;
    if (company.bank_branch) line += ` (${company.bank_branch})`;
    parts.push(line);
  }
  if (company.bank_account_holder) parts.push(`Chủ TK: ${company.bank_account_holder}`);
  return parts.join(' - ');
}

// Dung cho ca phieu that (issue/company tu API) lan du lieu mau co dinh trong khung xem truoc.
function buildStockIssueTokenValues(issue, company) {
  return {
    company_name: company.company_name || '(Chưa cấu hình tên công ty)',
    company_address: buildCompanyAddressLine(company),
    company_phones: buildCompanyPhonesLine(company),
    company_tax_code: buildCompanyTaxCodeLine(company),
    company_contact: buildCompanyContactLine(company),
    company_bank_info: buildCompanyBankLine(company),
    issue_code: issue.code,
    issue_date: formatDateVN(issue.created_at),
    customer_name: issue.partner_name || 'Khách lẻ',
    customer_address: issue.partner_address || '-',
    customer_phone: issue.partner_phone || '-',
    project_name: issue.project_name || '',
    issue_note: issue.note || '',
    company_print_note: company.print_note && company.print_note.trim() ? company.print_note : '',
    created_by_name: issue.created_by_name || '',
  };
}

// Thay tung the <span data-token="..."> bang GIA TRI THAT dang text thuan (khong con class/nen/
// vien "chip" - chip mau xanh chi phuc vu luc dang soan thao trong print-template-edit.html, con
// ham nay dung cho ca khung xem truoc LAN ban in that nen phai ra dung "van ban binh thuong":
// khong nen, khong vien, mau chu mac dinh). An ca dong bao ngoai <... data-token-line="..."> neu
// gia tri rong (dung chung 1 attribute name voi token tuong ung).
function applyPrintTemplateTokens(root, values) {
  root.querySelectorAll('[data-token]').forEach((el) => {
    const key = el.dataset.token;
    const value = values[key];
    const text = value !== undefined && value !== null ? value : '';
    el.replaceWith(document.createTextNode(text));
  });
  root.querySelectorAll('[data-token-line]').forEach((el) => {
    const key = el.dataset.tokenLine;
    el.hidden = !values[key];
  });
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

// table_columns luu trong DB co the o 1 trong 2 dang: mang chuoi cu ["key",...] (tu migration
// 028, cac cot rong bang nhau) hoac mang object moi [{key,width},...] (tu migration 029, tu
// chinh duoc do rong). Ham nay luon tra ve dang object da chuan hoa, tu quy doi cot cu sang do
// rong deu nhau neu gap dinh dang cu - khong can migrate lai du lieu da luu truoc do.
function normalizeTableColumns(rawColumns) {
  const list = Array.isArray(rawColumns) ? rawColumns : [];
  const evenWidth = list.length > 0 ? Math.round((100 / list.length) * 10) / 10 : 0;
  return list
    .map((item) => {
      if (typeof item === 'string') return { key: item, width: evenWidth };
      const width = Number(item && item.width);
      return { key: item && item.key, width: width > 0 ? width : evenWidth };
    })
    .filter((c) => !!c.key);
}

// Gia tri tung cot bang san pham - key phai khop dung STOCK_ISSUE_TABLE_COLUMNS trong
// backend/config/printTemplateTokens.js.
const STOCK_ISSUE_TABLE_CELL_RENDERERS = {
  stt: (item, index) => String(index + 1),
  product_code: (item) => item.product_code,
  product_name: (item) => item.product_name,
  unit: (item) => item.unit,
  quantity: (item) => formatMoneyVN(item.quantity),
  unit_price: (item) => formatMoneyVN(item.unit_price),
  discount_percent: (item) => (item.discount_percent ? `${item.discount_percent}%` : '-'),
  net_unit_price: (item) => formatMoneyVN(Math.round(item.unit_price * (1 - (item.discount_percent || 0) / 100))),
  line_total: (item) => formatMoneyVN(Math.round(item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100))),
};

// Dung lai cau truc + class CSS cua .print-table hien co (khong doi gi ve mat hien thi so voi
// ban tinh truoc migration 028 khi du 9 cot mac dinh duoc bat theo dung thu tu/do rong goc).
// `columns` la table_columns THO tu DB (chua chuan hoa - co the o dang mang chuoi cu hoac mang
// object moi, xem normalizeTableColumns). `table-layout:fixed` (style.css) khien <colgroup> duoc
// ton trong tuyet doi - chu dai se tu xuong dong trong dung do rong cot da chinh, thay vi tu keo
// gian cot (dung nhu yeu cau nguoi dung: kiem soat duoc do rong, chap nhan xuong dong neu hep).
function renderPrintTable({ columns, columnsMeta, items, totalAmount, showAmountInWords }) {
  const metaByKey = {};
  columnsMeta.forEach((c) => {
    metaByKey[c.key] = c;
  });
  const normalized = normalizeTableColumns(columns).filter(
    (c) => metaByKey[c.key] && STOCK_ISSUE_TABLE_CELL_RENDERERS[c.key]
  );

  const totalWidth = normalized.reduce((sum, c) => sum + c.width, 0) || 1;
  const colgroupCells = normalized.map((c) => `<col style="width:${((c.width / totalWidth) * 100).toFixed(2)}%">`).join('');

  const theadCells = normalized
    .map((c) => `<th${metaByKey[c.key].numeric ? ' class="print-num"' : ''}>${metaByKey[c.key].label}</th>`)
    .join('');

  const bodyRows = items
    .map((item, index) => {
      const cells = normalized
        .map((c) => {
          const value = STOCK_ISSUE_TABLE_CELL_RENDERERS[c.key](item, index);
          return `<td${metaByKey[c.key].numeric ? ' class="print-num"' : ''}>${value}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const colspan = Math.max(normalized.length - 1, 1);
  const amountWordsRow = showAmountInWords
    ? `<tr>
        <td colspan="${normalized.length}" class="print-amount-words">Số tiền viết bằng chữ: <strong>${numberToVietnameseWords(totalAmount)}</strong></td>
      </tr>`
    : '';

  return `<table class="print-table">
    <colgroup>${colgroupCells}</colgroup>
    <thead><tr>${theadCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="${colspan}" class="print-total-label">Tổng cộng</td>
        <td class="print-total-value">${formatMoneyVN(Math.round(totalAmount))}</td>
      </tr>
      ${amountWordsRow}
    </tfoot>
  </table>`;
}

// Du lieu mau CO DINH (khong goi API) dung cho khung xem truoc o trang chinh sua mau in - tranh
// phu thuoc phai co san 1 phieu xuat that + tranh lo du lieu that khi demo mau in.
const SAMPLE_STOCK_ISSUE_DATA = {
  company: {
    company_name: 'Công ty TNHH Minh Đạt',
    address: '123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    phones: ['0901 234 567', '028 3822 1234'],
    tax_code: '0312345678',
    email: 'info@minhdat.vn',
    website: 'www.minhdat.vn',
    bank_name: 'Vietcombank',
    bank_branch: 'Chi nhánh TP.HCM',
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

// ---- Giay de nghi tam ung (migration 030) - mau in THU 2, khong co bang san pham ----

function buildBankNameBranchLine(company) {
  if (!company.bank_name) return '';
  return company.bank_branch ? `${company.bank_name} – Chi nhánh ${company.bank_branch}` : company.bank_name;
}

// Dung cho ca phieu that (project/milestone/company tu API) lan du lieu mau co dinh trong khung
// xem truoc. print_date luon la NGAY IN THAT (luc bam in/xem truoc), khong phai ngay tao dot
// thanh toan trong DB - dung yeu cau nguoi dung.
function buildProjectAdvanceTokenValues(project, milestone, company) {
  return {
    company_name: company.company_name || '(Chưa cấu hình tên công ty)',
    contract_no: project.contract_no || '',
    contract_date: project.contract_date ? formatDateVNLong(project.contract_date) : '',
    customer_name: project.partner_name || '',
    site_address: project.site_address || '-',
    advance_number: milestone.sort_order !== null && milestone.sort_order !== undefined ? String(milestone.sort_order) : '',
    advance_percent: milestone.percent !== null && milestone.percent !== undefined ? String(milestone.percent) : '',
    advance_amount: `${formatMoneyVN(Math.round(milestone.amount))} VNĐ`,
    bank_account_holder: company.bank_account_holder || '',
    bank_account_number: company.bank_account_number || '',
    bank_name_branch: buildBankNameBranchLine(company),
    print_date: `ngày ${formatDateVNLong(new Date())}`,
  };
}

// Du lieu mau CO DINH cho khung xem truoc - phong theo dung so lieu trong mau PDF nguoi dung
// gui tham khao (DNTT LAN 1 ANH QUYNH.pdf).
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
  },
};

// ---- Registry tong quat: loai phieu -> du lieu mau + ham tinh token - de print-template-edit.js
// dung CHUNG 1 logic cho moi loai phieu (khong hardcode rieng tung loai), them mau in moi sau
// nay (vd Phieu nhap kho) chi can them 1 entry o day. ----
const PRINT_TYPE_HANDLERS = {
  stock_issue: {
    sampleData: SAMPLE_STOCK_ISSUE_DATA,
    buildTokenValues: (data) => buildStockIssueTokenValues(data.issue, data.company),
  },
  project_payment_advance: {
    sampleData: SAMPLE_PROJECT_ADVANCE_DATA,
    buildTokenValues: (data) => buildProjectAdvanceTokenValues(data.project, data.milestone, data.company),
  },
};
