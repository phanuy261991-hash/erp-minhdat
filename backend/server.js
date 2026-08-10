// Diem khoi dong ung dung: cau hinh Express, session, load cac route.

const path = require('path');
const express = require('express');
const session = require('express-session');
const crypto = require('crypto');

const { runMigrations } = require('./db/migrate');
const authRoutes = require('./routes/auth.routes');
const setupRoutes = require('./routes/setup.routes');
const usersRoutes = require('./routes/users.routes');
const rolesRoutes = require('./routes/roles.routes');
const companySettingsRoutes = require('./routes/companySettings.routes');
const warehouseSettingsRoutes = require('./routes/warehouseSettings.routes');
const productsRoutes = require('./routes/products.routes');
const stockReceiptsRoutes = require('./routes/stockReceipts.routes');
const stockIssuesRoutes = require('./routes/stockIssues.routes');
const stockReturnsRoutes = require('./routes/stockReturns.routes');
const supplierReturnsRoutes = require('./routes/supplierReturns.routes');
const partnersRoutes = require('./routes/partners.routes');
const customerCategoriesRoutes = require('./routes/customerCategories.routes');
const debtsRoutes = require('./routes/debts.routes');
const warrantiesRoutes = require('./routes/warranties.routes');
const reportsRoutes = require('./routes/reports.routes');
const cashVouchersRoutes = require('./routes/cashVouchers.routes');
const cashCategoriesRoutes = require('./routes/cashCategories.routes');
const cashBookSettingsRoutes = require('./routes/cashBookSettings.routes');
const projectsRoutes = require('./routes/projects.routes');
const projectPhaseTemplatesRoutes = require('./routes/projectPhaseTemplates.routes');
const contactsRoutes = require('./routes/contacts.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const notificationSettingsRoutes = require('./routes/notificationSettings.routes');
const printTemplatesRoutes = require('./routes/printTemplates.routes');
const clientLogsRoutes = require('./routes/clientLogs.routes');
const { requireAuth } = require('./middleware/auth');
const { requirePermission } = require('./middleware/requirePermission');
const log = require('./utils/logger');

// Ghi log server ra file data/logs/ (them 2026-08-06, xem backend/utils/logger.js) - bat loi
// chua duoc bat (thoat process ngay sau khi ghi, dung hanh vi mac dinh cua Node khi khong co
// handler nao ca - chi khac la nay co ghi lai duoc ly do truoc khi thoat).
process.on('uncaughtException', (err) => {
  log.error(`UNCAUGHT EXCEPTION: ${err.stack || err.message}`);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? (reason.stack || reason.message) : String(reason);
  log.error(`UNHANDLED REJECTION: ${message}`);
  process.exit(1);
});

// Tu chay migration khi khoi dong (2026-08-01) - can thiet cho ban dong goi .exe chay tren may
// nguoi dung: khong co san npm/terminal de tu chay "npm run migrate" truoc, nen server phai tu
// dam bao schema day du moi lan khoi dong. An toan chay lai nhieu lan (migrate.js chi ap dung
// migration CHUA co trong schema_migrations - xem backend/db/migrate.js).
try {
  runMigrations();
} catch (err) {
  log.error(`Khong the khoi tao/cap nhat database: ${err.message}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Uu tien lay session secret tu bien moi truong SESSION_SECRET.
// Neu chua cau hinh (dev/demo), tu sinh ngau nhien - luu y session se mat khi restart server,
// khong phu hop production (can dat SESSION_SECRET co dinh khi chay that qua PM2).
let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  sessionSecret = crypto.randomBytes(32).toString('hex');
  log.warn('Chua cau hinh SESSION_SECRET - dang dung secret ngau nhien cho phien lam viec nay.');
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  // rolling:true + maxAge dai (7 ngay) - them 2026-08-06 cho Giao dien di dong: ban desktop
  // luon mo san ca lam viec nen 8 tieng co dinh khong thanh van de, nhung dien thoai dong app
  // roi mo lai nhieu lan trong ngay - neu khong "rolling" (tu gia han moi request thay vi dem
  // co dinh tu luc dang nhap) se bi dang xuat giua chung du dang thao tac. Ap dung chung ca 2
  // ban vi dung chung 1 co che session. Van dung MemoryStore (chua doi, xem docs/CURRENT.md) -
  // restart server van lam mat toan bo phien dang hoat dong bat ke maxAge dai bao nhieu.
  rolling: true,
  cookie: {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngay, tu gia han lai moi request (rolling)
  },
}));

// Ghi log cac request cham (>=SLOW_REQUEST_MS) - them 2026-08-06 sau khi dieu tra bao cao "dung
// ung dung thi bi do" nhung khong co gi de doi chieu (server truoc day khong ghi log ra file).
// Giup phat hien dung duong dan/query nao thuc su gay nghen neu con tai dien trong tuong lai.
const SLOW_REQUEST_MS = 2000;
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration >= SLOW_REQUEST_MS) {
      const user = req.session && req.session.user ? req.session.user.username : '(chua dang nhap)';
      log.warn(`SLOW REQUEST ${req.method} ${req.originalUrl} - ${duration}ms - status=${res.statusCode} - user=${user}`);
    }
  });
  next();
});

// Khong gan requireAuth (chua ai dang nhap duoc luc chua thiet lap xong) - tu khoa lai sau khi
// da co it nhat 1 tai khoan, xem setup.routes.js.
app.use('/api/setup', setupRoutes);
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
app.use('/api/stock-returns', requireAuth, requirePermission('kho'), stockReturnsRoutes);
app.use('/api/supplier-returns', requireAuth, requirePermission('kho'), supplierReturnsRoutes);
// GET mo cho moi nguoi da dang nhap (chon doi tac luc lap phieu), POST/PUT/DELETE rieng kiem
// tra quyen ('kho' hoac 'cong_no' cho POST, chi 'cong_no' cho PUT/DELETE) ben trong file route
// (xem partners.routes.js).
app.use('/api/partners', requireAuth, partnersRoutes);
// GET mo cho moi nguoi da dang nhap (chon loai khach hang luc them/sua), POST/PUT/DELETE rieng
// kiem tra quyen 'cau_hinh' ben trong file route (xem customerCategories.routes.js).
app.use('/api/customer-categories', requireAuth, customerCategoriesRoutes);
app.use('/api/debts', requireAuth, requirePermission('cong_no'), debtsRoutes);
// Module rieng 'bao_hanh' (migration 036, 2026-08-08) - truoc do dung chung quyen 'cong_no',
// da tach de chon rieng duoc o trang "Vai tro" (xem warranties.routes.js).
app.use('/api/warranties', requireAuth, requirePermission('bao_hanh'), warrantiesRoutes);
app.use('/api/reports', requireAuth, requirePermission('bao_cao'), reportsRoutes);
// Module "So quy" - doc lap hoan toan voi Cong no (khong ghi debt_ledger, xem docs/DECISIONS.md).
// cash-book-settings: GET mo cho moi nguoi da dang nhap, PUT rieng kiem tra quyen 'so_quy' ben
// trong file route (giong warehouse-settings.routes.js).
app.use('/api/cash-vouchers', requireAuth, requirePermission('so_quy'), cashVouchersRoutes);
app.use('/api/cash-categories', requireAuth, requirePermission('so_quy'), cashCategoriesRoutes);
app.use('/api/cash-book-settings', requireAuth, cashBookSettingsRoutes);
// Module "Quan ly du an" (2026-08-04) - so cai cong no VAN thuoc khach hang, module nay khong
// dung debt_ledger (xem docs/DECISIONS.md). GET mo cho moi nguoi da dang nhap (dung khi tao du
// an de xem truoc danh sach Giai doan mau se duoc copy), POST/PUT/DELETE rieng quyen 'cau_hinh'
// ben trong file route (xem projectPhaseTemplates.routes.js).
app.use('/api/project-phase-templates', requireAuth, projectPhaseTemplatesRoutes);
app.use('/api/projects', requireAuth, requirePermission('du_an'), projectsRoutes);
// Module "Doi tac" (2026-08-05) - danh ba lien he ca nhan, hoan toan tach biet Nha cung cap/
// Khach hang. Quyen 'doi_tac' kiem tra RIENG TUNG ROUTE ben trong contacts.routes.js (khong gan
// chung o day nhu truoc) vi GET /birthdays-this-month phai mo cho moi tai khoan (dung cho card
// sinh nhat o dashboard.html).
app.use('/api/contacts', requireAuth, contactsRoutes);
// He thong thong bao (migration 027) - GET mo cho moi tai khoan da dang nhap (moi nguoi deu
// nhan thong bao), PUT cau hinh rieng quyen 'cau_hinh' kiem tra ben trong file route.
app.use('/api/notifications', requireAuth, notificationsRoutes);
app.use('/api/notification-settings', requireAuth, notificationSettingsRoutes);
// Cau hinh mau in (migration 028) - GET mo cho moi tai khoan da dang nhap (trang in phieu that
// can doc mau de render), PUT rieng kiem tra quyen 'cau_hinh' ben trong file route.
app.use('/api/print-templates', requireAuth, printTemplatesRoutes);
// Nhan bao loi JS phia trinh duyet (them 2026-08-06, xem clientLogs.routes.js) - KHONG gan
// requireAuth vi loi co the xay ra ngay ca truoc khi dang nhap (vd tren login.html).
app.use('/api/client-logs', clientLogsRoutes);

// Route kiem tra server song - dung de test nhanh khi chay demo.
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Server dang chay' });
});

// Phuc vu file tinh (HTML/CSS/JS) trong thu muc frontend/, khong qua build step.
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Phuc vu hinh anh dinh kem mau in (2026-08-06, xem printTemplates.routes.js#POST /:type/images)
// - luu ngoai frontend/ vi la du lieu runtime nguoi dung tai len (giong data/logs/), khong phai
// asset tinh checked-in nhu frontend/assets/images/. Cong khai khong doi requireAuth, giong cach
// logo/anh tinh trong frontend/ dang duoc phuc vu (trang in phieu that cung khong dang nhap lai).
app.use('/uploads/print-templates', express.static(path.join(__dirname, '..', 'data', 'print-template-uploads')));

// Mac dinh vao trang dang nhap khi truy cap trang chu.
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.listen(PORT, () => {
  log.info(`Server dang chay tai http://localhost:${PORT}`);
});
