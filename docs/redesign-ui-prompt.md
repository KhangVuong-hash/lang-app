# Prompt cho Claude Code — Thiết kế lại UI/UX cho LangApp

> Copy toàn bộ nội dung dưới đây và dán vào Claude Code trong thư mục gốc project `lang-app`.
>
> Ảnh tham khảo: landing page nhà hàng "PIZZAN" — chỉ tham khảo **bố cục & độ chỉn chu**,
> KHÔNG lấy màu đỏ-đen-lửa hay chủ đề đồ ăn.

---

## Bối cảnh dự án

Đây là project Next.js 14 (App Router) + Tailwind CSS + Supabase, tên **LangApp** — nền
tảng học ngoại ngữ đa ngôn ngữ (Anh/Trung/Nhật/Hàn) với 3 vai trò Admin/Giáo viên/Học sinh,
lớp học gồm 4 kỹ năng Nghe/Nói/Viết/Đọc. Hiện tại UI mới chỉ có Tailwind mặc định, chưa có
định hướng thiết kế nhất quán, chưa có navbar/layout chung. Nhiệm vụ của bạn là thiết kế lại
toàn bộ giao diện với một bản sắc thị giác rõ ràng, chuyên nghiệp, không rập khuôn.

Tôi có một ảnh tham khảo (giao diện landing page nhà hàng "PIZZAN") mà tôi thích ở **cấu
trúc bố cục và độ chỉn chu**, KHÔNG phải ở màu sắc/chủ đề đồ ăn. Cụ thể tôi muốn học theo:
- Header 2 tầng: thanh top-bar mỏng (thông tin liên hệ/khẩu hiệu) phía trên navbar chính.
- Navbar chính: logo bên trái, menu ngang giữa, cụm icon tiện ích + nút CTA nổi bật bên phải.
- Hero section lớn, có hình minh hoạ/ảnh chồng lớp, tiêu đề to, nút CTA rõ ràng.
- Các block "USP" (điểm mạnh) dạng icon + text ngắn nằm ngang.
- Lưới thẻ sản phẩm/nội dung đều nhau, có ảnh, tiêu đề, mô tả ngắn, giá/thông tin phụ.
- Banner khuyến mãi xen giữa các section để phá nhịp.
- Section "tabs" lọc nội dung theo danh mục.
- Khối tải app / call-to-action lớn cuối trang.
- Testimonial, blog preview, footer nhiều cột.

KHÔNG copy màu đỏ-đen-lửa của ảnh — đó là bản sắc nhà hàng, không hợp với app học tập.
Bạn cần đề xuất một bảng màu, typography và concept thị giác **riêng, phù hợp với chủ đề
học ngoại ngữ**, tránh mọi "default AI-generated look" (nền be ấm + serif tương phản cao +
màu đất nung; nền đen gần tuyệt đối + 1 màu neon; thẻ bo góc giống hệt nhau với shadow xám
nhạt; nhãn ALL-CAPS có tracking rộng; dấu '→' cuối mọi link/nút). Hãy đưa ra lựa chọn có chủ
đích, gắn với chủ đề "học ngôn ngữ / giao tiếp đa văn hoá / hành trình chinh phục ngôn ngữ
mới" — ví dụ (chỉ là gợi ý, bạn có thể đề xuất hướng khác miễn có lý do rõ ràng): motif hộ
chiếu/con tem thư, sổ tay ghi chú viết tay, bong bóng hội thoại, bảng chữ cái các ngôn ngữ
làm chi tiết trang trí...

## Yêu cầu quy trình (bắt buộc làm theo thứ tự)

1. **Đề xuất design plan trước khi code**, gồm:
   - Bảng màu: 4–6 mã hex có tên, giải thích lý do chọn (gắn với chủ đề học ngôn ngữ).
   - Typography: font chữ cho heading và body (có thể dùng Google Fonts qua `next/font`),
     type scale cụ thể (kích thước, weight cho H1–H6, body, caption).
   - Layout concept: mô tả bằng ASCII wireframe cho Trang chủ (landing trước khi login) và
     Dashboard (sau khi login).
   - Nguyên tắc thiết kế riêng cho app này (2–3 câu).
2. Tự phản biện plan đó: nếu phần nào giống "default" chung chung, sửa lại và nói rõ đã
   sửa gì.
3. Chỉ sau khi tôi (hoặc bạn tự) xác nhận plan ổn, mới bắt đầu code.

## Phạm vi cần thiết kế/code

### A. Layout chung (`app/layout.tsx` + component mới)
- `components/layout/TopBar.tsx` — thanh mỏng phía trên: liên hệ hỗ trợ, chọn ngôn ngữ
  hiển thị (vi/en), social links.
- `components/layout/Navbar.tsx` — sticky, đổi nền khi scroll, gồm:
  - Logo LangApp
  - Menu chính (khác nhau theo trạng thái đăng nhập/role — ẩn hiện qua props hoặc server
    component fetch role)
  - Nếu **chưa đăng nhập**: menu marketing (Tính năng, Ngôn ngữ hỗ trợ, Về chúng tôi) +
    nút "Đăng nhập" + nút CTA nổi bật "Bắt đầu miễn phí" → `/register`
  - Nếu **đã đăng nhập**: avatar + tên + dropdown (Trang cá nhân, Đăng xuất), badge hiển
    thị role, link nhanh tới Dashboard theo role
  - Responsive: menu hamburger trên mobile, drawer trượt từ phải
