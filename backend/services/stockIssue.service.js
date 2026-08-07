// Service tao phieu xuat kho: insert phieu + items + movements trong 1 transaction duy nhat.
// Doc warehouse_settings.allow_negative_stock de quyet dinh chan cung hay cho phep xuat khi
// ton kho khong du (xem CLAUDE.md muc Key Constraints, docs/DECISIONS.md).

const db = require('../db/database');
const { getCostingMethod, consumeStockForIssue } = require('./costing.service');
const { recordDebtFromDocument } = require('./debt.service');

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

// items: [{ productId, quantity, unitPrice }]. adjustsType/adjustsId (tuy chon): xem chu thich
// tuong ung trong stockReceipt.service.js. paymentStatus='cong_no' phat sinh 1 dong debt_ledger
// (no phai thu khach hang) trong CUNG transaction - bat buoc phai co partnerId. issueDate (tuy
// chon, dang 'YYYY-MM-DD HH:MM:SS') dung lam created_at that cho phieu + movement lien quan,
// giong het co che receipt_date o stockReceipt.service.js - khong truyen thi dung thoi diem
// hien tai. projectId (tuy chon, migration 024): xem chu thich tuong ung trong
// stockReceipt.service.js - gan phieu xuat voi du an, tinh "da xuat" cho tab Vat tu.
function createStockIssue({ partnerId, createdBy, note, paymentStatus, items, adjustsType, adjustsId, issueDate, projectId }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ServiceError('Phieu xuat phai co it nhat 1 dong san pham');
  }
  if (paymentStatus === 'cong_no' && !partnerId) {
    throw new ServiceError('Phieu xuat cong no phai chon khach hang');
  }

  const allowNegative = isNegativeStockAllowed();
  const costingMethod = getCostingMethod();

  const run = db.transaction(() => {
    if (projectId) {
      const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
      if (!project) {
        throw new ServiceError('Khong tim thay du an');
      }
    }

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

    const timestamp = issueDate || db.prepare("SELECT datetime('now') AS now").get().now;

    const code = generateIssueCode();
    const issueResult = db
      .prepare(
        'INSERT INTO stock_issues (code, partner_id, created_by, note, payment_status, adjusts_type, adjusts_id, created_at, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(code, partnerId || null, createdBy, note || '', paymentStatus, adjustsType || null, adjustsId || null, timestamp, projectId || null);
    const issueId = issueResult.lastInsertRowid;

    const insertItem = db.prepare(
      'INSERT INTO stock_issue_items (issue_id, product_id, quantity, unit_price, discount_percent) VALUES (?, ?, ?, ?, ?)'
    );
    const insertMovement = db.prepare(
      "INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, unit_cost, created_at) VALUES (?, 'out', ?, 'issue', ?, ?, ?)"
    );

    // totalAmount (dung de ghi cong no) tinh theo GIA SAU CHIET KHAU (net) - giong het cach
    // tinh o stockReceipt.service.js. unit_cost cua movement (gia von xuat kho, tu costing.service)
    // khong lien quan chiet khau ban hang - do la 2 khai niem khac nhau (gia von vs gia ban).
    let totalAmount = 0;
    items.forEach((item) => {
      const discountPercent = item.discountPercent || 0;
      insertItem.run(issueId, item.productId, item.quantity, item.unitPrice, discountPercent);
      // Tru dan cac lo con lai (FIFO vat ly) va lay gia von ghi lai theo dung costing_method
      // dang chon - xem backend/services/costing.service.js.
      const unitCost = consumeStockForIssue(item.productId, item.quantity, costingMethod);
      insertMovement.run(item.productId, item.quantity, issueId, unitCost, timestamp);
      totalAmount += item.quantity * item.unitPrice * (1 - discountPercent / 100);
    });

    if (paymentStatus === 'cong_no') {
      recordDebtFromDocument({
        partnerId,
        amount: totalAmount,
        referenceType: 'issue',
        referenceId: issueId,
        createdBy,
        projectId,
      });
    }

    return issueId;
  });

  const issueId = run();
  return db.prepare('SELECT * FROM stock_issues WHERE id = ?').get(issueId);
}

module.exports = { createStockIssue, ServiceError };
