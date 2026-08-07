// Service "Tra hang nha cung cap" (migration 034) - doi xung "Tra hang xuat"
// (stockReturn.service.js) nhung theo CHIEU NGUOC LAI: tai dung stock_issues/stock_issue_items
// (khong tao bang rieng, cung ly do CHECK constraint - xem docs/DECISIONS.md), hang tra lam
// GIAM ton kho (movement_type='out', dung consumeStockForIssue() nhu phieu xuat thuong) va GIAM
// cong no PHAI TRA nha cung cap.
//
// Quy trinh 2 buoc giong het "Tra hang xuat": "Luu" (status='cho_tru_kho') chi ghi thong tin,
// "Tru kho" (createSupplierReturn voi process=true, hoac processSupplierReturn() cho phieu da
// luu truoc do) moi thuc su tru ton kho that + ghi giam cong no qua applyProcessing().

const db = require('../db/database');
const { getCostingMethod, consumeStockForIssue } = require('./costing.service');
const { recordReturnCredit } = require('./debt.service');

class ServiceError extends Error {}

function generateSupplierReturnCode() {
  const row = db.prepare("SELECT code FROM stock_issues WHERE is_return = 1 ORDER BY id DESC LIMIT 1").get();
  const lastNumber = row ? parseInt(row.code.replace('TN', ''), 10) : 0;
  return `TN${String(lastNumber + 1).padStart(6, '0')}`;
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

// "Da nhap"/"Da tra"/"Con lai co the tra" cho 1 NCC + 1 san pham - tinh on-the-fly, khong luu.
// CHI tinh cac phieu tra DA 'da_tru_kho' vao "da tra" (giong het getReturnReference() ben
// stockReturn.service.js) - phieu con 'cho_tru_kho' chua chac chan se duoc duyet.
function getSupplierReturnReference(partnerId, productId) {
  const receivedRow = db
    .prepare(`
      SELECT COALESCE(SUM(ri.quantity), 0) AS qty
      FROM stock_receipt_items ri
      JOIN stock_receipts r ON r.id = ri.receipt_id
      WHERE r.partner_id = ? AND r.is_return = 0 AND ri.product_id = ?
    `)
    .get(partnerId, productId);

  const returnedRow = db
    .prepare(`
      SELECT COALESCE(SUM(ii.quantity), 0) AS qty
      FROM stock_issue_items ii
      JOIN stock_issues i ON i.id = ii.issue_id
      WHERE i.partner_id = ? AND i.is_return = 1 AND i.status = 'da_tru_kho' AND ii.product_id = ?
    `)
    .get(partnerId, productId);

  const receivedQuantity = receivedRow.qty;
  const returnedQuantity = returnedRow.qty;
  return { receivedQuantity, returnedQuantity, remainingReturnable: receivedQuantity - returnedQuantity };
}

// Danh sach cac gia nhap PHAN BIET tung mua tu dung NCC nay cho dung san pham nay (chi tinh
// phieu nhap THUONG, is_return=0) - dung de tu dien/cho nguoi dung chon gia khi lap phieu tra
// (theo yeu cau nguoi dung: 1 gia thi tu dien luon, >=2 gia thi hien cho chon).
function getSupplierPrices(partnerId, productId) {
  const rows = db
    .prepare(`
      SELECT DISTINCT ri.unit_price
      FROM stock_receipt_items ri
      JOIN stock_receipts r ON r.id = ri.receipt_id
      WHERE r.partner_id = ? AND r.is_return = 0 AND ri.product_id = ?
      ORDER BY ri.unit_price ASC
    `)
    .all(partnerId, productId);
  return rows.map((r) => r.unit_price);
}

function validatePartner(partnerId) {
  const partner = db.prepare('SELECT id, type FROM partners WHERE id = ?').get(partnerId);
  if (!partner) {
    throw new ServiceError('Khong tim thay nha cung cap');
  }
  if (partner.type !== 'nha_cung_cap') {
    throw new ServiceError('Doi tac phai la nha cung cap de lap phieu tra hang nha cung cap');
  }
}

// Validate hinh dang du lieu tung dong (san pham ton tai, so luong > 0) - ap dung ca luc "Luu"
// lan "Tru kho". KHONG check "con lai co the tra"/ton kho o day - chi chan luc thuc su "Tru kho".
function validateItemsShape(items) {
  items.forEach((item) => {
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(item.productId);
    if (!product) {
      throw new ServiceError(`San pham khong ton tai: id=${item.productId}`);
    }
    if (!(item.quantity > 0)) {
      throw new ServiceError('So luong tra lai phai lon hon 0');
    }
  });
}

function validateRemaining(partnerId, items) {
  const quantityByProduct = new Map();
  items.forEach((item) => {
    quantityByProduct.set(item.product_id, (quantityByProduct.get(item.product_id) || 0) + item.quantity);
  });

  for (const [productId, totalQuantity] of quantityByProduct) {
    const { remainingReturnable } = getSupplierReturnReference(partnerId, productId);
    if (totalQuantity > remainingReturnable) {
      throw new ServiceError(
        `Số lượng trả lại vượt quá số đã nhập còn có thể trả (còn lại: ${remainingReturnable})`
      );
    }
  }
}

// Thuc hien TRU KHO THAT SU cho 1 phieu da co san trong DB (dung chung cho createSupplierReturn
// {process:true} va processSupplierReturn()) - doc lai items TU DATABASE (khong nhan tham so),
// vi phieu co the vua duoc sua qua updateSupplierReturn() truoc do.
function applyProcessing(issueId, partnerId, createdBy, timestamp) {
  const items = db
    .prepare('SELECT id, product_id, quantity, unit_price FROM stock_issue_items WHERE issue_id = ?')
    .all(issueId);

  validateRemaining(partnerId, items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })));

  // Kiem tra ton kho THAT SU du de tra (khac "da nhap con lai" o tren - day la kiem tra vat ly,
  // giong het nguyen tac phieu xuat thuong: chan cung mac dinh, cho phep am neu bat
  // allow_negative_stock). Chan tai day (luc Tru kho), khong chan luc Luu.
  if (!isNegativeStockAllowed()) {
    items.forEach((item) => {
      const currentStock = getCurrentStock(item.product_id);
      if (currentStock < item.quantity) {
        throw new ServiceError(
          `San pham id=${item.product_id} khong du ton kho de tra (con ${currentStock}, can tra ${item.quantity})`
        );
      }
    });
  }

  const costingMethod = getCostingMethod();
  const insertMovement = db.prepare(
    "INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, unit_cost, created_at) VALUES (?, 'out', ?, 'issue', ?, ?, ?)"
  );

  let totalCredit = 0;
  items.forEach((item) => {
    // Gia von xuat (unit_cost cua movement) tinh qua dung co che FIFO/binh quan gia quyen dang
    // dung cho phieu xuat thuong - KHAC "Gia nhap" (item.unit_price, dung tinh cong no giam).
    const unitCost = consumeStockForIssue(item.product_id, item.quantity, costingMethod);
    insertMovement.run(item.product_id, item.quantity, issueId, unitCost, timestamp);
    totalCredit += item.quantity * item.unit_price;
  });

  // Giam cong no phai tra NCC tuong ung gia tri hang tra (Gia nhap x So luong tra) - bo qua neu
  // =0 (debt_ledger.amount co CHECK > 0).
  if (totalCredit > 0) {
    recordReturnCredit({ partnerId, amount: totalCredit, referenceType: 'issue', referenceId: issueId, createdBy, projectId: null });
  }

  db.prepare("UPDATE stock_issues SET status = 'da_tru_kho' WHERE id = ?").run(issueId);
}

