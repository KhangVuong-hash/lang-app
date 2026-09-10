-- ============================================================
-- Mọi thành viên trong lớp (đã active) được SỬA thông tin bài học
--   + quản lý script. Tạo mới / xoá vẫn theo policy cũ + guard người tạo.
-- ============================================================

-- listening
create policy "listening_lessons: members edit" on listening_lessons for update
  to authenticated
  using (public.is_enrolled(class_id))
  with check (public.is_enrolled(class_id));

create policy "listening_segments: members manage" on listening_script_segments for all
  to authenticated
  using (public.is_enrolled((select class_id from listening_lessons where id = lesson_id)))
  with check (public.is_enrolled((select class_id from listening_lessons where id = lesson_id)));

-- speaking
create policy "speaking_lessons: members edit" on speaking_lessons for update
  to authenticated
  using (public.is_enrolled(class_id))
  with check (public.is_enrolled(class_id));

create policy "speaking_segments: members manage" on speaking_script_segments for all
  to authenticated
  using (public.is_enrolled((select class_id from speaking_lessons where id = lesson_id)))
  with check (public.is_enrolled((select class_id from speaking_lessons where id = lesson_id)));

-- writing
create policy "writing_topics: members edit" on writing_topics for update
  to authenticated
  using (public.is_enrolled(class_id))
  with check (public.is_enrolled(class_id));

-- Guard: chỉ người tạo mới được xoá bài học (áp cho cả *_lessons đã có ở migration trước).
-- Bổ sung guard cho việc thành viên khác vô tình set deleted_at qua policy mới ở trên —
-- guard_soft_delete_owner() (migration 20260910150000) đã lo việc này.
