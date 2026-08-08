// Service tao phieu nhap kho: insert phieu + items + movements trong 1 transaction duy nhat.
// Loi o buoc nao cung rollback toan bo (xem .claude/docs/inventory-debt-ledger.md muc
// "Quy tac transaction khi tao phieu").

const db = require('../db/database');
const { recordDebtFromDocument } = require('./debt.service');
const { recordAutoVoucher } = require('./cashVoucher.service');

class ServiceError extends Error {}

// BAT BUOC loc is_return=0 - stock_receipts dung CHUNG bang voi "Tra hang xuat" (is_return=1,
// ma rieng "TH..."). Neu khong loc, phieu "Tra hang xuat" tao gan nhat (id lon hon) se bi lay
// nham lam "ma gan nhat" o day, parseInt("TH000005") tra ve NaN -> sinh ma hong "PN000NaN".
// Sua loi 2026-08-07 (phat hien khi dieu tra loi validate "Tra hang nha cung cap") - doi xung
// cach generateReturnCode()/generateSupplierReturnCode() da loc dung tu dau.
function generateReceiptCode() {
  const row = db.prepare("SELECT code FROM stock_receipts WHERE is_return = 0 ORDER BY id DESC LIMIT 1").get();
  const lastNumber = row ? parseInt(row.code.replace('PN', ''), 10) : 0;
  return `PN${String(lastNumber + 1).padStart(6, '0')}`;
}

// items: [{ productId, quantity, unitPrice, discountPercent }]. receiptDate (tuy chon,
// dang 'YYYY-MM-DD HH:MM:SS') dung lam created_at that cho phieu + moi dong/movement/lo hang
// lien quan - anh huong thu tu tieu thu FIFO va tinh gia binh quan gia quyen (xem
// docs/DECISIONS.md muc "Thoi gian nhap kho"). Khong truyen thi dung thoi diem hien tai.
// adjustsType/adjustsId (tuy chon): phieu nay la phieu dieu chinh bu tru cho 1 phieu nhap/xuat
// da co truoc do - khong sua/xoa phieu goc, chi ghi lien ket de truy vet (xem migration 010,
// docs/DECISIONS.md muc "Sua/huy phieu da tao"). Validate ton tai phieu goc o tang route.
// paymentStatus ('da_thanh_toan' mac dinh hoac 'cong_no', migration 011): 'cong_no' phat sinh
// 1 dong debt_ledger (no phai tra NCC) trong CUNG transaction nay - bat buoc phai co partnerId
// (khong the ghi no cho doi tac khong xac dinh).
// projectId (tuy chon, migration 024): gan phieu voi 1 du an - dung de doi chieu vat tu du toan/
// da xuat va loc cong no theo du an (module "Quan ly du an" Dot 3, xem docs/DECISIONS.md).
// Validate ton tai o day (khong o tang route) vi phai chay TRONG transaction giong het cach
// validate san pham ben duoi.
function createStockReceipt({ partnerId, createdBy, note, items, receiptDate, orderCode, adjustsType, adjustsId, paymentStatus, projectId }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ServiceError('Phieu nhap phai co it nhat 1 dong san pham');
  }
  if (paymentStatus === 'cong_no' && !partnerId) {
    throw new ServiceError('Phieu nhap cong no phai chon nha cung cap');
  }

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
    });

    const timestamp = receiptDate || db.prepare("SELECT datetime('now') AS now").get().now;

    const code = generateReceiptCode();
    const resolvedPaymentStatus = paymentStatus || 'da_thanh_toan';
    const receiptResult = db
      .prepare(
        'INSERT INTO stock_receipts (code, partner_id, created_by, note, created_at, order_code, adjusts_type, adjusts_id, payment_status, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(code, partnerId || null, createdBy, note || '', timestamp, orderCode || '', adjustsType || null, adjustsId || null, resolvedPaymentStatus, projectId || null);
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

    let totalAmount = 0;
    items.forEach((item) => {
      const discountPercent = item.discountPercent || 0;
      const netUnitCost = item.unitPrice * (1 - discountPercent / 100);

      insertItem.run(receiptId, item.productId, item.quantity, item.unitPrice, discountPercent);
      insertMovement.run(item.productId, item.quantity, receiptId, netUnitCost, timestamp);
      insertLot.run(item.productId, receiptId, netUnitCost, item.quantity, item.quantity, timestamp);
      totalAmount += item.quantity * netUnitCost;
    });

    if (resolvedPaymentStatus === 'cong_no') {
      recordDebtFromDocument({
        partnerId,
        amount: totalAmount,
        referenceType: 'receipt',
        referenceId: receiptId,
        createdBy,
        projectId,
      });
    } else {
      // Thanh toan ngay (khong cong no) - tien mat/chuyen khoan THAT chi ra khoi cong ty ngay
      // luc nhap hang, tu dong tao 1 phieu Chi trong So quy (migration 035). Day la nhanh se
      // chay cho HAU HET phieu nhap thuong (da_thanh_toan la gia tri mac dinh) - xem
      // docs/DECISIONS.md 2026-08-07 ve he qua nay.
      const partner = partnerId ? db.prepare('SELECT name FROM partners WHERE id = ?').get(partnerId) : null;
      recordAutoVoucher({
        type: 'chi',
        systemKey: 'chi_mua_hang',
        partnerId,
        counterpartName: partner ? partner.name : '',
        amount: totalAmount,
        note: `Nhập hàng - Phiếu ${code}`,
        referenceType: 'stock_receipt',
        referenceId: receiptId,
        createdBy,
        voucherDate: timestamp,
      });
    }

    return receiptId;
  });

  const receiptId = run();
  return db.prepare('SELECT * FROM stock_receipts WHERE id = ?').get(receiptId);
}

module.exports = { createStockReceipt, ServiceError };
