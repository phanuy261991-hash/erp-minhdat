# Handoff: "Nghiệm thu theo giải pháp" — 4 giả định kỹ thuật đã CHỐT, kế hoạch chi tiết sẵn sàng — CHƯA CODE

**Ngày**: 2026-08-19 (buổi tối, tiếp nối `HANDOFF-NghiemThu-2026-08-19.md` cùng ngày)
**Trạng thái**: Mockup giao diện đã chốt hướng từ phiên trước. Phiên này đã **xác nhận lại đủ 4 giả định kỹ thuật** còn treo (qua `AskUserQuestion` với người dùng) và **nghiên cứu kỹ pattern code thật** cần tái sử dụng (không đoán). Người dùng yêu cầu dừng lại ở bước lưu kế hoạch, **KHÔNG code trong phiên này** — phiên sau đọc file này là code thẳng được, không cần hỏi lại 4 điểm dưới đây.

## 1. Đọc trước

- `docs/handoff/HANDOFF-NghiemThu-2026-08-19.md` — bối cảnh gốc, yêu cầu người dùng nguyên văn, link mockup.
- `docs/handoff/mockup-nghiem-thu-2026-08-19.html` — mở trực tiếp bằng trình duyệt để xem giao diện đã chốt (mở file này lên xem TRƯỚC khi code phần frontend).
- File này (v2) — 4 giả định đã chốt + pattern code thật cần tái sử dụng + checklist code theo thứ tự.

## 2. 4 giả định kỹ thuật — ĐÃ CHỐT qua `AskUserQuestion` (không hỏi lại)

1. **1 thiết bị đã xuất được chia số lượng vào NHIỀU giải pháp khác nhau** (vd 40 camera → 20 vào giải pháp A, 20 vào giải pháp B). → Cần bảng quan hệ nhiều-nhiều `product_id` ↔ `solution_id` kèm `quantity`.
2. **Phân quyền — kiểu MỚI trong dự án, tách XEM/SỬA ngay trong cùng 1 tab**: "Ai có quyền dự án (`du_an`) đều XEM được tab Nghiệm thu; nhưng chỉ Kế toán/Ban giám đốc mới THAO TÁC được (tạo/sửa/xóa giải pháp, gán thiết bị)". Vì **không được hardcode tên vai trò** trong code kiểm tra quyền (nguyên tắc `CLAUDE.md`), giải pháp: thêm **module quyền mới `nghiem_thu`**.
   - `GET` (xem danh sách/chi tiết) chỉ cần `du_an` — đã gán sẵn ở tầng mount `/api/projects` trong `server.js`, không cần thêm gì.
   - `POST`/`PUT`/`DELETE` (tạo/sửa/xóa giải pháp) cần **thêm** `nghiem_thu` — check thủ công trong handler bằng `userHasPermission()`.
   - Admin tự cấp module `nghiem_thu` cho đúng vai trò "Kế toán"/"Ban giám đốc" (hoặc bất kỳ vai trò nào) qua trang "Vai trò" **có sẵn**, không cần code gì thêm cho việc gán quyền — chỉ cần khai báo module mới xuất hiện tự động ở đó (đúng cơ chế `GET /api/roles/modules` đang đọc từ `MODULE_KEYS`).
3. **Đơn giá hiển thị = giá bán trên phiếu xuất kho gốc** (`stock_issue_items.unit_price` sau chiết khấu, KHÔNG phải giá vốn `costing.service.js`) — bình quân gia quyền theo đúng số lượng đã xuất nếu 1 sản phẩm xuất nhiều đợt giá khác nhau.
4. **CẦN chức năng in biên bản nghiệm thu** ngay trong đợt này (không hoãn) — thêm 1 loại mẫu in mới `acceptance_solution`, dùng lại đúng cơ chế "Mẫu in" (khung HTML/CSS thật + token `{{TenBien}}`) vừa xây xong cùng phiên hôm nay — xem `docs/DECISIONS.md` mục 2026-08-19 "Mẫu in: chuyển từ WYSIWYG contenteditable sang khung HTML/CSS thật + token binding" để hiểu cơ chế trước khi thêm loại mẫu mới.

