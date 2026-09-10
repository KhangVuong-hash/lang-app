'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ReviewForm({
  submissionId,
  existingReview,
}: {
  submissionId: string;
  existingReview?: { feedback: string; score: number | null };
}) {
  const supabase = createClient();
  const router = useRouter();
  const [feedback, setFeedback] = useState(existingReview?.feedback ?? '');
  const [score, setScore] = useState(existingReview?.score?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from('writing_reviews').upsert(
      {
        submission_id: submissionId,
        teacher_id: user?.id,
        feedback,
        score: score ? Number(score) : null,
      },
      { onConflict: 'submission_id' }
    );

    await supabase.from('writing_submissions').update({ status: 'reviewed' }).eq('id', submissionId);

    setSaving(false);
    router.refresh();
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row">
        <input
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="Điểm"
          className="input sm:w-20"
        />
        <input
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Nhận xét cho học sinh…"
          className="input sm:flex-1"
        />
      </div>
      <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">
        {saving ? 'Đang lưu…' : 'Lưu nhận xét'}
      </button>
    </div>
  );
}
