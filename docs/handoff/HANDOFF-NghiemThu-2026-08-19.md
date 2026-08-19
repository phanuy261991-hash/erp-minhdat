# Handoff: Mockup "Nghiệm thu theo giải pháp" đã chốt hướng — chưa code

**Ngày**: 2026-08-19
**Trạng thái**: Toàn bộ việc khác trong phiên này đã code xong, test kỹ, **đã commit** (`git log` xem commit mới nhất). Tính năng **"Nghiệm thu"** (tab mới trong Chi tiết dự án) mới dừng ở **mockup giao diện đã được người dùng chốt hướng** — **CHƯA VIẾT DÒNG CODE THẬT NÀO** (không migration, không route, không file frontend nào ngoài file mockup tĩnh).

## 1. Việc đã xong + đã commit trong phiên này (không liên quan tới Nghiệm thu)

Commit `1968694` — "Bao hanh theo du an + lich su bao hanh, tach quyen Khach hang khoi Cong no". Chi tiết đầy đủ: `docs/CHANGELOG.md` mục `2026-08-19`, `docs/DECISIONS.md` mục `2026-08-19`. Tóm tắt 6 việc:

1. Sắp xếp cột "Ngày nghiệm thu" (trang Bảo hành, không liên quan nghiệp vụ "Nghiệm thu dự án" bên dưới — trùng tên tình cờ).
2. **"Quy bảo hành về theo dự án"** — migration `038`: `warranties.project_id` (tùy chọn) + bảng `warranty_visits` (lịch sử bảo hành). Tab "Bảo hành" mới trong Chi tiết dự án. Nút "Xem chi tiết" trên trang Bảo hành.
3. Công nợ khách hàng: sắp xếp ưu tiên còn nợ khác 0.
4. Khách hàng: gom nhóm theo Loại khách hàng.
5. Báo cáo: biểu đồ hiện thêm nhãn tháng trước.
6. **Migration `039`**: tách quyền module `khach_hang` khỏi `cong_no` (`cong_no` từ nay chỉ còn Nhà cung cấp/Công nợ NCC).

Không có gì dang dở ở 6 mục này — nếu phiên sau không làm gì liên quan tới "Nghiệm thu", chỉ cần đọc `docs/CURRENT.md`/`docs/TASK.md` như quy trình bình thường.

## 2. Việc đang mở: tính năng "Nghiệm thu theo giải pháp"

### Yêu cầu gốc của người dùng
> "Tại dự án sẽ có thêm 1 tab là Nghiệm thu, bấm vào sẽ hiển thị giao diện tạo danh sách nghiệm thu, theo từng giải pháp đã ký với khách hàng, trong những giải pháp đó sẽ có các danh sách thiết bị tương ứng, người dùng tạo giải pháp và hệ thống sẽ sổ ra tất cả thiết bị đã được xuất cho dự án đó, cho phép người dùng check chọn để thêm thiết bị vào từng giải pháp tương ứng."

Sau đó người dùng yêu cầu thêm: **hiển thị đơn giá cho từng thiết bị** trong bảng chọn.

### Mockup đã dựng — người dùng đã xem và nói "chốt cái này"
- **File lưu trong repo** (nguồn chính thống, mở trực tiếp bằng trình duyệt để xem lại bất cứ lúc nào, không phụ thuộc dịch vụ ngoài): [`docs/handoff/mockup-nghiem-thu-2026-08-19.html`](mockup-nghiem-thu-2026-08-19.html)
- Bản Artifact online cùng nội dung (có thể đã bị người dùng chỉnh sửa thêm sau thời điểm này qua share link, kiểm tra lại nếu nghi ngờ lệch bản): `https://claude.ai/code/artifact/e0b1120a-bd76-4f84-b61d-81067f58066e`

Mockup thể hiện:
- Tab "Nghiệm thu" mới, nằm sau tab "Bảo hành" trong Chi tiết dự án.
- 4 thẻ số liệu tổng quan: Thiết bị đã xuất / Đã đưa vào giải pháp (kèm % + thanh tiến độ) / Chưa phân loại / Tổng giá trị đã xuất.
- Danh sách "Giải pháp" dạng thẻ: tên, số loại thiết bị, tổng số lượng, tổng giá trị, xem nhanh vài thiết bị tiêu biểu (chip), thanh tiến độ "đã gán bao nhiêu %", icon Sửa/Xóa.
- Modal Thêm/Sửa giải pháp: tên + ghi chú, bảng TOÀN BỘ thiết bị đã xuất cho dự án (tick chọn + nhập số lượng đưa vào giải pháp này), mỗi dòng có **Đơn giá** + **Thành tiền**, dòng tổng cuối bảng.

### ⚠️ QUAN TRỌNG — "chốt" ở đây là chốt HƯỚNG GIAO DIỆN, chưa phải chốt từng chi tiết kỹ thuật

Mockup có 1 khung cảnh báo màu vàng liệt kê **4 giả định thiết kế do Claude tự đặt ra khi chưa được hỏi kỹ** (người dùng chưa phản hồi riêng từng điểm này, chỉ nói chung "chốt cái này"). **Phiên sau PHẢI xác nhận lại từng điểm này với người dùng trước khi migrate/code**, đừng suy đoán tiếp:

