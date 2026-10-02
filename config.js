// Chỉ dán Supabase PUBLISHABLE key (sb_publishable_...) vào đây.
// Tệp này nằm trên GitHub Pages và công khai: không đưa secret, service_role,
// Google Client Secret, Refresh Token hoặc GMAIL_ENCRYPTION_KEY vào đây.
window.GMAIL_APP_CONFIG = Object.freeze({
  supabaseUrl: "https://whuyytjksrpyojmukftp.supabase.co",
  publishableKey: "sb_publishable_gpW8TcOIz4ocrrMIWUx3Qg_sZaeZqQ0",
  // Tài khoản đã kết nối và kiểm thử. Các tài khoản mới do Edge Function
  // gmail-accounts trả về nếu bạn triển khai endpoint đó.
  initialAccounts: [
    {
      id: "a49812ea-47c9-4948-8b36-176027b69fee",
      email: "vothanhdamkg1982@gmail.com",
    },
  ],
});
