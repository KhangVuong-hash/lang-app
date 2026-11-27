-- ============================================================
-- Ghim / bỏ ghim ghi chú ngay trên thẻ không được tính là "sửa":
-- giữ nguyên updated_at/updated_by khi chỉ cột pinned thay đổi, để ngày hiển thị
-- trên thẻ và thứ tự "mới cập nhật" không bị xáo trộn.
-- ============================================================

create or replace function public.set_personal_note_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.skill, new.title, new.content, new.image_paths, new.deleted_at)
     is not distinct from (old.skill, old.title, old.content, old.image_paths, old.deleted_at)
  then
    new.updated_at := old.updated_at;
    new.updated_by := old.updated_by;
  else
    new.updated_at := now();
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_personal_notes on personal_notes;
create trigger trg_audit_personal_notes before update on personal_notes
  for each row execute procedure public.set_personal_note_audit();
