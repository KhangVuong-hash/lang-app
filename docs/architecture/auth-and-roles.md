# Xác thực & phân quyền

## Mô hình role - chỉ 2 role

`user_role` enum = `('admin', 'user')`.

- **admin** - quản trị hệ thống (`/admin`): xem mọi người dùng/lớp, đổi role.
- **user** - thành viên thường. Một user **vừa có thể dạy vừa có thể học**:
  - tạo lớp → là **giáo viên** của lớp đó (`classes.teacher_id = auth.uid()`)
  - được thêm vào lớp → là **học sinh** của lớp đó (`enrollments`)

"Giáo viên" / "học sinh" là **quan hệ với từng lớp**, không phải role toàn cục.

## Đăng ký / đăng nhập

- `/register` → `supabase.auth.signUp(...)`. Trigger `handle_new_user` tạo `profiles`
  role `'user'`. Nếu bật "Confirm email", `signUp` trả `session = null` → màn "kiểm tra email".
- `/login` → `signInWithPassword`, rồi `router.push('/')`.
- Đăng xuất: `UserMenu` → `supabase.auth.signOut()` → `/login`.

## middleware.ts

1. Refresh session.
2. `!user && route bảo vệ` (`/classes`, `/admin`, `/profile`) → `/login`.
3. `user && (/login | /register | /)` → `homeFor(role)` = `/admin` nếu admin, ngược lại `/classes`.
4. `user && /admin` mà role ≠ admin → `/classes`.

## Quyền theo lớp - `lib/access.ts`

`getClassAccess(classId)` trả về:

| field | ý nghĩa |
|---|---|
| `isAdmin` | role = admin |
| `isTeacher` | `classes.teacher_id === user.id` |
| `isEnrolled` | có `enrollments` active |
| `canManage` | `isTeacher || isAdmin` - tạo/sửa bài, thêm học sinh |
| `canView` | `canManage || isEnrolled` - xem nội dung lớp |

Guard bằng **layout server component**:

- `app/classes/[classId]/layout.tsx` → `notFound()` nếu `!canView`
- `app/classes/[classId]/*/new/layout.tsx` → `notFound()` nếu `!canManage`

RLS ở DB là lớp chặn thật; guard chỉ để trả 404 gọn thay vì trang lỗi.

## Mời vào lớp - `POST /api/enroll-student`

1. Server client (RLS) xác minh người gọi là giáo viên của lớp.
2. Service-role client tra email → user id.
3. Từ chối nếu là tài khoản `admin`, chính người gọi, hoặc đã là thành viên.
4. Tạo `enrollments` với `status = 'invited'`.

### Luồng lời mời (`enrollments.status`)

- `invited` — giáo viên đã mời; `is_enrolled()` = false nên chưa xem được nội dung lớp,
  nhưng thấy được tên lớp (policy `classes: invited user can view` + `is_invited()`).
- Học sinh vào `/classes` → mục **"Lời mời vào lớp"** → **Tham gia** (`invited → active`)
  hoặc **Từ chối** (`invited → declined`). Policy `enrollments: student responds to invite`
  chỉ cho chuyển **từ** `invited`.
- Badge số lời mời hiện trên nav (AppShell đếm, truyền vào AppNav).
- Thành viên `active` xem được danh sách thành viên (`enrollments: members see roster`);
  giáo viên/admin thấy thêm cả lời mời đang chờ. Người tạo lớp = `classes.teacher_id`.