## 3. Pattern code thật đã xác nhận qua đọc code (KHÔNG đoán — copy đúng, đừng viết lại khác)

### 3.1 Sub-resource dự án (route pattern)

Bám theo `backend/routes/projectVariations.routes.js` nguyên xi:
- `const router = express.Router({ mergeParams: true });`
- Mount trong `backend/routes/projects.routes.js`: `router.use('/:id/acceptance-solutions', projectAcceptanceSolutionsRoutes);`
- Quyền `du_an` **đã gán 1 lần** ở `server.js` (`app.use('/api/projects', requireAuth, requirePermission('du_an'), projectsRoutes)`) — sub-router **không cần khai báo lại** `du_an`, chỉ tự thêm chặn `nghiem_thu` cho route ghi.
- Mỗi handler tự kiểm tra dự án tồn tại đầu tiên:
  ```js
  function getProject(projectId) {
    return db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
  }
  ```

### 3.2 Công thức "thiết bị đã xuất cho dự án" — PHẢI dùng đúng công thức này (khớp tab Vật tư)

Copy nguyên xi từ `backend/routes/projectMaterials.routes.js`:
```js
function sumQuantityByProduct(table, itemsTable, foreignKey, projectId) {
  const rows = db.prepare(`
    SELECT it.product_id, SUM(it.quantity) AS qty
    FROM ${itemsTable} it JOIN ${table} d ON d.id = it.${foreignKey}
    WHERE d.project_id = ? GROUP BY it.product_id
  `).all(projectId);
  return new Map(rows.map((r) => [r.product_id, r.qty]));
}
// "Da xuat" NET (da tru tra hang, vi tra hang xuat ghi qua stock_receipts.is_return=1):
const issuedMap = sumQuantityByProduct('stock_issues', 'stock_issue_items', 'issue_id', projectId);
const receivedMap = sumQuantityByProduct('stock_receipts', 'stock_receipt_items', 'receipt_id', projectId);
const issuedNet = (productId) => (issuedMap.get(productId) || 0) - (receivedMap.get(productId) || 0);
```
Lý do bắt buộc dùng đúng công thức này: để số "Thiết bị đã xuất" ở tab Nghiệm thu khớp 100% với số ở tab "Vật tư" cùng dự án — viết công thức khác sẽ tạo ra 2 con số vênh nhau cho cùng 1 khái niệm, rất dễ gây nghi ngờ dữ liệu sai.

### 3.3 Đơn giá bình quân gia quyền theo GIÁ BÁN (chưa có hàm sẵn — viết mới)

`costing.service.js#getWeightedAverageCost()` là giá VỐN, không dùng được. Viết SQL mới:
```sql
SELECT it.product_id,
       SUM(it.quantity * it.unit_price * (1 - it.discount_percent/100.0)) / SUM(it.quantity) AS avg_unit_price
FROM stock_issue_items it JOIN stock_issues i ON i.id = it.issue_id
WHERE i.project_id = ?
GROUP BY it.product_id
```

### 3.4 Check quyền 2 lớp (AND) — không có helper sẵn, gọi thủ công

`backend/middleware/requirePermission.js` chỉ có `requirePermission`/`requireAnyPermission` (OR) — **không có** `requireAllPermissions`. Dùng hàm thuần đã có `userHasPermission(user, moduleKey)`:
```js
const { userHasPermission } = require('../middleware/requirePermission');
// trong handler POST/PUT/DELETE:
if (!userHasPermission(req.session.user, 'nghiem_thu')) {
  return res.status(403).json({ error: 'Không có quyền thao tác Nghiệm thu' });
}
```

### 3.5 Trang in thật — copy khung `print-project-advance.html`/`.js`

