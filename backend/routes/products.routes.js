// Route danh muc san pham. Ton kho khong luu cot rieng - luon tinh tu SUM(stock_movements)
// (xem .claude/docs/inventory-debt-ledger.md). GET mo cho moi nguoi da dang nhap (can de
// chon san pham luc lap phieu nhap/xuat), POST/PUT rieng kiem tra quyen module 'kho'.

const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const db = require('../db/database');
const { requirePermission } = require('../middleware/requirePermission');
const { getCostingMethod, getWeightedAverageCost } = require('../services/costing.service');

const router = express.Router();

// Import/export Excel (2026-08-02): dung memoryStorage (khong ghi file tam ra dia) vi file
// danh muc san pham nho, xu ly xong la vut ngay. Gioi han 5MB + chi nhan .xlsx (ExcelJS khong
// doc duoc dinh dang .xls cu).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const IMPORT_TEMPLATE_HEADERS = [
  'Mã sản phẩm*', 'Tên sản phẩm*', 'Đơn vị tính*', 'Giá bán*', 'Giá vốn', 'Ngưỡng cảnh báo tồn kho thấp',
];

// Cac truong duoc theo doi lich su chinh sua (product_change_log) - so sanh gia tri cu/moi
// moi lan PUT thanh cong, chi ghi dong nao thuc su thay doi.
const TRACKED_FIELDS = ['code', 'name', 'unit', 'cost_price', 'sale_price', 'low_stock_threshold'];

const SELECT_PRODUCTS_WITH_STOCK = `
  SELECT p.id, p.code, p.name, p.unit, p.cost_price, p.sale_price, p.low_stock_threshold,
         p.is_active, p.created_at,
         COALESCE(SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE -sm.quantity END), 0) AS stock
  FROM products p
  LEFT JOIN stock_movements sm ON sm.product_id = p.id
  GROUP BY p.id
`;

// sale_price bat buoc nhap (khac cost_price/low_stock_threshold co the de trong = 0) - theo
// yeu cau nguoi dung khi thiet ke form trang Danh muc san pham.
function readProductInput(body) {
  const {
    code,
    name,
    unit,
    cost_price: costPrice,
    sale_price: salePrice,
    low_stock_threshold: lowStockThreshold,
  } = body || {};

  return {
    code: code ? String(code).trim() : '',
    name: name ? String(name).trim() : '',
    unit: unit ? String(unit).trim() : '',
    costPrice: Number(costPrice) || 0,
    salePrice: salePrice === undefined || salePrice === null || salePrice === '' ? null : Number(salePrice),
    lowStockThreshold: Number(lowStockThreshold) || 0,
  };
}

function withBooleanActive(product) {
  return { ...product, is_active: Boolean(product.is_active) };
}

router.get('/', (req, res) => {
  const products = db.prepare(`${SELECT_PRODUCTS_WITH_STOCK} ORDER BY p.created_at DESC`).all();
  res.json({ products: products.map(withBooleanActive) });
});

