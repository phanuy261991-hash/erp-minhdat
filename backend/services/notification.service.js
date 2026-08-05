// Service he thong thong bao (migration 027) - 3 loai: thanh toan cong no NCC, thanh toan cong
// no KH (goi tu debt.service.js#recordPayment), sinh nhat doi tac (quet LUOI moi ngay, khong
// dung cron/setInterval - dung nguyen tac "tinh on-the-fly" xuyen suot du an, xem docs/DECISIONS.md
// muc 2026-08-05 "He thong thong bao: TAM DUNG..."). Moi tai khoan dang hoat dong deu nhan, danh
// dau da doc RIENG TUNG USER (bang notification_reads).

const db = require('../db/database');

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
function todayVN() {
  return new Date(Date.now() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

function getSettings() {
  return db.prepare('SELECT * FROM notification_settings WHERE id = 1').get();
}

// dedupeKey (tuy chon): neu da ton tai thong bao cung dedupe_key thi bo qua, khong tao trung -
// dung cho sinh nhat vi ham quet co the chay lai nhieu lan cung 1 "moc" nhac.
function createNotification({ type, title, message, referenceType, referenceId, dedupeKey }) {
  if (dedupeKey) {
    const existing = db.prepare('SELECT id FROM notifications WHERE dedupe_key = ?').get(dedupeKey);
    if (existing) return existing.id;
  }
  const result = db
    .prepare(
      'INSERT INTO notifications (type, title, message, reference_type, reference_id, dedupe_key) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(type, title, message || '', referenceType || null, referenceId || null, dedupeKey || null);
  return result.lastInsertRowid;
}

// Cau chu message theo dung mau nguoi dung yeu cau (2026-08-05) - dung chung cho ca dong trong
// chuong thong bao lan popup toast realtime o frontend, tranh 2 noi tu dinh nghia 2 cach khac
// nhau cho cung 1 su kien.
function notifySupplierPayment({ partnerId, partnerName, amount }) {
  const settings = getSettings();
  if (!settings.supplier_payment_enabled) return;
  createNotification({
    type: 'supplier_payment',
    title: 'Thông báo thanh toán công nợ',
    message: `Thông báo thanh toán công nợ: Nhà cung cấp "${partnerName}" đã được thanh toán số tiền ${Number(amount).toLocaleString('vi-VN')}`,
    referenceType: 'supplier_debt',
    referenceId: partnerId,
  });
}

function notifyCustomerPayment({ partnerId, partnerName, amount }) {
  const settings = getSettings();
  if (!settings.customer_payment_enabled) return;
  createNotification({
    type: 'customer_payment',
    title: 'Thông báo thanh toán công nợ',
    message: `Thông báo thanh toán công nợ: Khách hàng "${partnerName}" đã thanh toán số tiền ${Number(amount).toLocaleString('vi-VN')}`,
    referenceType: 'customer_debt',
    referenceId: partnerId,
  });
}

// Doc danh sach moc nhac (CSV) thanh mang so nguyen khong am, bo qua gia tri khong hop le.
function parseReminderDays(csv) {
  return (csv || '')
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 0);
}

// So ngay tu "today" (YYYY-MM-DD) den lan sinh nhat sap toi gan nhat (>=0) - neu da qua trong
// nam nay thi tinh sang moc nam sau. Dung Date.UTC (giong diffDaysBetween cua project.service.js)
// de tranh sai lech do DST khi tru truc tiep 2 chuoi ngay.
function daysUntilNextBirthday(dateOfBirth, today) {
  const [, m, d] = dateOfBirth.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  let targetUtc = Date.UTC(ty, m - 1, d);
  if (targetUtc < todayUtc) {
    targetUtc = Date.UTC(ty + 1, m - 1, d);
  }
  return Math.round((targetUtc - todayUtc) / 86400000);
}

// Quet LUOI moi lan goi (tu GET /notifications lan GET /notifications/unread-count) - AN TOAN
// goi lai nhieu lan nho dedupe_key (UNIQUE, xem createNotification()) nen khong tao thong bao
// trung. Co tinh KHONG gate theo "da quet trong ngay chua": neu chi quet 1 lan/ngay, doi tac
// them MOI sau thoi diem quet se bi bo lo hoan toan moc nhac ngay hom do (vd them doi tac sinh
// nhat con dung 3 ngay sau khi da quet xong hom nay se khong bao gio duoc nhac lai, vi ngay mai
// so ngay con lai la 2 - khong khop moc nao trong danh sach). Chi phi quet lai (SELECT contacts,
// bang nho, <20 nguoi dung dong thoi) khong dang ke o quy mo du an nay.
function ensureBirthdayNotifications() {
  const settings = getSettings();
  const today = todayVN();

  if (settings.birthday_enabled) {
    const reminderDays = parseReminderDays(settings.birthday_reminder_days);
    if (reminderDays.length > 0) {
      const contacts = db
        .prepare("SELECT id, full_name, date_of_birth FROM contacts WHERE date_of_birth IS NOT NULL AND date_of_birth != ''")
        .all();

      contacts.forEach((contact) => {
        const daysUntil = daysUntilNextBirthday(contact.date_of_birth, today);
        if (!reminderDays.includes(daysUntil)) return;

        const message =
          daysUntil === 0
            ? `Thông báo sinh nhật: Hôm nay là sinh nhật đối tác "${contact.full_name}"`
            : `Thông báo sinh nhật: Sinh nhật đối tác "${contact.full_name}" sẽ diễn ra trong ${daysUntil} ngày tới`;

        createNotification({
          type: 'birthday',
          title: 'Thông báo sinh nhật',
          message,
          referenceType: 'contact',
          referenceId: contact.id,
          dedupeKey: `birthday:${contact.id}:${today}:${daysUntil}`,
        });
      });
    }
  }

  db.prepare("UPDATE notification_settings SET last_birthday_check_date = ? WHERE id = 1").run(today);
}

module.exports = {
  todayVN,
  getSettings,
  notifySupplierPayment,
  notifyCustomerPayment,
  ensureBirthdayNotifications,
  daysUntilNextBirthday,
};
