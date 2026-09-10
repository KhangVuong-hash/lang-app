import { createClient } from '@/lib/supabase/server';
import PageHeader from '@/components/ui/PageHeader';
import LanguageCrest from '@/components/ui/LanguageCrest';
import { ROLE_LABEL } from '@/lib/constants';
import VocabGrammarNotebook from './VocabGrammarNotebook';

function ClassList({ title, items }: { title: string; items: any[] }) {
  if (items.length === 0) return null;
  return (
    <div className="card p-5">
      <h2 className="mb-3 font-display text-lg font-semibold">{title}</h2>
      <ul className="divide-y divide-line">
        {items.map((c: any) => (
          <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm">
            <LanguageCrest code={c.language_code} size="sm" />
            <span className="text-ink">{c.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: teaching }, { data: enrollments }, { data: vocab }, { data: grammar }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user?.id).single(),
      supabase.from('classes').select('*, languages(name)').eq('teacher_id', user?.id).is('deleted_at', null),
      supabase
        .from('enrollments')
        .select('classes(*, languages(name))')
        .eq('student_id', user?.id)
        .eq('status', 'active'),
      supabase
        .from('vocabulary_notes')
        .select('*, classes(name)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('grammar_notes')
        .select('*, classes(name)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false }),
    ]);

  const taught = teaching ?? [];
  const learning = (enrollments ?? []).map((e: any) => e.classes).filter(Boolean);
  const allClasses = [...taught, ...learning];

  return (
    <div className="container-page max-w-4xl py-8">
      <PageHeader eyebrow="Trang cá nhân" title={profile?.full_name ?? 'Chưa có tên'}>
        <span className="pill bg-highlight-soft text-ink">
          {ROLE_LABEL[profile?.role ?? 'user'] ?? 'Thành viên'}
        </span>
      </PageHeader>

      <div className="space-y-6">
        <ClassList title="Lớp tôi dạy" items={taught} />
        <ClassList title="Lớp tôi học" items={learning} />
        {allClasses.length === 0 && (
          <div className="card p-5 text-sm text-ink-faint">
            Bạn chưa dạy hay học lớp nào.
          </div>
        )}
        <VocabGrammarNotebook
          vocab={vocab ?? []}
          grammar={grammar ?? []}
          classes={allClasses}
        />
      </div>
    </div>
  );
}
