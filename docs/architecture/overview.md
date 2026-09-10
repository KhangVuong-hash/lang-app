# Tổng quan

## Stack

- **Next.js 14.2** - App Router, React Server Components mặc định
- **Tailwind CSS 3.4** - token tuỳ chỉnh trong `tailwind.config.js`
- **Supabase** - Postgres + Auth + Storage; `@supabase/ssr` cho session qua cookie
- **TypeScript**, package manager **pnpm**
- `youtube-transcript` (không chính thức) để lấy phụ đề YouTube

## Cấu trúc thư mục

```
app/
  layout.tsx              html/body + next/font (Space Grotesk, Be Vietnam Pro)
  page.tsx                chưa đăng nhập → <Landing/>; đã đăng nhập → /admin hoặc /classes
  login/  register/       AuthShell (chỉ logo)
  classes/                khu chính sau đăng nhập (dạy + học chung một chỗ)
    layout.tsx            bọc AppShell (TopBar + AppNav + Footer)
    page.tsx              dashboard: "Lớp tôi dạy" + "Lớp tôi học"
    new/                  tạo lớp
    [classId]/
      layout.tsx          guard canView (getClassAccess)
      page.tsx            tổng quan lớp - adaptive theo isTeacher / isEnrolled
      listening|speaking|writing/
        page.tsx          danh sách - nút "Tạo" chỉ hiện khi canManage
        new/layout.tsx    guard canManage
        [lessonId]/[topicId] - player / editor, adaptive
  admin/  profile/         layout.tsx bọc AppShell
  api/
    youtube/transcript/   POST: URL → segments
    enroll-student/       POST: thêm học sinh vào lớp bằng email (service role)

components/
  layout/                 Logo, TopBar, PublicNav, AppNav, UserMenu, Footer, *Shell
  ui/                     SectionHeading, PageHeader, SkillIcon, LanguageCrest,
                          SkillGrid, ClassCard, LessonRow, StatusPill, EmptyState
  marketing/Landing.tsx   toàn bộ landing page
  YouTubeScriptPlayer / ShadowingPlayer / AudioRecorder

lib/
  constants.ts            SKILLS, LANGUAGES, ROLE_LABEL
  access.ts               getClassAccess(classId) → quyền của user với 1 lớp
  supabase/client.ts      browser client (anon key)
  supabase/server.ts      server client (anon key, đọc cookie)
  supabase/admin.ts       service-role client - CHỈ trong Route Handler
  youtube.ts              extractYoutubeId

middleware.ts             refresh session + điều hướng theo role
supabase/
  migrations/             nguồn sự thật của schema (thay cho schema.sql cũ)
  config.toml             cấu hình Supabase CLI (auth, ports…)
```

## Mô hình render

- Trang danh sách / tổng quan: **Server Component**, gọi `createClient()` (server) truy vấn
  trực tiếp, chịu RLS theo user đang đăng nhập.
- Form và player: **Client Component** (`'use client'`), gọi `createClient()` (browser).
- Điều hướng theo vai trò nằm ở `middleware.ts` (chạy trước khi vào trang).

## Biến môi trường

| Biến | Dùng ở | Ghi chú |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | công khai |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | công khai |
| `SUPABASE_SERVICE_ROLE_KEY` | chỉ Route Handler (`admin.ts`) | **bí mật**, bỏ qua RLS |
