# Triển khai thật (Phase 5 — Vận hành & Go-live)

> Tài liệu này mô tả **quy trình đầy đủ** để đưa ứng dụng chạy ổn định lâu dài trên máy chủ thật trong văn phòng — khác với `docs/DEMO.md` (chỉ để chạy thử/test nhanh). Thực hiện **trên đúng máy sẽ dùng làm máy chủ** (không phải máy dev) — xem `docs/DECISIONS.md` mục "Phase 5" để biết lý do tách riêng.

Có 2 cách triển khai — chọn 1 trong 2:

- **Cách A — Cài đặt từ bản đóng gói (khuyến nghị, đơn giản hơn)**: không cần cài Node.js/npm trên máy chủ, không cần biết dòng lệnh `git`/`npm install`. Phù hợp hầu hết trường hợp. Xem mục 1 ngay dưới đây.
- **Cách B — PM2 thủ công**: cần cài Node.js, chạy `npm install`/`pm2` bằng tay, nhưng có công cụ theo dõi process (`pm2 list`, `pm2 logs`) mạnh hơn Task Scheduler. Xem từ mục "0. Điều kiện trước khi bắt đầu" trở xuống.

## 1. Cách A — Cài đặt từ bản đóng gói

### 1.1. Đóng gói (thực hiện trên máy dev, có sẵn Node.js + đã `npm install`)

```bash
npm run build:portable
```

Lệnh này tạo thư mục `dist/` chứa: `node.exe` (portable, không cần cài đặt), toàn bộ `backend/`/`frontend/`/`scripts/`/`node_modules/`, `start.bat` (điểm vào double-click), và `install-autostart.ps1`/`uninstall-autostart.ps1`. Xem lý do chọn cách đóng gói này (đã thử `pkg` đóng gói thành 1 file `.exe` duy nhất trước, thất bại do lỗi native-addon) tại `docs/DECISIONS.md`.

### 1.2. Cài đặt trên máy chủ thật