router.post('/', requirePermission('kho'), (req, res) => {
  const input = readProductInput(req.body);

  if (!input.code || !input.name || !input.unit || input.salePrice === null || Number.isNaN(input.salePrice)) {
    return res.status(400).json({ error: 'Thieu thong tin bat buoc (ma, ten, don vi tinh, gia ban)' });
  }

  const existing = db.prepare('SELECT id FROM products WHERE code = ?').get(input.code);
  if (existing) {
    return res.status(409).json({ error: 'Ma san pham da ton tai' });
  }

  const result = db
    .prepare(
      'INSERT INTO products (code, name, unit, cost_price, sale_price, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(input.code, input.name, input.unit, input.costPrice, input.salePrice, input.lowStockThreshold);

  const product = db.prepare(`${SELECT_PRODUCTS_WITH_STOCK} HAVING p.id = ?`).get(result.lastInsertRowid);
  res.status(201).json({ product: withBooleanActive(product) });
});

// Cac route Excel dat TRUOC "GET /:id" o duoi - Express khop "/:id" voi bat ky doan duong dan
// nao (vd "import-template" se bi hieu la id) neu dang ky sau, nen phai khai bao truoc.

// Tai file mau de dien du lieu import - cung 6 cot dung thu tu voi form them/sua san pham.
router.get('/import-template', requirePermission('kho'), async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('San pham');
  sheet.columns = IMPORT_TEMPLATE_HEADERS.map((header) => ({ header, width: 24 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEAFE' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const guideSheet = workbook.addWorksheet('Hướng dẫn');
  guideSheet.columns = [{ width: 90 }];
  [
    'Hướng dẫn nhập file:',
    '- Không xóa/đổi dòng tiêu đề (dòng 1) ở sheet "San pham".',
    '- Cột có dấu * là bắt buộc: Mã sản phẩm, Tên sản phẩm, Đơn vị tính, Giá bán.',
    '- Mã sản phẩm không được trùng với sản phẩm đã có trong hệ thống, và không trùng nhau trong file.',
    '- Giá bán, Giá vốn, Ngưỡng cảnh báo tồn kho thấp phải là số (để trống Giá vốn/Ngưỡng nếu không có, hệ thống tự hiểu là 0).',
    '- Nếu file có bất kỳ dòng nào lỗi, toàn bộ file sẽ không được nhập - sửa hết lỗi rồi tải lên lại.',
  ].forEach((line, i) => {
    guideSheet.getCell(i + 1, 1).value = line;
  });
  guideSheet.getRow(1).font = { bold: true };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="mau-import-san-pham.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

function cellString(cell) {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if ('text' in v) return String(v.text).trim();
    if ('result' in v) return String(v.result).trim();
    return '';
  }
  return String(v).trim();
}

// Tra ve { value, invalid }: value = so (null neu de trong), invalid = true neu co noi dung
// nhung khong phai so hop le - dung de bao loi ro rang thay vi am tham quy ve 0 nhu form thuong.
function cellNumberOrNull(cell) {
  const text = cellString(cell);
  if (text === '') return { value: null, invalid: false };
  const n = Number(text.replace(/,/g, '').trim());
  return { value: Number.isNaN(n) ? null : n, invalid: Number.isNaN(n) };
}

// Import hang loat tu file Excel: chi nhan khi TOAN BO file hop le (theo yeu cau nguoi dung,
// khong import mot phan roi bao loi phan con lai) - tranh tinh trang du lieu import do dang kho
// kiem soat. Ma san pham trung (voi DB hoac trong chinh file) bi bao loi, khong ghi de (upsert).
router.post('/import', requirePermission('kho'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Chưa chọn file để nhập' });
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ error: 'File không đúng định dạng Excel (.xlsx)' });
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return res.status(400).json({ error: 'File không có dữ liệu' });
  }

  const existingCodes = new Set(db.prepare('SELECT code FROM products').all().map((p) => p.code));
  const codesInFile = new Set();
  const errors = [];
  const validRows = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // dong tieu de

    const code = cellString(row.getCell(1));
    const name = cellString(row.getCell(2));
    const unit = cellString(row.getCell(3));
    const salePrice = cellNumberOrNull(row.getCell(4));
    const costPrice = cellNumberOrNull(row.getCell(5));
    const lowStockThreshold = cellNumberOrNull(row.getCell(6));

    // Dong hoan toan trong (vd dong trang o cuoi file) - bo qua, khong tinh la loi.
    if (!code && !name && !unit && salePrice.value === null) return;

    const rowErrors = [];
    if (!code) rowErrors.push('Thiếu Mã sản phẩm');
    if (!name) rowErrors.push('Thiếu Tên sản phẩm');
    if (!unit) rowErrors.push('Thiếu Đơn vị tính');
    if (salePrice.invalid) rowErrors.push('Giá bán không phải là số');
    else if (salePrice.value === null) rowErrors.push('Thiếu Giá bán');
    if (costPrice.invalid) rowErrors.push('Giá vốn không phải là số');
    if (lowStockThreshold.invalid) rowErrors.push('Ngưỡng cảnh báo tồn kho thấp không phải là số');

    if (code) {
      if (existingCodes.has(code)) rowErrors.push('Mã sản phẩm đã tồn tại trong hệ thống');
      else if (codesInFile.has(code)) rowErrors.push('Mã sản phẩm bị trùng trong file');
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, message: rowErrors.join('; ') });
      return;
    }

    codesInFile.add(code);
    validRows.push({
      code,
      name,
      unit,
      costPrice: costPrice.value === null ? 0 : costPrice.value,
      salePrice: salePrice.value,
      lowStockThreshold: lowStockThreshold.value === null ? 0 : lowStockThreshold.value,
    });
  });

  if (errors.length > 0) {
    return res.status(422).json({ error: 'File có dòng dữ liệu bị lỗi, chưa nhập gì cả', errors });
  }

  if (validRows.length === 0) {
    return res.status(400).json({ error: 'File không có dữ liệu nào để nhập' });
  }

  const insertProduct = db.prepare(
    'INSERT INTO products (code, name, unit, cost_price, sale_price, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertAll = db.transaction((rows) => {
    rows.forEach((r) => insertProduct.run(r.code, r.name, r.unit, r.costPrice, r.salePrice, r.lowStockThreshold));
  });
  insertAll(validRows);

  res.json({ imported: validRows.length });
});

