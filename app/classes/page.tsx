import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import PageHeader from '@/components/ui/PageHeader';
import ClassCard from '@/components/ui/ClassCard';
import EmptyState from '@/components/ui/EmptyState';
import type { SkillKey } from '@/lib/constants';

function enabledOf(row: any): SkillKey[] {
  return (row?.class_skills ?? [])
    .filter((s: any) => s.is_enabled)
    .map((s: any) => s.skill_type);
}

export default async function ClassesDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: teaching }, { data: enrollments }] = await Promise.all([
    supabase
      .from('classes')
      .select('*, languages(name), class_skills(skill_type, is_enabled), enrollments(count)')
      .eq('teacher_id', user?.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('enrollments')
      .select(
        '*, classes(*, languages(name), class_skills(skill_type, is_enabled), profiles!classes_teacher_id_fkey(full_name))'
      )
      .eq('student_id', user?.id)
      .eq('status', 'active'),
  ]);

  const taught = teaching ?? [];
  const learning = (enrollments ?? []).filter((e: any) => e.classes);
  const nothing = taught.length === 0 && learning.length === 0;

  return (
    <div className="container-page py-8">
      <PageHeader eyebrow="Bảng điều khiển" title="Lớp học ~của tôi~" mark>
        <Link href="/classes/new" className="btn-primary">
          Tạo lớp học
        </Link>
      </PageHeader>

      {nothing && (
        <EmptyState
          icon="📚"
          title="Bạn chưa có lớp nào"
          hint="Tạo một lớp để bắt đầu dạy, hoặc gửi email tài khoản này cho giáo viên để được thêm vào lớp học."
        >
          <Link href="/classes/new" className="btn-primary mt-2">
            Tạo lớp học
          </Link>
        </EmptyState>
      )}

      {taught.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-lg font-semibold">Lớp tôi dạy</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {taught.map((c: any) => (
              <ClassCard
                key={c.id}
                href={`/classes/${c.id}`}
                name={c.name}
                languageCode={c.language_code}
                level={c.level}
                meta={`${c.enrollments?.[0]?.count ?? 0} học sinh`}
                enabledSkills={enabledOf(c)}
              />
            ))}
          </div>
        </section>
      )}

      {learning.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Lớp tôi học</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {learning.map((e: any) => {
              const c = e.classes;
              return (
                <ClassCard
                  key={e.id}
                  href={`/classes/${c.id}`}
                  name={c.name}
                  languageCode={c.language_code}
                  level={c.level}
                  meta={`GV: ${c.profiles?.full_name ?? '—'}`}
                  enabledSkills={enabledOf(c)}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
