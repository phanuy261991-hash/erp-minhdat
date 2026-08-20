// Route "Nghiem thu theo giai phap" (migration 041, theo yeu cau nguoi dung 2026-08-19 - xem
// docs/handoff/HANDOFF-NghiemThu-2026-08-19-v2.md cho day du 4 gia dinh ky thuat da chot qua
// AskUserQuestion truoc khi code) - long vao projects.routes.js tai '/:id/acceptance-solutions'
// (mergeParams:true, cung pattern voi projectVariations.routes.js).
//
// Trang nay CHI gom nhom thiet bi DA XUAT cho du an vao tung "giai phap" da ky voi khach hang, de
// lap bien ban nghiem thu - KHONG tao phieu xuat kho moi, KHONG doi ton kho.
//
// Phan quyen 2 lop (kieu MOI trong du an): quyen 'du_an' da gan 1 lan o server.js cho toan bo
// '/api/projects' nen AI VAO DUOC trang deu XEM duoc (GET) - rieng THAO TAC (POST/PUT/DELETE) can
// THEM quyen 'nghiem_thu', kiem tra thu cong ngay trong handler bang userHasPermission() (khong co
// helper requireAllPermissions() san, xem backend/middleware/requirePermission.js).

const express = require('express');
const db = require('../db/database');
const { userHasPermission } = require('../middleware/requirePermission');

const router = express.Router({ mergeParams: true });

function getProject(projectId) {
  return db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
}

// Tra false + tu ghi response 403 neu thieu quyen 'nghiem_thu' - goi ngay dau moi handler
// POST/PUT/DELETE, SAU KHI da kiem tra du an/ban ghi ton tai (404 uu tien hon 403, dung thu tu
// cac route khac trong du an dang lam).
function requireNghiemThuPermission(req, res) {
  if (!userHasPermission(req.session.user, 'nghiem_thu')) {
    res.status(403).json({ error: 'Không có quyền thao tác Nghiệm thu' });
    return false;
  }
  return true;
}

// SUM so luong theo product_id - COPY NGUYEN XI cong thuc trong projectMaterials.routes.js (khong
// viet lai khac di) de so "Da xuat" o tab Nghiem thu khop dung 100% voi tab "Vat tu" cung du an -
// xem muc 3.2 file handoff.
// status='da_tru_kho': phieu xuat con dang nhap (2026-08-20) chua thuc su xuat hang, khong duoc
// tinh vao "da xuat" - ca stock_receipts lan stock_issues deu co cot nay (mac dinh 'da_tru_kho').
function sumQuantityByProduct(table, itemsTable, foreignKey, projectId) {
  const rows = db
    .prepare(`
      SELECT it.product_id, SUM(it.quantity) AS qty
      FROM ${itemsTable} it
      JOIN ${table} d ON d.id = it.${foreignKey}
      WHERE d.project_id = ? AND d.status = 'da_tru_kho'
      GROUP BY it.product_id
    `)
    .all(projectId);
  return new Map(rows.map((r) => [r.product_id, r.qty]));
}

// Don gia BINH QUAN GIA QUYEN theo GIA BAN tren phieu xuat kho goc (KHAC gia von cua
// costing.service.js) - chua co ham san, viet moi (xem muc 3.3 file handoff).
function getAverageUnitPriceMap(projectId) {
  const rows = db
    .prepare(`
      SELECT it.product_id,
             SUM(it.quantity * it.unit_price * (1 - it.discount_percent / 100.0)) / SUM(it.quantity) AS avg_unit_price
      FROM stock_issue_items it
      JOIN stock_issues i ON i.id = it.issue_id
      WHERE i.project_id = ? AND i.status = 'da_tru_kho'
      GROUP BY it.product_id
    `)
    .all(projectId);
  return new Map(rows.map((r) => [r.product_id, r.avg_unit_price]));
}

// Map product_id -> { product_id, product_code, product_name, unit, unit_price, issued_net,
// assigned_other, remaining } - dung cho ca GET /available-devices (bang chon trong modal) lan
// validate luc POST/PUT. `excludeSolutionId`: khi dang SUA 1 giai phap, khong tinh phan sản pham
// DA gan cho CHINH giai phap dang sua vao "assigned_other" (de nguoi dung tu do doi lai so luong
// cua giai phap do) - null khi tao moi hoac khi tinh tong hop toan du an (GET /, "assigned_other"
// luc do la SUM tren TAT CA giai phap).
function computeAvailableDevices(projectId, excludeSolutionId) {
  const issuedMap = sumQuantityByProduct('stock_issues', 'stock_issue_items', 'issue_id', projectId);
  const receivedMap = sumQuantityByProduct('stock_receipts', 'stock_receipt_items', 'receipt_id', projectId);
  const priceMap = getAverageUnitPriceMap(projectId);

  const assignedRows = db
    .prepare(`
      SELECT it.product_id, SUM(it.quantity) AS qty
      FROM project_acceptance_solution_items it
      JOIN project_acceptance_solutions s ON s.id = it.solution_id
      WHERE s.project_id = ? ${excludeSolutionId ? 'AND it.solution_id != ?' : ''}
      GROUP BY it.product_id
    `)
    .all(...(excludeSolutionId ? [projectId, excludeSolutionId] : [projectId]));
  const assignedMap = new Map(assignedRows.map((r) => [r.product_id, r.qty]));

  const result = new Map();
  issuedMap.forEach((issuedQty, productId) => {
    // "Da xuat" NET (tru tra hang) - chi liet ke san pham THAT SU con dang xuat cho du an nay,
    // bo qua neu da tra het (issuedNet <= 0), dung nguyen tac cua tab "Vat tu".
    const issuedNet = issuedQty - (receivedMap.get(productId) || 0);
    if (issuedNet <= 0) return;

    const product = db.prepare('SELECT id, code, name, unit FROM products WHERE id = ?').get(productId);
    if (!product) return;

    const assignedOther = assignedMap.get(productId) || 0;
    result.set(productId, {
      product_id: productId,
      product_code: product.code,
      product_name: product.name,
      unit: product.unit,
      unit_price: Math.round(priceMap.get(productId) || 0),
      issued_net: issuedNet,
      assigned_other: assignedOther,
      remaining: issuedNet - assignedOther,
    });
  });
  return result;
}

