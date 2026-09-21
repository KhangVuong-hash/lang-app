-- ============================================================
-- Cho phép đổi profiles.role từ Supabase Studio / SQL Editor / service role.
--   Các kênh này không có JWT nên auth.uid() là NULL -> trước đây is_admin() = false
--   và trigger chặn luôn cả chủ DB (không thể cấp admin đầu tiên).
--   Người dùng đăng nhập luôn có auth.uid(), nên vẫn bị chặn tự nâng quyền.
--   (policy update trên profiles chỉ dành cho `authenticated`, anon không sửa được.)
-- ============================================================

create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins can change user roles';
  end if;
  return new;
end;
$$;
