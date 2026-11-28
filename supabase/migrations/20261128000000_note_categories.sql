-- ============================================================
-- Danh mục ghi chú trong tab Language: mỗi kỹ năng có danh mục riêng do người dùng tạo
-- (vd. Viết: "Task 1", "Task 2", "Từ nối"). Mỗi ghi chú thuộc tối đa một danh mục.
--   note_categories          : owner_id + skill + name (không trùng tên trong cùng kỹ năng)
--   personal_notes.category_id: FK ghép (category_id, owner_id, skill) -> danh mục phải
--                               cùng chủ và cùng kỹ năng với ghi chú.
-- Xoá danh mục -> ghi chú giữ nguyên, chỉ bỏ danh mục (category_id = null).
-- ============================================================

create table note_categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  skill skill_type not null,
  name text not null,
  created_at timestamptz not null default now(),
  constraint note_categories_name_len check (char_length(btrim(name)) between 1 and 40),
  constraint note_categories_ref unique (id, owner_id, skill)
);

create unique index note_categories_unique_name
  on note_categories (owner_id, skill, lower(btrim(name)));

alter table note_categories enable row level security;

create policy "note_categories: owner all" on note_categories for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

alter table personal_notes add column if not exists category_id uuid;

alter table personal_notes
  add constraint personal_notes_category_fk
  foreign key (category_id, owner_id, skill)
  references note_categories (id, owner_id, skill)
  on delete set null (category_id),
  -- MATCH SIMPLE bỏ qua kiểm tra khi skill null -> chặn riêng
  add constraint personal_notes_category_needs_skill
  check (category_id is null or skill is not null);

create index idx_personal_notes_category
  on personal_notes (category_id)
  where category_id is not null and deleted_at is null;

-- đổi danh mục được tính là sửa ghi chú (cập nhật updated_at); chỉ ghim, hoặc danh mục
-- bị xoá (FK set null - lúc này dòng danh mục đã mất) thì không
create or replace function public.set_personal_note_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  category_dropped boolean := new.category_id is null and old.category_id is not null
    and not exists (select 1 from public.note_categories c where c.id = old.category_id);
begin
  if (new.skill, new.title, new.content, new.image_paths, new.deleted_at)
     is not distinct from (old.skill, old.title, old.content, old.image_paths, old.deleted_at)
     and (category_dropped or new.category_id is not distinct from old.category_id)
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
