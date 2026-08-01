// Diem khoi dong ung dung: cau hinh Express, session, load cac route.

const path = require('path');
const express = require('express');
const session = require('express-session');
const crypto = require('crypto');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const rolesRoutes = require('./routes/roles.routes');
const companySettingsRoutes = require('./routes/companySettings.routes');
const warehouseSettingsRoutes = require('./routes/warehouseSettings.routes');
const productsRoutes = require('./routes/products.routes');
const stockReceiptsRoutes = require('./routes/stockReceipts.routes');
const stockIssuesRoutes = require('./routes/stockIssues.routes');
const partnersRoutes = require('./routes/partners.routes');
const customerCategoriesRoutes = require('./routes/customerCategories.routes');
const debtsRoutes = require('./routes/debts.routes');
const warrantiesRoutes = require('./routes/warranties.routes');
const reportsRoutes = require('./routes/reports.routes');
const { requireAuth } = require('./middleware/auth');
const { requirePermission } = require('./middleware/requirePermission');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Uu tien lay session secret tu bien moi truong SESSION_SECRET.
// Neu chua cau hinh (dev/demo), tu sinh ngau nhien - luu y session se mat khi restart server,
// khong phu hop production (can dat SESSION_SECRET co dinh khi chay that qua PM2).
let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  sessionSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[CANH BAO] Chua cau hinh SESSION_SECRET - dang dung secret ngau nhien cho phien lam viec nay.');
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 tieng, phu hop 1 ca lam viec
  },
}));

app.use('/api/auth', authRoutes);
app.use('/api/users', requireAuth, requirePermission('nguoi_dung'), usersRoutes);
app.use('/api/roles', requireAuth, requirePermission('nguoi_dung'), rolesRoutes);
// GET mo cho moi nguoi da dang nhap (dung khi render mau in / kiem tra allow_negative_stock),
// PUT rieng kiem tra quyen module 'cau_hinh' ben trong tung file route.
app.use('/api/company-settings', requireAuth, companySettingsRoutes);
app.use('/api/warehouse-settings', requireAuth, warehouseSettingsRoutes);
// GET mo cho moi nguoi da dang nhap (chon san pham luc lap phieu), POST/PUT rieng kiem tra
// quyen module 'kho' ben trong file route.
app.use('/api/products', requireAuth, productsRoutes);
app.use('/api/stock-receipts', requireAuth, requirePermission('kho'), stockReceiptsRoutes);
app.use('/api/stock-issues', requireAuth, requirePermission('kho'), stockIssuesRoutes);
// GET mo cho moi nguoi da dang nhap (chon doi tac luc lap phieu), POST/PUT/DELETE rieng kiem
// tra quyen ('kho' hoac 'cong_no' cho POST, chi 'cong_no' cho PUT/DELETE) ben trong file route
// (xem partners.routes.js).
app.use('/api/partners', requireAuth, partnersRoutes);
// GET mo cho moi nguoi da dang nhap (chon loai khach hang luc them/sua), POST/PUT/DELETE rieng
// kiem tra quyen 'cau_hinh' ben trong file route (xem customerCategories.routes.js).
app.use('/api/customer-categories', requireAuth, customerCategoriesRoutes);
app.use('/api/debts', requireAuth, requirePermission('cong_no'), debtsRoutes);
// Thuoc menu Khach hang, dung chung quyen 'cong_no' (xem warranties.routes.js).
app.use('/api/warranties', requireAuth, requirePermission('cong_no'), warrantiesRoutes);
app.use('/api/reports', requireAuth, requirePermission('bao_cao'), reportsRoutes);

// Route kiem tra server song - dung de test nhanh khi chay demo.
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Server dang chay' });
});

// Phuc vu file tinh (HTML/CSS/JS) trong thu muc frontend/, khong qua build step.
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Mac dinh vao trang dang nhap khi truy cap trang chu.
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.listen(PORT, () => {
  console.log(`Server dang chay tai http://localhost:${PORT}`);
});
