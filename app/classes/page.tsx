import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import PageHeader from '@/components/ui/PageHeader';
import ClassCard from '@/components/ui/ClassCard';
import EmptyState from '@/components/ui/EmptyState';
import LanguageCrest from '@/components/ui/LanguageCrest';
import InviteResponse from './InviteResponse';
import { LANGUAGE_MAP, type SkillKey } from '@/lib/constants';

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

  const [{ data: teaching }, { data: enrollments }, { data: invites }] = await Promise.all([
    supabase
      .from('classes')
      .select('*, languages(name), class_skills(skill_type, is_enabled)')
      .eq('teacher_id', user?.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('enrollments')
      .select(
        '*, classes(*, languages(name), class_skills(skill_type, is_enabled), profiles!classes_teacher_id_fkey(full_name))'
      )
      .eq('student_id', user?.id)
      .eq('status', 'active'),
    supabase
      .from('enrollments')
      .select('id, class_id, classes(name, language_code, profiles!classes_teacher_id_fkey(full_name))')
      .eq('student_id', user?.id)
      .eq('status', 'invited'),
  ]);

  const taught = teaching ?? [];

  // đếm thành viên active cho các lớp mình dạy
  const memberCount: Record<string, number> = {};
  if (taught.length) {
    const { data: rows } = await supabase
      .from('enrollments')
      .select('class_id')
      .eq('status', 'active')
      .in(
        'class_id',
        taught.map((c: any) => c.id)
      );
    for (const r of rows ?? []) memberCount[r.class_id] = (memberCount[r.class_id] ?? 0) + 1;
  }

  const learning = (enrollments ?? []).filter((e: any) => e.classes);
  const pending = (invites ?? []).filter((e: any) => e.classes);
  const nothing = taught.length === 0 && learning.length === 0 && pending.length === 0;

  return (
    <div className="container-page py-8">
      <PageHeader eyebrow="Bảng điều khiển" title="Lớp học ~của tôi~" mark>
        <Link href="/classes/new" className="btn-primary">
          Tạo lớp học
        </Link>
      </PageHeader>

      {pending.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-lg font-semibold">
            Lời mời vào lớp ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((e: any) => (
              <div
                key={e.id}
                className="card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="flex items-center gap-3">
                  <LanguageCrest code={e.classes.language_code} size="sm" />
                  <div>
                    <p className="font-semibold text-ink">{e.classes.name}</p>
                    <p className="text-xs text-ink-faint">
                      {LANGUAGE_MAP[e.classes.language_code]?.name} · Mời bởi{' '}
                      {e.classes.profiles?.full_name ?? 'giáo viên'}
                    </p>
                  </div>
                </div>
                <InviteResponse enrollmentId={e.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      {nothing && (
        <EmptyState
          icon="📚"
          title="Bạn chưa có lớp nào"
          hint="Tạo một lớp để bắt đầu dạy, hoặc gửi email tài khoản này cho giáo viên để được mời vào lớp."
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
                meta={`${memberCount[c.id] ?? 0} thành viên`}
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
                  meta={`GV: ${c.profiles?.full_name ?? '-'}`}
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