1. Nén thư mục `dist/` thành `.zip`, copy sang máy chủ, giải nén vào 1 thư mục cố định (vd `C:\ERP_MinhDat\`).
2. Chạy thử `start.bat` — cửa sổ dòng lệnh hiện ra, tự tạo `data\data.db` mới và áp dụng đủ migration.
3. Mở trình duyệt tại `http://localhost:3000` — hệ thống tự chuyển sang trang **"Thiết lập lần đầu"** (vì chưa có tài khoản nào). Điền tên công ty (tuỳ chọn), họ tên quản trị viên, tên đăng nhập, mật khẩu → **"Tạo tài khoản & bắt đầu"** → đăng nhập bằng tài khoản vừa tạo.
4. Mở Windows Firewall cho port 3000 (xem lệnh `New-NetFirewallRule` ở mục 2 bên dưới) để máy khác trong LAN truy cập được qua `http://<IP-máy-chủ>:3000`.
5. Cài tự động khởi động cùng Windows (chạy ngầm, không cần giữ cửa sổ `start.bat` mở): chuột phải PowerShell → **Run as Administrator**, chạy:
   ```powershell
   powershell -ExecutionPolicy Bypass -File C:\ERP_MinhDat\install-autostart.ps1
   ```
   Đăng ký 1 Task Scheduler task chạy `node.exe backend\server.js` mỗi khi Windows khởi động (kể cả chưa ai đăng nhập), **chạy ngầm ngay lập tức** sau khi đăng ký (không cần đợi khởi động lại máy), tự khởi động lại tối đa 3 lần nếu tiến trình crash. Gỡ bằng `uninstall-autostart.ps1` tương tự. Đóng cửa sổ `start.bat` (nếu còn mở) trước khi chạy bước này để tránh xung đột cổng 3000.
6. Đặt `SESSION_SECRET` cố định — **lưu ý riêng cho Cách A**: tác vụ Task Scheduler chạy dưới tài khoản `SYSTEM`, không đọc được biến môi trường cấp người dùng thường, nên **bắt buộc dùng cờ `/M`** (khác với mục 3 bên dưới viết cho Cách B/PM2):
   ```powershell
   & "C:\ERP_MinhDat\node.exe" -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   setx SESSION_SECRET "<dán chuỗi vừa sinh ra>" /M
   Stop-ScheduledTask -TaskName "ERP-MinhDat-KhoCongNo"
   Start-ScheduledTask -TaskName "ERP-MinhDat-KhoCongNo"
   ```
   3 lệnh trên chạy trong PowerShell quyền Administrator. 2 lệnh cuối khởi động lại tác vụ để nạp lại biến môi trường mới (tác vụ đang chạy đã nạp môi trường cũ từ lúc khởi động, không tự đọc lại).
7. Cấu hình backup (xem mục 5 bên dưới) — đường dẫn `node.exe`/`scripts/backup.js` dùng trong Task Scheduler backup lấy từ chính thư mục `dist/` đã giải nén (vd `C:\ERP_MinhDat\node.exe` / `C:\ERP_MinhDat\scripts\backup.js`).

### 1.3. Cập nhật phiên bản mới

Đóng gói lại (`npm run build:portable`) trên máy dev, copy đè toàn bộ `dist/` mới sang máy chủ **trừ thư mục `data/`** (giữ nguyên database cũ) — dừng `start.bat`/task tự khởi động trước khi copy đè để tránh file đang bị khoá.

## 0. Điều kiện trước khi bắt đầu (Cách B — PM2 thủ công)

- Đã cài Node.js (phiên bản dùng khi phát triển) trên máy chủ.
- Đã `npm install`, `npm run migrate`, `npm run seed:admin` trên máy chủ (xem `docs/DEMO.md` mục 2–4 nếu chưa từng chạy).
- Đã xác nhận chạy thử bằng `npm start` truy cập được từ máy khác trong LAN (theo `docs/DEMO.md`) — chỉ chuyển sang các bước dưới đây sau khi bước test thủ công đã thành công.

## 1. Đặt IP tĩnh cho máy chủ

Cần để các máy khác trong LAN không bị mất kết nối khi máy chủ được cấp lại IP khác qua DHCP.

**Cách 1 — DHCP reservation trên router (khuyến nghị)**: an toàn hơn đặt tĩnh trực tiếp trên máy (tránh xung đột IP với thiết bị khác). Vào trang quản trị router (thường `192.168.x.1`), tìm mục "DHCP Reservation"/"Address Reservation", gán cố định 1 địa chỉ IP cho địa chỉ MAC của máy chủ. Bước cụ thể khác nhau theo hãng router — cần thông tin đăng nhập router của bạn.

**Cách 2 — Đặt IP tĩnh trực tiếp trên Windows**: vào **Settings → Network & Internet → (chọn card mạng đang dùng) → IP settings → Edit → Manual** — điền đúng theo dải mạng LAN thật đang dùng (không đoán): IP tĩnh, Subnet mask, Gateway, DNS. Lấy các thông số này bằng lệnh `ipconfig /all` trên chính máy chủ trước khi đổi (ghi lại địa chỉ đang được DHCP cấp để dùng lại chính IP đó dưới dạng tĩnh — tránh xung đột với máy khác). **Cẩn thận**: nhập sai Gateway sẽ làm máy chủ mất kết nối mạng — nên có quyền truy cập vật lý vào máy khi đổi, tránh chỉ thao tác từ xa.

Sau khi đặt xong, ghi lại IP tĩnh này — dùng cho toàn bộ máy client truy cập `http://<IP-tĩnh>:3000`.

## 2. Cấu hình Windows Firewall

Xem `docs/DEMO.md` mục "Nếu không vào được dù ping thấy máy chủ" — chạy 1 lần trên máy chủ (PowerShell quyền Administrator):

```powershell
New-NetFirewallRule -DisplayName "ERP MinhDat - App port 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

## 3. Đặt SESSION_SECRET cố định

Hiện tại nếu không cấu hình, `backend/server.js` tự sinh secret ngẫu nhiên mỗi lần khởi động → **toàn bộ người dùng bị đăng xuất mỗi khi restart server** (session không còn hợp lệ). Bắt buộc đặt cố định trước khi chạy thật lâu dài.

1. Sinh 1 secret ngẫu nhiên mạnh (chạy trên máy chủ):
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Đặt làm biến môi trường **hệ thống** (không phải biến phiên tạm thời — `setx` ghi vào registry, có hiệu lực cho các phiên PowerShell/PM2 mở **sau đó**, không ảnh hưởng phiên đang mở):
   ```powershell
   setx SESSION_SECRET "<giá trị vừa sinh ra>"
   ```
3. Đóng và mở lại PowerShell (hoặc khởi động lại máy) để biến môi trường có hiệu lực, rồi mới chạy `pm2 start` ở bước 4.

**Không** ghi giá trị secret vào `ecosystem.config.js` hay bất kỳ file nào commit vào git (xem `CLAUDE.md` — không hardcode thông tin bí mật).

## 4. Chạy bằng PM2

```powershell
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
```

`ecosystem.config.js` (đã có sẵn ở gốc dự án) khai báo `NODE_ENV=production`, `PORT=3000` — `SESSION_SECRET` được PM2 tự kế thừa từ biến môi trường hệ thống đã đặt ở bước 3.

### Tự khởi động lại khi máy chủ khởi động (Windows)

Lệnh `pm2 startup` chính thức **chỉ hỗ trợ Linux/macOS**. Trên Windows, dùng gói bổ sung:

```powershell
npm install -g pm2-windows-startup
pm2-startup install
pm2 save
```

`pm2-startup install` tạo 1 Windows Service tự chạy `pm2 resurrect` (khôi phục lại đúng danh sách process đã `pm2 save`) mỗi khi máy khởi động — **cần chạy PowerShell với quyền Administrator**. Sau này mỗi lần thêm/sửa process PM2 (vd đổi cấu hình `ecosystem.config.js` rồi `pm2 restart`), luôn chạy lại `pm2 save` để lưu đúng danh sách mới (xem `CLAUDE.md`).

## 5. Cấu hình backup tự động

1. Vào **Cấu hình kho** trong ứng dụng (cần quyền `cau_hinh`) → mục "Sao lưu dữ liệu" → nhập thư mục lưu backup (**nên chọn ổ đĩa khác** ổ chứa dự án, vd `D:\Backups\ERP_MinhDat` — để vẫn còn bản sao nếu ổ chứa dự án hỏng) → **Lưu thay đổi**.
2. Bấm **Backup ngay** để xác nhận đường dẫn hoạt động đúng (tạo ngay 1 file `data-<thời-điểm>.db` trong thư mục đã chọn).
3. Đặt lịch chạy tự động hàng ngày bằng **Windows Task Scheduler**:
   - Mở **Task Scheduler** → **Create Basic Task** → đặt tên (vd "ERP MinhDat - Backup hàng ngày") → Trigger: **Daily**, chọn giờ ít người dùng hệ thống (vd 23:00) → Action: **Start a program**.
   - Program/script: đường dẫn đầy đủ tới `node.exe` (xem bằng `(Get-Command node).Source`).
   - Add arguments: `scripts/backup.js`
   - Start in: đường dẫn gốc dự án (vd `C:\Projects\ERP_MinhDat`) — **bắt buộc** để script tìm đúng `data/data.db` và kết nối đúng database đọc cấu hình đường dẫn backup.
4. Script tự xóa các bản backup cũ hơn 14 ngày (xem `scripts/backup.js`) — tránh thư mục backup phình to vô hạn. Nếu muốn giữ lâu hơn, tự sao chép file ra nơi khác định kỳ.

## 6. Checklist trước khi go-live

- [ ] IP tĩnh đã đặt, đã test truy cập từ ≥2 máy khác trong LAN bằng đúng IP đó.
- [ ] Windows Firewall đã mở port 3000.
- [ ] `SESSION_SECRET` đã đặt cố định qua `setx`, đã xác nhận không bị đăng xuất sau khi restart PM2.
- [ ] PM2 đang chạy app (`pm2 list` thấy `kho-app` trạng thái `online`), đã `pm2 save`.
- [ ] `pm2-startup install` đã chạy — test bằng cách khởi động lại máy chủ, xác nhận app tự chạy lại không cần thao tác thủ công.
- [ ] Đường dẫn backup đã cấu hình, đã bấm "Backup ngay" thành công, đã đặt Task Scheduler chạy hàng ngày.
- [ ] Đã đổi mật khẩu tài khoản `admin` mặc định (nếu seed bằng giá trị demo) và điền đúng thông tin công ty thật (trang Thông tin công ty) trước khi dùng thật.
- [ ] Đã đào tạo người dùng thật (thủ kho, kế toán) thao tác cơ bản trên hệ thống.
