// Service "Tra hang" (migration 032/033). Tai su dung dung co che stock_receipts/
// stock_receipt_items/stock_movements/stock_lots cua phieu nhap kho (xem docs/DECISIONS.md ly do
// khong tao bang rieng) - 1 phieu tra hang la 1 dong stock_receipts is_return=1, ma prefix TH.
//
// Quy trinh 2 buoc (migration 033, theo yeu cau nguoi dung 2026-08-06): "Luu" (status=
// 'cho_tru_kho') chi ghi lai thong tin da nhap (phieu + items), KHONG dong stock_movements/
// stock_lots/debt_ledger - phieu con sua duoc (updateStockReturn). "Tru kho" (createStockReturn
// voi process=true, hoac processStockReturn() cho phieu da luu truoc do) moi thuc su ghi cac
// dong do qua applyProcessing() - dung NGUYEN VEN logic nghiep vu cu (validate so luong con lai,
// tinh gia von binh quan, ghi cong no giam), chi doi thoi diem kich hoat. Sau khi tru kho thanh
// cong, status='da_tru_kho' - khoa vinh vien, khong con sua duoc.

const db = require('../db/database');
const { getWeightedAverageCost } = require('./costing.service');
const { recordReturnCredit } = require('./debt.service');

class ServiceError extends Error {}

function generateReturnCode() {
  const row = db.prepare("SELECT code FROM stock_receipts WHERE is_return = 1 ORDER BY id DESC LIMIT 1").get();
  const lastNumber = row ? parseInt(row.code.replace('TH', ''), 10) : 0;
  return `TH${String(lastNumber + 1).padStart(6, '0')}`;
}

// "Da xuat"/"Da tra"/"Con lai co the tra" cho 1 khach hang + 1 san pham - tinh on-the-fly, khong
// luu. CHI tinh cac phieu tra DA 'da_tru_kho' vao "da tra" - phieu con 'cho_tru_kho' chua thuc su
// tru gi nen khong duoc tinh, tranh chan nham cac phieu khac boi 1 phieu nhap con dang cho duyet
// (co the bi sua/khong bao gio duoc tru).
function getReturnReference(partnerId, productId, projectId) {
  const issuedRow = projectId
    ? db
        .prepare(`
          SELECT COALESCE(SUM(ii.quantity), 0) AS qty
          FROM stock_issue_items ii
          JOIN stock_issues i ON i.id = ii.issue_id
          WHERE i.partner_id = ? AND ii.product_id = ? AND i.project_id = ?
        `)
        .get(partnerId, productId, projectId)
    : db
        .prepare(`
          SELECT COALESCE(SUM(ii.quantity), 0) AS qty
          FROM stock_issue_items ii
          JOIN stock_issues i ON i.id = ii.issue_id
          WHERE i.partner_id = ? AND ii.product_id = ?
        `)
        .get(partnerId, productId);

  const returnedRow = projectId
    ? db
        .prepare(`
          SELECT COALESCE(SUM(ri.quantity), 0) AS qty
          FROM stock_receipt_items ri
          JOIN stock_receipts r ON r.id = ri.receipt_id
          WHERE r.partner_id = ? AND r.is_return = 1 AND r.status = 'da_tru_kho' AND ri.product_id = ? AND r.project_id = ?
        `)
        .get(partnerId, productId, projectId)
    : db
        .prepare(`
          SELECT COALESCE(SUM(ri.quantity), 0) AS qty
          FROM stock_receipt_items ri
          JOIN stock_receipts r ON r.id = ri.receipt_id
          WHERE r.partner_id = ? AND r.is_return = 1 AND r.status = 'da_tru_kho' AND ri.product_id = ?
        `)
        .get(partnerId, productId);

  const issuedQuantity = issuedRow.qty;
  const returnedQuantity = returnedRow.qty;
  return { issuedQuantity, returnedQuantity, remainingReturnable: issuedQuantity - returnedQuantity };
}

function validatePartnerAndProject(partnerId, projectId) {
  const partner = db.prepare('SELECT id, type FROM partners WHERE id = ?').get(partnerId);
  if (!partner) {
    throw new ServiceError('Khong tim thay khach hang');
  }
  if (partner.type !== 'khach_hang') {
    throw new ServiceError('Doi tac phai la khach hang de lap phieu tra hang');
  }

  if (projectId) {
    const project = db.prepare('SELECT id, partner_id FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      throw new ServiceError('Khong tim thay du an');
    }
    if (project.partner_id !== partnerId) {
      throw new ServiceError('Du an khong thuoc khach hang dang thao tac');
    }
  }
}

