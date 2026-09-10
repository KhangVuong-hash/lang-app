# Deploy lên Vercel

## 1. Tạo Supabase project (hosted)

- [supabase.com](https://supabase.com) → New Project. Ghi lại **Project ref** và mật khẩu DB.
- Áp schema bằng migration:
  ```bash
  supabase link --project-ref <ref>
  supabase db push
  ```
- Kiểm tra Storage có bucket `speaking-recordings` (migration tự tạo; nếu lỗi quyền thì
  tạo tay: Storage → New bucket → `speaking-recordings`, Private).

## 2. Cấu hình Auth (Supabase Dashboard → Authentication)

- **Providers → Email**: bật *Enable Email provider*.
- **URL Configuration**:
  - *Site URL*: `https://<app>.vercel.app`
  - *Redirect URLs*: thêm
    - `https://<app>.vercel.app/auth/callback`
    - `https://<app>-*.vercel.app/auth/callback` (preview deployments, nếu cần)
    - `http://localhost:3000/auth/callback` (dev)
- **Confirm email**: nếu bật, link xác nhận sẽ đi qua route `/auth/callback` (đã có sẵn).
  Nếu muốn đăng ký xong đăng nhập được ngay, tắt nó đi.

## 3. Environment Variables trên Vercel

Project Settings → Environment Variables (áp cho Production + Preview + Development):

| Key | Giá trị | Ghi chú |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | công khai |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key (hosted) | công khai |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (hosted) | **bí mật**, không prefix `NEXT_PUBLIC` |
| `GEMINI_API_KEY` | key free ở [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | tuỳ chọn — bật "Lấy script tự động" từ URL YouTube; free tier ~1500 lần/ngày. Không có key thì chỉ còn dán transcript thủ công. |

> Không dùng lại key trong `.env` local - đó là key của Supabase local demo.

## 4. Import repo vào Vercel

- Add New → Project → import `KhangVuong-hash/lang-app`.
- Framework preset: **Next.js** (tự nhận). Build command / output: mặc định.
- Package manager: Vercel tự nhận **pnpm** (có `pnpm-lock.yaml`).
- Deploy.

## 5. Sau khi có domain

- Cập nhật lại *Site URL* / *Redirect URLs* ở Supabase nếu domain khác dự kiến.
- Tạo 1 tài khoản, rồi vào Supabase → Table Editor → `profiles` đổi `role` của nó thành
  `admin` để có tài khoản quản trị đầu tiên.

## Lưu ý

- **Lấy script tự động**: `POST /api/youtube/transcript` thử theo thứ tự
  (1) Gemini nếu có `GEMINI_API_KEY` — nhận thẳng URL YouTube, ổn định trên Vercel;
  (2) cào phụ đề `youtube-transcript` — hay bị YouTube chặn từ IP datacenter.
  Nếu cả hai fail, giáo viên **dán transcript** từ YouTube ("Hiển thị bản chép lời") vào ô
  có sẵn ở trang tạo/sửa bài. Video dài (>20 phút) qua Gemini có thể mất 20-40s và tốn
  nhiều token — cân nhắc dùng clip ngắn.
- Middleware chạy trên Edge Runtime - `@supabase/ssr` tương thích, không cần chỉnh.
- Chưa có route cho giáo viên nghe lại bài ghi âm của học sinh (bucket private). Cần thêm
  route tạo signed URL bằng service role - xem
  [architecture/skills-listening-speaking.md](architecture/skills-listening-speaking.md).
