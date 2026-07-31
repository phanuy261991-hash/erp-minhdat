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

// items: [{ productId, quantity, unitPrice }]
function createStockReceipt({ partnerId, createdBy, note, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ServiceError('Phieu nhap phai co it nhat 1 dong san pham');
  }

  const run = db.transaction(() => {
    items.forEach((item) => {
      const product = db.prepare('SELECT id FROM products WHERE id = ?').get(item.productId);
      if (!product) {
        throw new ServiceError(`San pham khong ton tai: id=${item.productId}`);
      }
    });

    const code = generateReceiptCode();
    const receiptResult = db
      .prepare('INSERT INTO stock_receipts (code, partner_id, created_by, note) VALUES (?, ?, ?, ?)')
      .run(code, partnerId || null, createdBy, note || '');
    const receiptId = receiptResult.lastInsertRowid;

    const insertItem = db.prepare(
      'INSERT INTO stock_receipt_items (receipt_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
    );
    const insertMovement = db.prepare(
      "INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id) VALUES (?, 'in', ?, 'receipt', ?)"
    );

    items.forEach((item) => {
      insertItem.run(receiptId, item.productId, item.quantity, item.unitPrice);
      insertMovement.run(item.productId, item.quantity, receiptId);
    });

    return receiptId;
  });

  const receiptId = run();
  return db.prepare('SELECT * FROM stock_receipts WHERE id = ?').get(receiptId);
}

module.exports = { createStockReceipt, ServiceError };