// Validate hinh dang du lieu tung dong (san pham ton tai, so luong > 0) - ap dung luon o buoc
// "Luu" lan "Tru kho". KHONG check "con lai co the tra" o day - cai do chi chan luc thuc su
// "Tru kho" (applyProcessing), de "Luu" luon thanh cong voi bat ky so lieu nao nguoi dung go.
function validateItemsShape(items) {
  items.forEach((item) => {
    // Khac createStockReceipt(): KHONG chan san pham da ngung kinh doanh (is_active=0) - van
    // phai nhan tra hang cho san pham da ngung ban de tra ve dung ton kho + tru dung cong no.
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(item.productId);
    if (!product) {
      throw new ServiceError(`San pham khong ton tai: id=${item.productId}`);
    }
    if (!(item.quantity > 0)) {
      throw new ServiceError('So luong tra lai phai lon hon 0');
    }
  });
}

function validateRemaining(partnerId, projectId, items) {
  const quantityByProduct = new Map();
  items.forEach((item) => {
    quantityByProduct.set(item.product_id, (quantityByProduct.get(item.product_id) || 0) + item.quantity);
  });

  for (const [productId, totalQuantity] of quantityByProduct) {
    const { remainingReturnable } = getReturnReference(partnerId, productId, projectId);
    if (totalQuantity > remainingReturnable) {
      throw new ServiceError(
        `Số lượng trả lại vượt quá số đã xuất còn có thể trả (còn lại: ${remainingReturnable})`
      );
    }
  }
}

// Thuc hien TRU KHO THAT SU cho 1 phieu da co san trong DB (dung chung cho createStockReturn
// {process:true} va processStockReturn()) - doc lai items TU DATABASE (khong nhan tham so), vi
// phieu co the vua duoc sua qua updateStockReturn() truoc do, luon phai dung du lieu moi nhat.
// timestamp: dung dung "Thoi gian tra" da luu tren phieu (khong phai luc bam Tru kho) - nhat
// quan voi cach receiptDate/issueDate anh huong thu tu FIFO/binh quan gia quyen o phieu nhap/xuat.
function applyProcessing(receiptId, partnerId, projectId, createdBy, timestamp) {
  const items = db
    .prepare('SELECT id, product_id, quantity, sale_price FROM stock_receipt_items WHERE receipt_id = ?')
    .all(receiptId);

  validateRemaining(partnerId, projectId, items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })));

  const updateItemCost = db.prepare('UPDATE stock_receipt_items SET unit_price = ? WHERE id = ?');
  const insertMovement = db.prepare(
    "INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, unit_cost, created_at) VALUES (?, 'in', ?, 'receipt', ?, ?, ?)"
  );
  // Lo hang moi tu hang tra - unit_cost lay GIA VON BINH QUAN HIEN TAI (khong phai gia ban) de
  // khong lam lech gia von binh quan cua san pham (xem docs/DECISIONS.md).
  const insertLot = db.prepare(
    'INSERT INTO stock_lots (product_id, receipt_id, unit_cost, quantity_received, quantity_remaining, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );

  let totalCredit = 0;
  items.forEach((item) => {
    const unitCost = getWeightedAverageCost(item.product_id);
    updateItemCost.run(unitCost, item.id);
    insertMovement.run(item.product_id, item.quantity, receiptId, unitCost, timestamp);
    insertLot.run(item.product_id, receiptId, unitCost, item.quantity, item.quantity, timestamp);
    totalCredit += item.quantity * item.sale_price;
  });

  // Giam cong no khach hang tuong ung gia tri hang tra (Gia ban x So luong tra) - bo qua neu
  // =0 (debt_ledger.amount co CHECK > 0, khong the insert dong 0).
  if (totalCredit > 0) {
    recordReturnCredit({ partnerId, amount: totalCredit, referenceType: 'receipt', referenceId: receiptId, createdBy, projectId });
  }

  db.prepare("UPDATE stock_receipts SET status = 'da_tru_kho' WHERE id = ?").run(receiptId);
}

