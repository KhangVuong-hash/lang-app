'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { parseTranscript, type ParsedSegment } from '@/lib/transcript';

type Seg = ParsedSegment;

export default function ScriptManager({
  table,
  lessonId,
  initialSegments,
}: {
  table: 'listening_script_segments' | 'speaking_script_segments';
  lessonId: string;
  initialSegments: Seg[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [segments, setSegments] = useState<Seg[]>(
    initialSegments.map((s, i) => ({ ...s, order_index: i }))
  );
  const [paste, setPaste] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function reindex(list: Seg[]) {
    return list.map((s, i) => ({ ...s, order_index: i }));
  }

  function applyPaste(mode: 'replace' | 'append') {
    const parsed = parseTranscript(paste);
    if (parsed.length === 0) {
      setMsg('Không nhận ra nội dung để tách.');
      return;
    }
    setSegments((prev) => reindex(mode === 'replace' ? parsed : [...prev, ...parsed]));
    setPaste('');
    setMsg(`Đã tách ${parsed.length} câu.`);
  }

  function update(idx: number, patch: Partial<Seg>) {
    setSegments((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function remove(idx: number) {
    setSegments((prev) => reindex(prev.filter((_, i) => i !== idx)));
  }

  function addRow() {
    setSegments((prev) => {
      const last = prev[prev.length - 1];
      const start = last ? Number(last.end_seconds) : 0;
      return reindex([
        ...prev,
        { order_index: prev.length, start_seconds: start, end_seconds: start + 3, text_content: '' },
      ]);
    });
  }

  async function save() {
    setSaving(true);
    setMsg(null);

    const { error: delErr } = await supabase.from(table).delete().eq('lesson_id', lessonId);
    if (delErr) {
      setSaving(false);
      setMsg(`Lỗi: ${delErr.message}`);
      return;
    }

    const rows = segments
      .filter((s) => s.text_content.trim())
      .map((s, i) => ({
        lesson_id: lessonId,
        order_index: i,
        start_seconds: Number(s.start_seconds) || 0,
        end_seconds: Number(s.end_seconds) || Number(s.start_seconds) + 3 || 3,
        text_content: s.text_content.trim(),
      }));

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from(table).insert(rows);
      if (insErr) {
        setSaving(false);
        setMsg(`Lỗi: ${insErr.message}`);
        return;
      }
    }

    setSaving(false);
    setMsg('Đã lưu script.');
    router.refresh();
  }

  return (
    <div className="card mt-6 p-5">
      <h2 className="font-display text-lg font-semibold">Sửa script ({segments.length} câu)</h2>

      <div className="mt-3 rounded-lg bg-paper p-3">
        <label className="field-label">Dán transcript từ YouTube</label>
        <p className="mb-2 text-xs text-ink-soft">
          Dưới video YouTube bấm <strong>…</strong> → <strong>Hiển thị bản chép lời</strong>,
          chọn hết, sao chép rồi dán vào đây. Không có timestamp cũng được — hệ thống sẽ tách
          theo câu.
        </p>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={5}
          className="textarea"
          placeholder={'0:03\nyou could say I have to deal with a\n0:07\nlot of problems at work'}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyPaste('replace')}
            disabled={!paste.trim()}
            className="btn-primary btn-sm"
          >
            Tách &amp; thay toàn bộ
          </button>
          <button
            type="button"
            onClick={() => applyPaste('append')}
            disabled={!paste.trim()}
            className="btn-secondary btn-sm"
          >
            Tách &amp; thêm vào cuối
          </button>
        </div>
      </div>

      <div className="mt-4 max-h-[26rem] space-y-2 overflow-y-auto">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-start gap-2 rounded-lg border border-line p-2">
            <div className="flex w-24 shrink-0 flex-col gap-1">
              <input
                type="number"
                step="0.1"
                value={seg.start_seconds}
                onChange={(e) => update(idx, { start_seconds: Number(e.target.value) })}
                className="rounded border border-line bg-surface px-1 py-0.5 text-xs"
                title="Bắt đầu (giây)"
              />
              <input
                type="number"
                step="0.1"
                value={seg.end_seconds}
                onChange={(e) => update(idx, { end_seconds: Number(e.target.value) })}
                className="rounded border border-line bg-surface px-1 py-0.5 text-xs"
                title="Kết thúc (giây)"
              />
            </div>
            <textarea
              value={seg.text_content}
              onChange={(e) => update(idx, { text_content: e.target.value })}
              rows={2}
              className="textarea flex-1 resize-none"
            />
            <button
              type="button"
              onClick={() => remove(idx)}
              className="shrink-0 rounded-md border border-line px-2 py-1 text-xs text-danger hover:bg-danger/10"
            >
              Xoá
            </button>
          </div>
        ))}
        {segments.length === 0 && (
          <p className="py-4 text-center text-sm text-ink-faint">
            Chưa có câu nào. Dán transcript ở trên hoặc thêm dòng thủ công.
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={addRow} className="btn-secondary btn-sm">
          + Thêm dòng
        </button>
        <button type="button" onClick={save} disabled={saving} className="btn-primary btn-sm">
          {saving ? 'Đang lưu…' : 'Lưu script'}
        </button>
        {msg && <span className="text-xs text-ink-soft">{msg}</span>}
      </div>
    </div>
  );
}
