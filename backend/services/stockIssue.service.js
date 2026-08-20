// Service tao phieu xuat kho: insert phieu + items trong 1 transaction duy nhat.
//
// Quy trinh 2 buoc (2026-08-20, theo yeu cau nguoi dung - dung nguyen xi pattern da co cua
// "Tra hang" migration 033, xem stockReturn.service.js): "Luu tam" (status='cho_tru_kho') chi ghi
// lai thong tin da nhap (phieu + items), KHONG dong stock_movements/debt_ledger/cash_vouchers -
// phieu con sua duoc (updateStockIssue). "Xuat kho" (createStockIssue voi isDraft=false, hoac
// processStockIssue() cho phieu da luu truoc do) moi thuc su ghi cac dong do qua
// applyIssueProcessing() - dung NGUYEN VEN logic nghiep vu cu (validate ton kho, tru FIFO/binh
// quan gia quyen, ghi cong no/so quy), chi doi thoi diem kich hoat. Sau khi xuat kho thanh cong,
// status='da_tru_kho' - khoa vinh vien, khong con sua duoc.
//
// Doc warehouse_settings.allow_negative_stock de quyet dinh chan cung hay cho phep xuat khi
// ton kho khong du (xem CLAUDE.md muc Key Constraints, docs/DECISIONS.md) - CHI ap dung luc
// applyIssueProcessing() (xuat kho that), KHONG chan luc Luu tam.

const db = require('../db/database');
const { getCostingMethod, consumeStockForIssue } = require('./costing.service');
const { recordDebtFromDocument } = require('./debt.service');
const { recordAutoVoucher } = require('./cashVoucher.service');

class ServiceError extends Error {}

// BAT BUOC loc is_return=0 - stock_issues dung CHUNG bang voi "Tra hang nha cung cap"
// (is_return=1, ma rieng "TN..."). Neu khong loc, cung loi "PN000NaN" nhu generateReceiptCode()
// se xay ra o day thanh "PX000NaN" - sua cung luc, 2026-08-07.
function generateIssueCode() {
  const row = db.prepare('SELECT code FROM stock_issues WHERE is_return = 0 ORDER BY id DESC LIMIT 1').get();
  const lastNumber = row ? parseInt(row.code.replace('PX', ''), 10) : 0;
  return `PX${String(lastNumber + 1).padStart(6, '0')}`;
}

function getCurrentStock(productId) {
  const row = db
    .prepare(`
      SELECT COALESCE(SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE -quantity END), 0) AS stock
      FROM stock_movements
      WHERE product_id = ?
    `)
    .get(productId);
  return row.stock;
}

function isNegativeStockAllowed() {
  const row = db.prepare("SELECT value FROM warehouse_settings WHERE key = 'allow_negative_stock'").get();
  return Boolean(row) && row.value === '1';
}

function validatePartnerAndProject(partnerId, paymentStatus, projectId) {
  if (paymentStatus === 'cong_no' && !partnerId) {
    throw new ServiceError('Phieu xuat cong no phai chon khach hang');
  }
  if (projectId) {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      throw new ServiceError('Khong tim thay du an');
    }
  }
}

// Validate hinh dang du lieu tung dong (san pham ton tai + dang hoat dong) - ap dung luon o buoc
// "Luu tam" lan "Xuat kho". KHONG check ton kho du hay khong o day - cai do chi chan luc thuc su
// "Xuat kho" (applyIssueProcessing), de "Luu tam" luon thanh cong voi bat ky so lieu nao.
function validateItemsShape(items) {
  items.forEach((item) => {
    const product = db.prepare('SELECT id, is_active FROM products WHERE id = ?').get(item.productId);
    if (!product) {
      throw new ServiceError(`San pham khong ton tai: id=${item.productId}`);
    }
    if (!product.is_active) {
      throw new ServiceError(`San pham id=${item.productId} da ngung kinh doanh, khong the dung trong phieu moi`);
    }
  });
}

