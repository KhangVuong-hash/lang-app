'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { ScriptSegment } from '@/components/YouTubeScriptPlayer';
import { extractYoutubeId } from '@/lib/youtube';
import { parseTranscript } from '@/lib/transcript';
import Spinner from '@/components/ui/Spinner';
import LoadingOverlay from '@/components/ui/LoadingOverlay';

export default function NewSpeakingLessonPage() {
  const { classId } = useParams<{ classId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [lang, setLang] = useState('');
  const [segments, setSegments] = useState<ScriptSegment[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchTranscript() {
    setError(null);
    setFetching(true);
    setSegments([]);
    try {
      const res = await fetch('/api/youtube/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl, lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Lỗi không xác định');
        setVideoId(extractYoutubeId(youtubeUrl));
        return;
      }
      setVideoId(data.videoId);
      setSegments(data.segments);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setFetching(false);
    }
  }

  function updateSegmentText(idx: number, text: string) {
    setSegments((prev) => prev.map((s, i) => (i === idx ? { ...s, text_content: text } : s)));
  }

  function applyPaste() {
    const parsed = parseTranscript(pasteText);
    if (!parsed.length) {
      setError('Không nhận ra nội dung transcript để tách.');
      return;
    }
    setSegments(parsed);
    setPasteText('');
    setError(null);
  }

  async function handleSave() {
    const vid = videoId ?? extractYoutubeId(youtubeUrl);
    if (!vid || !title.trim()) {
      setError('Cần có tiêu đề và URL YouTube hợp lệ.');
      return;
    }
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: lesson, error: lessonErr } = await supabase
      .from('speaking_lessons')
      .insert({
        class_id: classId,
        title,
        source_url: youtubeUrl,
        source_type: 'youtube',
        youtube_video_id: vid,
        created_by: user?.id,
      })
      .select()
      .single();

    if (lessonErr || !lesson) {
      setError(lessonErr?.message ?? 'Không thể tạo bài học');
      setSaving(false);
      return;
    }

    if (segments.length > 0) {
      const rows = segments.map((s, i) => ({
        lesson_id: lesson.id,
        order_index: i,
        start_seconds: s.start_seconds,
        end_seconds: s.end_seconds,
        text_content: s.text_content,
      }));
      await supabase.from('speaking_script_segments').insert(rows);
    }

    setSaving(false);
    router.push(`/classes/${classId}/speaking/${lesson.id}`);
  }

  return (
    <div className="container-page max-w-4xl space-y-6 py-8">
      {fetching && <LoadingOverlay label="Đang lấy script từ video…" />}
      <h1 className="text-2xl font-bold sm:text-3xl">Tạo bài shadowing mới</h1>

      <div className="card space-y-3 p-5">
        <div>
          <label className="field-label">Tiêu đề</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="field-label">URL YouTube</label>
          <div className="flex gap-2">
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="input flex-1"
            />
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="select w-auto">
              <option value="">Auto</option>
              <option value="en">EN</option>
              <option value="ja">JA</option>
              <option value="ko">KO</option>
              <option value="zh-Hans">ZH</option>
              <option value="vi">VI</option>
            </select>
            <button
              onClick={fetchTranscript}
              disabled={!youtubeUrl || fetching}
              className="btn-primary shrink-0"
            >
              {fetching && <Spinner />}
              {fetching ? 'Đang lấy…' : 'Lấy script tự động'}
            </button>
          </div>
        </div>
        {error && <p className="rounded-lg bg-danger/10 p-2 text-sm text-danger">{error}</p>}
      </div>

      <div className="card p-5">
        <h2 className="mb-2 font-display font-semibold">Script ({segments.length} câu)</h2>

        <div className="mb-4 rounded-lg bg-paper p-3">
          <label className="field-label">Dán transcript từ YouTube</label>
          <p className="mb-2 text-xs text-ink-soft">
            Dưới video bấm <strong>…</strong> → <strong>Hiển thị bản chép lời</strong>, sao
            chép rồi dán vào đây (không có timestamp cũng được).
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={4}
            className="textarea"
            placeholder={'0:03\nyou could say I have to deal with a\n0:07\nlot of problems at work'}
          />
          <button
            type="button"
            onClick={applyPaste}
            disabled={!pasteText.trim()}
            className="btn-secondary btn-sm mt-2"
          >
            Tách thành câu
          </button>
        </div>

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {segments.map((seg, idx) => (
            <div key={idx} className="flex items-start gap-2 rounded-lg border border-line p-2 text-sm">
              <span className="mt-1 w-12 shrink-0 text-xs text-ink-faint">{seg.start_seconds}s</span>
              <textarea
                value={seg.text_content}
                onChange={(e) => updateSegmentText(idx, e.target.value)}
                rows={2}
                className="textarea flex-1 resize-none"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || (!youtubeUrl.trim() || !title.trim())}
        className="btn w-full bg-success text-white hover:opacity-90"
      >
        {saving && <Spinner />}
        {saving ? 'Đang lưu…' : 'Lưu bài học'}
      </button>
    </div>
  );
}
