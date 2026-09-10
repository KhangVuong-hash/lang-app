import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getClassAccess } from '@/lib/access';
import ClassEditForm from './ClassEditForm';

export default async function EditClassPage({ params }: { params: { classId: string } }) {
  const access = await getClassAccess(params.classId);
  if (!access?.canManage) notFound();

  const supabase = createClient();
  const { data: languages } = await supabase
    .from('languages')
    .select('code, name')
    .order('name', { ascending: true });

  return <ClassEditForm klass={access.klass} languages={languages ?? []} />;
}
