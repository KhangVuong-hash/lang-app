# LangApp - Nền tảng học ngoại ngữ (Next.js + Supabase)

Ứng dụng học ngoại ngữ đa ngôn ngữ (Anh, Trung, Nhật, Hàn - mở rộng được) với 3 vai trò
**Admin / Giáo viên / Học sinh**, lớp học gồm 4 kỹ năng (Nghe, Nói, Viết, Đọc - Đọc tạm đóng),
và sổ tay Từ vựng/Ngữ pháp cá nhân.

## Điểm nhấn: Kỹ năng Nghe & Nói

- Giáo viên dán **URL YouTube** → hệ thống gọi `youtube-transcript` để **tự động lấy script/phụ đề**
  có sẵn trên video (nếu có), cắt theo từng câu kèm mốc thời gian (`start_seconds` / `end_seconds`).
- Giáo viên có thể **sửa lại text từng câu**, thêm/xoá dòng thủ công nếu video không có phụ đề.
- Học sinh xem bài học với video nhúng (YouTube IFrame API) + danh sách script bên cạnh:
  - Nút **⏮ Tua**: nhảy video về đầu câu đó và phát.
  - Nút **🔁 Lặp**: tự động lặp lại đúng câu đó liên tục cho tới khi tắt - dùng để luyện nghe kỹ.
  - Chỉnh tốc độ phát (0.5x–1.25x).
- Kỹ năng Nói dùng lại cơ chế script y hệt Nghe, cộng thêm nút **🎙 Ghi âm** để học sinh
  thu lại giọng đọc theo (shadowing) từng câu, lưu vào Supabase Storage.

> ⚠️ Lưu ý: `youtube-transcript` là thư viện **không chính thức**, lấy dữ liệu public timedtext
> của YouTube. Nó hoạt động tốt với hầu hết video có phụ đề (tự động hoặc do người tạo video
> upload), nhưng có thể lỗi nếu video tắt phụ đề, ở chế độ riêng tư, hoặc YouTube thay đổi cấu
> trúc nội bộ. Vì vậy UI luôn có lối thoát: giáo viên nhập/sửa script thủ công.

## Cấu trúc dự án

```
app/
  login/                          - đăng nhập
  admin/                          - quản lý user, đổi role
  teacher/
    page.tsx                      - dashboard: danh sách lớp đang dạy
    classes/new/                  - tạo lớp (chọn ngôn ngữ tự do)
    classes/[classId]/
      page.tsx                    - tổng quan lớp, bật/tắt 4 kỹ năng
      listening/                  - CRUD bài nghe + auto-transcript
      speaking/                   - CRUD bài shadowing + auto-transcript
      writing/                    - tạo chủ đề viết/dịch, xem & review bài nộp
  student/
    page.tsx                      - dashboard: danh sách lớp đang học
    classes/[classId]/
      listening/[lessonId]/       - học nghe (player + script + tua/lặp)
      speaking/[lessonId]/        - luyện shadowing (player + ghi âm)
      writing/[topicId]/          - viết bài / dịch + xem feedback
  profile/                        - trang cá nhân: lớp học + sổ tay từ vựng/ngữ pháp

app/api/youtube/transcript/route.ts  - API tự động lấy transcript YouTube

components/
  YouTubeScriptPlayer.tsx         - player dùng cho kỹ năng Nghe
  ShadowingPlayer.tsx             - player + ghi âm dùng cho kỹ năng Nói
  AudioRecorder.tsx               - ghi âm MediaRecorder + upload Storage

lib/
  supabase/client.ts              - Supabase client phía trình duyệt
  supabase/server.ts              - Supabase client phía server (Server Components)
  youtube.ts                      - helper trích xuất video ID

middleware.ts                     - refresh session + điều hướng theo role

supabase/schema.sql               - TOÀN BỘ schema + RLS policies + storage policies
```

## Cài đặt

### 1. Tạo project Supabase
- Vào [supabase.com](https://supabase.com) → New Project.
- Vào **SQL Editor**, chạy toàn bộ nội dung file `supabase/schema.sql`.
- Vào **Storage**, xác nhận bucket `speaking-recordings` đã được tạo (script đã tự tạo,
  nhưng nếu lỗi quyền thì tạo tay: Storage → New bucket → tên `speaking-recordings`, Private).

### 2. Cấu hình biến môi trường
```bash
cp .env.example .env.local
```
Điền `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` từ
Supabase Dashboard → Project Settings → API.

### 3. Cài đặt & chạy
```bash
npm install
npm run dev
```
Mở http://localhost:3000

### 4. Tạo tài khoản & set role
- Đăng ký tài khoản qua Supabase Auth (có thể bật email/password trong Dashboard →
  Authentication → Providers), hoặc thêm form `/register` (chưa có sẵn trong scaffold này,
  dùng `supabase.auth.signUp()` tương tự `app/login/page.tsx`).
- Mặc định user mới có role `student` (xem trigger `handle_new_user` trong schema).
- Để có tài khoản Giáo viên/Admin: đăng nhập bằng 1 tài khoản, vào Supabase Dashboard →
  Table Editor → `profiles`, sửa `role` thành `teacher` hoặc `admin` cho lần đầu tiên.
  Sau đó admin đó có thể đổi role người khác ngay trong `/admin`.

## Những phần cần hoàn thiện tiếp (gợi ý roadmap)

1. **Nghe giáo viên nghe lại bài ghi âm của học sinh** - cần route lấy signed URL từ
   Supabase Storage (service role) vì bucket đang private theo user. (`lib/supabase/admin.ts`
   đã có sẵn client service-role để bạn viết tiếp route này theo mẫu `enroll-student`.)
2. **Kỹ năng Đọc** - đã có `class_skills.reading` (mặc định tắt) và bảng để mở rộng sau.
3. **Toggle bật/tắt kỹ năng ** - hiện DB đã có `class_skills.is_enabled`,
   cần thêm UI switch trong trang tổng quan lớp cho giáo viên.
4. **Thông báo / email** khi có bài nộp mới, có feedback mới, v.v.
5. **Quên mật khẩu** - Supabase có sẵn `resetPasswordForEmail`, chỉ cần thêm 1 trang form.

### Đã hoàn thành trong bản cập nhật này
- ✅ `app/page.tsx` - trang chủ tự động redirect theo trạng thái đăng nhập & role.
- ✅ `app/register/page.tsx` - đăng ký tài khoản mới (mặc định role `student`).
- ✅ Mời/thêm học sinh vào lớp bằng email: `app/api/enroll-student/route.ts` +
  `EnrollStudentForm.tsx` trong trang tổng quan lớp của giáo viên. Route này dùng
  `SUPABASE_SERVICE_ROLE_KEY` để tra cứu tài khoản theo email (auth.users không lộ qua anon key),
  tự kiểm tra người gọi đúng là giáo viên của lớp trước khi ghi dữ liệu.

> ⚠️ Nhớ điền `SUPABASE_SERVICE_ROLE_KEY` trong `.env.local` (khác với anon key) - key này
> **không được lộ ra client**, chỉ dùng trong Route Handlers như đã làm ở `enroll-student`.
