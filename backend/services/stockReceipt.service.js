// Service tao phieu nhap kho: insert phieu + items + movements trong 1 transaction duy nhat.
// Loi o buoc nao cung rollback toan bo (xem .claude/docs/inventory-debt-ledger.md muc
// "Quy tac transaction khi tao phieu").

const db = require('../db/database');

class ServiceError extends Error {}

function generateReceiptCode() {
  const row = db.prepare('SELECT code FROM stock_receipts ORDER BY id DESC LIMIT 1').get();
  const lastNumber = row ? parseInt(row.code.replace('PN', ''), 10) : 0;
  return `PN${String(lastNumber + 1).padStart(6, '0')}`;
}

// items: [{ productId, quantity, unitPrice, discountPercent }]. receiptDate (tuy chon,
// dang 'YYYY-MM-DD HH:MM:SS') dung lam created_at that cho phieu + moi dong/movement/lo hang
// lien quan - anh huong thu tu tieu thu FIFO va tinh gia binh quan gia quyen (xem
// docs/DECISIONS.md muc "Thoi gian nhap kho"). Khong truyen thi dung thoi diem hien tai.
function createStockReceipt({ partnerId, createdBy, note, items, receiptDate, orderCode }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ServiceError('Phieu nhap phai co it nhat 1 dong san pham');
  }

  const run = db.transaction(() => {
    items.forEach((item) => {
      const product = db.prepare('SELECT id, is_active FROM products WHERE id = ?').get(item.productId);
      if (!product) {
        throw new ServiceError(`San pham khong ton tai: id=${item.productId}`);
      }
      if (!product.is_active) {
        throw new ServiceError(`San pham id=${item.productId} da ngung kinh doanh, khong the dung trong phieu moi`);
      }
    });

    const timestamp = receiptDate || db.prepare("SELECT datetime('now') AS now").get().now;

    const code = generateReceiptCode();
    const receiptResult = db
      .prepare(
        'INSERT INTO stock_receipts (code, partner_id, created_by, note, created_at, order_code) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(code, partnerId || null, createdBy, note || '', timestamp, orderCode || '');
    const receiptId = receiptResult.lastInsertRowid;

    const insertItem = db.prepare(
      'INSERT INTO stock_receipt_items (receipt_id, product_id, quantity, unit_price, discount_percent) VALUES (?, ?, ?, ?, ?)'
    );
    const insertMovement = db.prepare(
      "INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, unit_cost, created_at) VALUES (?, 'in', ?, 'receipt', ?, ?, ?)"
    );
    // Moi dong nhap la 1 lo hang rieng - gia von cua lo la GIA SAU CHIET KHAU (net), phan anh
    // dung chi phi thuc te da bo ra. Luon tao lo du khong dung FIFO de xem, vi day la du lieu
    // vat ly can co san neu sau nay doi costing_method.
    const insertLot = db.prepare(
      'INSERT INTO stock_lots (product_id, receipt_id, unit_cost, quantity_received, quantity_remaining, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );

    items.forEach((item) => {
      const discountPercent = item.discountPercent || 0;
      const netUnitCost = item.unitPrice * (1 - discountPercent / 100);

      insertItem.run(receiptId, item.productId, item.quantity, item.unitPrice, discountPercent);
      insertMovement.run(item.productId, item.quantity, receiptId, netUnitCost, timestamp);
      insertLot.run(item.productId, receiptId, netUnitCost, item.quantity, item.quantity, timestamp);
    });

    return receiptId;
  });

  const receiptId = run();
  return db.prepare('SELECT * FROM stock_receipts WHERE id = ?').get(receiptId);
}

module.exports = { createStockReceipt, ServiceError };
