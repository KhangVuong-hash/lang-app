'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { ScriptSegment } from '@/components/YouTubeScriptPlayer';
import { extractYoutubeId } from '@/lib/youtube';
import { parseTranscript } from '@/lib/transcript';
import Spinner from '@/components/ui/Spinner';
import LoadingOverlay from '@/components/ui/LoadingOverlay';

export default function NewListeningLessonPage() {
  const { classId } = useParams<{ classId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
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
        body: JSON.stringify({ youtubeUrl }),
      });
      const raw = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(raw);
      } catch {
        data = { error: 'Máy chủ gặp lỗi hoặc quá thời gian khi lấy script.' };
      }
      if (!res.ok || !data.segments) {
        setError(
          (data.error || `Lỗi ${res.status}`) + (data.detail ? ` — ${data.detail}` : '')
        );
        setVideoId(extractYoutubeId(youtubeUrl));
        return;
      }
      setVideoId(data.videoId);
      setSegments(data.segments);
    } catch (e: any) {
      setError('Không lấy được script: ' + (e?.message ?? e) + '. Hãy dán transcript thủ công.');
    } finally {
      setFetching(false);
    }
  }

  function updateSegmentText(idx: number, text: string) {
    setSegments((prev) => prev.map((s, i) => (i === idx ? { ...s, text_content: text } : s)));
  }

  function removeSegment(idx: number) {
    setSegments((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order_index: i })));
  }

  function addManualSegment() {
    setSegments((prev) => [
      ...prev,
      { order_index: prev.length, start_seconds: 0, end_seconds: 3, text_content: '' },
    ]);
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
    if (!vid) {
      setError('URL YouTube không hợp lệ.');
      return;
    }
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề bài học.');
      return;
    }
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: lesson, error: lessonErr } = await supabase
      .from('listening_lessons')
      .insert({
        class_id: classId,
        title,
        youtube_url: youtubeUrl,
        youtube_video_id: vid,
        transcript_source: segments.length ? 'auto' : 'manual',
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
      const { error: segErr } = await supabase.from('listening_script_segments').insert(rows);
      if (segErr) {
        setError(segErr.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    router.refresh();
    router.push(`/classes/${classId}/listening/${lesson.id}`);
  }

  return (
    <div className="container-page max-w-4xl space-y-6 py-8">
      {fetching && <LoadingOverlay label="Đang lấy script từ video…" />}
      <h1 className="text-2xl font-bold sm:text-3xl">Tạo bài nghe mới</h1>

      <div className="card space-y-3 p-5">
        <div>
          <label className="field-label">Tiêu đề bài học <span className="text-danger">*</span></label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Bài 1 - Giới thiệu bản thân"
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
            <button
              onClick={fetchTranscript}
              disabled={!youtubeUrl || fetching}
              className="btn-primary shrink-0"
            >
              {fetching && <Spinner />}
              {fetching ? 'Đang lấy…' : 'Lấy script tự động'}
            </button>
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            Tự động lấy script từ phụ đề của video. Nếu video không có phụ đề, dán transcript từ YouTube hoặc tự thêm dòng bên dưới.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-danger/10 p-2 text-sm text-danger">{error}</p>
        )}
      </div>

      {videoId && (
        <div className="aspect-video w-full max-w-md overflow-hidden rounded-xl border border-line bg-black">
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt="thumbnail"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display font-semibold">Script ({segments.length} câu)</h2>
          <button onClick={addManualSegment} className="text-sm font-medium text-brand hover:underline">
            + Thêm dòng thủ công
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-paper p-3">
          <label className="field-label">Hoặc dán transcript từ YouTube</label>
          <p className="mb-2 text-xs text-ink-soft">
            Dưới video bấm <strong>…</strong> → <strong>Hiển thị bản chép lời</strong>, chọn
            hết, sao chép rồi dán vào đây (không có timestamp cũng được).
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
            <div key={idx} className="flex items-start gap-2 rounded-lg border border-line p-2">
              <div className="flex w-28 shrink-0 flex-col gap-1 text-xs">
                <input
                  type="number"
                  step="0.1"
                  value={seg.start_seconds}
                  onChange={(e) =>
                    setSegments((prev) =>
                      prev.map((s, i) => (i === idx ? { ...s, start_seconds: Number(e.target.value) } : s))
                    )
                  }
                  className="rounded border border-line bg-surface px-1 py-0.5"
                  title="Bắt đầu (giây)"
                />
                <input
                  type="number"
                  step="0.1"
                  value={seg.end_seconds}
                  onChange={(e) =>
                    setSegments((prev) =>
                      prev.map((s, i) => (i === idx ? { ...s, end_seconds: Number(e.target.value) } : s))
                    )
                  }
                  className="rounded border border-line bg-surface px-1 py-0.5"
                  title="Kết thúc (giây)"
                />
              </div>
              <textarea
                value={seg.text_content}
                onChange={(e) => updateSegmentText(idx, e.target.value)}
                rows={2}
                className="textarea flex-1 resize-none"
              />
              <button
                onClick={() => removeSegment(idx)}
                className="shrink-0 rounded-md border border-line px-2 py-1 text-xs text-danger hover:bg-danger/10"
              >
                Xoá
              </button>
            </div>
          ))}
          {segments.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-faint">
              Chưa có script. Bấm "Lấy script tự động" hoặc thêm dòng thủ công.
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !youtubeUrl.trim() || !title.trim()}
        className="btn w-full bg-success text-white hover:opacity-90"
      >
        {saving && <Spinner />}
        {saving ? 'Đang lưu…' : 'Lưu bài học'}
      </button>
    </div>
  );
}
