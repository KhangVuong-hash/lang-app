/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sổ tay đã chuyển vào trang cá nhân
  async redirects() {
    return [
      { source: '/notebook', destination: '/profile/notebook', permanent: true },
      // tab "Ghi chú" đã gộp vào tab "Language" (ghi chú theo kỹ năng)
      { source: '/profile/notes', destination: '/profile/language', permanent: true },
    ];
  },
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
    // Quay lại trang vừa xem (điều hướng trong app) dùng dữ liệu đã cache thay vì
    // gọi lại Supabase — kể cả trang "dynamic" (dùng cookie/auth) vốn mặc định
    // không cache. Mỗi trình duyệt tự giữ cache riêng nên không lẫn dữ liệu giữa người dùng.
    staleTimes: { dynamic: 30 },
  },
};

module.exports = nextConfig;
