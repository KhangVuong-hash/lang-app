'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { extractYoutubeId } from '@/lib/youtube';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';

export default function LessonInfoForm({
  table,
  urlField,
  lesson,
  backHref,
  heading,
}: {
  table: 'listening_lessons' | 'speaking_lessons';
  urlField: 'youtube_url' | 'source_url';
  lesson: any;
  backHref: string;
  heading: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(lesson.title ?? '');
  const [url, setUrl] = useState(lesson[urlField] ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề bài học.');
      return;
    }
    const vid = extractYoutubeId(url) ?? lesson.youtube_video_id;
    if (!vid) {
      setError('URL YouTube không hợp lệ.');
      return;
    }
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from(table)
      .update({ title: title.trim(), [urlField]: url.trim(), youtube_video_id: vid })
      .eq('id', lesson.id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
    router.push(`${backHref}/${lesson.id}`);
  }

  return (
    <div className="container-page max-w-xl py-8">
      <PageHeader back={{ href: `${backHref}/${lesson.id}`, label: 'Bài học' }} title={heading} />

      <form onSubmit={handleSubmit} className="card space-y-4 p-5">
        <div>
          <label className="field-label">
            Tiêu đề <span className="text-danger">*</span>
          </label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label className="field-label">URL YouTube</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="input"
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <p className="mt-1 text-xs text-ink-faint">
            Đổi video sẽ không tự cập nhật script — sửa lại script bên trang bài học nếu cần.
          </p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <button disabled={saving} className="btn-primary">
            {saving && <Spinner />}
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
          <a href={`${backHref}/${lesson.id}`} className="btn-secondary">
            Huỷ
          </a>
        </div>
      </form>
    </div>
  );
}
