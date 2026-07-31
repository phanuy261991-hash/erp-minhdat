// Service tao phieu xuat kho: insert phieu + items + movements trong 1 transaction duy nhat.
// Doc warehouse_settings.allow_negative_stock de quyet dinh chan cung hay cho phep xuat khi
// ton kho khong du (xem CLAUDE.md muc Key Constraints, docs/DECISIONS.md).

const db = require('../db/database');
const { getCostingMethod, consumeStockForIssue } = require('./costing.service');

class ServiceError extends Error {}

function generateIssueCode() {
  const row = db.prepare('SELECT code FROM stock_issues ORDER BY id DESC LIMIT 1').get();
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

// items: [{ productId, quantity, unitPrice }]
function createStockIssue({ partnerId, createdBy, note, paymentStatus, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ServiceError('Phieu xuat phai co it nhat 1 dong san pham');
  }

  const allowNegative = isNegativeStockAllowed();
  const costingMethod = getCostingMethod();

  const run = db.transaction(() => {
    items.forEach((item) => {
      const product = db.prepare('SELECT id, is_active FROM products WHERE id = ?').get(item.productId);
      if (!product) {
        throw new ServiceError(`San pham khong ton tai: id=${item.productId}`);
      }
      if (!product.is_active) {
        throw new ServiceError(`San pham id=${item.productId} da ngung kinh doanh, khong the dung trong phieu moi`);
      }

      if (!allowNegative) {
        const currentStock = getCurrentStock(item.productId);
        if (currentStock < item.quantity) {
          throw new ServiceError(
            `San pham id=${item.productId} khong du ton kho de xuat (con ${currentStock}, can xuat ${item.quantity})`
          );
        }
      }
    });

    const code = generateIssueCode();
    const issueResult = db
      .prepare(
        'INSERT INTO stock_issues (code, partner_id, created_by, note, payment_status) VALUES (?, ?, ?, ?, ?)'
      )
      .run(code, partnerId || null, createdBy, note || '', paymentStatus);
    const issueId = issueResult.lastInsertRowid;

    const insertItem = db.prepare(
      'INSERT INTO stock_issue_items (issue_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
    );
    const insertMovement = db.prepare(
      "INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, unit_cost) VALUES (?, 'out', ?, 'issue', ?, ?)"
    );

    items.forEach((item) => {
      insertItem.run(issueId, item.productId, item.quantity, item.unitPrice);
      // Tru dan cac lo con lai (FIFO vat ly) va lay gia von ghi lai theo dung costing_method
      // dang chon - xem backend/services/costing.service.js.
      const unitCost = consumeStockForIssue(item.productId, item.quantity, costingMethod);
      insertMovement.run(item.productId, item.quantity, issueId, unitCost);
    });

    return issueId;
  });

  const issueId = run();
  return db.prepare('SELECT * FROM stock_issues WHERE id = ?').get(issueId);
}

module.exports = { createStockIssue, ServiceError };
