# Facebook AI Agent Auto Poster (Zero Token / Zero API)

Dự án AI Agent tự động hóa đăng bài lên Facebook (Fanpage / Group / Profile) sử dụng **Playwright** mà **HOÀN TOÀN KHÔNG CẦN TOKEN, KHÔNG CẦN FACEBOOK DEVELOPER APP**.

---

## 🎯 Điểm đặc biệt của cơ chế này:
1. **Zero Token**: Sử dụng cơ chế `launchPersistentContext` của trình duyệt Chrome thật trên máy tính của bạn.
2. **Đăng nhập một lần duy nhất**: Sau khi đăng nhập Facebook lần đầu, toàn bộ cookies/session được lưu tại thư mục `fb-profile/`. Những lần sau chạy hoàn toàn tự động mà không cần nhập lại mật khẩu.
3. **AI Tự động kết nối với Website**: Tự đọc dữ liệu tour/bài viết từ website `website-vntoyou-ver2` (tiêu đề, mô tả, lộ trình, hình ảnh) -> Tự biên tập bài đăng Facebook chuẩn SEO & Marketing -> Tự mở Chrome và đăng bài.

---

## 🚀 Hướng dẫn sử dụng:

### Bước 1: Mở thư mục dự án
Mở PowerShell hoặc Command Prompt:
```powershell
cd D:\My-small-app\fb-agent-poster
```

### Bước 2: Đăng nhập Facebook lần đầu (Chỉ làm 1 lần)
Chạy lệnh:
```powershell
npm run login
```
* Cửa sổ trình duyệt Chrome sẽ tự động bật lên trang Facebook.
* Bạn đăng nhập tài khoản Facebook của bạn (tài khoản quản lý Fanpage/Group).
* Sau khi đăng nhập thành công, quay lại cửa sổ dòng lệnh và bấm phím **ENTER**.
* Trình duyệt sẽ đóng lại và lưu toàn bộ phiên đăng nhập vào thư mục `fb-profile/`.

---

### Bước 3: Đăng bài tự động

#### Cách 1: Đăng bài viết tùy chỉnh
Chạy lệnh:
```powershell
npm run post
```
Trình duyệt sẽ tự động mở lên, truy cập Facebook, tìm ô viết bài, điền nội dung và tự động đăng.

#### Cách 2: Ra lệnh cho AI Agent tự đọc Tour từ website và đăng bài
Chạy lệnh:
```powershell
# Cú pháp: node scripts/agent.mjs [mã_tour] [link_fanpage]
node scripts/agent.mjs vnn425 https://www.facebook.com/vntoyoutour
```
* AI Agent sẽ tự động nạp dữ liệu tour `vnn425` từ `website-vntoyou-ver2`.
* Tự viết một caption lôi cuốn kèm hashtag và link trực tiếp đến website.
* Tự động đăng lên Fanpage đã chỉ định.

