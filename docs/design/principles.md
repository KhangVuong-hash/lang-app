# Nguyên tắc thiết kế cho LangApp

1. **Mỗi màn hình là một trang sổ.** Lề rộng, một cột đọc rõ ràng, tiêu đề section được
   nhấn bằng vệt bút dạ quang (`.mark`) chứ không phải hoạ tiết trang trí.

2. **Danh tính kỹ năng xuyên suốt.** Bốn kỹ năng (Nghe/Nói/Viết/Đọc) giữ nguyên màu + icon
   ở mọi nơi — thẻ trên landing, thẻ trong class overview, eyebrow trang bài học — để người
   học nhận diện tức thì.

3. **Tiết chế chuyển động và trang trí.** Đúng một chuyển động có chủ đích ở hero
   (`animate-rise-in` cho thẻ script, `animate-loop-pulse` cho chấm ghi âm), hover nâng nhẹ
   thẻ (`.card-hover`). Chấm bi / bong bóng thưa và không bao giờ nằm sau chữ.
   `prefers-reduced-motion` được tôn trọng toàn cục trong `globals.css`.

## Accessibility

- Focus nhìn thấy rõ: `:focus-visible` → `ring-2 ring-brand ring-offset-2` toàn cục.
- Emoji trang trí đều `aria-hidden`.
- Tương phản: chữ `ink` trên `paper`/`surface`; nút CTA chữ trắng trên `brand`; chữ `ink`
  trên `highlight` (vàng) — đều đạt ngưỡng AA cho body text.
- Drawer mobile khoá scroll body khi mở.
