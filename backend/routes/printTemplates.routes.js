// Route "Cau hinh mau in" (migration 028, theo yeu cau nguoi dung 2026-08-05). Moi loai phieu
// (type, vd 'stock_issue') chi co dung 1 mau, sua truc tiep - khong co khai niem nhieu mau/loai.
// GET mo cho moi tai khoan da dang nhap (trang in phieu thuc te can doc mau de render, khong doi
// quyen 'kho'), PUT rieng yeu cau quyen 'cau_hinh' - giong het pattern companySettings.routes.js.

const express = require('express');
const db = require('../db/database');
const { requirePermission } = require('../middleware/requirePermission');
const { PRINT_TEMPLATE_TYPES } = require('../config/printTemplateTokens');

const router = express.Router();

function serialize(row) {
  return {
    ...row,
    table_columns: JSON.parse(row.table_columns || '[]'),
    show_amount_in_words: row.show_amount_in_words === 1,
  };
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

// Danh sach token kha dung (dropdown "Chen truong thong tin") + danh sach cot bang san pham -
// dung cho trang chinh sua mau in.
router.get('/:type/tokens', (req, res) => {
  const def = PRINT_TEMPLATE_TYPES[req.params.type];
  if (!def) {
    return res.status(404).json({ error: 'Loại mẫu in không tồn tại' });
  }
  res.json({ tokens: def.tokens, tableColumns: def.tableColumns, hasTable: def.hasTable });
});

// Noi dung mac dinh ("factory default") - dung cho nut "Dat lai" o trang chinh sua, khong doi
// gi du du lieu trong bang print_templates da bi nguoi dung sua truoc do.
router.get('/:type/default', (req, res) => {
  const def = PRINT_TEMPLATE_TYPES[req.params.type];
  if (!def) {
    return res.status(404).json({ error: 'Loại mẫu in không tồn tại' });
  }
  res.json({
    name: def.name,
    orientation: def.defaultOrientation,
    header_html: def.defaultHeaderHtml,
    footer_html: def.defaultFooterHtml,
    table_columns: def.defaultTableColumns,
    show_amount_in_words: def.defaultShowAmountInWords,
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

  const {
    header_html: headerHtml,
    footer_html: footerHtml,
    table_columns: tableColumns,
    orientation,
    show_amount_in_words: showAmountInWords,
  } = req.body || {};

  if (typeof headerHtml !== 'string' || typeof footerHtml !== 'string') {
    return res.status(400).json({ error: 'Thiếu nội dung đầu trang/chân trang' });
  }
  if (orientation !== 'portrait' && orientation !== 'landscape') {
    return res.status(400).json({ error: 'Khổ giấy không hợp lệ' });
  }
  // table_columns: mang object {key, width} - width la ti le tuong doi (khong bat buoc tong = 100,
  // xem chu thich o backend/config/printTemplateTokens.js). Loai phieu khong co bang san pham
  // (hasTable=false, vd "Giay de nghi tam ung") luon luu '[]', khong validate cot.
  let tableColumnsToSave = [];
  if (def.hasTable) {
    const validKeys = new Set(def.tableColumns.map((c) => c.key));
    const isValidColumn = (c) =>
      c && typeof c.key === 'string' && validKeys.has(c.key) && Number.isFinite(Number(c.width)) && Number(c.width) > 0;
    if (!Array.isArray(tableColumns) || tableColumns.length === 0 || !tableColumns.every(isValidColumn)) {
      return res.status(400).json({ error: 'Danh sách cột bảng sản phẩm không hợp lệ' });
    }
    tableColumnsToSave = tableColumns;
  }

  db.prepare(`
    UPDATE print_templates
    SET header_html = ?, footer_html = ?, table_columns = ?, orientation = ?, show_amount_in_words = ?,
        updated_at = datetime('now'), updated_by = ?
    WHERE type = ?
  `).run(
    headerHtml,
    footerHtml,
    JSON.stringify(tableColumnsToSave),
    orientation,
    showAmountInWords ? 1 : 0,
    req.session.user.id,
    req.params.type
  );

  const row = db.prepare('SELECT * FROM print_templates WHERE type = ?').get(req.params.type);
  res.json({ template: serialize(row) });
});

module.exports = router;
