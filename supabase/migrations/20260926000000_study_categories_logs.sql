-- ============================================================
-- Thời khóa biểu tự học: danh mục + kết quả từng buổi (cho thống kê)
--   study_categories    : danh mục do user tự tạo (VD: Học tiếng Anh, Học công
--                         nghệ, Học trên lớp). color = vị trí trong bảng màu cố
--                         định của app (0-7). Xoá thật; lịch thuộc danh mục bị
--                         xoá chuyển về "Chưa phân loại".
--   study_schedules.category_id
--   study_session_logs  : đánh dấu MỘT buổi (schedule_id + ngày gốc) đã hoàn
--                         thành hay không; hoàn thành thì kèm số phút học thực tế.
--
-- Chỉ chủ sở hữu đọc/ghi được (giống study_schedules).
-- ============================================================

create table study_categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  name text not null,
  color smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint study_categories_name_not_blank check (length(trim(name)) between 1 and 60),
  constraint study_categories_color_valid check (color between 0 and 7)
);

create index idx_study_categories_owner on study_categories (owner_id);

alter table study_schedules
  add column category_id uuid references study_categories(id) on delete set null;

create table study_session_logs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references study_schedules(id) on delete cascade,
  owner_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  -- ngày gốc của buổi (giống study_schedule_exceptions.occurs_on)
  occurs_on date not null,
  completed boolean not null,
  -- số phút học thực tế, chỉ có khi completed
  actual_minutes integer,
  updated_at timestamptz not null default now(),
  unique (schedule_id, occurs_on),
  constraint study_session_logs_minutes check (
    (completed and actual_minutes between 1 and 1440)
    or (not completed and actual_minutes is null)
  )
);

create index idx_study_session_logs_owner on study_session_logs (owner_id, occurs_on);

alter table study_categories enable row level security;
alter table study_session_logs enable row level security;

create policy "study_categories: owner all" on study_categories for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- kết quả phải thuộc một lịch của chính mình
create policy "study_session_logs: owner all" on study_session_logs for all
  to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from study_schedules s where s.id = schedule_id and s.owner_id = auth.uid()
    )
  );

-- lịch chỉ được gắn danh mục của chính mình
create or replace function public.check_study_schedule_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.category_id is not null and not exists (
    select 1 from public.study_categories c
    where c.id = new.category_id and c.owner_id = new.owner_id
  ) then
    raise exception 'Danh mục không hợp lệ';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_study_schedule_category on study_schedules;
create trigger trg_study_schedule_category before insert or update of category_id on study_schedules
  for each row execute procedure public.check_study_schedule_category();