// items: [{ productId, quantity, unitPrice }] (unitPrice = "Gia nhap" nguoi dung chon/nhap).
// process=true: tao va TRU KHO NGAY (1 buoc). process=false (mac dinh): chi "Luu".
function createSupplierReturn({ partnerId, createdBy, note, items, returnDate, process }) {
  if (!partnerId) {
    throw new ServiceError('Phieu tra hang phai chon nha cung cap');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new ServiceError('Phieu tra hang phai co it nhat 1 dong san pham');
  }

  const run = db.transaction(() => {
    validatePartner(partnerId);
    validateItemsShape(items);

    const timestamp = returnDate || db.prepare("SELECT datetime('now') AS now").get().now;
    const code = generateSupplierReturnCode();

    // LUON insert voi status='cho_tru_kho', BAT KE process co true hay khong - neu process=true,
    // applyProcessing() se tu doi thanh 'da_tru_kho' o CUOI (sau khi validate xong, dong 166).
    // Sua loi 2026-08-06 (nguoi dung bao cao): truoc day insert thang 'da_tru_kho' khi
    // process=true, khien getSupplierReturnReference() (dieu kien i.status='da_tru_kho') dem
    // NHAM chinh phieu vua tao vao "da tra", lam remainingReturnable bi tru hut dung bang so
    // luong dang tao - luon bao "vuot qua so con lai co the tra" du tra bao nhieu cung vay.
    const issueResult = db
      .prepare(`
        INSERT INTO stock_issues (code, partner_id, created_by, note, payment_status, created_at, is_return, status)
        VALUES (?, ?, ?, ?, 'da_thu_tien', ?, 1, 'cho_tru_kho')
      `)
      .run(code, partnerId, createdBy, note || '', timestamp);
    const issueId = issueResult.lastInsertRowid;

    const insertItem = db.prepare(
      'INSERT INTO stock_issue_items (issue_id, product_id, quantity, unit_price, discount_percent) VALUES (?, ?, ?, ?, 0)'
    );
    items.forEach((item) => {
      insertItem.run(issueId, item.productId, item.quantity, item.unitPrice || 0);
    });

    if (process) {
      applyProcessing(issueId, partnerId, createdBy, timestamp);
    }

    return issueId;
  });

  const issueId = run();
  return db.prepare('SELECT * FROM stock_issues WHERE id = ?').get(issueId);
}

