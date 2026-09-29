// Service tao phieu nhap kho: insert phieu + items + movements trong 1 transaction duy nhat.
// Loi o buoc nao cung rollback toan bo (xem .claude/docs/inventory-debt-ledger.md muc
// "Quy tac transaction khi tao phieu").

const db = require('../db/database');
const { recordDebtFromDocument, recordDebtAdjustment } = require('./debt.service');
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
// projectId: KHONG con nhan tu client tu 2026-08-20 (xem docs/DECISIONS.md) - phieu nhap kho
// THUONG luon ghi project_id = NULL. Ly do: cong thuc "Da xuat cho du an" (tab Vat tu +
// Nghiem thu, projectMaterials.routes.js/projectAcceptanceSolutions.routes.js) TRU di moi
// phieu nhap gan cung du an (coi la "tra vat tu thua ve kho") - neu phieu nhap THUONG (mua hang
// tu NCC, khong phai tra hang) bi gan nham du an, no se bi tru nham vao "da xuat", lam bien mat
// khoi danh sach thiet bi co the nghiem thu du thuc te da xuat kho that. Rieng "Tra hang xuat"
// (stockReturn.service.js#createStockReturn(), dung CHUNG bang stock_receipts nhung route/
// service hoan toan tach biet) van gan project_id binh thuong - do dung THAT SU la "tra vat tu
// thua", tru dung nghia.
// isOpeningBalance (tuy chon, migration 037): phieu "Nhap ton dau ky" - danh dau de KHONG phat
// sinh debt_ledger/cash_vouchers du payment_status la gi (bo qua ca 2 nhanh ben duoi), chi tao
// stock_movements/stock_lots nhu phieu thuong de doi ton kho + luu gia von cho lan xuat sau.
function createStockReceipt({ partnerId, createdBy, note, items, receiptDate, orderCode, adjustsType, adjustsId, paymentStatus, isOpeningBalance }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ServiceError('Phieu nhap phai co it nhat 1 dong san pham');
  }
  if (!isOpeningBalance && paymentStatus === 'cong_no' && !partnerId) {
    throw new ServiceError('Phieu nhap cong no phai chon nha cung cap');
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
    // Phieu ton dau ky luon coi nhu "da thanh toan" ve mat du lieu (khong co y nghia cong no) -
    // tranh CHECK constraint payment_status bi vi pham neu client lo gui 'cong_no'.
    const resolvedPaymentStatus = isOpeningBalance ? 'da_thanh_toan' : (paymentStatus || 'da_thanh_toan');
    const receiptResult = db
      .prepare(
        'INSERT INTO stock_receipts (code, partner_id, created_by, note, created_at, order_code, adjusts_type, adjusts_id, payment_status, project_id, is_opening_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(code, partnerId || null, createdBy, note || '', timestamp, orderCode || '', adjustsType || null, adjustsId || null, resolvedPaymentStatus, null, isOpeningBalance ? 1 : 0);
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

    if (isOpeningBalance) {
      // Nhap ton dau ky - chi doi so luong ton kho, khong dung cham cong no/so quy (xem
      // migration 037 + docs/DECISIONS.md 2026-08-15).
    } else if (resolvedPaymentStatus === 'cong_no') {
      recordDebtFromDocument({
        partnerId,
        amount: totalAmount,
        referenceType: 'receipt',
        referenceId: receiptId,
        createdBy,
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

// Sua NGAY NHAP cua 1 phieu da tao - ngoai le CO CHU DICH cho nguyen tac "khong sua/xoa truc
// tiep phieu nhap/xuat da tao" (docs/DECISIONS.md 2026-07-31): CHI cho sua truong ngay, khong
// dung cho so luong/don gia/san pham/NCC - khong lam thay doi ton kho hay cong no. Dong bo ngay
// moi sang CA stock_movements/stock_lots (anh huong thu tu tieu thu FIFO ve sau + gom dung thang
// tren Bao cao) va cash_vouchers tu dong (neu co, phieu tra tien ngay) - da hoi va chot voi nguoi
// dung truoc khi lam (2026-08-15). Chi ap dung phieu nhap thuong (is_return=0), khong dung cho
// "Tra hang xuat" dung chung bang nay.
function updateStockReceiptDate({ id, receiptDate }) {
  const run = db.transaction(() => {
    const receipt = db.prepare('SELECT id, is_return FROM stock_receipts WHERE id = ?').get(id);
    if (!receipt) {
      return false;
    }
    if (receipt.is_return) {
      throw new ServiceError('Khong the sua ngay cua phieu Tra hang xuat o day');
    }

    db.prepare('UPDATE stock_receipts SET created_at = ? WHERE id = ?').run(receiptDate, id);
    db.prepare("UPDATE stock_movements SET created_at = ? WHERE reference_type = 'receipt' AND reference_id = ?").run(receiptDate, id);
    db.prepare('UPDATE stock_lots SET created_at = ? WHERE receipt_id = ?').run(receiptDate, id);
    db.prepare("UPDATE cash_vouchers SET created_at = ? WHERE reference_type = 'stock_receipt' AND reference_id = ?").run(receiptDate, id);
    return true;
  });

  if (!run()) return null;
  return db.prepare('SELECT * FROM stock_receipts WHERE id = ?').get(id);
}

// Gan bo sung NCC cho 1 phieu nhap dang partner_id NULL (thuong la "Nhap ton dau ky" khong chon
// NCC luc tao, 2026-09-28 - xem docs/DECISIONS.md) - dung khi staff biet ro NCC that va muon
// "Tra hang NCC" ve sau tinh dung lich su (getSupplierReturnReference() so khop theo partner_id).
// CHI cho gan khi dang trong (khong ghi de doi tac da co) - an toan tuyet doi voi cong no: phieu
// cong_no bat buoc co doi tac tu luc tao, nen 1 phieu dang NULL chac chan CHUA TUNG phat sinh
// debt_ledger. Dong bo luon ten hien thi tren phieu Chi tu dong (neu co, xem createStockReceipt())
// cho khop - khong doi so tien, chi anh huong hien thi/truy vet. Ap dung ca phieu thuong lan
// phieu ton dau ky (is_opening_balance khong lien quan gi den validate nay), KHONG ap dung "Tra
// hang xuat" (is_return=1, dung stockReturn.service.js rieng, da bat buoc chon khach hang tu dau).
function assignStockReceiptPartner(id, partnerId) {
  if (!partnerId) {
    throw new ServiceError('Thieu nha cung cap can gan');
  }

  const run = db.transaction(() => {
    const receipt = db.prepare('SELECT id, partner_id, is_return FROM stock_receipts WHERE id = ?').get(id);
    if (!receipt) {
      throw new ServiceError('Khong tim thay phieu nhap');
    }
    if (receipt.is_return) {
      throw new ServiceError('Khong the gan doi tac cho phieu tra hang o day');
    }
    if (receipt.partner_id) {
      throw new ServiceError('Phieu da co doi tac, khong the gan lai');
    }

    const partner = db.prepare('SELECT id, name, type FROM partners WHERE id = ?').get(partnerId);
    if (!partner) {
      throw new ServiceError('Khong tim thay nha cung cap');
    }
    if (partner.type !== 'nha_cung_cap') {
      throw new ServiceError('Doi tac phai la nha cung cap');
    }

    db.prepare('UPDATE stock_receipts SET partner_id = ? WHERE id = ?').run(partnerId, id);
    db.prepare(
      "UPDATE cash_vouchers SET partner_id = ?, counterpart_name = ? WHERE reference_type = 'stock_receipt' AND reference_id = ?"
    ).run(partnerId, partner.name, id);

    return id;
  });

  const receiptId = run();
  return db.prepare('SELECT * FROM stock_receipts WHERE id = ?').get(receiptId);
}

// Sua don gia/chiet khau tung dong cua 1 phieu nhap THUONG (is_return=0) - ngoai le co chu dich
// khac (2026-09-28, xem docs/DECISIONS.md), sua loi "go nham chiet khau/gia nhap khong co cach
// xu ly". CHI cho sua khi TOAN BO lo hang cua phieu (moi dong) CHUA bi xuat dung mot phan nao
// (stock_lots.quantity_remaining === quantity_received cho moi dong) - neu da bi tieu thu qua
// FIFO, cac stock_movements 'out' lien quan da chot gia von SAI vinh vien theo gia cu, sua lai
// gia nhap luc nay se lam lech vinh vien COGS da ghi so - bat buoc phai dung phieu dieu chinh bu
// tru (adjusts_type/adjusts_id) thay vi sua truc tiep trong truong hop do. Khong doi so luong/
// san pham - chi don gia/chiet khau tung dong, khop dung theo item_id (khong cho them/bot/doi
// dong o day). Tu dong sua luon cong no/phieu Chi tu dong lien quan (neu co) cho khop tong tien
// moi - xem 2 nhanh duoi.
function updateStockReceiptPricing(id, items, createdBy) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ServiceError('Phieu nhap phai co it nhat 1 dong san pham');
  }

  const run = db.transaction(() => {
    const receipt = db
      .prepare('SELECT id, code, partner_id, payment_status, is_return, is_opening_balance FROM stock_receipts WHERE id = ?')
      .get(id);
    if (!receipt) {
      throw new ServiceError('Khong tim thay phieu nhap');
    }
    if (receipt.is_return) {
      throw new ServiceError('Khong the sua don gia cho phieu tra hang o day');
    }

    const existingItems = db
      .prepare('SELECT id, product_id, quantity, unit_price, discount_percent FROM stock_receipt_items WHERE receipt_id = ?')
      .all(id);
    const existingIds = existingItems.map((i) => i.id).sort((a, b) => a - b);
    const submittedIds = items.map((i) => i.itemId).sort((a, b) => a - b);
    if (existingIds.length !== submittedIds.length || existingIds.some((v, idx) => v !== submittedIds[idx])) {
      throw new ServiceError('Danh sach dong san pham khong khop voi phieu goc - khong the them/bot/doi dong o day');
    }

    // Chan neu bat ky lo hang nao cua phieu da bi tieu thu 1 phan/toan bo - dung nguyen tac an
    // toan neu tren (tranh lam lech gia von cac dong stock_movements 'out' da chot truoc do).
    const lots = db.prepare('SELECT quantity_received, quantity_remaining FROM stock_lots WHERE receipt_id = ?').all(id);
    const touched = lots.some((lot) => lot.quantity_remaining !== lot.quantity_received);
    if (touched) {
      throw new ServiceError(
        'Phiếu đã có lô hàng bị xuất dùng một phần, không thể sửa đơn giá trực tiếp - dùng phiếu điều chỉnh bù trừ'
      );
    }

    const itemById = new Map(existingItems.map((i) => [i.id, i]));
    let oldTotal = 0;
    let newTotal = 0;
    const updateItem = db.prepare('UPDATE stock_receipt_items SET unit_price = ?, discount_percent = ? WHERE id = ?');
    const updateLot = db.prepare('UPDATE stock_lots SET unit_cost = ? WHERE receipt_id = ? AND product_id = ?');
    const updateMovement = db.prepare(
      "UPDATE stock_movements SET unit_cost = ? WHERE reference_type = 'receipt' AND reference_id = ? AND product_id = ?"
    );

    items.forEach((submitted) => {
      const existing = itemById.get(submitted.itemId);
      const oldNetCost = existing.unit_price * (1 - existing.discount_percent / 100);
      oldTotal += existing.quantity * oldNetCost;

      const newNetCost = submitted.unitPrice * (1 - submitted.discountPercent / 100);
      newTotal += existing.quantity * newNetCost;

      updateItem.run(submitted.unitPrice, submitted.discountPercent, submitted.itemId);
      updateLot.run(newNetCost, id, existing.product_id);
      updateMovement.run(newNetCost, id, existing.product_id);
    });

    const diff = newTotal - oldTotal;
    // Ton dau ky khong dung debt_ledger/cash_vouchers (xem createStockReceipt()) - bo qua ca 2
    // nhanh duoi, chi doi lot/movement/item nhu tren la du.
    if (diff !== 0 && !receipt.is_opening_balance) {
      if (receipt.payment_status === 'cong_no') {
        // Ghi 1 dong dieu chinh MOI (khong sua dong 'no' goc) - dung nguyen tac append-only cua
        // debt_ledger, xem recordDebtAdjustment().
        recordDebtAdjustment({
          partnerId: receipt.partner_id,
          type: diff > 0 ? 'no' : 'tra',
          amount: Math.abs(diff),
          referenceType: 'receipt',
          referenceId: id,
          note: `Điều chỉnh do sửa đơn giá/chiết khấu phiếu ${receipt.code}`,
          createdBy,
        });
      } else {
        // da_thanh_toan (khong phai ton dau ky): phieu Chi tu dong (chi_mua_hang) da tao luc lap
        // phieu can sua lai amount cho khop - khong co co che "dieu chinh" rieng nhu debt_ledger
        // (cash_vouchers khong co is_adjustment), nen sua truc tiep dung 1 dong duy nhat truy vet
        // qua reference_type/reference_id - tien le giong updateStockReceiptDate() da tung sua
        // truc tiep cash_vouchers.created_at.
        if (newTotal <= 0) {
          throw new ServiceError('Tổng tiền phiếu sau khi sửa phải lớn hơn 0');
        }
        db.prepare("UPDATE cash_vouchers SET amount = ? WHERE reference_type = 'stock_receipt' AND reference_id = ?").run(
          newTotal,
          id
        );
      }
    }

    return id;
  });

  const receiptId = run();
  return db.prepare('SELECT * FROM stock_receipts WHERE id = ?').get(receiptId);
}

module.exports = {
  createStockReceipt,
  updateStockReceiptDate,
  assignStockReceiptPartner,
  updateStockReceiptPricing,
  ServiceError,
};
