-- ============================================================
-- Bình luận theo lớp học và theo từng bài học
--   subject_type = null            -> bình luận ở trang lớp
--   subject_type in (listening/speaking/writing) + subject_id -> theo bài học
-- ============================================================

create table comments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  subject_type text check (subject_type in ('listening', 'speaking', 'writing')),
  subject_id uuid,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references profiles(id) on delete set null,
  constraint comments_subject_pair check ((subject_type is null) = (subject_id is null))
);

create index idx_comments_thread
  on comments (class_id, subject_type, subject_id, created_at)
  where deleted_at is null;

alter table comments enable row level security;

-- tự điền updated_at / updated_by khi UPDATE (dùng lại hàm ở migration soft-delete)
drop trigger if exists trg_audit_comments on comments;
create trigger trg_audit_comments before update on comments
  for each row execute procedure public.set_audit_fields();

-- Thành viên / giáo viên / admin của lớp đọc được bình luận.
-- (Không lọc deleted_at ở policy: PG17 áp policy SELECT như WITH CHECK cho UPDATE,
--  nếu lọc thì thao tác "ẩn" - set deleted_at - sẽ bị chặn. App tự lọc deleted_at.)
create policy "comments: class members read" on comments for select
  to authenticated
  using (
    public.is_enrolled(class_id)
    or public.is_class_teacher(class_id)
    or public.is_admin()
  );

-- Ai ở trong lớp cũng viết được, nhưng chỉ với danh nghĩa chính mình.
create policy "comments: member writes own" on comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (
      public.is_enrolled(class_id)
      or public.is_class_teacher(class_id)
      or public.is_admin()
    )
  );

-- Tác giả sửa / ẩn bình luận của chính mình.
create policy "comments: author edits own" on comments for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Giáo viên lớp / admin ẩn được bình luận của người khác (kiểm duyệt).
create policy "comments: class staff moderate" on comments for update
  to authenticated
  using (public.is_class_teacher(class_id) or public.is_admin())
  with check (public.is_class_teacher(class_id) or public.is_admin());