// Sua phieu dang 'cho_tru_kho' - thay toan bo thong tin + danh sach dong.
function updateSupplierReturn(id, { partnerId, note, items, returnDate }) {
  if (!partnerId) {
    throw new ServiceError('Phieu tra hang phai chon nha cung cap');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new ServiceError('Phieu tra hang phai co it nhat 1 dong san pham');
  }

  const run = db.transaction(() => {
    const existing = db.prepare('SELECT id, status, created_at FROM stock_issues WHERE id = ? AND is_return = 1').get(id);
    if (!existing) {
      throw new ServiceError('Khong tim thay phieu tra hang');
    }
    if (existing.status !== 'cho_tru_kho') {
      throw new ServiceError('Phieu đã trừ kho, không thể sửa');
    }

    validatePartner(partnerId);
    validateItemsShape(items);

    const timestamp = returnDate || existing.created_at;

    db.prepare('UPDATE stock_issues SET partner_id = ?, note = ?, created_at = ? WHERE id = ?').run(
      partnerId,
      note || '',
      timestamp,
      id
    );

    db.prepare('DELETE FROM stock_issue_items WHERE issue_id = ?').run(id);
    const insertItem = db.prepare(
      'INSERT INTO stock_issue_items (issue_id, product_id, quantity, unit_price, discount_percent) VALUES (?, ?, ?, ?, 0)'
    );
    items.forEach((item) => {
      insertItem.run(id, item.productId, item.quantity, item.unitPrice || 0);
    });

    return id;
  });

  const issueId = run();
  return db.prepare('SELECT * FROM stock_issues WHERE id = ?').get(issueId);
}

// "Tru kho" cho 1 phieu da 'Luu' truoc do - chi ap dung duoc khi phieu dang 'cho_tru_kho'.
function processSupplierReturn(id, { createdBy }) {
  const run = db.transaction(() => {
    const existing = db
      .prepare('SELECT id, partner_id, created_at, status FROM stock_issues WHERE id = ? AND is_return = 1')
      .get(id);
    if (!existing) {
      throw new ServiceError('Khong tim thay phieu tra hang');
    }
    if (existing.status !== 'cho_tru_kho') {
      throw new ServiceError('Phieu da duoc tru kho truoc do');
    }

    applyProcessing(id, existing.partner_id, createdBy, existing.created_at);
    return id;
  });

  const issueId = run();
  return db.prepare('SELECT * FROM stock_issues WHERE id = ?').get(issueId);
}

module.exports = {
  createSupplierReturn,
  updateSupplierReturn,
  processSupplierReturn,
  getSupplierReturnReference,
  getSupplierPrices,
  generateSupplierReturnCode,
  ServiceError,
};
