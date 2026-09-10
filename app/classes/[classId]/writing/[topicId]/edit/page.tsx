import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getClassAccess } from '@/lib/access';
import WritingTopicForm from './WritingTopicForm';

export default async function EditWritingTopicPage({
  params,
}: {
  params: { classId: string; topicId: string };
}) {
  const access = await getClassAccess(params.classId);
  if (!access?.canView) notFound();

  const supabase = createClient();
  const { data: topic } = await supabase
    .from('writing_topics')
    .select('*')
    .eq('id', params.topicId)
    .is('deleted_at', null)
    .single();
  if (!topic) notFound();

  return <WritingTopicForm classId={params.classId} topic={topic} />;
}
