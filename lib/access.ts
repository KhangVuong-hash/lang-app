import { createClient } from '@/lib/supabase/server';
import type { SkillKey } from '@/lib/constants';

export type ClassAccess = {
  userId: string;
  klass: any;
  skills: Partial<Record<SkillKey, boolean>>;
  isAdmin: boolean;
  /** là giáo viên của chính lớp này */
  isTeacher: boolean;
  /** là học sinh đang active của lớp này */
  isEnrolled: boolean;
  /** được phép quản lý (tạo/sửa bài, thêm học sinh) */
  canManage: boolean;
  /** được phép xem nội dung lớp */
  canView: boolean;
};

/**
 * Trả về quyền của user hiện tại với một lớp, hoặc null nếu chưa đăng nhập /
 * lớp không tồn tại / không có quyền xem (RLS đã lọc sẵn `classes`).
 */
export async function getClassAccess(classId: string): Promise<ClassAccess | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: klass } = await supabase
    .from('classes')
    .select('*, languages(name)')
    .eq('id', classId)
    .single();
  if (!klass) return null;

  const [{ data: profile }, { data: enr }, { data: skillRows }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase
      .from('enrollments')
      .select('id')
      .eq('class_id', classId)
      .eq('student_id', user.id)
      .eq('status', 'active')
      .maybeSingle(),
    supabase.from('class_skills').select('skill_type, is_enabled').eq('class_id', classId),
  ]);

  const isAdmin = profile?.role === 'admin';
  const isTeacher = klass.teacher_id === user.id;
  const isEnrolled = !!enr;
  const canManage = isTeacher || isAdmin;

  return {
    userId: user.id,
    klass,
    skills: Object.fromEntries(
      (skillRows ?? []).map((s) => [s.skill_type, s.is_enabled])
    ) as Partial<Record<SkillKey, boolean>>,
    isAdmin,
    isTeacher,
    isEnrolled,
    canManage,
    canView: canManage || isEnrolled,
  };
}