// Thuc hien XUAT KHO THAT SU cho 1 phieu da co san trong DB (dung chung cho createStockIssue
// {isDraft:false} va processStockIssue()) - doc lai phieu + items TU DATABASE (khong nhan tham
// so), vi phieu co the vua duoc sua qua updateStockIssue() truoc do, luon phai dung du lieu moi
// nhat. Dung dung `created_at` da luu tren phieu ("Thoi gian xuat" nguoi dung chon, khong phai
// luc bam Xuat kho that) cho ca stock_movements/cong no/so quy - nhat quan voi hanh vi goc (von
// da dung issueDate tuy chinh) va giong het cach receiptDate/issueDate anh huong FIFO o phieu
// nhap/xuat thuong. Rieng gia von tieu thu (consumeStockForIssue) luon tinh theo TON KHO HIEN TAI
// (luc xuat kho that), khong phai luc Luu tam - dung nguyen tac du lieu moi nhat.
function applyIssueProcessing(issueId, { createdBy }) {
  const issue = db.prepare('SELECT * FROM stock_issues WHERE id = ?').get(issueId);
  const items = db.prepare('SELECT * FROM stock_issue_items WHERE issue_id = ?').all(issueId);

  const allowNegative = isNegativeStockAllowed();
  const costingMethod = getCostingMethod();

  if (!allowNegative) {
    items.forEach((item) => {
      const currentStock = getCurrentStock(item.product_id);
      if (currentStock < item.quantity) {
        throw new ServiceError(
          `San pham id=${item.product_id} khong du ton kho de xuat (con ${currentStock}, can xuat ${item.quantity})`
        );
      }
    });
  }

  const insertMovement = db.prepare(
    "INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, unit_cost, created_at) VALUES (?, 'out', ?, 'issue', ?, ?, ?)"
  );

  // totalAmount (dung de ghi cong no/so quy) tinh theo GIA SAU CHIET KHAU (net) - giong het cach
  // tinh o stockReceipt.service.js. unit_cost cua movement (gia von xuat kho, tu costing.service)
  // khong lien quan chiet khau ban hang - do la 2 khai niem khac nhau (gia von vs gia ban).
  let totalAmount = 0;
  items.forEach((item) => {
    const unitCost = consumeStockForIssue(item.product_id, item.quantity, costingMethod);
    insertMovement.run(item.product_id, item.quantity, issueId, unitCost, issue.created_at);
    totalAmount += item.quantity * item.unit_price * (1 - item.discount_percent / 100);
  });

  if (issue.payment_status === 'cong_no') {
    recordDebtFromDocument({
      partnerId: issue.partner_id,
      amount: totalAmount,
      referenceType: 'issue',
      referenceId: issueId,
      createdBy,
      projectId: issue.project_id,
    });
  } else {
    // Thu tien ngay (khong cong no) - tien mat/chuyen khoan THAT vao cong ty ngay luc xuat hang,
    // tu dong tao 1 phieu Thu trong So quy (migration 035). partnerId co the null (khach le
    // khong chon doi tac) - van tao phieu, chi de counterpart_name trong.
    const partner = issue.partner_id ? db.prepare('SELECT name FROM partners WHERE id = ?').get(issue.partner_id) : null;
    recordAutoVoucher({
      type: 'thu',
      systemKey: 'thu_ban_hang',
      partnerId: issue.partner_id,
      counterpartName: partner ? partner.name : '',
      amount: totalAmount,
      note: `Xuất hàng bán - Phiếu ${issue.code}`,
      referenceType: 'stock_issue',
      referenceId: issueId,
      createdBy,
      voucherDate: issue.created_at,
    });
  }

  db.prepare("UPDATE stock_issues SET status = 'da_tru_kho' WHERE id = ?").run(issueId);
}

