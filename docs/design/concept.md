# Concept: "Sổ tay hội thoại"

Học một ngôn ngữ = nhặt nhạnh từng câu, tô đậm chỗ quan trọng, mang theo bên mình.

## Motif thị giác

- **Bong bóng hội thoại** - dùng cho logo và thẻ testimonial (góc `rounded-2xl rounded-bl-sm`).
- **Vệt bút dạ quang** (`.mark` trong `globals.css`) - nền gradient vàng nhạt chạy sau từ
  khoá trong tiêu đề. Thay cho gạch chân / dấu `→` / nhãn ALL-CAPS.
- **Nhịp trang sổ** - lề rộng, một cột đọc, chấm bi (`radial-gradient`) mờ dần ở hero.
- **Danh tính kỹ năng** - 4 kỹ năng giữ nguyên màu + icon ở mọi nơi (landing → dashboard →
  bài học) để người học dựng bản đồ trong đầu.

## Chống "default AI-generated look"

| Anti-pattern | Cách tránh ở đây |
|---|---|
| Nền be ấm + serif tương phản cao | `paper` trắng-ngà **lạnh** `#F1F4F3`; heading dùng grotesk (Space Grotesk), không serif |
| Nền đen + 1 màu neon | Không dùng |
| Thẻ bo góc giống hệt + shadow xám nhạt | Viền 1px `line` là chính; shadow ám màu mực, rất thấp, chỉ hiện khi hover |
| Nhãn ALL-CAPS tracking rộng | Caption sentence-case màu `ink-faint`, hoặc vệt `.mark` |
| Dấu `→` cuối mọi link/nút | Bỏ hẳn; nút dùng động từ ("Bắt đầu miễn phí", "Xem lớp học") |
| 4 màu kỹ năng làm chip đầy màu | Dùng làm thanh accent trái / tint icon; `ink` vẫn là màu chữ chủ đạo |
