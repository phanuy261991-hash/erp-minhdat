// Route cau hinh kho: dang key-value, mo rong dan khi phat sinh nhu cau (xem docs/PRD.md muc 4.8).
// Xem (GET) cho moi nguoi da dang nhap - can de kiem tra allow_negative_stock luc lap phieu xuat.
// Sua (PUT) chi danh cho ai co quyen module 'cau_hinh'.

const express = require('express');
const db = require('../db/database');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

// Danh sach key hop le, kiem tra tai day de tranh ghi key tuy y vao bang.
const BOOLEAN_KEYS = ['allow_negative_stock'];
// Key dang lua chon 1 trong nhieu gia tri co dinh (khac boolean) - them key moi thi khai bao
// them 1 dong o day, khong dung chung logic voi BOOLEAN_KEYS.
const ENUM_KEYS = {
  costing_method: ['binh_quan_gia_quyen', 'fifo'],
};

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

  const invalidKeys = keys.filter((key) => !BOOLEAN_KEYS.includes(key) && !ENUM_KEYS[key]);
  if (invalidKeys.length > 0) {
    return res.status(400).json({ error: `Cau hinh khong hop le: ${invalidKeys.join(', ')}` });
  }

  const invalidEnumValue = keys.find((key) => ENUM_KEYS[key] && !ENUM_KEYS[key].includes(body[key]));
  if (invalidEnumValue) {
    return res.status(400).json({ error: `Gia tri khong hop le cho ${invalidEnumValue}: ${body[invalidEnumValue]}` });
  }

  const update = db.prepare("UPDATE warehouse_settings SET value = ?, updated_at = datetime('now') WHERE key = ?");
  const updateAll = db.transaction(() => {
    keys.forEach((key) => {
      const value = BOOLEAN_KEYS.includes(key) ? (body[key] ? '1' : '0') : String(body[key]);
      update.run(value, key);
    });
  });
  updateAll();

  const rows = db.prepare('SELECT key, value FROM warehouse_settings').all();
  res.json({ settings: serializeSettings(rows) });
});

module.exports = router;
