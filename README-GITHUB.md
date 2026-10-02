GMAIL AI ASSISTANT v1.2 — BẢN THỬ NGHIỆM TÍCH HỢP GEMINI
=========================================================

LƯU Ý QUAN TRỌNG:
- Giữ nguyên config.js HIỆN ĐANG CHẠY trên GitHub. KHÔNG tải tệp config.example.js lên đè.
- Không lưu GEMINI_API_KEY, sb_secret_, service_role, Google Client Secret, token vào GitHub.
- Giữ nguyên các Edge Functions đã chạy: gmail-ai-health, gmail-oauth-start,
  gmail-oauth-callback, gmail-list-messages, gmail-accounts, gmail-message-detail.
- Ứng dụng chỉ gửi dữ liệu đến Gemini khi người dùng bấm nút và xác nhận.
- Gói Gemini API miễn phí có thể thay đổi hạn mức/model hoặc chính sách dùng dữ liệu.
  Chỉ chọn API key thuộc dự án KHÔNG bật thanh toán nếu muốn không phát sinh phí.
  Kiểm tra trực tiếp mức giá/hạn mức và điều khoản dữ liệu tại Google AI Studio.
- Không gửi tài liệu nhạy cảm qua Free Tier nếu chưa chấp nhận chính sách dữ liệu.

TRIỂN KHAI THEO THỨ TỰ:

BƯỚC A — SUPABASE SQL (chạy một lần):
  1. Supabase > SQL Editor > New query.
  2. Mở backend/ai-reports.sql; dán toàn bộ và Run.
  3. Integrations > Data API > Settings > Exposed functions:
       public.get_gmail_ai_report_v12
       public.save_gmail_ai_report_v12
     Chọn cả hai, Save.
     KHÔNG bật bảng gmail_ai.ai_reports_v12 trong Exposed tables.
     Giữ Automatically expose new tables ở OFF.

BƯỚC B — GOOGLE AI STUDIO:
  1. Truy cập https://aistudio.google.com/apikey và tạo Gemini API key
     cho dự án có hạn mức miễn phí phù hợp. KHÔNG cung cấp key trong chat.
  2. Supabase > Edge Functions > Secrets > Add or replace:
       Name: GEMINI_API_KEY
       Value: [khóa Gemini của riêng bạn]
  3. Có thể tạo GEMINI_MODEL = gemini-2.5-flash nếu mô hình đó hỗ trợ
     gói/hạn mức miễn phí của bạn. Nếu khác, chọn mô hình hiện được hỗ trợ
     và thay theo tài liệu Google.
  4. Không thêm phương thức thanh toán nếu muốn chỉ dùng trong hạn mức miễn phí.
     HTTP 429 sẽ hiển thị thông báo và dừng, không tự chuyển model trả phí.

BƯỚC C — SUPABASE EDGE FUNCTION:
  1. Edge Functions > Deploy a new function > Via Editor.
  2. Name: gmail-ai-summary.
  3. Sao chép toàn bộ backend/gmail-ai-summary-index.ts vào index.ts rồi Deploy.
  4. Settings > Verify JWT with legacy secret: OFF > Save changes.
     Mã nguồn TỰ xác thực bằng auth.getUser và kiểm tra admin.

BƯỚC D — GITHUB PAGES:
  1. Chỉ tải 4 tệp trong github/ lên REPO (nhánh main, thư mục root):
       index.html, styles.css, app.js, README.md (nếu có)
     V1.2 cung cấp index.html, styles.css, app.js, và README-GITHUB.md.
     Có thể bỏ qua README, chỉ tải 3 tệp giao diện.
  2. Tuyệt đối GIỮ NGUYÊN config.js trên GitHub.
  3. Đợi deploy rồi mở trang và nhấn Ctrl+F5.

KIỂM THỬ:
  1. Đăng nhập Google, chọn Gmail, mở một thư có tệp PDF/Word/Excel.
  2. Thông tin người nhận thu gọn (có nút xem tất cả).
  3. Chọn "Phân tích cả tệp đính kèm" (mặc định bật) nếu muốn.
  4. Nhấn "Tóm tắt email và tài liệu" và xác nhận gửi tới Gemini.
  5. Xem 4 phần: tóm tắt email; từng tệp; công việc; điểm chưa rõ.
  6. Bấm lần nữa với CÙNG chế độ sẽ trả từ cache, không gọi AI thêm.
  7. Thử tắt chọn tệp để chỉ tóm tắt email (báo cáo cache riêng).

GIỚI HẠN:
  - Tối đa 3 tệp, mỗi tệp tối đa 3 MB; .pdf, .docx, .xls, .xlsx,
    .csv, .txt. Tệp không hỗ trợ, quá lớn hay lỗi sẽ được liệt kê.
  - Word: trích văn bản; bảng/hình phức tạp có thể mất cấu trúc.
  - Excel: tối đa 8 sheet đầu, mỗi sheet 200 dòng đầu và 40 cột đầu.
  - PDF: gửi tài liệu đến Gemini để mô hình đọc; PDF quét có thể
    không trích xuất được chính xác. Kiểm tra kết quả quan trọng.
  - HTML email gốc vẫn mở riêng. Không tự gửi thư hoặc chạy AI nền.
  - Bản này chỉ được kiểm tra cú pháp tĩnh, CHƯA thử gọi thật API
    Gemini và Supabase với tài khoản của bạn. Hãy kiểm thử tuần tự.