// Xuat Excel danh sach san pham dang hien thi tren giao dien (nhan dung id tu frontend, khong
// tu suy doan bo loc/sap xep - de dam bao khop dung nhung gi nguoi dung dang thay tren man hinh).
router.post('/export', async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter((n) => Number.isInteger(n)) : [];
  if (ids.length === 0) {
    return res.status(400).json({ error: 'Không có sản phẩm nào để xuất' });
  }

  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(`${SELECT_PRODUCTS_WITH_STOCK} HAVING p.id IN (${placeholders})`).all(...ids);
  const rowsById = new Map(rows.map((r) => [r.id, r]));
  const orderedRows = ids.map((id) => rowsById.get(id)).filter(Boolean);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('San pham');
  sheet.columns = [
    { header: 'Mã sản phẩm', width: 18 },
    { header: 'Tên sản phẩm', width: 30 },
    { header: 'Đơn vị tính', width: 14 },
    { header: 'Giá vốn', width: 16 },
    { header: 'Giá bán', width: 16 },
    { header: 'Tồn kho', width: 12 },
    { header: 'Trạng thái', width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEAFE' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  orderedRows.forEach((p) => {
    sheet.addRow([
      p.code, p.name, p.unit, p.cost_price, p.sale_price, p.stock,
      p.is_active ? 'Đang kinh doanh' : 'Ngừng kinh doanh',
    ]);
  });

  const filename = `san-pham-${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});

router.put('/:id', requirePermission('kho'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay san pham' });
  }

  const input = readProductInput(req.body);
  if (!input.code || !input.name || !input.unit || input.salePrice === null || Number.isNaN(input.salePrice)) {
    return res.status(400).json({ error: 'Thieu thong tin bat buoc (ma, ten, don vi tinh, gia ban)' });
  }

  const duplicateCode = db.prepare('SELECT id FROM products WHERE code = ? AND id != ?').get(input.code, id);
  if (duplicateCode) {
    return res.status(409).json({ error: 'Ma san pham da ton tai' });
  }

  const newValues = {
    code: input.code,
    name: input.name,
    unit: input.unit,
    cost_price: input.costPrice,
    sale_price: input.salePrice,
    low_stock_threshold: input.lowStockThreshold,
  };
  const changes = TRACKED_FIELDS.filter((field) => String(existing[field]) !== String(newValues[field]));

  const applyUpdate = db.transaction(() => {
    db.prepare(
      'UPDATE products SET code = ?, name = ?, unit = ?, cost_price = ?, sale_price = ?, low_stock_threshold = ? WHERE id = ?'
    ).run(input.code, input.name, input.unit, input.costPrice, input.salePrice, input.lowStockThreshold, id);

    if (changes.length > 0) {
      const insertLog = db.prepare(
        'INSERT INTO product_change_log (product_id, changed_by, field_name, old_value, new_value) VALUES (?, ?, ?, ?, ?)'
      );
      changes.forEach((field) => {
        insertLog.run(id, req.session.user.id, field, String(existing[field]), String(newValues[field]));
      });
    }
  });
  applyUpdate();

  const product = db.prepare(`${SELECT_PRODUCTS_WITH_STOCK} HAVING p.id = ?`).get(id);
  res.json({ product: withBooleanActive(product) });
});

// Chi tiet 1 san pham, kem gia von tinh theo costing_method dang chon (xem
// backend/services/costing.service.js) - dung cho trang chi tiet san pham.
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const product = db.prepare(`${SELECT_PRODUCTS_WITH_STOCK} HAVING p.id = ?`).get(id);
  if (!product) {
    return res.status(404).json({ error: 'Khong tim thay san pham' });
  }

  const costingMethod = getCostingMethod();
  res.json({
    product: withBooleanActive(product),
    costing_method: costingMethod,
    current_cost: getWeightedAverageCost(id),
  });
});

// Lich su nhap/xuat kho cua 1 san pham - kem ma phieu goc de doi chieu.
router.get('/:id/movements', (req, res) => {
  const id = Number(req.params.id);
  const movements = db
    .prepare(`
      SELECT sm.id, sm.movement_type, sm.quantity, sm.unit_cost, sm.reference_type,
             sm.reference_id, sm.created_at,
             CASE sm.reference_type WHEN 'receipt' THEN r.code ELSE i.code END AS document_code
      FROM stock_movements sm
      LEFT JOIN stock_receipts r ON sm.reference_type = 'receipt' AND r.id = sm.reference_id
      LEFT JOIN stock_issues i ON sm.reference_type = 'issue' AND i.id = sm.reference_id
      WHERE sm.product_id = ?
      ORDER BY sm.created_at DESC, sm.id DESC
    `)
    .all(id);
  res.json({ movements });
});

// Lich su chinh sua thong tin san pham (product_change_log).
router.get('/:id/history', (req, res) => {
  const id = Number(req.params.id);
  const history = db
    .prepare(`
      SELECT pcl.id, pcl.field_name, pcl.old_value, pcl.new_value, pcl.created_at,
             u.full_name AS changed_by_name
      FROM product_change_log pcl
      JOIN users u ON u.id = pcl.changed_by
      WHERE pcl.product_id = ?
      ORDER BY pcl.created_at DESC, pcl.id DESC
    `)
    .all(id);
  res.json({ history });
});

// Vo hieu hoa/mo lai: danh cho ai co quyen module 'kho' (khong rieng Admin) - khac voi xoa cung
// ben duoi (chi Admin). San pham vo hieu hoa van hien trong danh sach (kem badge), chi khong
// duoc chon khi lap phieu nhap/xuat moi (kiem tra trong stockReceipt/stockIssue.service.js).
router.patch('/:id/deactivate', requirePermission('kho'), (req, res) => {
  setActiveState(req, res, 0);
});

router.patch('/:id/activate', requirePermission('kho'), (req, res) => {
  setActiveState(req, res, 1);
});

function setActiveState(req, res, isActive) {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay san pham' });
  }

  db.prepare('UPDATE products SET is_active = ? WHERE id = ?').run(isActive, id);

  const product = db.prepare(`${SELECT_PRODUCTS_WITH_STOCK} HAVING p.id = ?`).get(id);
  res.json({ product: withBooleanActive(product) });
}

// Xoa cung: chi Admin (is_protected), va chi khi san pham chua tung xuat hien trong
// stock_movements - giu nguyen tac giu lich su nhu phieu nhap/xuat (xem CLAUDE.md).
router.delete('/:id', (req, res) => {
  if (!req.session.user.is_protected) {
    return res.status(403).json({ error: 'Chi Admin moi co the xoa san pham' });
  }

  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Khong tim thay san pham' });
  }

  const inUse = db.prepare('SELECT COUNT(*) AS count FROM stock_movements WHERE product_id = ?').get(id);
  if (inUse.count > 0) {
    return res.status(400).json({ error: 'San pham da co lich su nhap/xuat kho, khong the xoa - chi co the vo hieu hoa' });
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Loi rieng cua multer (vd file qua 5MB) - tra JSON thay vi de Express roi ve trang loi HTML
// mac dinh, dong bo voi cach moi API khac trong du an luon tra { error: '...' }.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File vượt quá dung lượng cho phép (5MB)' : 'Lỗi khi tải file lên';
    return res.status(400).json({ error: message });
  }
  next(err);
});

module.exports = router;