```js
// print-acceptance-solution.js (mau, dua tren print-project-advance.js)
function renderAcceptance(project, solution, company, template) {
  const tokenValues = buildAcceptanceSolutionTokenValues(project, solution, company);
  const rendered = renderPrintTemplate({
    templateHtml: template.template_html,
    tokenValues,
    items: solution.items,
    itemTokenBuilder: buildAcceptanceSolutionItemTokenValues,
  });
  const shadow = sheet.shadowRoot || sheet.attachShadow({ mode: 'open' }); // BAT BUOC Shadow DOM, KHONG innerHTML truc tiep
  shadow.innerHTML = rendered;
  applyPrintOrientation(template.orientation);
}
```
**Lý do bắt buộc Shadow DOM (không phải `innerHTML` trực tiếp)**: phát hiện đau đớn cùng phiên hôm nay — mẫu in có `<style>` riêng của người dùng, nếu chèn trực tiếp vào trang sẽ rò rỉ CSS ra ngoài làm lệch nút "Quay lại"/"In phiếu". Xem `docs/DECISIONS.md` mục 2026-08-19 "Mẫu in" để hiểu đầy đủ sự cố + cách sửa.

Đăng ký thêm:
- `backend/config/printTemplateTokens.js`: thêm entry `acceptance_solution` vào `PRINT_TEMPLATE_TYPES` (`hasItems: true`, danh sách token document + item).
- `backend/config/print-template-defaults/acceptance_solution.html`: file mặc định tự chứa `<style>` + `.tpl-page` (copy cấu trúc `stock_issue.html` cùng thư mục — có `.tpl-signatures` cho "Bên giao/Bên nhận").
- `frontend/assets/print-template-render.js`: thêm `buildAcceptanceSolutionTokenValues()`, `buildAcceptanceSolutionItemTokenValues()`, `SAMPLE_ACCEPTANCE_SOLUTION_DATA`, entry trong `PRINT_TYPE_HANDLERS`.

### 3.6 Tab trong `project-detail.html` — khác tab "Bảo hành" ở điểm quan trọng

Cơ chế switch tab đã có sẵn (delegated click trên `.detail-tabs`, toggle `.active`/`hidden`, hỗ trợ deep-link `?tab=`) — chỉ thêm 1 `<button class="detail-tab" data-tab="acceptance">Nghiệm thu</button>` + panel tương ứng.

**Khác tab "Bảo hành"**: tab Bảo hành ẩn CẢ TAB nếu thiếu quyền phụ (`bao_hanh`). Tab Nghiệm thu **KHÔNG ẩn cả tab** — ai có `du_an` (đã vào được trang) đều thấy tab + số liệu + danh sách giải pháp bình thường. Chỉ ẩn/khóa (`hidden`/`disabled`) nút "Thêm giải pháp" + icon Sửa/Xóa từng thẻ, dựa vào `currentUser.permissions.includes('nghiem_thu')` — check ngay trong `init()` IIFE của `project-detail.js` (chỗ đang check `bao_hanh` là ví dụ tham khảo gần nhất, dù logic khác nhau).

## 4. Checklist code theo thứ tự (phiên sau làm theo, đánh dấu khi xong)

- [ ] Migration `041_project_acceptance_solutions.sql`:
  ```sql
  CREATE TABLE project_acceptance_solutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    name TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE project_acceptance_solution_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    solution_id INTEGER NOT NULL REFERENCES project_acceptance_solutions(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL,
    UNIQUE(solution_id, product_id)
  );
  ```
  (Không cần `ON DELETE CASCADE` — xóa thủ công 2 bước trong transaction, đúng pattern `project.service.js#deleteProject()` đang làm cho các bảng con khác của dự án.)
