# Hướng dẫn chạy demo trên máy (Phase 1)

Áp dụng cho việc test luồng đăng nhập trên chính máy bạn. Mô hình thật (nhiều máy trong LAN cùng truy cập 1 máy chủ) mô tả ở mục 4 bên dưới.

## 1. Yêu cầu

- Đã cài Node.js trên máy (kiểm tra bằng `node -v`).
- Đã ở trong thư mục dự án: `C:\Projects\ERP_MinhDat`.

## 2. Cài đặt (chỉ cần làm 1 lần, hoặc khi có thêm package mới)

```
npm install
```

## 3. Khởi tạo database (chỉ cần chạy khi database chưa có, hoặc có migration mới)

```
npm run migrate
```

Lệnh này tạo file `data/data.db` và áp dụng các migration chưa chạy. Chạy lại nhiều lần không sao — migration đã áp dụng sẽ tự bỏ qua.

## 4. Tạo tài khoản admin (chỉ cần làm 1 lần cho mỗi database mới)

PowerShell:

```powershell
$env:ADMIN_USERNAME="admin"
$env:ADMIN_PASSWORD="MatKhauCuaBan123"
npm run seed:admin
```

> Hiện tại `data/data.db` trên máy bạn đã có sẵn tài khoản demo (từ Phase 1.6, vai trò là dữ liệu động trong bảng `roles`, không còn 3 giá trị cố định):
> - `admin` / `Demo@123456` (vai trò **Admin**, `is_protected`, toàn quyền) — dùng để test mọi chức năng, kể cả trang Người dùng/Vai trò/Cấu hình.
> - `thukho1` / `ThuKho@123` (vai trò **Thủ kho**, quyền module `kho`) — dùng để test đúng phân quyền (chỉ thấy menu "Tổng quan", không thấy "Người dùng"/"Vai trò"/nhóm "Cấu hình").
>
> Có thể dùng ngay để test, không cần tạo lại. Tài khoản mới sau này tạo qua trang **Người dùng** (chọn vai trò từ danh sách động — quản lý tại trang **Vai trò**), chỉ Admin và vai trò có quyền module `nguoi_dung` mới thấy 2 trang này. Khi go-live thật, nên tạo tài khoản mới với mật khẩu riêng.

## 5. Chạy server

```
npm start
```

Thấy dòng `Server dang chay tai http://localhost:3000` là server đã chạy.

> Sẽ có cảnh báo "Chưa cấu hình SESSION_SECRET" — bình thường ở giai đoạn demo, không cần xử lý. Trước khi go-live thật (Phase 5) sẽ cấu hình cố định.

## 6. Truy cập thử

Mở trình duyệt vào: **http://localhost:3000**

Sẽ tự chuyển đến trang đăng nhập. Đăng nhập bằng tài khoản demo ở mục 4, sẽ được chuyển sang trang **Tổng quan** (dashboard) với sidebar điều hướng bên trái. Đăng nhập bằng `admin` sẽ thấy đủ menu, gồm nhóm "Quản trị" (Người dùng, Vai trò) và nhóm "Cấu hình" (Thông tin công ty, Cấu hình kho, Cấu hình bán hàng — khung trống chưa có nội dung); đăng nhập bằng `thukho1` sẽ chỉ thấy "Tổng quan" — đúng theo phân quyền (chặn cả ở giao diện lẫn API, thử vào thẳng URL các trang trên cũng bị chuyển hướng về Tổng quan).

## 7. Dừng server

Nhấn `Ctrl + C` trong cửa sổ terminal đang chạy `npm start`.

## 8. Test mô hình nhiều máy trong LAN (khi cần)

Đây là mô hình thật của dự án: 1 máy đóng vai trò máy chủ, các máy khác trong cùng mạng LAN truy cập qua IP.

1. Trên máy chủ, tìm địa chỉ IP nội bộ:
   ```
   ipconfig
   ```
   Tìm dòng `IPv4 Address` (ví dụ `192.168.1.50`).
2. Chạy server như mục 5 (`npm start`).
3. Trên máy khác trong cùng mạng LAN, mở trình duyệt vào: `http://192.168.1.50:3000` (thay bằng IP thật của máy chủ).
4. Nếu không vào được dù ping thấy máy chủ (rất hay gặp): do Windows Firewall chặn port 3000 (ping dùng ICMP, thường được cho phép sẵn; truy cập web dùng TCP nên cần rule riêng). Trên máy chủ, mở **PowerShell với quyền Administrator** và chạy:
   ```powershell
   New-NetFirewallRule -DisplayName "ERP MinhDat - App port 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
   ```
   Đã xác nhận cách này khắc phục được vấn đề trong lần test thực tế (2026-07-31).

> Lưu ý: đây chỉ là bước test thủ công. Việc cấu hình IP tĩnh/DHCP reservation và chạy ổn định bằng PM2 sẽ làm ở Phase 5 (Vận hành & Go-live) — khi đó cần tạo rule firewall này 1 lần cho máy chủ chính thức.