function getSolutionRow(solutionId) {
  return db
    .prepare(`
      SELECT s.*, u.full_name AS created_by_name
      FROM project_acceptance_solutions s
      LEFT JOIN users u ON u.id = s.created_by
      WHERE s.id = ?
    `)
    .get(solutionId);
}

// Ghep 1 giai phap voi danh sach thiet bi + don gia hien tai (bam gia LUC XEM, khong luu cung
// solution_items - dung nguyen tac "khong luu gia tri suy ra duoc" xuyen suot du an, giong het
// issued_quantity/remaining_quantity cua tab Vat tu). `issued_net` tung dong + `total_issued_net`
// (tong hop) dung cho thanh tien do tren the giai phap ("X/Y don vi da gan") - Y la tong so luong
// DA XUAT CHO DU AN cua dung cac san pham nam trong giai phap nay (khong phai tong toan du an).
function serializeSolution(solutionRow) {
  const items = db
    .prepare(`
      SELECT it.id, it.product_id, it.quantity, p.code AS product_code, p.name AS product_name, p.unit
      FROM project_acceptance_solution_items it
      JOIN products p ON p.id = it.product_id
      WHERE it.solution_id = ?
      ORDER BY p.name ASC
    `)
    .all(solutionRow.id);

  const priceMap = getAverageUnitPriceMap(solutionRow.project_id);
  const issuedMap = sumQuantityByProduct('stock_issues', 'stock_issue_items', 'issue_id', solutionRow.project_id);
  const receivedMap = sumQuantityByProduct('stock_receipts', 'stock_receipt_items', 'receipt_id', solutionRow.project_id);

  const itemsWithValue = items.map((it) => {
    const unitPrice = Math.round(priceMap.get(it.product_id) || 0);
    const issuedNet = (issuedMap.get(it.product_id) || 0) - (receivedMap.get(it.product_id) || 0);
    return { ...it, unit_price: unitPrice, line_total: Math.round(unitPrice * it.quantity), issued_net: issuedNet };
  });

  const totalQuantity = itemsWithValue.reduce((sum, it) => sum + it.quantity, 0);
  const totalValue = itemsWithValue.reduce((sum, it) => sum + it.line_total, 0);
  const totalIssuedNet = itemsWithValue.reduce((sum, it) => sum + it.issued_net, 0);

  return {
    ...solutionRow,
    items: itemsWithValue,
    item_type_count: itemsWithValue.length,
    total_quantity: totalQuantity,
    total_value: totalValue,
    total_issued_net: totalIssuedNet,
  };
}

// GET / - danh sach giai phap kem 4 so lieu tong hop dau trang (Da xuat/Da gan/Chua phan/Tong gia
// tri) - dung computeAvailableDevices(projectId, null) vi luc nay "assigned_other" tinh tren TAT
// CA giai phap (khong loai tru cai nao) - dung y nghia "da gan" tong hop toan du an.
router.get('/', (req, res) => {
  const projectId = Number(req.params.id);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }

  const solutionRows = db
    .prepare(`
      SELECT s.*, u.full_name AS created_by_name
      FROM project_acceptance_solutions s
      LEFT JOIN users u ON u.id = s.created_by
      WHERE s.project_id = ?
      ORDER BY s.id ASC
    `)
    .all(projectId);
  const solutions = solutionRows.map(serializeSolution);

  const deviceMap = computeAvailableDevices(projectId, null);
  let issuedTotal = 0;
  let assignedTotal = 0;
  let valueTotal = 0;
  deviceMap.forEach((d) => {
    issuedTotal += d.issued_net;
    assignedTotal += d.assigned_other;
    valueTotal += Math.round(d.unit_price * d.issued_net);
  });

  res.json({
    solutions,
    summary: {
      issued_total: issuedTotal,
      assigned_total: assignedTotal,
      unassigned_total: issuedTotal - assignedTotal,
      value_total: valueTotal,
    },
  });
});

