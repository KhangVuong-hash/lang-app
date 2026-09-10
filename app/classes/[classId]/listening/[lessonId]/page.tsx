import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getClassAccess } from '@/lib/access';
import YouTubeScriptPlayer from '@/components/YouTubeScriptPlayer';
import ScriptManager from '@/components/ScriptManager';
import DeleteResource from '@/components/DeleteResource';
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
    .is('deleted_at', null)
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
        eyebrow="🎧 Kỹ năng Nghe"
        title={lesson.title}
      >
        <Link
          href={`/classes/${params.classId}/listening/${params.lessonId}/edit`}
          className="btn-secondary btn-sm"
        >
          Sửa thông tin
        </Link>
      </PageHeader>

      <YouTubeScriptPlayer videoId={lesson.youtube_video_id} segments={segments ?? []} />

      <p className="mt-3 text-xs text-ink-faint">
        Mẹo: bấm <strong>Tua</strong> để nghe lại một câu, bấm <strong>Lặp</strong> để tự động
        lặp câu đó tới khi bạn tắt.
      </p>

      <ScriptManager
        table="listening_script_segments"
        lessonId={params.lessonId}
        initialSegments={(segments ?? []) as any}
      />

      {lesson.created_by === access.userId && (
        <div className="mt-6">
          <DeleteResource
            table="listening_lessons"
            id={params.lessonId}
            redirectTo={`/classes/${params.classId}/listening`}
            label="Xoá bài nghe này"
            question="Xoá bài nghe này? Dữ liệu vẫn lưu lại nhưng không còn hiển thị."
          />
        </div>
      )}
    </div>
  );
}
