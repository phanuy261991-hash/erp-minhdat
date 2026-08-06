// Route "Vat tu" (migration 024, Dot 3 module Quan ly du an) - long vao projects.routes.js tai
// '/:id/materials' (mergeParams:true, giong pattern projectTasks.routes.js). Quyen 'du_an' da
// gan o tang cha (server.js), khong can khai bao lai o day.
//
// Du toan (project_material_plan) chi luu SO LUONG DU KIEN - "Da xuat"/"Con lai" luon tinh
// on-the-fly tu stock_issue_items TRU stock_receipt_items cung project_id (khong luu gia tri suy
// ra duoc, dung nguyen tac xuyen suot du an). "Da xuat" phai tru di phieu nhap gan cung du an vi
// truong hop tra vat tu thua ve kho di qua phieu nhap dieu chinh bu tru (xem docs/DECISIONS.md
// muc 2026-08-04 quyet dinh ky thuat).

const express = require('express');
const db = require('../db/database');

const router = express.Router({ mergeParams: true });

function getProject(projectId) {
  return db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
}

// SUM so luong theo product_id, chi tinh phieu DA gan dung project nay - dung Map de tra cuu
// O(1) khi ghep voi danh sach du toan, tranh N+1 query.
function sumQuantityByProduct(table, itemsTable, foreignKey, projectId) {
  const rows = db
    .prepare(`
      SELECT it.product_id, SUM(it.quantity) AS qty
      FROM ${itemsTable} it
      JOIN ${table} d ON d.id = it.${foreignKey}
      WHERE d.project_id = ?
      GROUP BY it.product_id
    `)
    .all(projectId);
  return new Map(rows.map((r) => [r.product_id, r.qty]));
}

// Ghep du toan voi so lieu da xuat/da nhap tra thuc te - "Da xuat" = xuat cho du an TRU nhap
// tra ve kho cho du an (co the am neu nhap tra nhieu hon da xuat, van hien dung thuc te).
function getMaterialsForProject(projectId) {
  const plans = db
    .prepare(`
      SELECT pmp.id, pmp.product_id, p.code AS product_code, p.name AS product_name, p.unit,
             pmp.quantity AS planned_quantity, pmp.note
      FROM project_material_plan pmp
      JOIN products p ON p.id = pmp.product_id
      WHERE pmp.project_id = ?
      ORDER BY p.name ASC
    `)
    .all(projectId);

  const issuedMap = sumQuantityByProduct('stock_issues', 'stock_issue_items', 'issue_id', projectId);
  const receivedMap = sumQuantityByProduct('stock_receipts', 'stock_receipt_items', 'receipt_id', projectId);

  return plans.map((plan) => {
    const issued = (issuedMap.get(plan.product_id) || 0) - (receivedMap.get(plan.product_id) || 0);
    return {
      ...plan,
      issued_quantity: issued,
      remaining_quantity: plan.planned_quantity - issued,
      is_over: issued > plan.planned_quantity,
    };
  });
}

// Danh sach phieu nhap/xuat da gan du an nay - hien trong tab Vat tu de doi chieu, gop 2 bang
// bang UNION-nhu-JS (khac cau truc cot nen khong UNION SQL truc tiep duoc).
function getDocumentsForProject(projectId) {
  const receipts = db
    .prepare(`
      SELECT r.id, r.code, r.created_at, r.payment_status, r.is_return, pa.name AS partner_name
      FROM stock_receipts r
      LEFT JOIN partners pa ON pa.id = r.partner_id
      WHERE r.project_id = ?
    `)
    .all(projectId)
    .map((r) => ({ ...r, type: 'receipt' }));

  const issues = db
    .prepare(`
      SELECT i.id, i.code, i.created_at, i.payment_status, pa.name AS partner_name
      FROM stock_issues i
      LEFT JOIN partners pa ON pa.id = i.partner_id
      WHERE i.project_id = ?
    `)
    .all(projectId)
    .map((i) => ({ ...i, type: 'issue' }));

  return [...receipts, ...issues].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

router.get('/', (req, res) => {
  const projectId = Number(req.params.id);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }

  res.json({
    materials: getMaterialsForProject(projectId),
    documents: getDocumentsForProject(projectId),
  });
});

router.post('/', (req, res) => {
  const projectId = Number(req.params.id);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }

  const { product_id: rawProductId, quantity: rawQuantity, note } = req.body || {};
  const productId = Number(rawProductId);
  const quantity = Number(rawQuantity);

  if (!productId) {
    return res.status(400).json({ error: 'Thiếu sản phẩm' });
  }
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
  if (!product) {
    return res.status(400).json({ error: 'Không tìm thấy sản phẩm' });
  }
  if (!(quantity > 0)) {
    return res.status(400).json({ error: 'Số lượng dự toán phải lớn hơn 0' });
  }

  const existing = db
    .prepare('SELECT id FROM project_material_plan WHERE project_id = ? AND product_id = ?')
    .get(projectId, productId);
  if (existing) {
    return res.status(400).json({ error: 'Sản phẩm này đã có trong dự toán, hãy sửa dòng hiện có' });
  }

  const result = db
    .prepare('INSERT INTO project_material_plan (project_id, product_id, quantity, note) VALUES (?, ?, ?, ?)')
    .run(projectId, productId, quantity, note ? String(note).trim() : '');

  const materials = getMaterialsForProject(projectId);
  const created = materials.find((m) => m.id === result.lastInsertRowid);
  res.status(201).json({ material: created });
});

router.put('/:materialId', (req, res) => {
  const projectId = Number(req.params.id);
  const materialId = Number(req.params.materialId);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }

  const existing = db
    .prepare('SELECT id FROM project_material_plan WHERE id = ? AND project_id = ?')
    .get(materialId, projectId);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy dòng dự toán' });
  }

  const { quantity: rawQuantity, note } = req.body || {};
  const quantity = Number(rawQuantity);
  if (!(quantity > 0)) {
    return res.status(400).json({ error: 'Số lượng dự toán phải lớn hơn 0' });
  }

  db.prepare('UPDATE project_material_plan SET quantity = ?, note = ? WHERE id = ?').run(
    quantity,
    note ? String(note).trim() : '',
    materialId
  );

  const materials = getMaterialsForProject(projectId);
  const updated = materials.find((m) => m.id === materialId);
  res.json({ material: updated });
});

router.delete('/:materialId', (req, res) => {
  const projectId = Number(req.params.id);
  const materialId = Number(req.params.materialId);
  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }

  const existing = db
    .prepare('SELECT id FROM project_material_plan WHERE id = ? AND project_id = ?')
    .get(materialId, projectId);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy dòng dự toán' });
  }

  db.prepare('DELETE FROM project_material_plan WHERE id = ?').run(materialId);
  res.json({ ok: true });
});

module.exports = router;
