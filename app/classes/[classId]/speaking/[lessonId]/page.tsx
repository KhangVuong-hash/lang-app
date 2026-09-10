import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getClassAccess } from '@/lib/access';
import ShadowingPlayer from '@/components/ShadowingPlayer';
import ScriptManager from '@/components/ScriptManager';
import DeleteResource from '@/components/DeleteResource';
import PageHeader from '@/components/ui/PageHeader';

export default async function SpeakingLessonPage({
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

  const { data: segments } = await supabase
    .from('speaking_script_segments')
    .select('*')
    .eq('lesson_id', params.lessonId)
    .order('order_index', { ascending: true });

  const canRecord = access.isEnrolled && !access.canManage;

  return (
    <div className="container-page max-w-6xl py-8">
      <PageHeader
        back={{ href: `/classes/${params.classId}/speaking`, label: 'Bài shadowing' }}
        eyebrow={access.canManage ? '🗣️ Kỹ năng Nói · Xem trước' : '🗣️ Kỹ năng Nói'}
        title={lesson.title}
      />
      <ShadowingPlayer
        videoId={lesson.youtube_video_id}
        segments={(segments ?? []) as any}
        showRecorder={canRecord}
      />
      {access.canManage && (
        <>
          <ScriptManager
            table="speaking_script_segments"
            lessonId={params.lessonId}
            initialSegments={(segments ?? []) as any}
          />
          {lesson.created_by === access.userId && (
            <div className="mt-6">
              <DeleteResource
                table="speaking_lessons"
                id={params.lessonId}
                redirectTo={`/classes/${params.classId}/speaking`}
                label="Xoá bài shadowing này"
                question="Xoá bài shadowing này? Dữ liệu vẫn lưu lại nhưng không còn hiển thị."
              />
            </div>
          )}
        </>
      )}
      {canRecord && (
        <p className="mt-4 text-xs text-ink-faint">
          Nghe từng câu, bấm <strong>Ghi âm</strong> để thu lại giọng đọc theo (shadowing) rồi
          so sánh với bản gốc.
        </p>
      )}
    </div>
  );
}
