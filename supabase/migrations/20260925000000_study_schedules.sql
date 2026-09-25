-- ============================================================
-- Thời khóa biểu tự học - mỗi user tự xếp lịch học cho bản thân
--   study_schedules            : quy tắc lặp theo tuần (VD: T2 + T4, 19:00-20:30,
--                                mỗi 1 tuần, từ 01/10 đến 31/12). Buổi đơn lẻ =
--                                starts_on = ends_on.
--   study_schedule_exceptions  : ngoại lệ cho MỘT buổi của quy tắc - huỷ hoặc dời
--                                sang ngày/giờ khác.
--
-- Chỉ chủ sở hữu đọc/ghi được (giống sổ tay). Các buổi cụ thể KHÔNG lưu trong
-- DB: app tự sinh từ quy tắc (lib/schedule.ts). Giờ là giờ địa phương (cột
-- timezone, mặc định Asia/Ho_Chi_Minh).
-- ============================================================

create table study_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  title text,
  -- 0 = Chủ nhật … 6 = Thứ bảy (giống Date.getDay())
  weekdays smallint[] not null,
  start_time time not null,
  end_time time not null,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  starts_on date not null,
  ends_on date,
  interval_weeks smallint not null default 1,
  location text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references profiles(id) on delete set null,
  constraint study_schedules_weekdays_valid check (
    cardinality(weekdays) between 1 and 7 and weekdays <@ array[0,1,2,3,4,5,6]::smallint[]
  ),
  constraint study_schedules_time_order check (end_time > start_time),
  constraint study_schedules_date_order check (ends_on is null or ends_on >= starts_on),
  constraint study_schedules_interval check (interval_weeks between 1 and 8)
);

create index idx_study_schedules_owner on study_schedules (owner_id) where deleted_at is null;

create table study_schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references study_schedules(id) on delete cascade,
  owner_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  -- ngày gốc của buổi bị thay đổi
  occurs_on date not null,
  status text not null check (status in ('cancelled', 'rescheduled')),
  new_date date,
  new_start_time time,
  new_end_time time,
  note text,
  created_at timestamptz not null default now(),
  unique (schedule_id, occurs_on),
  constraint study_schedule_exceptions_reschedule check (
    status = 'cancelled'
    or (new_date is not null and new_start_time is not null and new_end_time is not null
        and new_end_time > new_start_time)
  )
);

create index idx_study_schedule_exceptions_owner on study_schedule_exceptions (owner_id);

drop trigger if exists trg_audit_study_schedules on study_schedules;
create trigger trg_audit_study_schedules before update on study_schedules
  for each row execute procedure public.set_audit_fields();

alter table study_schedules enable row level security;
alter table study_schedule_exceptions enable row level security;

create policy "study_schedules: owner all" on study_schedules for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ngoại lệ phải thuộc một lịch của chính mình
create policy "study_schedule_exceptions: owner all" on study_schedule_exceptions for all
  to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from study_schedules s where s.id = schedule_id and s.owner_id = auth.uid()
    )
  );
