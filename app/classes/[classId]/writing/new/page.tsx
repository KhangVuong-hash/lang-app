'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PageHeader from '@/components/ui/PageHeader';

export default function NewWritingTopicPage() {
  const { classId } = useParams<{ classId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [topicType, setTopicType] = useState<'essay' | 'translation'>('essay');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('writing_topics')
      .insert({
        class_id: classId,
        teacher_id: user?.id,
        topic_type: topicType,
        title,
        prompt: topicType === 'essay' ? prompt : null,
        source_text: topicType === 'translation' ? sourceText : null,
      })
      .select()
      .single();

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/classes/${classId}/writing/${data.id}`);
  }

  return (
    <div className="container-page max-w-2xl py-8">
      <PageHeader
        back={{ href: `/classes/${classId}/writing`, label: 'Chủ đề viết' }}
        title="Tạo chủ đề viết"
      />

      <form onSubmit={handleSubmit} className="card space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          {(['essay', 'translation'] as const).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTopicType(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                topicType === t ? 'bg-brand text-white' : 'bg-paper text-ink-soft'
              }`}
            >
              {t === 'essay' ? 'Bài luận theo chủ đề' : 'Dịch đoạn văn'}
            </button>
          ))}
        </div>

        <div>
          <label className="field-label">Tiêu đề</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </div>

        {topicType === 'essay' ? (
          <div>
            <label className="field-label">Đề bài / chủ đề</label>
            <textarea
              required
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="textarea"
              placeholder="VD: Viết đoạn văn 150 từ mô tả về gia đình bạn…"
            />
          </div>
        ) : (
          <div>
            <label className="field-label">Đoạn văn cần dịch</label>
            <textarea
              required
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={6}
              className="textarea"
              placeholder="Dán đoạn văn gốc học sinh cần dịch…"
            />
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <button disabled={saving} className="btn-primary w-full">
          {saving ? 'Đang lưu…' : 'Tạo chủ đề'}
        </button>
      </form>
    </div>
  );
}