- `components/layout/Footer.tsx` — nhiều cột: Về chúng tôi, Ngôn ngữ hỗ trợ, Liên kết
  nhanh, Liên hệ — theo đúng nguyên tắc content thật của app, không placeholder chung chung.

### B. Trang Landing (`app/(marketing)/page.tsx` — trang public trước khi đăng nhập)
Lưu ý: hiện `app/page.tsx` đang redirect thẳng theo auth. Tách logic: nếu **chưa đăng
nhập** → hiển thị landing page marketing đầy đủ (không redirect thẳng tới /login); nếu đã
đăng nhập → redirect như cũ.

Landing gồm các section (nội dung viết thật, đúng giọng app, không lorem ipsum):
1. Hero: tiêu đề chính về học ngoại ngữ đa ngôn ngữ, mô tả ngắn, 2 CTA ("Bắt đầu miễn phí",
   "Tôi là giáo viên"), hình minh hoạ/illustration phù hợp concept đã chọn.
2. USP bar: 3–4 điểm mạnh (VD: "4 kỹ năng toàn diện", "Shadowing với video thật",
   "Giáo viên theo dõi sát", "Đa ngôn ngữ: Anh — Trung — Nhật — Hàn") dạng icon + text.
3. Giới thiệu 4 kỹ năng (Nghe/Nói/Viết/Đọc) — mỗi kỹ năng 1 thẻ có icon riêng biệt, mô tả
   ngắn tính năng nổi bật (tua lại theo script YouTube, shadowing, review bài viết...).
4. Băng ngôn ngữ hỗ trợ: 4 lá cờ/biểu tượng ngôn ngữ hiện có + "sắp ra mắt thêm".
5. Banner CTA giữa trang (giống banner khuyến mãi trong ảnh mẫu nhưng nội dung khác — VD
   mời giáo viên tạo lớp, hoặc mời dùng thử).
6. Testimonial — học sinh/giáo viên (nội dung mẫu hợp lý, đánh dấu rõ là ví dụ).
7. CTA cuối trang + Footer.

### C. Dashboard sau đăng nhập (Giáo viên / Học sinh)
Áp cùng design system (màu, type, spacing, bo góc, shadow) vào các trang đã có sẵn:
- `app/teacher/page.tsx`, `app/student/page.tsx`: chuyển từ list đơn giản sang lưới thẻ
  lớp học có ảnh đại diện theo ngôn ngữ (hoặc icon ngôn ngữ), badge trình độ, progress nếu
  có dữ liệu.
- Trang tổng quan lớp (`[classId]/page.tsx`): 4 thẻ kỹ năng dạng lớn, rõ trạng thái
  bật/tắt, mỗi thẻ có icon + màu accent riêng nhất quán với section giới thiệu kỹ năng ở
  landing (để người dùng nhận diện xuyên suốt).
- Trang chi tiết Nghe/Nói (player + script): giữ nguyên logic, chỉ nâng cấp UI khung chứa,
  màu active segment, nút Tua/Lặp theo design token mới.
- Trang Viết, Từ vựng/Ngữ pháp, Admin, Profile: áp lại màu sắc, spacing, typography đồng bộ.

### D. Yêu cầu kỹ thuật
- Dùng Tailwind, có thể mở rộng `tailwind.config.js` với màu/token tuỳ chỉnh (đặt tên biến
  rõ nghĩa, không hard-code hex rải rác).
- Dùng `next/font` để load Google Fonts đã chọn, tránh flash-of-unstyled-text.
- Responsive đầy đủ từ mobile → desktop, kiểm tra breakpoint `sm/md/lg/xl`.
- Giữ nguyên toàn bộ logic nghiệp vụ hiện có (Supabase queries, RLS, server/client
  component boundary) — CHỈ thay đổi phần trình bày (markup + className + component mới
  cho layout), không sửa logic fetch/mutate dữ liệu trừ khi cần để phục vụ UI mới.
- Có focus state rõ ràng cho điều hướng bàn phím, tôn trọng `prefers-reduced-motion`,
  tương phản màu đủ chuẩn accessibility (đặc biệt trên nút CTA và text trên nền màu).
- Dùng motion tiết chế: 1 chuyển động có chủ đích ở hero (VD một hiệu ứng khi load), hover
  transition nhẹ trên card — không lạm dụng fade-slide-up tràn lan ở mọi section.

## Việc không cần làm trong lần này
- Không cần build thêm tính năng nghiệp vụ mới (đăng ký, enroll học sinh... đã có).
- Không cần dark mode trừ khi bạn thấy hợp lý và đề xuất riêng.
- Không cần animation phức tạp/thư viện ngoài (framer-motion nếu cần thì được, nhưng ưu
  tiên CSS transition thuần trước).

## Bàn giao
Sau khi code xong, tóm tắt lại: bảng màu cuối cùng dùng, font đã chọn, danh sách file đã
tạo/sửa, và chụp/miêu tả nhanh 2–3 màn hình chính để tôi review trước khi merge.