1. **1 thiết bị có được chia số lượng vào NHIỀU giải pháp khác nhau không?** (vd 40 camera → 20 vào giải pháp A, 20 vào giải pháp B). Mockup giả định: **CÓ** — ảnh hưởng trực tiếp thiết kế bảng (`project_acceptance_solution_items` sẽ là quan hệ nhiều-nhiều product↔solution kèm quantity, không phải 1-1).
2. Trang "Nghiệm thu" **chỉ gom nhóm thiết bị đã xuất để lập biên bản, KHÔNG tạo phiếu xuất kho mới, không đổi tồn kho** — xác nhận đúng ý hay người dùng thực ra muốn liên kết ngược tới in ấn/nghiệp vụ khác (vd tự sinh "Biên bản nghiệm thu" dạng in, giống `print-issue.html`)?
3. Quyền thao tác: mockup giả định dùng chung quyền `du_an` sẵn có (ai vào được Chi tiết dự án thì thao tác được Nghiệm thu). Hỏi lại xem có cần tách quyền riêng không (giống tiền lệ `bao_hanh`/`khach_hang` đã tách 2 lần trong dự án).
4. **Đơn giá** hiển thị lấy từ giá bán ghi trên phiếu xuất kho gốc (`stock_issue_items.unit_price`, bình quân gia quyền nếu xuất nhiều đợt giá khác nhau) — xác nhận đúng loại giá người dùng muốn thấy (giá bán cho khách, không phải giá vốn nội bộ).

Ngoài 4 điểm trên, còn ít nhất 2 câu hỏi thiết kế chưa đặt ra trong mockup, nên hỏi thêm ở phiên sau nếu bắt đầu code thật:
- Từ "giải pháp" hay đổi tên kỹ thuật khác (vd "hạng mục nghiệm thu") cho khớp thuật ngữ nội bộ công ty?
- Có cần chức năng **in biên bản nghiệm thu** (PDF/HTML in được, tương tự `print-issue.html`/`print-project-advance.html` đã có 2 mẫu) không, hay chỉ dừng ở quản lý số liệu trên web?

## 3. Đề xuất kỹ thuật khi bắt đầu code thật (chưa làm, chỉ để tham khảo — xác nhận lại giả định mục 2 trước)

- Migration mới (tiếp theo `039`, sẽ là `040`): 2 bảng —
  - `project_acceptance_solutions` (id, project_id, name, note, created_by, created_at) — giống hệt pattern `project_variations`.
  - `project_acceptance_solution_items` (id, solution_id, product_id, quantity, created_at) — quan hệ nhiều-nhiều product↔solution NẾU giả định (1) ở trên đúng.
- Backend: router mới lồng vào `projects.routes.js` tại `/:id/acceptance-solutions` (đúng pattern `mergeParams:true` các sub-resource khác — xem `projectVariations.routes.js` làm mẫu gọn nhất). Cần 1 hàm tính "thiết bị đã xuất cho dự án" (SELECT gộp theo `product_id` từ `stock_issue_items` JOIN `stock_issues` WHERE `project_id=? AND is_return=0`) và "còn lại chưa gán" (đã xuất − SUM đã gán ở giải pháp KHÁC, cho phép sửa lại số của chính giải pháp đang mở).
- Frontend: tab "Nghiệm thu" trong `project-detail.html`/`.js`, dựng lại đúng theo mockup (đã có sẵn toàn bộ markup/CSS tham khảo trong file mockup — copy cấu trúc, đổi sang đúng class/token thật của `style.css`, không copy y nguyên CSS trong mockup vì đó là bản chuẩn hóa lại từ token thật, không phải file thật).
- Nhớ cập nhật `docs/PRD.md`/`docs/Plan.md`/`docs/erd.mermaid` theo đúng quy trình bắt buộc của `CLAUDE.md` sau khi code xong.

## 4. Setup & Resources

- Đọc theo đúng thứ tự bắt buộc của `CLAUDE.md` khi bắt đầu phiên mới: `docs/PRD.md` → `docs/Plan.md` → `docs/erd.mermaid` → `docs/CURRENT.md` → `docs/TASK.md` → `docs/CHANGELOG.md` → `docs/DECISIONS.md`.
- Tài khoản demo: `admin`/`Demo@123456` (Admin, toàn quyền).
- Server không hot-reload — luôn restart thủ công sau khi sửa file backend trước khi test qua trình duyệt.
- Skill bắt buộc trước khi viết CSS cho tab mới: `ui-ux-pro-max` (theo `CLAUDE.md`) — dù đã có mockup tham khảo, vẫn nên chạy qua skill 1 lượt khi dựng bản thật để đối chiếu, đặc biệt nếu đổi hướng so với mockup.
- Không tự ý code migration/backend/frontend cho "Nghiệm thu" khi chưa xác nhận lại mục 2 ở trên — đây là tính năng nghiệp vụ mới hoàn toàn, đúng diện phải hỏi trước khi làm theo `CLAUDE.md`.
