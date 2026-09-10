import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import DeleteResource from '@/components/DeleteResource';
import ReviewForm from './ReviewForm';
import CommentThread from '@/components/CommentThread';

const STATUS: Record<string, { label: string; cls: string }> = {
  reviewed: { label: 'Đã chấm', cls: 'bg-success/10 text-success' },
  submitted: { label: 'Chờ chấm', cls: 'bg-highlight-soft text-ink' },
  draft: { label: 'Bản nháp', cls: 'bg-ink/5 text-ink-faint' },
};

export default async function TeacherTopicView({
  classId,
  topicId,
  userId,
}: {
  classId: string;
  topicId: string;
  userId: string;
}) {
  const supabase = createClient();

  const { data: topic } = await supabase
    .from('writing_topics')
    .select('*')
    .eq('id', topicId)
    .is('deleted_at', null)
    .single();
  if (!topic) notFound();

  const { data: submissions } = await supabase
    .from('writing_submissions')
    .select('*, profiles(full_name), writing_reviews(*)')
    .eq('topic_id', topicId)
    .order('updated_at', { ascending: false });

  const list = submissions ?? [];

  return (
    <div className="container-page max-w-3xl py-8">
      <PageHeader
        back={{ href: `/classes/${classId}/writing`, label: 'Chủ đề viết' }}
        eyebrow={topic.topic_type === 'essay' ? 'Bài luận' : 'Dịch đoạn văn'}
        title={topic.title}
      >
        <Link
          href={`/classes/${classId}/writing/${topicId}/edit`}
          className="btn-secondary btn-sm"
        >
          Sửa chủ đề
        </Link>
      </PageHeader>

      {topic.prompt && <p className="mb-2 text-sm text-ink-soft">{topic.prompt}</p>}
      {topic.source_text && (
        <p className="mb-4 whitespace-pre-wrap rounded-lg bg-paper p-3 text-sm text-ink-soft">
          {topic.source_text}
        </p>
      )}

      {list.length === 0 ? (
        <EmptyState icon="📝" title="Chưa có học sinh nào nộp bài" />
      ) : (
        <div className="space-y-3">
          {list.map((s: any) => {
            const st = STATUS[s.status] ?? STATUS.draft;
            return (
              <div key={s.id} className="card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold text-ink">{s.profiles?.full_name ?? 'Học sinh'}</p>
                  <span className={`pill ${st.cls}`}>{st.label}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink">{s.content}</p>
                <ReviewForm submissionId={s.id} existingReview={s.writing_reviews?.[0]} />
              </div>
            );
          })}
        </div>
      )}

      <CommentThread
        classId={classId}
        subjectType="writing"
        subjectId={topicId}
        currentUserId={userId}
        canModerate
      />

      {(topic.created_by ?? topic.teacher_id) === userId && (
        <div className="mt-8">
          <DeleteResource
            table="writing_topics"
            id={topicId}
            redirectTo={`/classes/${classId}/writing`}
            label="Xoá chủ đề này"
            question="Xoá chủ đề này? Dữ liệu vẫn lưu lại nhưng không còn hiển thị."
          />
        </div>
      )}
    </div>
  );
}
