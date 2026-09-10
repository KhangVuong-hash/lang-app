-- ============================================================
-- Soft delete + audit cho sổ tay từ vựng / ngữ pháp
--   created_at đã có; created_by = user_id (chủ sở hữu)
-- ============================================================

alter table vocabulary_notes
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references profiles(id) on delete set null,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references profiles(id) on delete set null;

alter table grammar_notes
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references profiles(id) on delete set null,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references profiles(id) on delete set null;

create index if not exists idx_vocab_alive
  on vocabulary_notes (user_id, created_at desc) where deleted_at is null;
create index if not exists idx_grammar_alive
  on grammar_notes (user_id, created_at desc) where deleted_at is null;

drop trigger if exists trg_audit_vocab on vocabulary_notes;
create trigger trg_audit_vocab before update on vocabulary_notes
  for each row execute procedure public.set_audit_fields();

drop trigger if exists trg_audit_grammar on grammar_notes;
create trigger trg_audit_grammar before update on grammar_notes
  for each row execute procedure public.set_audit_fields();
