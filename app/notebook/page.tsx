import { createClient } from '@/lib/supabase/server';
import PageHeader from '@/components/ui/PageHeader';
import Notebook from '@/components/Notebook';

const PAGE = 10;

export default async function NotebookPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: teaching }, { data: enrollments }, { data: vocab }, { data: grammar }] =
    await Promise.all([
      supabase
        .from('classes')
        .select('id, name, language_code')
        .eq('teacher_id', user?.id)
        .is('deleted_at', null),
      supabase
        .from('enrollments')
        .select('classes(id, name, language_code)')
        .eq('student_id', user?.id)
        .eq('status', 'active'),
      supabase
        .from('vocabulary_notes')
        .select('*, classes(name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(0, PAGE - 1),
      supabase
        .from('grammar_notes')
        .select('*, classes(name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(0, PAGE - 1),
    ]);

  const classMap = new Map<string, { id: string; name: string; language_code: string }>();
  for (const c of teaching ?? []) classMap.set(c.id, c as any);
  for (const e of enrollments ?? []) {
    const c = (e as any).classes;
    if (c) classMap.set(c.id, c);
  }

  return (
    <div className="container-page max-w-3xl py-8">
      <PageHeader
        back={{ href: '/profile', label: 'Trang cá nhân' }}
        eyebrow="Sổ tay"
        title="Từ vựng và ngữ pháp"
      />
      <Notebook
        classes={[...classMap.values()]}
        initialVocab={vocab ?? []}
        initialGrammar={grammar ?? []}
        pageSize={PAGE}
      />
    </div>
  );
}
