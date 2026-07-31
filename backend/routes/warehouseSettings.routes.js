// Route cau hinh kho: dang key-value, mo rong dan khi phat sinh nhu cau (xem docs/PRD.md muc 4.8).
// Xem (GET) cho moi nguoi da dang nhap - can de kiem tra allow_negative_stock luc lap phieu xuat.
// Sua (PUT) chi danh cho ai co quyen module 'cau_hinh'.

const express = require('express');
const db = require('../db/database');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

// Danh sach key hop le, kiem tra tai day de tranh ghi key tuy y vao bang. Tat ca dang boolean
// hien tai - khi them key kieu khac (vd so/text) thi tach rieng danh sach, khong dung chung.
const BOOLEAN_KEYS = ['allow_negative_stock'];

function serializeSettings(rows) {
  const settings = {};
  rows.forEach((row) => {
    settings[row.key] = BOOLEAN_KEYS.includes(row.key) ? row.value === '1' : row.value;
  });
  return settings;
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM warehouse_settings').all();
  res.json({ settings: serializeSettings(rows) });
});

router.put('/', requirePermission('cau_hinh'), (req, res) => {
  const body = req.body || {};
  const keys = Object.keys(body);

  const invalid = keys.filter((key) => !BOOLEAN_KEYS.includes(key));
  if (invalid.length > 0) {
    return res.status(400).json({ error: `Cau hinh khong hop le: ${invalid.join(', ')}` });
  }

  const update = db.prepare("UPDATE warehouse_settings SET value = ?, updated_at = datetime('now') WHERE key = ?");
  const updateAll = db.transaction(() => {
    keys.forEach((key) => {
      update.run(body[key] ? '1' : '0', key);
    });
  });
  updateAll();

  const rows = db.prepare('SELECT key, value FROM warehouse_settings').all();
  res.json({ settings: serializeSettings(rows) });
});

module.exports = router;
