-- ============================================================
-- Index cho các truy vấn chạy ở MỌI trang (AppShell, danh sách lớp, trang cá nhân)
--   enrollments theo học sinh + trạng thái: đếm lời mời (AppShell), "lớp tôi học"
--     (unique(class_id, student_id) có sẵn không dùng được khi lọc theo student_id)
--   classes theo giáo viên: "lớp tôi dạy"
-- ============================================================

create index if not exists idx_enrollments_student_status
  on enrollments (student_id, status);

create index if not exists idx_classes_teacher_alive
  on classes (teacher_id, created_at desc)
  where deleted_at is null;
