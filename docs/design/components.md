# File tạo / sửa trong đợt redesign

## Nền tảng design system

- `tailwind.config.js` — token màu, font, shadow, keyframe `rise-in` / `loop-pulse`
- `app/globals.css` — `@layer base` (nền, heading, focus), `@layer components`
  (`.btn-*`, `.card`, `.input`, `.field-label`, `.pill`, `.mark`, `.container-page`),
  khối `prefers-reduced-motion`
- `app/layout.tsx` — nạp Space Grotesk + Be Vietnam Pro qua `next/font`
- `lib/constants.ts` — `SKILLS`, `LANGUAGES`, `ROLE_LABEL` + map tra cứu

## Layout (`components/layout/`)

| File | Vai trò |
|---|---|
| `Logo.tsx` | Logo + mark bong bóng SVG (tone `ink` / `light`) |
| `TopBar.tsx` | Thanh mảnh trên cùng (`public` / `app`) |
| `PublicNav.tsx` | Navbar landing — sticky, đổi nền khi scroll, drawer mobile (client) |
| `AppNav.tsx` | Navbar sau đăng nhập — menu theo role, badge role, active state (client) |
| `UserMenu.tsx` | Avatar + dropdown, `supabase.auth.signOut()` (client) |
| `Footer.tsx` | Footer 4 cột (`public`) / rút gọn (`app`) |
| `MarketingShell.tsx` / `AppShell.tsx` / `AuthShell.tsx` | 3 khung trang |

## UI primitives (`components/ui/`)

| File | Vai trò |
|---|---|
| `SectionHeading.tsx` | Eyebrow + H2, đánh dấu từ khoá bằng cú pháp `~từ khoá~` |
| `PageHeader.tsx` | Back link + tiêu đề trang + slot action |
| `SkillIcon.tsx` | Icon kỹ năng trong ô tint (màu qua inline style) |
| `LanguageCrest.tsx` | "Crest" ngôn ngữ (中文 / 日本語…) trong ô tint |
| `SkillGrid.tsx` | Lưới 4 thẻ kỹ năng cho class overview |
| `ClassCard.tsx` | Thẻ lớp học cho dashboard |
| `LessonRow.tsx` | Hàng bài học trong danh sách |
| `StatusPill.tsx` | Pill trạng thái có chấm |
| `EmptyState.tsx` | Trạng thái rỗng |

## Marketing

- `components/marketing/Landing.tsx` — toàn bộ landing (Hero, UspBar, SkillsSection,
  LanguagesBand, TeacherBanner, HowItWorks, Testimonials, FinalCta) trong một file

## Trang (giữ nguyên logic nghiệp vụ)

`app/page.tsx` (landing / redirect), `login`, `register`, `admin` (+ `RoleSelect`),
`profile` (+ `VocabGrammarNotebook`), players `YouTubeScriptPlayer` / `ShadowingPlayer` /
`AudioRecorder`.

Khu `app/classes/**` gộp giáo viên + học sinh (xem
[architecture/overview.md](../architecture/overview.md)): dashboard, `new`, `[classId]`
(adaptive theo `getClassAccess`), listening/speaking/writing (list · `new` · `[id]`),
`EnrollStudentForm`, `ReviewForm`, `StudentWriteTopic`, `TeacherTopicView`.

`app/{classes,admin,profile}/layout.tsx` bọc `AppShell`; `app/classes/[classId]/**/layout.tsx`
là guard 404 theo quyền.