- [ ] `backend/config/modules.js`: thêm `'nghiem_thu'` vào `MODULE_KEYS`, `nghiem_thu: 'Nghiệm thu'` vào `MODULE_LABELS`.
- [ ] `backend/routes/projectAcceptanceSolutions.routes.js` (mới), mount trong `projects.routes.js`:
  - Helper `computeAvailableDevices(projectId, excludeSolutionId)` → `Map product_id -> {product_code, product_name, unit, unit_price, issued_net, assigned_other, remaining}`. `assigned_other` = SUM `project_acceptance_solution_items.quantity` JOIN `project_acceptance_solutions` WHERE `project_id=?` AND (không lọc `solution_id` nếu `excludeSolutionId` là null, ngược lại loại trừ đúng `solution_id`).
  - `GET /` → `{ solutions: [...kèm items rút gọn cho chip + tổng SL/giá trị], summary: {issued_total, assigned_total, unassigned_total, value_total} }`.
  - `GET /available-devices?exclude_solution_id=` → mảng cho bảng chọn trong modal.
  - `GET /:solutionId` → chi tiết 1 giải pháp kèm `items` đầy đủ (dùng cho modal Sửa + trang in).
  - `POST /` (thêm chặn `nghiem_thu`) → validate `name` bắt buộc, mỗi item `quantity > 0` và `<= remaining`, transaction insert solution + items.
  - `PUT /:solutionId` (thêm chặn `nghiem_thu`) → validate tương tự (`excludeSolutionId = solutionId`), transaction update solution + xóa hết items cũ + insert lại items mới.
  - `DELETE /:solutionId` (thêm chặn `nghiem_thu`) → transaction xóa items rồi xóa solution.
- [ ] `backend/config/printTemplateTokens.js` + `backend/config/print-template-defaults/acceptance_solution.html` (type mới, xem mục 3.5).
- [ ] `frontend/assets/print-template-render.js` (token builder mới, xem mục 3.5).
- [ ] `frontend/print-acceptance-solution.html`/`.js` (mới, copy khung `print-project-advance.html`/`.js`, URL `?project_id=&solution_id=`).
- [ ] `frontend/project-detail.html`/`.js`: tab "Nghiệm thu" + 4 thẻ số liệu + danh sách thẻ giải pháp + modal Thêm/Sửa — dựng lại THEO ĐÚNG markup/bố cục trong `mockup-nghiem-thu-2026-08-19.html` (đổi sang đúng class/biến thật của `style.css` — CSS trong mockup là bản chuẩn hóa lại để demo, không phải file thật, đừng copy y nguyên). Nút "Thêm giải pháp" + icon Sửa/Xóa ẩn/khóa theo `nghiem_thu` (xem mục 3.6). Nút "In biên bản" mỗi thẻ → `openPrintPreview('print-acceptance-solution.html?project_id=...&solution_id=...')`.
- [ ] Test qua API thật (curl/Node fetch: validate vượt quá remaining bị chặn, chia 1 sản phẩm vào 2 giải pháp đúng số dư, 403 khi thiếu `nghiem_thu` nhưng vẫn xem được qua GET, migration/backfill quyền nếu cần) + trình duyệt thật (Chrome headless CDP: tab hiện đúng, modal chọn thiết bị đúng số liệu, in biên bản không lỗi console, Shadow DOM cô lập CSS đúng).
- [ ] Đồng bộ tài liệu bắt buộc: `docs/PRD.md` (mục 4.12), `docs/Plan.md`, `docs/erd.mermaid` (2 bảng mới), `docs/CURRENT.md`, `docs/TASK.md`, `docs/CHANGELOG.md`, `docs/DECISIONS.md`.

## 5. Setup nhắc lại

- Đọc theo đúng thứ tự bắt buộc của `CLAUDE.md` khi bắt đầu phiên mới: `docs/PRD.md` → `docs/Plan.md` → `docs/erd.mermaid` → `docs/CURRENT.md` → `docs/TASK.md` → `docs/CHANGELOG.md` → `docs/DECISIONS.md`.
- Server không hot-reload — restart thủ công sau khi sửa file backend trước khi test qua trình duyệt.
- Migration tiếp theo là `041` (mới nhất hiện có: `040_print_template_html_body.sql`).
- Không cần hỏi lại 4 điểm ở mục 2 — đã chốt qua `AskUserQuestion` thật với người dùng, không phải giả định của Claude nữa.
