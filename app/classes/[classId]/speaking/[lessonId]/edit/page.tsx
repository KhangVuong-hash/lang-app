import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getClassAccess } from '@/lib/access';
import LessonInfoForm from '@/components/LessonInfoForm';

export default async function EditLessonPage({
  params,
}: {
  params: { classId: string; lessonId: string };
}) {
  const access = await getClassAccess(params.classId);
  if (!access?.canView) notFound();

  const supabase = createClient();
  const { data: lesson } = await supabase
    .from('speaking_lessons')
    .select('*')
    .eq('id', params.lessonId)
    .is('deleted_at', null)
    .single();
  if (!lesson) notFound();

  return (
    <LessonInfoForm
      table="speaking_lessons"
      urlField="source_url"
      lesson={lesson}
      backHref={`/classes/${params.classId}/speaking`}
      heading="Sửa thông tin bài shadowing"
    />
  );
}
