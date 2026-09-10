# Bảng màu

Định nghĩa trong [`tailwind.config.js`](../../tailwind.config.js) → `theme.extend.colors`.

## Nền tảng

| Token | Hex | Vai trò |
|---|---|---|
| `ink` | `#16323B` | Chữ chính, tiêu đề - màu "mực" đậm |
| `ink-soft` | `#4C666F` | Chữ phụ, mô tả |
| `ink-faint` | `#88A0A7` | Caption, metadata |
| `brand` | `#1C4A57` | Nút chính, link, trạng thái active - mực xanh teal (tránh xanh SaaS/indigo) |
| `brand-dark` | `#123742` | Hover của nút chính |
| `highlight` | `#FFCF5C` | Vệt bút dạ quang, badge, banner giáo viên |
| `highlight-soft` | `#FFE9A8` | Nền vệt `.mark`, nền segment đang phát |
| `paper` | `#F1F4F3` | Nền trang - trắng-ngà lạnh |
| `surface` | `#FFFFFF` | Nền thẻ |
| `line` | `#D9E1DF` | Viền |
| `success` | `#3F7D5A` | Nộp bài, trạng thái mở |
| `danger` | `#C34B36` | Lỗi, nút dừng ghi âm, đăng xuất |

## Màu kỹ năng

| Kỹ năng | Hex |
|---|---|
| `skill-listening` | `#2E7DB2` |
| `skill-speaking` | `#E06A55` |
| `skill-writing` | `#7B5EA7` |
| `skill-reading` | `#5C8A73` |

**Quy tắc dùng:** chỉ dùng làm thanh accent trái của thẻ (`borderLeft: 4px solid`), tint
icon (`backgroundColor: hex + '1A'`), hoặc chấm trạng thái. Không tô nền đầy màu. Màu chữ
luôn là `ink`. Set qua `style` inline (không phải class động) để an toàn với Tailwind
purge - xem `SkillIcon.tsx`, `LanguageCrest.tsx`, `SkillGrid.tsx`.

## Theme

Cam kết một giao diện sáng. Không làm dark mode trong đợt này (prompt cho phép bỏ qua).