// GET /available-devices?exclude_solution_id= - bang "Thiet bi da xuat cho du an" trong modal
// Them/Sua giai phap. Dat TRUOC '/:solutionId' de Express khong nham 'available-devices' la 1 id.
router.get('/available-devices', (req, res) => {
  const projectId = Number(req.params.id);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }

  const excludeSolutionId = req.query.exclude_solution_id ? Number(req.query.exclude_solution_id) : null;
  const deviceMap = computeAvailableDevices(projectId, excludeSolutionId);
  res.json({ devices: Array.from(deviceMap.values()) });
});

router.get('/:solutionId', (req, res) => {
  const projectId = Number(req.params.id);
  const solutionId = Number(req.params.solutionId);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }

  const solution = getSolutionRow(solutionId);
  if (!solution || solution.project_id !== projectId) {
    return res.status(404).json({ error: 'Không tìm thấy giải pháp' });
  }

  res.json({ solution: serializeSolution(solution) });
});

function readItemsInput(body) {
  const raw = Array.isArray(body.items) ? body.items : [];
  return raw
    .map((it) => ({
      productId: Number(it.product_id) || null,
      quantity: Number(it.quantity) || 0,
    }))
    .filter((it) => it.productId && it.quantity > 0);
}

// Chan luu neu bat ky dong nao vuot qua "remaining" hien tai (tinh lai truc tiep tu du lieu that,
// khong tin vao so client tu gui len) - tra thong bao loi kem ten san pham + so con lai de nguoi
// dung sua ngay, khong can doan.
function validateItemsAgainstAvailable(items, projectId, excludeSolutionId) {
  const deviceMap = computeAvailableDevices(projectId, excludeSolutionId);
  for (const item of items) {
    const device = deviceMap.get(item.productId);
    const remaining = device ? device.remaining : 0;
    if (item.quantity > remaining) {
      const name = device ? device.product_name : `#${item.productId}`;
      return `Sản phẩm "${name}" vượt quá số lượng còn có thể gán vào giải pháp (còn ${remaining})`;
    }
  }
  return null;
}

router.post('/', (req, res) => {
  const projectId = Number(req.params.id);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }
  if (!requireNghiemThuPermission(req, res)) return;

  const { name, note } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Thiếu tên giải pháp' });
  }

  const items = readItemsInput(req.body);
  const validationError = validateItemsAgainstAvailable(items, projectId, null);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const run = db.transaction(() => {
    const result = db
      .prepare('INSERT INTO project_acceptance_solutions (project_id, name, note, created_by) VALUES (?, ?, ?, ?)')
      .run(projectId, String(name).trim(), note ? String(note).trim() : '', req.session.user.id);
    const solutionId = result.lastInsertRowid;

    const insertItem = db.prepare(
      'INSERT INTO project_acceptance_solution_items (solution_id, product_id, quantity) VALUES (?, ?, ?)'
    );
    items.forEach((it) => insertItem.run(solutionId, it.productId, it.quantity));

    return solutionId;
  });
  const solutionId = run();

  res.status(201).json({ solution: serializeSolution(getSolutionRow(solutionId)) });
});

router.put('/:solutionId', (req, res) => {
  const projectId = Number(req.params.id);
  const solutionId = Number(req.params.solutionId);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }
  const existing = db
    .prepare('SELECT id FROM project_acceptance_solutions WHERE id = ? AND project_id = ?')
    .get(solutionId, projectId);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy giải pháp' });
  }
  if (!requireNghiemThuPermission(req, res)) return;

  const { name, note } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Thiếu tên giải pháp' });
  }

  const items = readItemsInput(req.body);
  const validationError = validateItemsAgainstAvailable(items, projectId, solutionId);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  db.transaction(() => {
    db.prepare("UPDATE project_acceptance_solutions SET name = ?, note = ?, updated_at = datetime('now') WHERE id = ?").run(
      String(name).trim(),
      note ? String(note).trim() : '',
      solutionId
    );
    db.prepare('DELETE FROM project_acceptance_solution_items WHERE solution_id = ?').run(solutionId);
    const insertItem = db.prepare(
      'INSERT INTO project_acceptance_solution_items (solution_id, product_id, quantity) VALUES (?, ?, ?)'
    );
    items.forEach((it) => insertItem.run(solutionId, it.productId, it.quantity));
  })();

  res.json({ solution: serializeSolution(getSolutionRow(solutionId)) });
});

router.delete('/:solutionId', (req, res) => {
  const projectId = Number(req.params.id);
  const solutionId = Number(req.params.solutionId);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }
  const existing = db
    .prepare('SELECT id FROM project_acceptance_solutions WHERE id = ? AND project_id = ?')
    .get(solutionId, projectId);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy giải pháp' });
  }
  if (!requireNghiemThuPermission(req, res)) return;

  db.transaction(() => {
    db.prepare('DELETE FROM project_acceptance_solution_items WHERE solution_id = ?').run(solutionId);
    db.prepare('DELETE FROM project_acceptance_solutions WHERE id = ?').run(solutionId);
  })();

  res.json({ ok: true });
});

module.exports = router;
