// Route "Cau hinh thong bao" (migration 027, menu Cau hinh) - GET mo cho moi nguoi da dang
// nhap (dung de hien thi trang cau hinh + biet loai nao dang bat/tat), PUT rieng quyen module
// 'cau_hinh' - giong pattern warehouse-settings.routes.js/company-settings.routes.js.

const express = require('express');
const db = require('../db/database');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

function readReminderDaysInput(value) {
  if (!Array.isArray(value)) return null;
  const days = value.map((v) => Number(v));
  if (days.some((d) => !Number.isInteger(d) || d < 0)) return null;
  return [...new Set(days)].sort((a, b) => b - a).join(',');
}

router.get('/', (req, res) => {
  const settings = db.prepare('SELECT * FROM notification_settings WHERE id = 1').get();
  res.json({
    settings: {
      ...settings,
      supplier_payment_enabled: Boolean(settings.supplier_payment_enabled),
      customer_payment_enabled: Boolean(settings.customer_payment_enabled),
      birthday_enabled: Boolean(settings.birthday_enabled),
      birthday_reminder_days: settings.birthday_reminder_days
        .split(',')
        .map(Number)
        .filter((n) => Number.isInteger(n)),
    },
  });
});

router.put('/', requirePermission('cau_hinh'), (req, res) => {
  const body = req.body || {};

  const reminderDaysCsv = readReminderDaysInput(body.birthday_reminder_days);
  if (reminderDaysCsv === null) {
    return res.status(400).json({ error: 'Danh sach moc nhac sinh nhat khong hop le' });
  }

  db.prepare(
    `UPDATE notification_settings
     SET supplier_payment_enabled = ?, customer_payment_enabled = ?, birthday_enabled = ?, birthday_reminder_days = ?, updated_at = datetime('now')
     WHERE id = 1`
  ).run(
    body.supplier_payment_enabled ? 1 : 0,
    body.customer_payment_enabled ? 1 : 0,
    body.birthday_enabled ? 1 : 0,
    reminderDaysCsv
  );

  const settings = db.prepare('SELECT * FROM notification_settings WHERE id = 1').get();
  res.json({
    settings: {
      ...settings,
      supplier_payment_enabled: Boolean(settings.supplier_payment_enabled),
      customer_payment_enabled: Boolean(settings.customer_payment_enabled),
      birthday_enabled: Boolean(settings.birthday_enabled),
      birthday_reminder_days: settings.birthday_reminder_days
        .split(',')
        .map(Number)
        .filter((n) => Number.isInteger(n)),
    },
  });
});

module.exports = router;
