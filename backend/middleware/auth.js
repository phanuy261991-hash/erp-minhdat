// Middleware kiem tra nguoi dung da dang nhap (co session hop le) hay chua.
// Khong xu ly phan quyen module o day - xem middleware/requirePermission.js.

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Chua dang nhap' });
  }
  next();
}

module.exports = { requireAuth };
