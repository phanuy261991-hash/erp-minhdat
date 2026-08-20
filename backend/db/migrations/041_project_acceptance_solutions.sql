-- Migration 041: "Nghiem thu theo giai phap" (2026-08-19, theo yeu cau nguoi dung - xem
-- docs/handoff/HANDOFF-NghiemThu-2026-08-19-v2.md cho day du 4 gia dinh ky thuat da chot qua
-- AskUserQuestion truoc khi code). Nhom thiet bi DA XUAT cho du an vao tung "giai phap" da ky voi
-- khach hang, phuc vu lap bien ban nghiem thu - KHONG tao phieu xuat kho moi, KHONG doi ton kho.
--
-- Quan he nhieu-nhieu product<->solution (gia dinh 1, da chot: 1 thiet bi duoc chia vao NHIEU
-- giai phap khac nhau) - UNIQUE(solution_id, product_id) de 1 san pham chi co dung 1 dong trong
-- cung 1 giai phap (sua thi UPDATE lai dong do qua xoa-roi-them-lai trong 1 transaction, khong
-- insert them dong trung).
CREATE TABLE project_acceptance_solutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    name TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE project_acceptance_solution_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    solution_id INTEGER NOT NULL REFERENCES project_acceptance_solutions(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL,
    UNIQUE(solution_id, product_id)
);

-- Mau in moi "Bien ban nghiem thu theo giai phap" (dung chung co che "Mau in" - migration 040,
-- khung HTML/CSS that + token {{TenBien}}) - noi dung khoi tao giong het file "factory default"
-- backend/config/print-template-defaults/acceptance_solution.html tai thoi diem tao migration nay
-- (khong can dong bo lai ve sau, dung nguyen tac da ap dung o migration 028/030).
INSERT INTO print_templates (type, name, orientation, template_html) VALUES (
'acceptance_solution',
'Biên bản nghiệm thu theo giải pháp',
'portrait',
'<style>
  .tpl-page { max-width: 800px; margin: 0 auto; background: #fff; border: 1px solid #E4ECFC; border-radius: 8px; padding: 40px; font-size: 14px; color: #000; }
  @media print {
    .tpl-page { max-width: 100%; border: none; border-radius: 0; box-shadow: none; padding: 12mm; }
  }
  .tpl-header { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 16px; border-bottom: 2px solid #0F172A; margin-bottom: 20px; }
  .tpl-company-name { font-size: 16px; font-weight: 700; margin: 0 0 4px; }
  .tpl-header p { margin: 2px 0; font-size: 13px; font-weight: 500; }
  .tpl-doc-title { text-align: right; }
  .tpl-doc-title h1 { font-size: 20px; letter-spacing: 0.04em; margin: 0 0 6px; }
  .tpl-doc-title p { margin: 2px 0; font-size: 13px; }
  .tpl-project p { margin: 4px 0; font-size: 14px; }
  .tpl-table { width: 100%; border-collapse: collapse; margin: 20px 0 24px; table-layout: fixed; }
  .tpl-table th, .tpl-table td { border: 1px solid #0F172A; padding: 8px 10px; font-size: 13px; text-align: left; overflow-wrap: break-word; word-break: break-word; }
  .tpl-table th { background: #F1F5FD; font-weight: 600; text-align: center; }
  .tpl-table td.tpl-num { text-align: right; }
  .tpl-table td.tpl-total-label { text-align: right; font-weight: 600; }
  .tpl-table td.tpl-total-value { text-align: right; font-weight: 700; font-size: 15px; }
  .tpl-amount-words { font-style: italic; font-size: 13px; }
  .tpl-signatures { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
  .tpl-signatures > div { width: 45%; }
  .tpl-signatures p { margin: 2px 0; }
  .tpl-sign-hint { font-size: 12px; color: #64748B; font-style: italic; }
  .tpl-sign-name { margin-top: 60px; font-weight: 600; }
</style>

<div class="tpl-page">
<div class="tpl-header">
  <div>
    <p class="tpl-company-name">{{CompanyName}}</p>
    <!-- if:CompanyAddress -->
    <p>Địa chỉ: {{CompanyAddress}}</p>
    <!-- endif -->
    <!-- if:CompanyPhones -->
    <p>Điện thoại: {{CompanyPhones}}</p>
    <!-- endif -->
    <!-- if:CompanyTaxCode -->
    <p>MST: {{CompanyTaxCode}}</p>
    <!-- endif -->
  </div>
  <div class="tpl-doc-title">
    <h1>BIÊN BẢN NGHIỆM THU</h1>
    <p>Giải pháp: <strong>{{SolutionName}}</strong></p>
    <p>Ngày: {{AcceptanceDate}}</p>
  </div>
</div>
<div class="tpl-project">
  <p>Khách hàng: <strong>{{CustomerName}}</strong></p>
  <p>Công trình: {{ProjectName}}</p>
  <p>Địa chỉ: {{SiteAddress}}</p>
  <!-- if:ContractNo -->
  <p>Hợp đồng số: {{ContractNo}}</p>
  <!-- endif -->
  <!-- if:SolutionNote -->
  <p>Ghi chú: {{SolutionNote}}</p>
  <!-- endif -->
</div>

<table class="tpl-table">
  <colgroup>
    <col style="width:6%"><col style="width:14%"><col style="width:34%"><col style="width:10%">
    <col style="width:12%"><col style="width:12%"><col style="width:12%">
  </colgroup>
  <thead>
    <tr>
      <th>STT</th><th>Mã sản phẩm</th><th>Tên hàng hóa</th><th>ĐVT</th>
      <th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th>
    </tr>
  </thead>
  <tbody>
    <!-- items:start -->
    <tr>
      <td class="tpl-num">{{Item.Stt}}</td>
      <td>{{Item.ProductCode}}</td>
      <td>{{Item.ProductName}}</td>
      <td>{{Item.Unit}}</td>
      <td class="tpl-num">{{Item.Quantity}}</td>
      <td class="tpl-num">{{Item.UnitPrice}}</td>
      <td class="tpl-num">{{Item.LineTotal}}</td>
    </tr>
    <!-- items:end -->
  </tbody>
  <tfoot>
    <tr>
      <td colspan="6" class="tpl-total-label">Tổng cộng</td>
      <td class="tpl-total-value">{{TotalAmount}}</td>
    </tr>
    <tr>
      <td colspan="7" class="tpl-amount-words">Số tiền viết bằng chữ: <strong>{{AmountInWords}}</strong></td>
    </tr>
  </tfoot>
</table>

<div class="tpl-signatures">
  <div>
    <p>Bên giao</p>
    <p class="tpl-sign-hint">(Ký, ghi rõ họ tên)</p>
    <p class="tpl-sign-name">{{CreatedByName}}</p>
  </div>
  <div>
    <p>Bên nhận</p>
    <p class="tpl-sign-hint">(Ký, ghi rõ họ tên)</p>
  </div>
</div>
</div>'
);