// items: [{ productId, quantity, salePrice }]. process=true: tao va TRU KHO NGAY (dung y het
// hanh vi cu truoc migration 033, 1 buoc duy nhat). process=false (mac dinh): chi "Luu" - phieu
// vao trang thai 'cho_tru_kho', chua dong gi vao stock_movements/stock_lots/debt_ledger.
function createStockReturn({ partnerId, projectId, createdBy, note, items, returnDate, process }) {
  if (!partnerId) {
    throw new ServiceError('Phieu tra hang phai chon khach hang');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new ServiceError('Phieu tra hang phai co it nhat 1 dong san pham');
  }

  const run = db.transaction(() => {
    validatePartnerAndProject(partnerId, projectId);
    validateItemsShape(items);

    const timestamp = returnDate || db.prepare("SELECT datetime('now') AS now").get().now;
    const code = generateReturnCode();
    const status = process ? 'da_tru_kho' : 'cho_tru_kho';

    const receiptResult = db
      .prepare(`
        INSERT INTO stock_receipts (code, partner_id, created_by, note, created_at, order_code, payment_status, project_id, is_return, status)
        VALUES (?, ?, ?, ?, ?, '', 'da_thanh_toan', ?, 1, ?)
      `)
      .run(code, partnerId, createdBy, note || '', timestamp, projectId || null, status);
    const receiptId = receiptResult.lastInsertRowid;

    const insertItem = db.prepare(
      'INSERT INTO stock_receipt_items (receipt_id, product_id, quantity, unit_price, discount_percent, sale_price) VALUES (?, ?, ?, 0, 0, ?)'
    );
    items.forEach((item) => {
      insertItem.run(receiptId, item.productId, item.quantity, item.salePrice || 0);
    });

    if (process) {
      applyProcessing(receiptId, partnerId, projectId, createdBy, timestamp);
    }

    return receiptId;
  });

  const receiptId = run();
  return db.prepare('SELECT * FROM stock_receipts WHERE id = ?').get(receiptId);
}

// Sua phieu dang 'cho_tru_kho' - thay toan bo thong tin + danh sach dong (xoa het items cu, insert
// lai items moi, don gian hon doi chieu tung dong). Chi ap dung duoc khi phieu CHUA tru kho.
function updateStockReturn(id, { partnerId, projectId, note, items, returnDate }) {
  if (!partnerId) {
    throw new ServiceError('Phieu tra hang phai chon khach hang');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new ServiceError('Phieu tra hang phai co it nhat 1 dong san pham');
  }

  const run = db.transaction(() => {
    const existing = db.prepare('SELECT id, status, created_at FROM stock_receipts WHERE id = ? AND is_return = 1').get(id);
    if (!existing) {
      throw new ServiceError('Khong tim thay phieu tra hang');
    }
    if (existing.status !== 'cho_tru_kho') {
      throw new ServiceError('Phieu đã trừ kho, không thể sửa');
    }

    validatePartnerAndProject(partnerId, projectId);
    validateItemsShape(items);

    const timestamp = returnDate || existing.created_at;

    db.prepare('UPDATE stock_receipts SET partner_id = ?, project_id = ?, note = ?, created_at = ? WHERE id = ?').run(
      partnerId,
      projectId || null,
      note || '',
      timestamp,
      id
    );

    db.prepare('DELETE FROM stock_receipt_items WHERE receipt_id = ?').run(id);
    const insertItem = db.prepare(
      'INSERT INTO stock_receipt_items (receipt_id, product_id, quantity, unit_price, discount_percent, sale_price) VALUES (?, ?, ?, 0, 0, ?)'
    );
    items.forEach((item) => {
      insertItem.run(id, item.productId, item.quantity, item.salePrice || 0);
    });

    return id;
  });

  const receiptId = run();
  return db.prepare('SELECT * FROM stock_receipts WHERE id = ?').get(receiptId);
}

// "Tru kho" cho 1 phieu da 'Luu' truoc do (nut rieng ngoai danh sach hoac trong modal sua) -
// chi ap dung duoc khi phieu dang 'cho_tru_kho'. Sau khi chay xong, phieu khoa vinh vien.
function processStockReturn(id, { createdBy }) {
  const run = db.transaction(() => {
    const existing = db
      .prepare('SELECT id, partner_id, project_id, created_at, status FROM stock_receipts WHERE id = ? AND is_return = 1')
      .get(id);
    if (!existing) {
      throw new ServiceError('Khong tim thay phieu tra hang');
    }
    if (existing.status !== 'cho_tru_kho') {
      throw new ServiceError('Phieu da duoc tru kho truoc do');
    }

    applyProcessing(id, existing.partner_id, existing.project_id, createdBy, existing.created_at);
    return id;
  });

  const receiptId = run();
  return db.prepare('SELECT * FROM stock_receipts WHERE id = ?').get(receiptId);
}

module.exports = {
  createStockReturn,
  updateStockReturn,
  processStockReturn,
  getReturnReference,
  generateReturnCode,
  ServiceError,
};
