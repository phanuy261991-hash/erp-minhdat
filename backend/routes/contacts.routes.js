// Route "Doi tac" (migration 026, them "So thich" + endpoint sinh nhat o migration 027) - danh
// ba lien he ca nhan, doc lap hoan toan voi Nha cung cap/Khach hang (bang partners). Quyen module
// 'doi_tac' ap dung rieng tung route (khong con gan o server.js) vi GET /birthdays-this-month
// phai MO CHO MOI TAI KHOAN da dang nhap (dung cho card sinh nhat o trang Tong quan, khong phan
// biet quyen module - giong tinh than "moi tai khoan dang hoat dong deu nhan thong bao sinh
// nhat", xem docs/DECISIONS.md muc 2026-08-05). Rieng XOA chi danh cho Admin (is_protected).

const express = require('express');
const db = require('../db/database');
const { requirePermission } = require('../middleware/requirePermission');
const notificationService = require('../services/notification.service');

const router = express.Router();

function readContactInput(body) {
  return {
    fullName: (body.full_name || '').trim(),
    phone: (body.phone || '').trim(),
    address: (body.address || '').trim(),
    occupation: (body.occupation || '').trim(),
    dateOfBirth: body.date_of_birth || null,
    hobby: (body.hobby || '').trim(),
    note: (body.note || '').trim(),
  };
}

// Danh sach doi tac co sinh nhat trong THANG HIEN TAI (gio VN) - dung cho card o dashboard.html.
// Dat TRUOC 'GET /' de khong lien quan thu tu (khong co GET '/:id' nen thuc ra khong xung dot),
// giu thoi quen dat route cu the truoc route chung cua du an.
router.get('/birthdays-this-month', (req, res) => {
  const today = notificationService.todayVN();
  const currentMonth = today.slice(5, 7); // 'MM'

  const contacts = db
    .prepare(
      `SELECT id, full_name, date_of_birth
       FROM contacts
       WHERE date_of_birth IS NOT NULL AND date_of_birth != '' AND strftime('%m', date_of_birth) = ?
       ORDER BY strftime('%d', date_of_birth) ASC`
    )
    .all(currentMonth);

  const result = contacts.map((c) => {
    const daysUntil = notificationService.daysUntilNextBirthday(c.date_of_birth, today);
    return {
      id: c.id,
      full_name: c.full_name,
      date_of_birth: c.date_of_birth,
      days_until: daysUntil,
      is_soon: daysUntil >= 0 && daysUntil <= 3,
    };
  });

  res.json({ contacts: result });
});

router.get('/', requirePermission('doi_tac'), (req, res) => {
  const contacts = db.prepare('SELECT * FROM contacts ORDER BY full_name ASC').all();
  res.json({ contacts });
});

router.post('/', requirePermission('doi_tac'), (req, res) => {
  const input = readContactInput(req.body || {});
  if (!input.fullName) {
    return res.status(400).json({ error: 'Thieu Ho va ten' });
  }

  const result = db
    .prepare(
      'INSERT INTO contacts (full_name, phone, address, occupation, date_of_birth, hobby, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(input.fullName, input.phone, input.address, input.occupation, input.dateOfBirth, input.hobby, input.note, req.session.user.id);

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ contact });
});

router.put('/:id', requirePermission('doi_tac'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM contacts WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay doi tac' });
  }

  const input = readContactInput(req.body || {});
  if (!input.fullName) {
    return res.status(400).json({ error: 'Thieu Ho va ten' });
  }

  db
    .prepare(
      "UPDATE contacts SET full_name = ?, phone = ?, address = ?, occupation = ?, date_of_birth = ?, hobby = ?, note = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .run(input.fullName, input.phone, input.address, input.occupation, input.dateOfBirth, input.hobby, input.note, id);

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  res.json({ contact });
});

// Xoa cung: chi Admin (is_protected), bat ke vai tro dang dang nhap co quyen module 'doi_tac'
// hay khong - theo yeu cau nguoi dung 2026-08-05. Khong bang nao khac tham chieu contacts.id
// nen khong can kiem tra "da co lich su".
router.delete('/:id', requirePermission('doi_tac'), (req, res) => {
  if (!req.session.user.is_protected) {
    return res.status(403).json({ error: 'Chi Admin moi co the xoa doi tac' });
  }

  const existing = db.prepare('SELECT id FROM contacts WHERE id = ?').get(Number(req.params.id));
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay doi tac' });
  }

  db.prepare('DELETE FROM contacts WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
