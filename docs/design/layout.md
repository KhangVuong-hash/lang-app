# Layout & Shell

## Ba lớp shell

| Shell | Dùng ở | Gồm |
|---|---|---|
| [`MarketingShell`](../../components/layout/MarketingShell.tsx) | Landing (`app/page.tsx` khi chưa đăng nhập) | `TopBar` + `PublicNav` (sticky, đổi nền khi scroll, drawer mobile) + `Footer` 4 cột |
| [`AppShell`](../../components/layout/AppShell.tsx) | `app/{classes,admin,profile}/layout.tsx` | `TopBar` + `AppNav` (menu theo role, badge role, `UserMenu` có Đăng xuất) + `Footer` rút gọn |
| [`AuthShell`](../../components/layout/AuthShell.tsx) | `/login`, `/register` | Chỉ logo + nội dung giữa trang |

`app/layout.tsx` chỉ giữ `<html><body>` + font. Không nhồi header vào root để mỗi nhánh
route tự chọn shell.

## Middleware

[`middleware.ts`](../../middleware.ts): route bảo vệ = `/classes`, `/admin`, `/profile`.
Đăng nhập xong → `/admin` (admin) hoặc `/classes` (user). Xem
[architecture/auth-and-roles.md](../architecture/auth-and-roles.md).

## Wireframe - Landing (chưa đăng nhập)

```
TopBar: khẩu hiệu · hotro@BanThuApp.vn · VI
Navbar sticky: ◆BanThuApp  Tính năng 4kỹnăng Ngônngữ Vềchúngtôi   [Đăng nhập][Bắt đầu miễn phí]
HERO 7/5:  "Học ‹‹từng câu một›› ..."  +  thẻ-script CSS (nút play, dòng highlight, chip ngôn ngữ)
USP BAR:   4 cột icon+text, chỉ divider, không thẻ
4 KỸ NĂNG: 4 thẻ, thanh accent trái theo màu kỹ năng, blurb thật
NGÔN NGỮ:  dải nền brand - EN 中文 日本語 한국어 + sắp có
BANNER GV: nền highlight - "Bạn là giáo viên? Tạo lớp miễn phí" [Tạo lớp học]
CÁCH HOẠT ĐỘNG: 3 bước đánh số, hình tab-sổ
TESTIMONIAL: thẻ bong bóng hội thoại ×3 ("ví dụ minh hoạ")
CTA cuối + FOOTER 4 cột
```

## Wireframe - Dashboard `/classes` (đã đăng nhập)

```
TopBar mảnh + AppNav: ◆BanThuApp [badge] Lớp học Sổ tay   ◔Tên▾(Trang cá nhân·Đăng xuất)
"Lớp học của tôi" (vệt highlight) + [Tạo lớp học]
Section "Lớp tôi dạy"  - lưới thẻ (nếu có)
Section "Lớp tôi học"  - lưới thẻ (nếu có)
Thẻ lớp: crest ngôn ngữ · tên · trình độ · số HS/GV · 4 icon kỹ năng bật/tắt
```

## Wireframe - Class overview `/classes/[id]`

```
‹ Lớp học của tôi   crest + "Tiếng Nhật · N4"   tên lớp
  pill "Bạn tạo lớp này" / "Bạn đang học lớp này"
4 thẻ kỹ năng lớn: SkillIcon, pill Đang mở/đóng, thanh màu trái, link nếu mở
(canManage) Học sinh (n) + form thêm bằng email
```

Các trang danh sách bài (Nghe/Nói/Viết) dùng `PageHeader` (eyebrow = "🎧 Kỹ năng Nghe") +
`card` chứa `LessonRow` + `EmptyState` khi rỗng.
