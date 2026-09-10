-- ============================================================
-- Lời mời vào lớp (dùng lại cột enrollments.status, kiểu text)
--   'invited'  - giáo viên đã mời, học sinh chưa đồng ý
--   'active'   - đã tham gia (is_enrolled chỉ tính giá trị này)
--   'declined' - học sinh từ chối
-- ============================================================

-- helper: user hiện tại đang được mời vào lớp cid (chưa đồng ý)
create or replace function public.is_invited(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments
    where class_id = cid and student_id = auth.uid() and status = 'invited'
  );
$$;

-- Học sinh xem được lớp mình ĐƯỢC MỜI (để hiện tên lớp trên lời mời).
drop policy if exists "classes: invited user can view" on classes;
create policy "classes: invited user can view" on classes for select
  to authenticated using (public.is_invited(id));

-- Học sinh phản hồi lời mời của chính mình - chỉ chuyển từ 'invited'.
drop policy if exists "enrollments: student responds to invite" on enrollments;
create policy "enrollments: student responds to invite" on enrollments for update
  to authenticated
  using (student_id = auth.uid() and status = 'invited')
  with check (student_id = auth.uid() and status in ('active', 'declined'));

-- Thành viên đã tham gia thấy được danh sách thành viên (rows 'active');
-- giáo viên / admin thấy tất cả (kể cả lời mời đang chờ).
drop policy if exists "enrollments: members see roster" on enrollments;
create policy "enrollments: members see roster" on enrollments for select
  to authenticated
  using (
    public.is_class_teacher(class_id)
    or public.is_admin()
    or (status = 'active' and public.is_enrolled(class_id))
  );
