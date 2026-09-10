import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getClassAccess } from '@/lib/access';
import YouTubeScriptPlayer from '@/components/YouTubeScriptPlayer';
import PageHeader from '@/components/ui/PageHeader';

export default async function ListeningLessonPage({
  params,
}: {
  params: { classId: string; lessonId: string };
}) {
  const access = await getClassAccess(params.classId);
  if (!access?.canView) notFound();

  const supabase = createClient();
  const { data: lesson } = await supabase
    .from('listening_lessons')
    .select('*')
    .eq('id', params.lessonId)
    .single();
  if (!lesson) notFound();

  const { data: segments } = await supabase
    .from('listening_script_segments')
    .select('*')
    .eq('lesson_id', params.lessonId)
    .order('order_index', { ascending: true });

  return (
    <div className="container-page max-w-6xl py-8">
      <PageHeader
        back={{ href: `/classes/${params.classId}/listening`, label: 'Bài nghe' }}
        eyebrow={access.canManage ? '🎧 Kỹ năng Nghe · Xem trước như học sinh' : '🎧 Kỹ năng Nghe'}
        title={lesson.title}
      />
      <YouTubeScriptPlayer videoId={lesson.youtube_video_id} segments={segments ?? []} />
      {!access.canManage && (
        <p className="mt-4 text-xs text-ink-faint">
          Mẹo: bấm <strong>Tua</strong> để nghe lại một câu, bấm <strong>Lặp</strong> để tự
          động lặp câu đó tới khi bạn tắt.
        </p>
      )}
    </div>
  );
}
