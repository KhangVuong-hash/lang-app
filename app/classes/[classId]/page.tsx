import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getClassAccess } from '@/lib/access';
import PageHeader from '@/components/ui/PageHeader';
import SkillGrid from '@/components/ui/SkillGrid';
import LanguageCrest from '@/components/ui/LanguageCrest';
import StatusPill from '@/components/ui/StatusPill';
import EnrollStudentForm from './EnrollStudentForm';
import { LANGUAGE_MAP } from '@/lib/constants';

export default async function ClassOverview({ params }: { params: { classId: string } }) {
  const access = await getClassAccess(params.classId);
  if (!access?.canView) notFound();

  const { klass, skills, canManage, isTeacher, isEnrolled } = access;
  const langName = LANGUAGE_MAP[klass.language_code]?.name ?? klass.languages?.name;

  let students: any[] = [];
  if (canManage) {
    const supabase = createClient();
    const { data } = await supabase
      .from('enrollments')
      .select('*, profiles(full_name)')
      .eq('class_id', params.classId);
    students = data ?? [];
  }

  return (
    <div className="container-page py-8">
      <PageHeader
        back={{ href: '/classes', label: 'Lớp học của tôi' }}
        eyebrow={[langName, klass.level].filter(Boolean).join(' · ')}
        title={klass.name}
      >
        {isTeacher && <StatusPill tone="info">Bạn dạy lớp này</StatusPill>}
        {!isTeacher && isEnrolled && <StatusPill tone="open">Bạn đang học lớp này</StatusPill>}
      </PageHeader>

      <div className="mb-6 flex items-center gap-3">
        <LanguageCrest code={klass.language_code} size="lg" />
        {klass.description && (
          <p className="max-w-prose text-sm text-ink-soft">{klass.description}</p>
        )}
      </div>

      <SkillGrid basePath={`/classes/${params.classId}`} enabledMap={skills} />

      {canManage && (
        <div className="card mt-8 p-5">
          <h2 className="mb-1 font-display text-lg font-semibold">
            Học sinh ({students.length})
          </h2>
          <p className="mb-4 text-sm text-ink-soft">
            Thêm học sinh bằng email tài khoản họ đã đăng ký.
          </p>
          <EnrollStudentForm classId={params.classId} />
          <ul className="mt-4 divide-y divide-line">
            {students.map((s: any) => (
              <li key={s.id} className="py-2.5 text-sm text-ink">
                {s.profiles?.full_name ?? 'Chưa cập nhật tên'}
              </li>
            ))}
            {students.length === 0 && (
              <li className="py-2.5 text-sm text-ink-faint">Chưa có học sinh nào trong lớp.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
