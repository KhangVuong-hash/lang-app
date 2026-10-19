'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Spinner from '@/components/ui/Spinner';

// Ô soạn bài + lưu nháp/nộp bài của chính người đang đăng nhập.
// selfStudy: người ra đề tự làm bài - không khoá khi đã chấm, không hiện "chờ chấm".
export default function WritingEditor({
  topicId,
  topicType,
  userId,
  selfStudy = false,
}: {
  topicId: string;
  topicType: string;
  userId: string;
  selfStudy?: boolean;
}) {
  const supabase = createClient();

  const [content, setContent] = useState('');
  const [submission, setSubmission] = useState<any>(null);
  const [review, setReview] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sub } = await supabase
        .from('writing_submissions')
        .select('*, writing_reviews(*)')
        .eq('topic_id', topicId)
        .eq('student_id', userId)
        .maybeSingle();

      if (sub) {
        setSubmission(sub);
        setContent(sub.content ?? '');
        setReview(sub.writing_reviews?.[0] ?? null);
      }
    })();
  }, [topicId, userId]); // eslint-disable-line

  async function save(status: 'draft' | 'submitted') {
    setSaving(true);
    const { data, error } = await supabase
      .from('writing_submissions')
      .upsert(
        {
          topic_id: topicId,
          student_id: userId,
          content,
          status,
          submitted_at: status === 'submitted' ? new Date().toISOString() : null,
        },
        { onConflict: 'topic_id,student_id' }
      )
      .select()
      .single();

    setSaving(false);
    if (!error) {
      setSubmission(data);
      setSavedAt(new Date());
    }
  }

  const locked = !selfStudy && submission?.status === 'reviewed';

  return (
    <>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={12}
        disabled={locked}
        placeholder={topicType === 'translation' ? 'Nhập bản dịch của bạn…' : 'Viết bài của bạn…'}
        className="textarea mt-4 disabled:bg-paper"
      />

      {!locked && (
        <div className="mt-3 flex gap-2">
          <button onClick={() => save('draft')} disabled={saving} className="btn-secondary">
            Lưu nháp
          </button>
          <button
            onClick={() => save('submitted')}
            disabled={saving}
            className="btn bg-success text-white hover:opacity-90"
          >
            {saving && <Spinner />}
            Nộp bài
          </button>
        </div>
      )}

      {submission && !locked && (
        <p className="mt-2 text-xs text-ink-faint">
          Trạng thái:{' '}
          {submission.status === 'draft'
            ? 'bản nháp'
            : selfStudy
              ? 'đã nộp'
              : 'đã nộp, chờ chấm'}
          {savedAt && ` · đã lưu lúc ${savedAt.toLocaleTimeString('vi-VN')}`}
        </p>
      )}

      {review && !selfStudy && (
        <div className="mt-5 rounded-xl border border-highlight-dark/40 bg-highlight-soft/60 p-4">
          <p className="text-sm font-semibold text-ink">Nhận xét của giáo viên</p>
          {review.score != null && <p className="text-sm text-ink-soft">Điểm: {review.score}</p>}
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{review.feedback}</p>
        </div>
      )}
    </>
  );
}
