-- ============================================================
-- Củng cố việc tự tạo profiles khi có user mới
--   * handle_new_user: idempotent (on conflict do nothing)
--   * tạo lại trigger on_auth_user_created (phòng khi lần push đầu thiếu)
--   * backfill profiles cho các auth.users chưa có
--   * policy: user tự tạo profile của mình (role ép = 'user') làm lưới an toàn
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- backfill: bất kỳ auth user nào chưa có profiles
insert into public.profiles (id, full_name, role)
select u.id, u.raw_user_meta_data->>'full_name', 'user'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- lưới an toàn: nếu vì lý do gì trigger không chạy, app vẫn tự tạo được profile
-- (role bị ép 'user' nên không thể tự phong admin)
drop policy if exists "profiles: insert own (as user)" on profiles;
create policy "profiles: insert own (as user)" on profiles for insert
  to authenticated
  with check (id = auth.uid() and role = 'user');
