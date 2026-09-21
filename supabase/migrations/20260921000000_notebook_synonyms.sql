-- ============================================================
-- Sổ tay: thêm cột từ / ngữ pháp đồng nghĩa
--   Các cột text của sổ tay (term/title, meaning/explanation, example_sentence,
--   synonyms) giờ lưu HTML đã lọc (b, i, u, br, div, p) - không cần đổi kiểu cột.
-- ============================================================

alter table vocabulary_notes add column if not exists synonyms text;
alter table grammar_notes add column if not exists synonyms text;
