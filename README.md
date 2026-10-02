# GMAIL AI ASSISTANT v1.1

Web App tĩnh (GitHub Pages) kết nối Supabase Auth, Edge Functions và Gmail API. Bản này **không có AI gửi thư**.

## Cập nhật GitHub

1. Giữ nguyên `config.js` đang chạy trong repo, đặc biệt `publishableKey` và `initialAccounts`. **Không tải đè file `config.js` mẫu trong ZIP**, vì nó không chứa khóa cá nhân đã cấu hình.
2. Tải đè `index.html`, `styles.css`, `app.js` và `README.md` trong thư mục gốc nhánh `main` của repo.
3. Không tải thư mục `backend-optional` lên GitHub Pages.
4. Đợi GitHub Pages triển khai, nhấn Ctrl+F5 để tải lại.

## Hai bước máy chủ bắt buộc cho tính năng mới

1. Trong Supabase SQL Editor, chạy `backend-optional/list-accounts.sql`. Vào Integrations → Data API → Settings → Exposed functions, chọn `public.list_gmail_accounts`. Tạo Edge Function tên `gmail-accounts`, thay `index.ts` bằng nội dung `backend-optional/gmail-accounts-index.ts`, deploy và đặt **Verify JWT with legacy secret = OFF**.
2. Tạo Edge Function tên `gmail-message-detail`, thay `index.ts` bằng `backend-optional/gmail-message-detail-index.ts`, deploy và đặt **Verify JWT with legacy secret = OFF**. Function sử dụng các RPC `get_gmail_credentials` và `update_gmail_access_token` đã tạo từ v1.0, và secrets đã lưu. Không cần bảng hay secret mới.

## Các chức năng

- Đăng nhập quản trị; kiểm tra `gmail-ai-health`.
- Danh sách nhiều tài khoản lấy từ `gmail-accounts` (nếu function chưa được triển khai, tạm sử dụng `initialAccounts` hiện có).
- Danh sách 10 email gần nhất lấy từ `gmail-list-messages`; tìm/lọc tại giao diện.
- Nhấn thư để tải nội dung đầy đủ (ưu tiên `text/plain`; nếu chỉ có HTML, hiển thị trong iframe sandbox với CSP giới hạn).
- Tệp đính kèm tối đa 7 MB/tệp, tải xuống khi người dùng nhấn nút; không tự động tải.
- Giải mã RFC 2047 cho tiêu đề/người gửi và hỗ trợ charset phần thân email. Một số email có header sai chuẩn vẫn có thể lỗi hiển thị.
- Không có tính năng gửi thư hoặc gọi AI trong bản này.

## An toàn

`config.js` được xuất bản công khai, nên chỉ chứa Supabase publishable key, URL Supabase và ID tài khoản; không chứa `sb_secret_`, `service_role`, Client Secret, Refresh Token hay `GMAIL_ENCRYPTION_KEY`.

Giới hạn 7 MB áp dụng cho tệp đính kèm tải qua Edge Function để tránh phản hồi JSON quá lớn. Tệp lớn hơn sẽ báo lỗi và không được tải trong bản 1.1.
