// Route cau hinh thong tin cong ty: dung de hien thi tren mau in phieu xuat kho (xem docs/PRD.md muc 4.7).
// Chi 1 dong duy nhat (id = 1). Xem (GET) cho moi nguoi da dang nhap - can de render trang in.
// Sua (PUT) chi danh cho ai co quyen module 'cau_hinh'.

const express = require('express');
const db = require('../db/database');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

// Thu tu phai khop dung thu tu cot trong cau SET ben duoi.
const TEXT_FIELDS = [
  'company_name',
  'address',
  'tax_code',
  'email',
  'website',
  'bank_name',
  'bank_branch',
  'bank_account_number',
  'bank_account_holder',
  'print_note',
];

// phones luu dang mang JSON trong 1 cot TEXT (cho nhap tu 2 so tro len) - khong tach bang
// rieng vi luon gan voi dung 1 dong company_settings duy nhat, khong can quan he/join.
function serializeSettings(row) {
  let phones;
  try {
    phones = JSON.parse(row.phones || '[]');
  } catch (err) {
    phones = [];
  }
  return { ...row, phones };
}

router.get('/', (req, res) => {
  const settings = db.prepare('SELECT * FROM company_settings WHERE id = 1').get();
  res.json({ settings: serializeSettings(settings) });
});

router.put('/', requirePermission('cau_hinh'), (req, res) => {
  const body = req.body || {};
  const textValues = TEXT_FIELDS.map((field) => (body[field] !== undefined ? String(body[field]).trim() : ''));

  const phonesInput = Array.isArray(body.phones) ? body.phones : [];
  const phones = phonesInput.map((p) => String(p).trim()).filter((p) => p.length > 0);

  db.prepare(`
    UPDATE company_settings
    SET company_name = ?, address = ?, tax_code = ?, email = ?, website = ?,
        bank_name = ?, bank_branch = ?, bank_account_number = ?, bank_account_holder = ?,
        print_note = ?, phones = ?, updated_at = datetime('now')
    WHERE id = 1
  `).run(...textValues, JSON.stringify(phones));

  const settings = db.prepare('SELECT * FROM company_settings WHERE id = 1').get();
  res.json({ settings: serializeSettings(settings) });
});

module.exports = router;
