// Middleware kiem tra quyen truy cap 1 module cua nguoi dung hien tai, dua theo role_permissions.
// Vai tro is_protected (Admin) luon duoc cho qua, khong can tra bang.
// Phai dat sau requireAuth tren cung 1 route (can req.session.user da ton tai).
//
// Vi du dung: router.get('/users', requireAuth, requirePermission('nguoi_dung'), handler)

const db = require('../db/database');

// Ham thuan (khong phai middleware) - dung khi can kiem tra quyen NGAY TRONG handler thay vi
// truoc handler, vi module can kiem tra chi biet duoc SAU KHI da doc du lieu (vd quyen phu thuoc
// "type" cua doi tac dang thao tac - xem debts.routes.js/partners.routes.js tach 'cong_no'/
// 'khach_hang' theo type, migration 039).
function userHasPermission(user, moduleKey) {
  if (!user) return false;
  if (user.is_protected) return true;
  return Boolean(
    db.prepare('SELECT 1 FROM role_permissions WHERE role_id = ? AND module_key = ?').get(user.role_id, moduleKey)
  );
}

function requirePermission(moduleKey) {
  return function (req, res, next) {
    const user = req.session && req.session.user;

    if (!user) {
      return res.status(401).json({ error: 'Chua dang nhap' });
    }

    if (!userHasPermission(user, moduleKey)) {
      return res.status(403).json({ error: 'Khong co quyen truy cap chuc nang nay' });
    }

    next();
  };
}

// Cho qua neu user co IT NHAT 1 trong cac module truyen vao (hoac is_protected). Dung cho
// hanh dong lien quan nhieu module (vd tao doi tac moi: ca thu kho (lap phieu nhap) lan ke
// toan (quan ly cong no) deu co the can thao tac nay - xem docs/DECISIONS.md).
function requireAnyPermission(moduleKeys) {
  return function (req, res, next) {
    const user = req.session && req.session.user;

    if (!user) {
      return res.status(401).json({ error: 'Chua dang nhap' });
    }

    const hasAny = moduleKeys.some((moduleKey) => userHasPermission(user, moduleKey));

    if (!hasAny) {
      return res.status(403).json({ error: 'Khong co quyen truy cap chuc nang nay' });
    }

    next();
  };
}

module.exports = { requirePermission, requireAnyPermission, userHasPermission };
