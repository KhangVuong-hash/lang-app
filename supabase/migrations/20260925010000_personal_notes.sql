-- ============================================================
-- Ghi chú cá nhân (trang cá nhân) - ghi lại thông tin tuỳ ý, đính kèm ảnh
--   personal_notes : title + content (HTML đã lọc, như sổ tay) + image_paths
--   bucket personal-notes (private): ảnh đính kèm WebP, path {owner_id}/{uuid}.webp
-- Chỉ chủ sở hữu đọc/ghi. Xoá ghi chú = soft delete; ảnh bị gỡ khỏi ghi chú thì
-- app xoá luôn file trong bucket.
-- ============================================================

create table personal_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  title text,
  content text,
  image_paths text[] not null default '{}',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references profiles(id) on delete set null,
  constraint personal_notes_max_images check (cardinality(image_paths) <= 20)
);

create index idx_personal_notes_owner
  on personal_notes (owner_id, pinned desc, updated_at desc)
  where deleted_at is null;

drop trigger if exists trg_audit_personal_notes on personal_notes;
create trigger trg_audit_personal_notes before update on personal_notes
  for each row execute procedure public.set_audit_fields();

alter table personal_notes enable row level security;

create policy "personal_notes: owner all" on personal_notes for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ------------------------------------------------------------
-- Storage: ảnh đính kèm. App nhận jpg/png/webp <= 2MB, đổi sang WebP và đặt tên
-- ngẫu nhiên (uuid) trước khi upload -> bucket chỉ nhận WebP <= 2MB.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'personal-notes',
  'personal-notes',
  false,
  2097152,
  array['image/webp']
)
on conflict (id) do nothing;

create policy "personal-notes: owner can upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'personal-notes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "personal-notes: owner can read own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'personal-notes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "personal-notes: owner can delete own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'personal-notes'
  and (storage.foldername(name))[1] = auth.uid()::text
);