// items: [{ productId, quantity, unitPrice, discountPercent }]. isDraft=true (mac dinh false):
// chi "Luu tam" - phieu vao trang thai 'cho_tru_kho', chua dong gi vao stock_movements/
// debt_ledger/cash_vouchers. isDraft=false: tao va XUAT KHO NGAY (dung y het hanh vi cu, 1 buoc).
// adjustsType/adjustsId (tuy chon): xem chu thich tuong ung trong stockReceipt.service.js.
// issueDate (tuy chon, dang 'YYYY-MM-DD HH:MM:SS'): dung lam created_at that cho phieu - khong
// truyen thi dung thoi diem hien tai. projectId (tuy chon, migration 024): gan phieu xuat voi
// du an, tinh "da xuat" cho tab Vat tu.
function createStockIssue({ partnerId, createdBy, note, paymentStatus, items, adjustsType, adjustsId, issueDate, projectId, isDraft }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ServiceError('Phieu xuat phai co it nhat 1 dong san pham');
  }
  validatePartnerAndProject(partnerId, paymentStatus, projectId);
  validateItemsShape(items);

  const run = db.transaction(() => {
    const timestamp = issueDate || db.prepare("SELECT datetime('now') AS now").get().now;
    const code = generateIssueCode();

    // LUON insert voi status='cho_tru_kho', BAT KE isDraft co false hay khong - neu isDraft=false,
    // applyIssueProcessing() se tu doi thanh 'da_tru_kho' o CUOI (sau khi validate xong). Cung 1
    // code path duy nhat cho ca 2 luong, dung nguyen tac da ap dung o stockReturn.service.js
    // (tranh bug tu dem nham chinh phieu vua tao, du o day khong co rui ro do tuong tu vi validate
    // ton kho doc tu stock_movements chu khong tu stock_issues).
    const issueResult = db
      .prepare(
        "INSERT INTO stock_issues (code, partner_id, created_by, note, payment_status, adjusts_type, adjusts_id, created_at, project_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'cho_tru_kho')"
      )
      .run(code, partnerId || null, createdBy, note || '', paymentStatus, adjustsType || null, adjustsId || null, timestamp, projectId || null);
    const issueId = issueResult.lastInsertRowid;

    const insertItem = db.prepare(
      'INSERT INTO stock_issue_items (issue_id, product_id, quantity, unit_price, discount_percent) VALUES (?, ?, ?, ?, ?)'
    );
    items.forEach((item) => {
      insertItem.run(issueId, item.productId, item.quantity, item.unitPrice, item.discountPercent || 0);
    });

    if (!isDraft) {
      applyIssueProcessing(issueId, { createdBy });
    }

    return issueId;
  });

  const issueId = run();
  return db.prepare('SELECT * FROM stock_issues WHERE id = ?').get(issueId);
}

// Sua phieu dang 'cho_tru_kho' - thay toan bo thong tin + danh sach dong (xoa het items cu,
// insert lai items moi, don gian hon doi chieu tung dong). Chi ap dung duoc khi phieu CHUA xuat
// kho - dung nguyen pattern updateStockReturn().
function updateStockIssue(id, { partnerId, note, paymentStatus, items, issueDate, projectId }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ServiceError('Phieu xuat phai co it nhat 1 dong san pham');
  }
  validatePartnerAndProject(partnerId, paymentStatus, projectId);
  validateItemsShape(items);

  const run = db.transaction(() => {
    const existing = db.prepare('SELECT id, status, created_at FROM stock_issues WHERE id = ? AND is_return = 0').get(id);
    if (!existing) {
      throw new ServiceError('Khong tim thay phieu xuat kho');
    }
    if (existing.status !== 'cho_tru_kho') {
      throw new ServiceError('Phieu đã xuất kho, không thể sửa');
    }

    const timestamp = issueDate || existing.created_at;

    db.prepare('UPDATE stock_issues SET partner_id = ?, note = ?, payment_status = ?, created_at = ?, project_id = ? WHERE id = ?').run(
      partnerId || null,
      note || '',
      paymentStatus,
      timestamp,
      projectId || null,
      id
    );

    db.prepare('DELETE FROM stock_issue_items WHERE issue_id = ?').run(id);
    const insertItem = db.prepare(
      'INSERT INTO stock_issue_items (issue_id, product_id, quantity, unit_price, discount_percent) VALUES (?, ?, ?, ?, ?)'
    );
    items.forEach((item) => {
      insertItem.run(id, item.productId, item.quantity, item.unitPrice, item.discountPercent || 0);
    });

    return id;
  });

  const issueId = run();
  return db.prepare('SELECT * FROM stock_issues WHERE id = ?').get(issueId);
}

// "Xuat kho" cho 1 phieu da 'Luu tam' truoc do (nut rieng ngoai danh sach hoac trong modal sua) -
// chi ap dung duoc khi phieu dang 'cho_tru_kho'. Sau khi chay xong, phieu khoa vinh vien.
function processStockIssue(id, { createdBy }) {
  const run = db.transaction(() => {
    const existing = db.prepare('SELECT id, status FROM stock_issues WHERE id = ? AND is_return = 0').get(id);
    if (!existing) {
      throw new ServiceError('Khong tim thay phieu xuat kho');
    }
    if (existing.status !== 'cho_tru_kho') {
      throw new ServiceError('Phieu da duoc xuat kho truoc do');
    }

    applyIssueProcessing(id, { createdBy });
    return id;
  });

  const issueId = run();
  return db.prepare('SELECT * FROM stock_issues WHERE id = ?').get(issueId);
}

module.exports = { createStockIssue, updateStockIssue, processStockIssue, ServiceError };
