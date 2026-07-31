// Middleware kiem tra quyen truy cap 1 module cua nguoi dung hien tai, dua theo role_permissions.
// Vai tro is_protected (Admin) luon duoc cho qua, khong can tra bang.
// Phai dat sau requireAuth tren cung 1 route (can req.session.user da ton tai).
//
// Vi du dung: router.get('/users', requireAuth, requirePermission('nguoi_dung'), handler)

const db = require('../db/database');

function requirePermission(moduleKey) {
  return function (req, res, next) {
    const user = req.session && req.session.user;

    if (!user) {
      return res.status(401).json({ error: 'Chua dang nhap' });
    }

    if (user.is_protected) {
      return next();
    }

    const hasPermission = db
      .prepare('SELECT 1 FROM role_permissions WHERE role_id = ? AND module_key = ?')
      .get(user.role_id, moduleKey);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Khong co quyen truy cap chuc nang nay' });
    }

    next();
  };
}

module.exports = { requirePermission };
