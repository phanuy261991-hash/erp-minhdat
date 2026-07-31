// Route quan tri vai tro: danh sach, tao moi, sua ten/quyen, xoa.
// Vai tro is_protected (Admin) khong duoc sua ten/quyen/xoa qua cac route nay.
// Toan bo route chi danh cho ai co quyen module 'nguoi_dung' (gan requirePermission khi mount).

const express = require('express');
const db = require('../db/database');
const { MODULE_KEYS } = require('../config/modules');

const router = express.Router();

function getPermissions(role) {
  if (role.is_protected) {
    return MODULE_KEYS.slice();
  }
  return db
    .prepare('SELECT module_key FROM role_permissions WHERE role_id = ?')
    .all(role.id)
    .map((row) => row.module_key);
}

function serializeRole(role) {
  return {
    id: role.id,
    name: role.name,
    is_protected: Boolean(role.is_protected),
    created_at: role.created_at,
    permissions: getPermissions(role),
  };
}

function validatePermissions(permissions) {
  const list = Array.isArray(permissions) ? permissions : [];
  const invalid = list.filter((key) => !MODULE_KEYS.includes(key));
  return { list, invalid };
}

router.get('/', (req, res) => {
  const roles = db.prepare('SELECT * FROM roles ORDER BY is_protected DESC, name ASC').all();
  res.json({ roles: roles.map(serializeRole) });
});

router.post('/', (req, res) => {
  const { name, permissions } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Thieu ten vai tro' });
  }

  const { list: permList, invalid } = validatePermissions(permissions);
  if (invalid.length > 0) {
    return res.status(400).json({ error: `Module khong hop le: ${invalid.join(', ')}` });
  }

  const trimmedName = name.trim();
  const existing = db.prepare('SELECT id FROM roles WHERE name = ?').get(trimmedName);
  if (existing) {
    return res.status(409).json({ error: 'Ten vai tro da ton tai' });
  }

  const createRole = db.transaction(() => {
    const result = db.prepare('INSERT INTO roles (name, is_protected) VALUES (?, 0)').run(trimmedName);
    const roleId = result.lastInsertRowid;
    const insertPerm = db.prepare('INSERT INTO role_permissions (role_id, module_key) VALUES (?, ?)');
    permList.forEach((moduleKey) => insertPerm.run(roleId, moduleKey));
    return roleId;
  });

  const roleId = createRole();
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(roleId);
  res.status(201).json({ role: serializeRole(role) });
});

router.put('/:id', (req, res) => {
  const roleId = Number(req.params.id);
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(roleId);

  if (!role) {
    return res.status(404).json({ error: 'Khong tim thay vai tro' });
  }
  if (role.is_protected) {
    return res.status(400).json({ error: 'Khong the sua vai tro Admin' });
  }

  const { name, permissions } = req.body || {};
  let trimmedName;
  if (name !== undefined) {
    trimmedName = name.trim();
    if (!trimmedName) {
      return res.status(400).json({ error: 'Ten vai tro khong duoc de trong' });
    }
    const duplicate = db.prepare('SELECT id FROM roles WHERE name = ? AND id != ?').get(trimmedName, roleId);
    if (duplicate) {
      return res.status(409).json({ error: 'Ten vai tro da ton tai' });
    }
  }

  let permList;
  if (permissions !== undefined) {
    const validated = validatePermissions(permissions);
    if (validated.invalid.length > 0) {
      return res.status(400).json({ error: `Module khong hop le: ${validated.invalid.join(', ')}` });
    }
    permList = validated.list;
  }

  const updateRole = db.transaction(() => {
    if (trimmedName !== undefined) {
      db.prepare('UPDATE roles SET name = ? WHERE id = ?').run(trimmedName, roleId);
    }
    if (permList !== undefined) {
      db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(roleId);
      const insertPerm = db.prepare('INSERT INTO role_permissions (role_id, module_key) VALUES (?, ?)');
      permList.forEach((moduleKey) => insertPerm.run(roleId, moduleKey));
    }
  });
  updateRole();

  const updated = db.prepare('SELECT * FROM roles WHERE id = ?').get(roleId);
  res.json({ role: serializeRole(updated) });
});

router.delete('/:id', (req, res) => {
  const roleId = Number(req.params.id);
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(roleId);

  if (!role) {
    return res.status(404).json({ error: 'Khong tim thay vai tro' });
  }
  if (role.is_protected) {
    return res.status(400).json({ error: 'Khong the xoa vai tro Admin' });
  }

  const inUse = db.prepare('SELECT COUNT(*) AS count FROM users WHERE role_id = ?').get(roleId);
  if (inUse.count > 0) {
    return res.status(400).json({ error: `Con ${inUse.count} tai khoan dang dung vai tro nay, khong the xoa` });
  }

  db.prepare('DELETE FROM roles WHERE id = ?').run(roleId);
  res.json({ ok: true });
});

module.exports = router;
