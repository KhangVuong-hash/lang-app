# Typography

Nạp qua `next/font/google` trong [`app/layout.tsx`](../../app/layout.tsx), expose thành
CSS variable, map vào Tailwind `fontFamily`.

## Font

| Vai trò | Font | Lý do |
|---|---|---|
| Heading (`font-display`) | **Space Grotesk** | Grotesk có nét riêng ở a/g, không phải Inter/Poppins nhàm, không phải serif tương phản cao |
| Body / UI (`font-sans`) | **Be Vietnam Pro** | Foundry Việt, bộ dấu tiếng Việt chuẩn - chọn có chủ đích theo đối tượng người dùng |

`h1..h5` tự động nhận `font-display` qua `@layer base` trong `globals.css`.

Nội dung CJK (script bài học) là dữ liệu người dùng nhập → rơi về fallback hệ thống, chấp
nhận được.

## Type scale

| Cấp | Kích thước | Weight | Ghi chú |
|---|---|---|---|
| Display (hero H1) | `text-4xl → text-5xl` (`sm:`) | 700 | `leading-[1.05]`, `tracking-tight` |
| H1 (tiêu đề trang) | `text-2xl → text-3xl` | 700 | qua `PageHeader` |
| H2 (section) | `text-2xl → text-3xl` | 600–700 | qua `SectionHeading` |
| H3 (tiêu đề thẻ) | `text-lg` | 600 | |
| Body | `text-base` (16px) | 400 | `leading` mặc định ~1.6 |
| Body nhỏ | `text-sm` | 400 | |
| Caption | `text-xs` | 500 | sentence-case, màu `ink-faint` - **không** ALL-CAPS tracking rộng |

## Lưu ý môi trường

Khi build/dev **không có mạng**, `next/font` báo lỗi tải font rồi rơi về fallback (có
`adjustFontFallback` nên không nhảy layout nhiều). Máy có mạng sẽ tự tải & self-host, không
cần cấu hình thêm.
