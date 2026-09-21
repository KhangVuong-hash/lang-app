-- ============================================================
-- Từ vựng: thêm cột từ loại (noun, verb, phrasal_verb, adjective...).
--   Giá trị hợp lệ nằm ở lib/constants.ts (PARTS_OF_SPEECH), không ràng buộc ở DB
--   để thêm loại mới không cần migration.
-- ============================================================

alter table vocabulary_notes add column if not exists part_of_speech text;
