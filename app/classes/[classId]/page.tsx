import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getClassAccess } from '@/lib/access';
import PageHeader from '@/components/ui/PageHeader';
import SkillGrid from '@/components/ui/SkillGrid';
import LanguageCrest from '@/components/ui/LanguageCrest';
import StatusPill from '@/components/ui/StatusPill';
import EnrollStudentForm from './EnrollStudentForm';
import DeleteResource from '@/components/DeleteResource';
import { LANGUAGE_MAP } from '@/lib/constants';

export default async function ClassOverview({ params }: { params: { classId: string } }) {
  const access = await getClassAccess(params.classId);
  if (!access?.canView) notFound();

  const { klass, skills, canManage, isTeacher, isEnrolled } = access;
  const supabase = createClient();
  const langName = LANGUAGE_MAP[klass.language_code]?.name ?? klass.languages?.name;

  const [{ data: creator }, { data: roster }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', klass.teacher_id).maybeSingle(),
    supabase
      .from('enrollments')
      .select('id, status, profiles(full_name)')
      .eq('class_id', params.classId)
      .order('joined_at', { ascending: true }),
  ]);

  const rows = roster ?? [];
  const members = rows.filter((r: any) => r.status === 'active');
  const invited = rows.filter((r: any) => r.status === 'invited');

  return (
    <div className="container-page py-8">
      <PageHeader
        back={{ href: '/classes', label: 'Lớp học của tôi' }}
        eyebrow={[langName, klass.level].filter(Boolean).join(' · ')}
        title={klass.name}
      >
        {isTeacher && <StatusPill tone="info">Bạn tạo lớp này</StatusPill>}
        {!isTeacher && isEnrolled && <StatusPill tone="open">Bạn đang học lớp này</StatusPill>}
      </PageHeader>

      <div className="mb-6 flex items-center gap-3">
        <LanguageCrest code={klass.language_code} size="lg" />
        <div>
          {klass.description && (
            <p className="max-w-prose text-sm text-ink-soft">{klass.description}</p>
          )}
          <p className="mt-1 text-xs text-ink-faint">
            Người tạo lớp: {creator?.full_name ?? '-'}
          </p>
        </div>
      </div>

      <SkillGrid basePath={`/classes/${params.classId}`} enabledMap={skills} />

      <div className="card mt-8 p-5">
        <h2 className="mb-1 font-display text-lg font-semibold">
          Thành viên ({members.length})
        </h2>

        {canManage && (
          <>
            <p className="mb-4 text-sm text-ink-soft">
              Mời học sinh bằng email tài khoản họ đã đăng ký - họ sẽ thấy lời mời và bấm
              “Tham gia”.
            </p>
            <EnrollStudentForm classId={params.classId} />
          </>
        )}

        <ul className="mt-4 divide-y divide-line">
          <li className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-ink">{creator?.full_name ?? 'Giáo viên'}</span>
            <span className="pill bg-brand/10 text-brand">Người tạo</span>
          </li>
          {members.map((m: any) => (
            <li key={m.id} className="py-2.5 text-sm text-ink">
              {m.profiles?.full_name ?? 'Chưa cập nhật tên'}
            </li>
          ))}
          {members.length === 0 && (
            <li className="py-2.5 text-sm text-ink-faint">Chưa có thành viên nào.</li>
          )}
        </ul>

        {canManage && invited.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-2 text-xs font-medium text-ink-faint">
              Đang chờ đồng ý ({invited.length})
            </p>
            <ul className="space-y-1">
              {invited.map((m: any) => (
                <li key={m.id} className="text-sm text-ink-soft">
                  {m.profiles?.full_name ?? 'Chưa cập nhật tên'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {isTeacher && (
        <div className="mt-8 rounded-xl border border-danger/30 bg-danger/5 p-5">
          <h2 className="font-display text-sm font-semibold text-ink">Vùng nguy hiểm</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Chỉ bạn (người tạo lớp) mới xoá được. Xoá lớp sẽ ẩn toàn bộ bài học, bài nộp và
            thành viên (dữ liệu vẫn lưu lại).
          </p>
          <div className="mt-3">
            <DeleteResource
              table="classes"
              id={params.classId}
              redirectTo="/classes"
              label="Xoá lớp học"
              question="Xoá lớp này và toàn bộ nội dung bên trong? Không hoàn tác được."
            />
          </div>
        </div>
      )}
    </div>
  );
}
