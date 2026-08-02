// Service Phieu thu/Phieu chi (module "So quy", migration 019). Doc lap hoan toan voi
// debt_ledger (khong ghi cong no) - xem docs/DECISIONS.md. Khong co ham sua (chi tao + xoa cung,
// dung quyen module 'so_quy', khong can rang buoc lich su vi khong bang nao tham chieu nguoc).

const db = require('../db/database');

class ServiceError extends Error {}

const SELECT_VOUCHER = `
  SELECT v.id, v.code, v.type, v.category_id, c.name AS category_name,
         v.counterpart_name, v.handled_by, h.full_name AS handled_by_name,
         v.amount, v.note, v.record_business_result,
         v.created_by, u.full_name AS created_by_name, v.created_at
  FROM cash_vouchers v
  JOIN cash_categories c ON c.id = v.category_id
  LEFT JOIN users h ON h.id = v.handled_by
  JOIN users u ON u.id = v.created_by
`;

function generateVoucherCode(type) {
  const prefix = type === 'thu' ? 'PT' : 'PC';
  const row = db.prepare('SELECT code FROM cash_vouchers WHERE type = ? ORDER BY id DESC LIMIT 1').get(type);
  const lastNumber = row ? parseInt(row.code.replace(prefix, ''), 10) : 0;
  return `${prefix}${String(lastNumber + 1).padStart(6, '0')}`;
}

// Nguoi dung o Viet Nam (UTC+7, khong DST), nhung created_at luu UTC (giong moi bang khac trong
// du an - xem toSqliteDatetime() o frontend/assets/stock-receipts.js). Tinh "thang nay" theo gio
// UTC tho se lech 7 gio quanh nua dem, phan loai sai phieu - phai tru offset VN truoc khi doi
// sang chuoi UTC de so sanh voi created_at. Khong dung thu vien timezone, hardcode +7h co dinh.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

// month: 'YYYY-MM' (thang duong lich theo gio VN). Tra ve { startUtc, endUtc } dang chuoi
// 'YYYY-MM-DD HH:MM:SS' (UTC, khong hau to 'Z') - cung dinh dang voi created_at da luu, so sanh
// truc tiep bang < / >= la dung (chuoi zero-pad sap xep giong thu tu thoi gian).
function monthBoundsUtc(monthStr) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthStr || '');
  if (!match) {
    throw new ServiceError('Thang khong hop le, dinh dang YYYY-MM');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new ServiceError('Thang khong hop le, dinh dang YYYY-MM');
  }

  const startLocalAsUtcMs = Date.UTC(year, month - 1, 1, 0, 0, 0);
  const endLocalAsUtcMs = Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1, 0, 0, 0);
  const toSqlite = (ms) => new Date(ms - VN_OFFSET_MS).toISOString().slice(0, 19).replace('T', ' ');

  return { startUtc: toSqlite(startLocalAsUtcMs), endUtc: toSqlite(endLocalAsUtcMs) };
}

function sumByType(whereClause, params) {
  const row = db
    .prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'thu' THEN amount ELSE 0 END), 0) AS total_in,
        COALESCE(SUM(CASE WHEN type = 'chi' THEN amount ELSE 0 END), 0) AS total_out
      FROM cash_vouchers
      WHERE ${whereClause}
    `)
    .get(...params);
  return row;
}

// Tong hop Quy dau ky/Tong thu/Tong chi/Ton quy cho 1 thang - tat ca tinh truc tiep tu SUM,
// khong luu so co dinh (dung nguyen tac ledger xuyen suot du an).
function getCashBookSummary(month) {
  const { startUtc, endUtc } = monthBoundsUtc(month);
  const settings = db.prepare('SELECT opening_balance FROM cash_book_settings WHERE id = 1').get();

  const before = sumByType('created_at < ?', [startUtc]);
  const openingBalance = settings.opening_balance + before.total_in - before.total_out;

  const within = sumByType('created_at >= ? AND created_at < ?', [startUtc, endUtc]);
  const closingBalance = openingBalance + within.total_in - within.total_out;

  return {
    opening_balance: openingBalance,
    total_in: within.total_in,
    total_out: within.total_out,
    closing_balance: closingBalance,
  };
}

function listVouchers(month) {
  const { startUtc, endUtc } = monthBoundsUtc(month);
  return db
    .prepare(`${SELECT_VOUCHER} WHERE v.created_at >= ? AND v.created_at < ? ORDER BY v.created_at DESC, v.id DESC`)
    .all(startUtc, endUtc);
}

// voucherDate (tuy chon, 'YYYY-MM-DD HH:MM:SS'): dung lam created_at that cho phieu - giong
// receiptDate cua stockReceipt.service.js, quyet dinh phieu thuoc thang nao. Khong truyen thi
// dung thoi diem hien tai.
function createCashVoucher({ type, categoryId, counterpartName, handledBy, amount, note, recordBusinessResult, voucherDate, createdBy }) {
  if (!['thu', 'chi'].includes(type)) {
    throw new ServiceError('Loai phieu khong hop le');
  }
  if (!(Number(amount) > 0)) {
    throw new ServiceError('So tien phai lon hon 0');
  }

  const category = db.prepare('SELECT id, type FROM cash_categories WHERE id = ?').get(categoryId);
  if (!category) {
    throw new ServiceError('Khong tim thay loai thu/chi');
  }
  // SQLite khong CHECK cheo bang duoc - phai validate o tang service rang danh muc dung chieu
  // voi phieu (vd khong the tao phieu chi nhung chon nham danh muc thuoc loai thu).
  if (category.type !== type) {
    throw new ServiceError('Loai thu/chi khong khop voi loai phieu');
  }

  if (handledBy) {
    const staff = db.prepare('SELECT id FROM users WHERE id = ? AND is_active = 1').get(handledBy);
    if (!staff) {
      throw new ServiceError('Nguoi thu/chi khong hop le');
    }
  }

  const run = db.transaction(() => {
    const timestamp = voucherDate || db.prepare("SELECT datetime('now') AS now").get().now;
    const code = generateVoucherCode(type);

    const result = db
      .prepare(`
        INSERT INTO cash_vouchers
          (code, type, category_id, counterpart_name, handled_by, amount, note, record_business_result, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        code,
        type,
        categoryId,
        counterpartName || '',
        handledBy || null,
        Number(amount),
        note || '',
        recordBusinessResult ? 1 : 0,
        createdBy,
        timestamp
      );

    return result.lastInsertRowid;
  });

  const voucherId = run();
  return db.prepare(`${SELECT_VOUCHER} WHERE v.id = ?`).get(voucherId);
}

function deleteCashVoucher(id) {
  const result = db.prepare('DELETE FROM cash_vouchers WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = {
  generateVoucherCode,
  monthBoundsUtc,
  getCashBookSummary,
  listVouchers,
  createCashVoucher,
  deleteCashVoucher,
  ServiceError,
};
