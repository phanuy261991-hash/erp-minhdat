// Route "Cau hinh mau in" (migration 028, viet lai hoan toan o migration 040 theo yeu cau nguoi
// dung 2026-08-19 - chuyen tu contenteditable + table_columns JSON sang 1 khung HTML/CSS THAT
// duy nhat, xem docs/DECISIONS.md). Moi loai phieu (type, vd 'stock_issue') chi co dung 1 mau,
// sua truc tiep - khong co khai niem nhieu mau/loai. GET mo cho moi tai khoan da dang nhap (trang
// in phieu thuc te can doc mau de render, khong doi quyen 'kho'), PUT rieng yeu cau quyen
// 'cau_hinh' - giong het pattern companySettings.routes.js.

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db/database');
const { requirePermission } = require('../middleware/requirePermission');
const { PRINT_TEMPLATE_TYPES } = require('../config/printTemplateTokens');

const router = express.Router();

// Dinh kem hinh anh vao mau in (2026-08-06, theo yeu cau nguoi dung - vd ma QR code thanh toan)
// - tra ve URL tinh de frontend tu chen doan <img src="..."> vao dung vi tri con tro trong o
// soan thao (khong con la vung contenteditable tu migration 040, nhung co che upload khong doi).
// Luu file that vao data/print-template-uploads/<type>/ (memoryStorage roi tu ghi dia, giong
// pattern products.routes.js#import), KHONG luu trong repo (xem .gitignore) vi day la du lieu
// runtime nguoi dung tai len, khac anh thuong hieu tinh (frontend/assets/images/).
const IMAGE_MIME_EXTENSIONS = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!IMAGE_MIME_EXTENSIONS[file.mimetype]) {
      return cb(new Error('Chỉ chấp nhận hình ảnh định dạng PNG, JPG, WEBP hoặc GIF'));
    }
    cb(null, true);
  },
});

// Cung 1 quy uoc danh dau khoi lap dong san pham voi frontend/assets/print-template-render.js -
// PHAI khop dung cu phap (khong dung chung 1 file vi day la 2 moi truong khac nhau: backend chi
// dung regex thuan de VALIDATE token, khong render).
const ITEMS_BLOCK_PATTERN = /<!--\s*items:start\s*-->([\s\S]*?)<!--\s*items:end\s*-->/;
const CONDITIONAL_IF_PATTERN = /<!--\s*if:([A-Za-z0-9_.]+)\s*-->/g;
const TOKEN_PATTERN = /\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g;

function extractTokenKeys(text) {
  const keys = new Set();
  let match = TOKEN_PATTERN.exec(text);
  while (match) {
    keys.add(match[1]);
    match = TOKEN_PATTERN.exec(text);
  }
  return keys;
}

function extractConditionalKeys(text) {
  const keys = new Set();
  let match = CONDITIONAL_IF_PATTERN.exec(text);
  while (match) {
    keys.add(match[1]);
    match = CONDITIONAL_IF_PATTERN.exec(text);
  }
  return keys;
}

// Kiem tra toan bo {{...}} va <!-- if:... --> xuat hien trong template_html co khop dung
// whitelist token cua dung loai phieu hay khong (bat loi go sai ten token TRUOC khi luu, thay vi
// de nguoi dung phat hien luc in phieu that ra o rong). Token BEN TRONG khoi
// <!-- items:start -->...<!-- items:end --> phai thuoc danh sach 'item' (key da co san prefix
// "Item." trong config, vd 'Item.ProductName'); token o NGOAI khoi do (ke ca dieu kien if:) phai
// thuoc danh sach 'document'. Tra ve mang ten token khong hop le (rong = hop le).
function findInvalidTokens(templateHtml, def) {
  const documentKeys = new Set(def.tokens.document.map((t) => t.key));
  const itemKeys = new Set(def.tokens.item.map((t) => t.key));

  const itemsMatch = def.hasItems ? templateHtml.match(ITEMS_BLOCK_PATTERN) : null;
  const itemsBlockText = itemsMatch ? itemsMatch[1] : '';
  const outsideText = itemsMatch ? templateHtml.replace(ITEMS_BLOCK_PATTERN, '') : templateHtml;

  const invalid = new Set();
  extractTokenKeys(outsideText).forEach((key) => {
    if (!documentKeys.has(key)) invalid.add(key);
  });
  extractConditionalKeys(templateHtml).forEach((key) => {
    if (!documentKeys.has(key)) invalid.add(key);
  });
  extractTokenKeys(itemsBlockText).forEach((key) => {
    if (!itemKeys.has(key)) invalid.add(key);
  });

  return Array.from(invalid);
}

function serialize(row) {
  return { ...row };
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM print_templates ORDER BY id ASC').all();
  res.json({ templates: rows.map(serialize) });
});

