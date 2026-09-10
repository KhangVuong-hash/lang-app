# Migration Supabase

Trước đây toàn bộ schema nằm trong `supabase/schema.sql` và chạy tay qua SQL Editor. Đã
chuyển sang migration chuẩn của Supabase CLI.

## Đã làm

1. `supabase init` → tạo `supabase/config.toml` (+ `seed.sql` rỗng).
2. `supabase migration new initial_schema` → `supabase/migrations/<timestamp>_initial_schema.sql`.
3. Copy toàn bộ nội dung `schema.sql` cũ vào file migration đó. `schema.sql` đã bỏ.

`supabase/migrations/` giờ là **nguồn sự thật** của schema.

## Áp dụng

| Môi trường | Lệnh |
|---|---|
| Local | `supabase start` rồi `supabase db reset` |
| Hosted | `supabase link --project-ref <ref>` rồi `supabase db push` |

## Cho phép tự đăng ký / đăng nhập

`supabase/config.toml` (áp dụng cho local; đẩy lên hosted bằng `supabase config push`):

- `[auth] enable_signup = true`
- `[auth.email] enable_signup = true`
- `[auth.email] enable_confirmations = false` — `signUp` trả session ngay
- `site_url` / `additional_redirect_urls` trỏ `http://localhost:3000`

Project **hosted**: Dashboard → Authentication → Providers → Email: bật Email provider, tắt
"Confirm email" (mặc định đang bật) để khớp với code hiện tại (chưa có route `/auth/callback`).

## Lưu ý

Phần cuối migration tạo policy trên `storage.objects` + insert `storage.buckets` — chạy qua
`supabase db push` thì OK (role `postgres`).
