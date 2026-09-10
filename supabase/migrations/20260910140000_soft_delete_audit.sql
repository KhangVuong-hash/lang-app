-- ============================================================
-- Soft delete + audit cho các bảng nội dung có nút xoá
--   classes, listening_lessons, speaking_lessons, writing_topics
--
--   created_at  : đã có sẵn
--   created_by  : lessons đã có; classes & writing_topics thêm mới (backfill = teacher_id)
--   updated_at / updated_by : trigger set_audit_fields() tự điền khi UPDATE
--   deleted_at / deleted_by : nút "Xoá" chỉ set 2 cột này (không DELETE thật)
--
-- Segments (*_script_segments) KHÔNG soft delete: chúng bị thay toàn bộ mỗi lần
-- sửa script nên vẫn xoá cứng.
-- ============================================================

alter table classes
  add column if not exists created_by uuid references profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references profiles(id) on delete set null,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references profiles(id) on delete set null;
update classes set created_by = teacher_id where created_by is null;

alter table listening_lessons
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references profiles(id) on delete set null,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references profiles(id) on delete set null;

alter table speaking_lessons
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references profiles(id) on delete set null,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references profiles(id) on delete set null;

alter table writing_topics
  add column if not exists created_by uuid references profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references profiles(id) on delete set null,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references profiles(id) on delete set null;
update writing_topics set created_by = teacher_id where created_by is null;

create index if not exists idx_classes_alive on classes(id) where deleted_at is null;
create index if not exists idx_listening_alive on listening_lessons(class_id) where deleted_at is null;
create index if not exists idx_speaking_alive on speaking_lessons(class_id) where deleted_at is null;
create index if not exists idx_writing_alive on writing_topics(class_id) where deleted_at is null;

-- Trigger: tự điền updated_at / updated_by mỗi lần UPDATE.
create or replace function public.set_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_audit_classes on classes;
create trigger trg_audit_classes before update on classes
  for each row execute procedure public.set_audit_fields();

drop trigger if exists trg_audit_listening_lessons on listening_lessons;
create trigger trg_audit_listening_lessons before update on listening_lessons
  for each row execute procedure public.set_audit_fields();

drop trigger if exists trg_audit_speaking_lessons on speaking_lessons;
create trigger trg_audit_speaking_lessons before update on speaking_lessons
  for each row execute procedure public.set_audit_fields();

drop trigger if exists trg_audit_writing_topics on writing_topics;
create trigger trg_audit_writing_topics before update on writing_topics
  for each row execute procedure public.set_audit_fields();

-- Ẩn bản ghi đã xoá khỏi các policy hướng người học.
drop policy if exists "classes: enrolled students can view" on classes;
create policy "classes: enrolled students can view" on classes for select
  to authenticated using (public.is_enrolled(id) and deleted_at is null);

drop policy if exists "classes: invited user can view" on classes;
create policy "classes: invited user can view" on classes for select
  to authenticated using (public.is_invited(id) and deleted_at is null);

drop policy if exists "listening_lessons: students view" on listening_lessons;
create policy "listening_lessons: students view" on listening_lessons for select
  to authenticated using (public.is_enrolled(class_id) and deleted_at is null);

drop policy if exists "speaking_lessons: students view" on speaking_lessons;
create policy "speaking_lessons: students view" on speaking_lessons for select
  to authenticated using (public.is_enrolled(class_id) and deleted_at is null);

drop policy if exists "writing_topics: students view" on writing_topics;
create policy "writing_topics: students view" on writing_topics for select
  to authenticated using (public.is_enrolled(class_id) and deleted_at is null);
