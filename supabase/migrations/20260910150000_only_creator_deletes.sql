-- ============================================================
-- Chỉ NGƯỜI TẠO mới được xoá (soft delete) lớp học / bài học / chủ đề.
-- Guard ở tầng DB: chặn việc set deleted_at nếu auth.uid() không phải người tạo.
--   classes        -> người tạo = teacher_id (hoặc created_by)
--   *_lessons      -> người tạo = created_by
--   writing_topics -> người tạo = created_by (hoặc teacher_id)
-- ============================================================

create or replace function public.guard_soft_delete_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  j jsonb := to_jsonb(new);
  creator uuid;
begin
  -- chỉ kiểm khi chuyển từ "chưa xoá" sang "đã xoá"
  if new.deleted_at is not null and (old.deleted_at is null) then
    creator := coalesce((j->>'created_by')::uuid, (j->>'teacher_id')::uuid);
    if creator is null or creator <> auth.uid() then
      raise exception 'Chỉ người tạo mới được xoá mục này';
    end if;
    new.deleted_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_delete_classes on classes;
create trigger trg_guard_delete_classes before update on classes
  for each row execute procedure public.guard_soft_delete_owner();

drop trigger if exists trg_guard_delete_listening on listening_lessons;
create trigger trg_guard_delete_listening before update on listening_lessons
  for each row execute procedure public.guard_soft_delete_owner();

drop trigger if exists trg_guard_delete_speaking on speaking_lessons;
create trigger trg_guard_delete_speaking before update on speaking_lessons
  for each row execute procedure public.guard_soft_delete_owner();

drop trigger if exists trg_guard_delete_writing on writing_topics;
create trigger trg_guard_delete_writing before update on writing_topics
  for each row execute procedure public.guard_soft_delete_owner();