router.get('/:type', (req, res) => {
  if (!PRINT_TEMPLATE_TYPES[req.params.type]) {
    return res.status(404).json({ error: 'Loại mẫu in không tồn tại' });
  }
  const row = db.prepare('SELECT * FROM print_templates WHERE type = ?').get(req.params.type);
  if (!row) {
    return res.status(404).json({ error: 'Chưa có mẫu in cho loại này' });
  }
  res.json({ template: serialize(row) });
});

// Danh sach token kha dung (panel "Token tham chieu") - dung cho trang chinh sua mau in.
router.get('/:type/tokens', (req, res) => {
  const def = PRINT_TEMPLATE_TYPES[req.params.type];
  if (!def) {
    return res.status(404).json({ error: 'Loại mẫu in không tồn tại' });
  }
  res.json({ tokens: def.tokens, hasItems: def.hasItems });
});

// Noi dung mac dinh ("factory default") - dung cho nut "Dat lai" o trang chinh sua, khong doi gi
// du du lieu trong bang print_templates da bi nguoi dung sua truoc do. Doc truc tiep tu file
// .html trong backend/config/print-template-defaults/ (de dang xem/sua bang tay hon 1 string JS
// dai) - moi lan goi doc lai file, khong cache, vi day la thao tac hiem (chi luc bam "Dat lai").
router.get('/:type/default', (req, res) => {
  const def = PRINT_TEMPLATE_TYPES[req.params.type];
  if (!def) {
    return res.status(404).json({ error: 'Loại mẫu in không tồn tại' });
  }
  const templateHtml = fs.readFileSync(def.defaultTemplatePath, 'utf8');
  res.json({
    name: def.name,
    orientation: def.defaultOrientation,
    template_html: templateHtml,
  });
});

router.put('/:type', requirePermission('cau_hinh'), (req, res) => {
  const def = PRINT_TEMPLATE_TYPES[req.params.type];
  if (!def) {
    return res.status(404).json({ error: 'Loại mẫu in không tồn tại' });
  }
  const existing = db.prepare('SELECT id FROM print_templates WHERE type = ?').get(req.params.type);
  if (!existing) {
    return res.status(404).json({ error: 'Chưa có mẫu in cho loại này' });
  }

  const { template_html: templateHtml, orientation } = req.body || {};

  if (typeof templateHtml !== 'string' || !templateHtml.trim()) {
    return res.status(400).json({ error: 'Nội dung mẫu in không được để trống' });
  }
  if (orientation !== 'portrait' && orientation !== 'landscape') {
    return res.status(400).json({ error: 'Khổ giấy không hợp lệ' });
  }

  const invalidTokens = findInvalidTokens(templateHtml, def);
  if (invalidTokens.length > 0) {
    return res.status(400).json({
      error: `Mẫu in chứa token không hợp lệ: ${invalidTokens.map((t) => `{{${t}}}`).join(', ')}`,
      invalidTokens,
    });
  }

  db.prepare(`
    UPDATE print_templates
    SET template_html = ?, orientation = ?, updated_at = datetime('now'), updated_by = ?
    WHERE type = ?
  `).run(templateHtml, orientation, req.session.user.id, req.params.type);

  const row = db.prepare('SELECT * FROM print_templates WHERE type = ?').get(req.params.type);
  res.json({ template: serialize(row) });
});

// Tai 1 hinh anh len de chen vao mau in (nut "Chen hinh anh" o print-template-edit.js) - tra ve
// URL tinh de frontend tu chen doan <img src="..."> vao dung vi tri con tro trong o soan thao.
router.post('/:type/images', requirePermission('cau_hinh'), uploadImage.single('file'), (req, res) => {
  if (!PRINT_TEMPLATE_TYPES[req.params.type]) {
    return res.status(404).json({ error: 'Loại mẫu in không tồn tại' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Chưa chọn hình ảnh để tải lên' });
  }

  const uploadDir = path.join(db.dataDir, 'print-template-uploads', req.params.type);
  fs.mkdirSync(uploadDir, { recursive: true });

  const ext = IMAGE_MIME_EXTENSIONS[req.file.mimetype];
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);

  res.json({ url: `/uploads/print-templates/${req.params.type}/${filename}` });
});

// Loi rieng cua multer/fileFilter (vd file qua 3MB, sai dinh dang) - tra JSON thay vi de Express
// roi ve trang loi HTML mac dinh, dong bo voi cach products.routes.js#import da lam.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Hình ảnh vượt quá dung lượng cho phép (3MB)' : 'Lỗi khi tải hình ảnh lên';
    return res.status(400).json({ error: message });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'Lỗi khi tải hình ảnh lên' });
  }
  next();
});

module.exports = router;
