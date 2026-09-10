'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';

export default function WritingTopicForm({
  classId,
  topic,
}: {
  classId: string;
  topic: any;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [topicType, setTopicType] = useState<'essay' | 'translation'>(topic.topic_type);
  const [title, setTitle] = useState(topic.title ?? '');
  const [prompt, setPrompt] = useState(topic.prompt ?? '');
  const [sourceText, setSourceText] = useState(topic.source_text ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề.');
      return;
    }
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from('writing_topics')
      .update({
        topic_type: topicType,
        title: title.trim(),
        prompt: topicType === 'essay' ? prompt.trim() || null : null,
        source_text: topicType === 'translation' ? sourceText.trim() || null : null,
      })
      .eq('id', topic.id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
    router.push(`/classes/${classId}/writing/${topic.id}`);
  }

  return (
    <div className="container-page max-w-2xl py-8">
      <PageHeader
        back={{ href: `/classes/${classId}/writing/${topic.id}`, label: 'Chủ đề viết' }}
        title="Sửa chủ đề viết"
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
          <label className="field-label">
            Tiêu đề <span className="text-danger">*</span>
          </label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </div>

        {topicType === 'essay' ? (
          <div>
            <label className="field-label">Đề bài / chủ đề</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="textarea"
            />
          </div>
        ) : (
          <div>
            <label className="field-label">Đoạn văn cần dịch</label>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={6}
              className="textarea"
            />
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <button disabled={saving} className="btn-primary">
            {saving && <Spinner />}
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
          <a href={`/classes/${classId}/writing/${topic.id}`} className="btn-secondary">
            Huỷ
          </a>
        </div>
      </form>
    </div>
  );
}
