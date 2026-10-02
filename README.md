# GMAIL AI ASSISTANT

Giao diện độc lập chạy trên GitHub Pages, sử dụng Supabase Auth và Edge Functions.

## Cài đặt

1. Trong `config.js`, thay `DAN_SUPABASE_PUBLISHABLE_KEY_VAO_DAY` bằng **Publishable key** của dự án Supabase (bắt đầu bằng `sb_publishable_`).
2. Tải `index.html`, `styles.css`, `config.js`, `app.js` lên thư mục gốc nhánh `main` của GitHub repository `GMAIL-AI-ASSISTANT`.
3. GitHub Pages: Deploy from a branch → `main` → `/(root)`.
4. Supabase Auth → URL Configuration → Redirect URLs: thêm `https://vothanhdamkg1982-lang.github.io/GMAIL-AI-ASSISTANT/`.
5. Các Edge Functions hiện có phải hoạt động: `gmail-ai-health`, `gmail-oauth-start`, `gmail-list-messages`. Khi thêm tài khoản Gmail từ giao diện, `gmail-oauth-callback` phải đang hoạt động.

## Danh sách nhiều tài khoản Gmail (nâng cấp)

Frontend cố gắng gọi thêm Edge Function `gmail-accounts` để lấy danh sách tài khoản theo phiên đăng nhập. Nếu chưa triển khai, ứng dụng dùng **tài khoản ban đầu đã kiểm thử** trong `config.js`. Khi bạn kết nối tài khoản mới, cần triển khai `gmail-accounts` để ứng dụng tự hiển thị tất cả tài khoản. Mã bổ sung nằm trong thư mục `backend-optional/`.

## Hiện có

- Đăng nhập Google thông qua Supabase Auth; kiểm tra quản trị bằng `gmail-ai-health`.
- Kết nối tài khoản Gmail qua `gmail-oauth-start` (tab Google mới).
- Đọc 10 email gần nhất qua `gmail-list-messages`; tự làm mới token tại máy chủ.
- Chọn tài khoản, tìm kiếm trong 10 email đã tải, xem người gửi/tiêu đề/ngày/đoạn trích.
- Giao diện đáp ứng màn hình máy tính và điện thoại; đăng xuất.

## Chưa có

- Đọc toàn bộ nội dung/đính kèm; tìm kiếm Gmail phía máy chủ.
- AI tóm tắt, AI soạn thư, lưu bản nháp hoặc gửi thư có phê duyệt. Các nút tương ứng đang bị khóa.
- Sau khi cấp quyền tài khoản Gmail mới, hãy quay lại trang ứng dụng rồi **tải lại trang**; `gmail-accounts` sẽ cập nhật danh sách nếu được triển khai.

## Bảo mật

`config.js` là **mã công khai**. Không bao giờ đưa `sb_secret_`, `service_role`, Google Client Secret, Access/Refresh Token, `GMAIL_ENCRYPTION_KEY` hoặc OAuth URL có `code`/`state` vào repository.

GitHub Pages chỉ cung cấp giao diện; dữ liệu nhạy cảm xử lý bên Supabase. Các quyền SQL, RLS và chính sách truy cập phải được rà soát khi mở rộng hệ thống.
