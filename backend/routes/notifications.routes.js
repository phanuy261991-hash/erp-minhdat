// Route "Thong bao" (migration 027) - GET mo cho MOI tai khoan da dang nhap (moi tai khoan dang
// hoat dong deu nhan thong bao, khong phan biet quyen module - xem docs/DECISIONS.md muc
// 2026-08-05). Danh dau da doc RIENG TUNG USER (bang notification_reads).

const express = require('express');
const db = require('../db/database');
const notificationService = require('../services/notification.service');

const router = express.Router();

router.get('/', (req, res) => {
  notificationService.ensureBirthdayNotifications();

  const userId = req.session.user.id;
  const notifications = db
    .prepare(
      `SELECT n.*, CASE WHEN nr.notification_id IS NULL THEN 0 ELSE 1 END AS is_read
       FROM notifications n
       LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`
    )
    .all(userId);

  res.json({ notifications: notifications.map((n) => ({ ...n, is_read: Boolean(n.is_read) })) });
});

router.get('/unread-count', (req, res) => {
  notificationService.ensureBirthdayNotifications();

  const userId = req.session.user.id;
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM notifications n
       WHERE NOT EXISTS (SELECT 1 FROM notification_reads nr WHERE nr.notification_id = n.id AND nr.user_id = ?)`
    )
    .get(userId);

  res.json({ unread_count: row.count });
});

router.post('/:id/read', (req, res) => {
  const userId = req.session.user.id;
  const notificationId = Number(req.params.id);

  const notification = db.prepare('SELECT id FROM notifications WHERE id = ?').get(notificationId);
  if (!notification) {
    return res.status(404).json({ error: 'Khong tim thay thong bao' });
  }

  db.prepare('INSERT OR IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)').run(notificationId, userId);
  res.json({ ok: true });
});

router.post('/read-all', (req, res) => {
  const userId = req.session.user.id;

  db.prepare(
    `INSERT OR IGNORE INTO notification_reads (notification_id, user_id)
     SELECT id, ? FROM notifications
     WHERE id NOT IN (SELECT notification_id FROM notification_reads WHERE user_id = ?)`
  ).run(userId, userId);

  res.json({ ok: true });
});

module.exports = router;
