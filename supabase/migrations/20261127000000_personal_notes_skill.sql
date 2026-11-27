-- ============================================================
-- Tab "Language" (trang cá nhân): ghi chú chia theo 4 kỹ năng nghe/nói/đọc/viết.
-- Tái dùng personal_notes, thêm cột skill. Ghi chú cũ (tạo từ tab "Ghi chú" đã bỏ)
-- có skill = null -> hiện ở mục "Chưa phân loại" để người dùng chuyển sang kỹ năng.
-- ============================================================

alter table personal_notes add column if not exists skill skill_type;

drop index if exists idx_personal_notes_owner;
create index idx_personal_notes_owner_skill
  on personal_notes (owner_id, skill, pinned desc, updated_at desc)
  where deleted_at is null;
