// Script backfill 1 LAN: tao lai phieu thu/chi trong So quy cho TOAN BO thanh toan cong no va
// phieu nhap/xuat kho "tra tien ngay" (khong cong no) da co TU TRUOC migration 035 (xem
// docs/DECISIONS.md 2026-08-07). KHONG chay tu dong qua migration runner (day la MUTATE du lieu
// tai chinh that, khac thay doi schema thuan) - phai chay tay 1 lan, sau khi migration 035 +
// code hook (debt.service.js/stockIssue.service.js/stockReceipt.service.js) da trien khai xong,
// va TRUOC KHI co giao dich moi (de ma phieu PT/PC sinh ra dung thu tu thoi gian).
//
// Mac dinh chay o che do DRY-RUN (chi in ra se tao bao nhieu phieu/tong tien, KHONG ghi gi vao
// DB). Chi thuc su ghi khi truyen --apply:
//
//   node scripts/backfillCashVouchers.js            (xem truoc)
//   node scripts/backfillCashVouchers.js --apply    (ghi that)
//
// Chan chay lan 2: neu da co bat ky cash_vouchers nao voi reference_type khac NULL, dung ngay -
// tranh tao trung phieu.

const db = require('../backend/db/database');
const { recordAutoVoucher } = require('../backend/services/cashVoucher.service');

const APPLY = process.argv.includes('--apply');

function alreadyBackfilled() {
  const row = db.prepare('SELECT COUNT(*) AS count FROM cash_vouchers WHERE reference_type IS NOT NULL').get();
  return row.count > 0;
}

// Cong thuc tinh tong tien PHAI khop dung voi createStockIssue()/createStockReceipt() dang dung
// khi tao phieu song (quantity * unit_price * (1 - discount_percent/100)).
function issueAmount(issueId) {
  const row = db
    .prepare('SELECT COALESCE(SUM(quantity * unit_price * (1 - discount_percent / 100.0)), 0) AS total FROM stock_issue_items WHERE issue_id = ?')
    .get(issueId);
  return row.total;
}

function receiptAmount(receiptId) {
  const row = db
    .prepare('SELECT COALESCE(SUM(quantity * unit_price * (1 - discount_percent / 100.0)), 0) AS total FROM stock_receipt_items WHERE receipt_id = ?')
    .get(receiptId);
  return row.total;
}

// Gom du lieu 3 nguon (thanh toan cong no + xuat/nhap tra tien ngay), da PHAN LOAI san theo dung
// systemKey se dung o recordAutoVoucher() - tra ve 2 mang da sap xep theo created_at TANG DAN
// rieng cho 'thu' va 'chi' (quan trong: giu dung thu tu thoi gian trong CUNG 1 loai de ma
// PT.../PC... sinh ra tang dan hop ly theo moc thoi gian that).
function collectEntries() {
  const payments = db
    .prepare(`
      SELECT dl.id, dl.partner_id, dl.amount, dl.note, dl.created_by, dl.created_at, dl.milestone_id,
             p.type AS partner_type, p.name AS partner_name
      FROM debt_ledger dl
      JOIN partners p ON p.id = dl.partner_id
      WHERE dl.type = 'tra' AND dl.reference_type = 'payment' AND dl.is_adjustment = 0
      ORDER BY dl.created_at ASC
    `)
    .all();

  const issues = db
    .prepare(`
      SELECT si.id, si.code, si.partner_id, si.created_by, si.created_at, si.note
      FROM stock_issues si
      WHERE si.payment_status = 'da_thu_tien' AND si.is_return = 0
      ORDER BY si.created_at ASC
    `)
    .all();

  const receipts = db
    .prepare(`
      SELECT sr.id, sr.code, sr.partner_id, sr.created_by, sr.created_at, sr.note
      FROM stock_receipts sr
      WHERE sr.payment_status = 'da_thanh_toan' AND sr.is_return = 0
      ORDER BY sr.created_at ASC
    `)
    .all();

  const thu = [];
  const chi = [];

  payments.forEach((p) => {
    const entry = {
      partnerId: p.partner_id,
      counterpartName: p.partner_name,
      amount: p.amount,
      note: p.note || '',
      referenceType: 'debt_payment',
      referenceId: p.id,
      createdBy: p.created_by,
      voucherDate: p.created_at,
    };
    if (p.partner_type === 'nha_cung_cap') {
      chi.push({ ...entry, type: 'chi', systemKey: 'chi_cong_no_ncc' });
    } else {
      thu.push({ ...entry, type: 'thu', systemKey: p.milestone_id ? 'thu_dot_thanh_toan_du_an' : 'thu_cong_no_kh' });
    }
  });

  issues.forEach((i) => {
    const partner = i.partner_id ? db.prepare('SELECT name FROM partners WHERE id = ?').get(i.partner_id) : null;
    thu.push({
      type: 'thu',
      systemKey: 'thu_ban_hang',
      partnerId: i.partner_id,
      counterpartName: partner ? partner.name : '',
      amount: issueAmount(i.id),
      note: `Xuất hàng bán - Phiếu ${i.code}`,
      referenceType: 'stock_issue',
      referenceId: i.id,
      createdBy: i.created_by,
      voucherDate: i.created_at,
    });
  });

  receipts.forEach((r) => {
    const partner = r.partner_id ? db.prepare('SELECT name FROM partners WHERE id = ?').get(r.partner_id) : null;
    chi.push({
      type: 'chi',
      systemKey: 'chi_mua_hang',
      partnerId: r.partner_id,
      counterpartName: partner ? partner.name : '',
      amount: receiptAmount(r.id),
      note: `Nhập hàng - Phiếu ${r.code}`,
      referenceType: 'stock_receipt',
      referenceId: r.id,
      createdBy: r.created_by,
      voucherDate: r.created_at,
    });
  });

  thu.sort((a, b) => (a.voucherDate < b.voucherDate ? -1 : 1));
  chi.sort((a, b) => (a.voucherDate < b.voucherDate ? -1 : 1));

  return { thu, chi };
}

function printSummary(thu, chi) {
  const sum = (arr) => arr.reduce((s, e) => s + e.amount, 0);
  console.log(`Phiếu THU sẽ tạo: ${thu.length} (tổng ${sum(thu).toLocaleString('vi-VN')}đ)`);
  console.log(`Phiếu CHI sẽ tạo: ${chi.length} (tổng ${sum(chi).toLocaleString('vi-VN')}đ)`);
}

function run() {
  if (alreadyBackfilled()) {
    console.error('Đã có phiếu tự động trong Sổ quỹ (reference_type khác NULL) - script này có vẻ đã chạy trước đó, dừng lại để tránh tạo trùng.');
    process.exit(1);
  }

  const { thu, chi } = collectEntries();

  if (!APPLY) {
    console.log('=== CHẾ ĐỘ XEM TRƯỚC (dry-run) - chưa ghi gì vào DB ===');
    printSummary(thu, chi);
    console.log('Chạy lại kèm --apply để ghi thật.');
    return;
  }

  const applyAll = db.transaction(() => {
    [...thu, ...chi].forEach((entry) => recordAutoVoucher(entry));
  });
  applyAll();

  console.log('=== ĐÃ GHI VÀO DB ===');
  printSummary(thu, chi);
}

if (require.main === module) {
  run();
}

module.exports = { collectEntries };
