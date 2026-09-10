'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Spinner from '@/components/ui/Spinner';
import RouteLoading from '@/components/ui/RouteLoading';

export default function StudentWriteTopic({
  classId,
  topicId,
}: {
  classId: string;
  topicId: string;
}) {
  const supabase = createClient();

  const [topic, setTopic] = useState<any>(null);
  const [content, setContent] = useState('');
  const [submission, setSubmission] = useState<any>(null);
  const [review, setReview] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from('writing_topics').select('*').eq('id', topicId).single();
      setTopic(t);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: sub } = await supabase
        .from('writing_submissions')
        .select('*, writing_reviews(*)')
        .eq('topic_id', topicId)
        .eq('student_id', user?.id)
        .maybeSingle();

      if (sub) {
        setSubmission(sub);
        setContent(sub.content ?? '');
        setReview(sub.writing_reviews?.[0] ?? null);
      }
    })();
  }, [topicId]); // eslint-disable-line

  async function saveDraft(status: 'draft' | 'submitted') {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('writing_submissions')
      .upsert(
        {
          topic_id: topicId,
          student_id: user?.id,
          content,
          status,
          submitted_at: status === 'submitted' ? new Date().toISOString() : null,
        },
        { onConflict: 'topic_id,student_id' }
      )
      .select()
      .single();

    setSaving(false);
    if (!error) setSubmission(data);
  }

  if (!topic) return <RouteLoading label="Đang tải bài viết…" />;

  return (
    <div className="container-page max-w-2xl py-8">
      <a
        href={`/classes/${classId}/writing`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <span aria-hidden>‹</span> Chủ đề viết
      </a>

      <p className="text-sm font-medium text-ink-faint">
        {topic.topic_type === 'essay' ? 'Bài luận' : 'Dịch đoạn văn'}
      </p>
      <h1 className="text-2xl font-bold sm:text-3xl">{topic.title}</h1>
      {topic.prompt && <p className="mt-2 text-sm text-ink-soft">{topic.prompt}</p>}
      {topic.source_text && (
        <p className="mt-3 whitespace-pre-wrap rounded-lg bg-paper p-3 text-sm text-ink-soft">
          {topic.source_text}
        </p>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={12}
        disabled={submission?.status === 'reviewed'}
        placeholder={topic.topic_type === 'translation' ? 'Nhập bản dịch của bạn…' : 'Viết bài của bạn…'}
        className="textarea mt-4 disabled:bg-paper"
      />

      {submission?.status !== 'reviewed' && (
        <div className="mt-3 flex gap-2">
          <button onClick={() => saveDraft('draft')} disabled={saving} className="btn-secondary">
            Lưu nháp
          </button>
          <button
            onClick={() => saveDraft('submitted')}
            disabled={saving}
            className="btn bg-success text-white hover:opacity-90"
          >
            {saving && <Spinner />}
            Nộp bài
          </button>
        </div>
      )}

      {submission && submission.status !== 'reviewed' && (
        <p className="mt-2 text-xs text-ink-faint">
          Trạng thái: {submission.status === 'submitted' ? 'đã nộp, chờ chấm' : 'bản nháp'}
        </p>
      )}

      {review && (
        <div className="mt-5 rounded-xl border border-highlight-dark/40 bg-highlight-soft/60 p-4">
          <p className="text-sm font-semibold text-ink">Nhận xét của giáo viên</p>
          {review.score != null && <p className="text-sm text-ink-soft">Điểm: {review.score}</p>}
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{review.feedback}</p>
        </div>
      )}
    </div>
  );
}
