'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Images, Pin, Plus, Search, StickyNote, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import RichTextEditor, { RichTextToolbar } from '@/components/ui/RichTextEditor';
import RichText from '@/components/ui/RichText';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '@/components/ui/Spinner';
import ConfirmButton from '@/components/ui/ConfirmButton';
import { cleanHtml, isEmptyHtml } from '@/lib/rich-text';
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_NOTE_IMAGES,
  NOTES_PAGE_SIZE,
  NOTE_COLUMNS,
  removeNoteImages,
  signImages,
  uploadNoteImage,
  validateImage,
  type PersonalNote,
} from '@/lib/personal-notes';

type Urls = Record<string, string>;

/** ghim lên đầu, sau đó ghi chú sửa gần nhất */
function sortNotes(list: PersonalNote[]) {
  return [...list].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at)
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PersonalNotes({
  userId,
  initialNotes,
  initialUrls,
}: {
  userId: string;
  initialNotes: PersonalNote[];
  initialUrls: Urls;
}) {
  const supabase = createClient();
  const [notes, setNotes] = useState(initialNotes);
  const [urls, setUrls] = useState<Urls>(initialUrls);
  const [done, setDone] = useState(initialNotes.length < NOTES_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<{ note?: PersonalNote } | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const addUrls = (more: Urls) => setUrls((u) => ({ ...u, ...more }));

  async function fetchPage(q: string, offset: number) {
    let req = supabase
      .from('personal_notes')
      .select(NOTE_COLUMNS)
      .is('deleted_at', null)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
      .range(offset, offset + NOTES_PAGE_SIZE - 1);
    // bỏ ký tự đặc biệt của cú pháp filter PostgREST / ilike
    const term = q.replace(/[,()"\\%_*]/g, ' ').trim();
    if (term) req = req.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
    const { data } = await req;
    const rows = (data ?? []) as PersonalNote[];
    addUrls(await signImages(supabase, rows.map((n) => n.image_paths[0]).filter(Boolean)));
    return rows;
  }

  // tìm kiếm: debounce 300ms rồi nạp lại từ đầu
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      const rows = await fetchPage(query, 0);
      setNotes(rows);
      setDone(rows.length < NOTES_PAGE_SIZE);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Lazy load: cuộn tới cuối lưới thì nạp thêm NOTES_PAGE_SIZE ghi chú
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || done) return;
    const io = new IntersectionObserver(async (entries) => {
      if (!entries[0].isIntersecting || loading) return;
      setLoading(true);
      const rows = await fetchPage(query, notes.length);
      setNotes((ns) => [...ns, ...rows.filter((r) => !ns.some((n) => n.id === r.id))]);
      setDone(rows.length < NOTES_PAGE_SIZE);
      setLoading(false);
    });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.length, done, loading, query]);

  function onSaved(note: PersonalNote) {
    setNotes((ns) => sortNotes([note, ...ns.filter((n) => n.id !== note.id)]));
    setDialog(null);
  }

  function onDeleted(id: string) {
    setNotes((ns) => ns.filter((n) => n.id !== id));
    setDialog(null);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm trong ghi chú…"
            className="input pl-9"
            aria-label="Tìm ghi chú"
          />
        </div>
        <button onClick={() => setDialog({})} className="btn-primary h-10">
          <Plus className="h-4 w-4" />
          Ghi chú mới
        </button>
      </div>

      {notes.length === 0 && !loading ? (
        query ? (
          <p className="py-10 text-center text-sm text-ink-faint">
            Không có ghi chú nào khớp “{query}”.
          </p>
        ) : (
          <EmptyState
            icon={StickyNote}
            title="Chưa có ghi chú nào"
            hint="Ghi lại bất cứ điều gì cần nhớ - mẹo học, lịch thi, ảnh chụp bảng, tài liệu…"
          >
            <button onClick={() => setDialog({})} className="btn-primary mt-2">
              <Plus className="h-4 w-4" />
              Ghi chú mới
            </button>
          </EmptyState>
        )
      ) : (
        <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              cover={urls[n.image_paths[0]]}
              onOpen={() => setDialog({ note: n })}
            />
          ))}
        </div>
      )}

      {!done && (
        <div ref={sentinelRef} className="flex h-12 items-center justify-center text-ink-faint">
          {loading && <Spinner />}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="mb-3 pr-8 font-display text-lg font-semibold text-ink">
            {dialog?.note ? 'Sửa ghi chú' : 'Ghi chú mới'}
          </DialogTitle>
          {dialog && (
            <NoteEditor
              key={dialog.note?.id ?? 'new'}
              userId={userId}
              note={dialog.note}
              urls={urls}
              onUrls={addUrls}
              onSaved={onSaved}
              onDeleted={onDeleted}
              onCancel={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NoteCard({
  note,
  cover,
  onOpen,
}: {
  note: PersonalNote;
  cover?: string;
  onOpen: () => void;
}) {
  const count = note.image_paths.length;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="card card-hover block w-full overflow-hidden text-left"
    >
      {count > 0 && (
        <div className="relative aspect-[16/9] bg-paper">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
          )}
          {count > 1 && (
            <span className="pill absolute bottom-2 right-2 bg-ink/70 text-white">
              <Images className="h-3 w-3" />
              {count}
            </span>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className={`font-semibold ${note.title ? 'text-ink' : 'text-ink-faint'}`}>
            {note.title || 'Không tiêu đề'}
          </p>
          {note.pinned && <Pin className="h-4 w-4 shrink-0 fill-highlight text-ink-soft" />}
        </div>
        {!isEmptyHtml(note.content) && (
          <RichText
            html={note.content ?? ''}
            className="mt-1 line-clamp-6 break-words text-sm text-ink-soft"
          />
        )}
        <p className="mt-3 text-xs text-ink-faint">{formatDateTime(note.updated_at)}</p>
      </div>
    </button>
  );
}

function NoteEditor({
  userId,
  note,
  urls,
  onUrls,
  onSaved,
  onDeleted,
  onCancel,
}: {
  userId: string;
  note?: PersonalNote;
  urls: Urls;
  onUrls: (u: Urls) => void;
  onSaved: (n: PersonalNote) => void;
  onDeleted: (id: string) => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [images, setImages] = useState<string[]>(note?.image_paths ?? []);
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // ảnh upload trong phiên sửa này; đóng mà không lưu thì xoá khỏi bucket
  const uploaded = useRef<string[]>([]);
  const saved = useRef(false);
  // ảnh cũ bị gỡ - chỉ xoá file khi đã lưu
  const removed = useRef<string[]>([]);

  // ghi chú cũ: tải link cho mọi ảnh (danh sách chỉ ký sẵn ảnh bìa)
  useEffect(() => {
    const missing = images.filter((p) => !urls[p]);
    if (missing.length) signImages(supabase, missing).then(onUrls);
    return () => {
      if (!saved.current) removeNoteImages(createClient(), uploaded.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addFiles(files: File[]) {
    if (!files.length) return;
    setError(null);
    // file sai định dạng / quá 2MB bị loại ngay, không upload
    const errors = files.map(validateImage).filter(Boolean) as string[];
    const imgs = files.filter((f) => !validateImage(f));
    if (errors.length) setError(errors.join(' '));
    if (!imgs.length) return;
    const room = MAX_NOTE_IMAGES - images.length;
    if (imgs.length > room) setError(`Mỗi ghi chú tối đa ${MAX_NOTE_IMAGES} ảnh.`);
    const batch = imgs.slice(0, Math.max(0, room));
    setUploading((n) => n + batch.length);
    await Promise.all(
      batch.map(async (f) => {
        try {
          const path = await uploadNoteImage(supabase, userId, f);
          uploaded.current.push(path);
          onUrls(await signImages(supabase, [path]));
          setImages((xs) => [...xs, path]);
        } catch (e: any) {
          setError(
            e.message.startsWith('“') ? e.message : `Không tải được “${f.name}”: ${e.message}`
          );
        } finally {
          setUploading((n) => n - 1);
        }
      })
    );
  }

  function removeImage(path: string) {
    setImages((xs) => xs.filter((p) => p !== path));
    if (uploaded.current.includes(path)) {
      uploaded.current = uploaded.current.filter((p) => p !== path);
      removeNoteImages(supabase, [path]);
    } else {
      removed.current.push(path);
    }
  }

  async function save() {
    setError(null);
    const body = cleanHtml(content);
    if (!title.trim() && !body && images.length === 0) {
      if (!note) return onCancel();
      return setError('Ghi chú đang trống - hãy nhập nội dung hoặc xoá ghi chú.');
    }
    setSaving(true);
    const payload = { title: title.trim() || null, content: body, image_paths: images, pinned };
    const { data, error } = note
      ? await supabase
          .from('personal_notes')
          .update(payload)
          .eq('id', note.id)
          .select(NOTE_COLUMNS)
          .single()
      : await supabase.from('personal_notes').insert(payload).select(NOTE_COLUMNS).single();
    setSaving(false);
    if (error || !data) return setError(error?.message ?? 'Không lưu được ghi chú.');
    saved.current = true;
    removeNoteImages(supabase, removed.current);
    onSaved(data as PersonalNote);
  }

  async function del() {
    const { error } = await supabase
      .from('personal_notes')
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq('id', note!.id);
    if (error) return setError(error.message);
    onDeleted(note!.id);
  }

  return (
    <div
      className="space-y-4"
      // dán ảnh (Ctrl+V) ở bất kỳ đâu trong hộp thoại
      onPaste={(e) => {
        const files = Array.from(e.clipboardData.files);
        if (files.some((f) => f.type.startsWith('image/'))) {
          e.preventDefault();
          addFiles(files);
        }
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Tiêu đề"
        className="input text-base font-semibold"
        aria-label="Tiêu đề"
      />

      <div>
        <RichTextToolbar className="mb-1" />
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Nội dung cần ghi lại…"
          className="[&_[role=textbox]]:min-h-[10rem]"
          tall
        />
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(Array.from(e.dataTransfer.files));
        }}
        className="rounded-lg border border-dashed border-line p-3"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-ink-soft">
            Hình ảnh ({images.length}/{MAX_NOTE_IMAGES})
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={images.length >= MAX_NOTE_IMAGES}
            className="btn-secondary btn-sm"
          >
            <ImagePlus className="h-4 w-4" />
            Thêm ảnh
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            multiple
            hidden
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
        </div>

        {images.length === 0 && uploading === 0 ? (
          <p className="py-3 text-center text-xs text-ink-faint">
            Kéo thả ảnh vào đây, dán ảnh (Ctrl+V) hoặc bấm “Thêm ảnh”. JPG, PNG, WebP - tối đa
            2MB/ảnh.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((p) => (
              <div
                key={p}
                className="group relative aspect-square overflow-hidden rounded-md bg-paper"
              >
                {urls[p] ? (
                  <a href={urls[p]} target="_blank" rel="noreferrer" title="Xem ảnh gốc">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={urls[p]} alt="" className="h-full w-full object-cover" />
                  </a>
                ) : (
                  <div className="grid h-full place-items-center">
                    <Spinner />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(p)}
                  aria-label="Gỡ ảnh"
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-white opacity-100 hover:bg-danger sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {Array.from({ length: uploading }, (_, i) => (
              <div
                key={`up-${i}`}
                className="grid aspect-square place-items-center rounded-md bg-paper text-ink-faint"
              >
                <Spinner />
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button onClick={save} disabled={saving || uploading > 0} className="btn-primary">
            {saving && <Spinner />}
            {uploading > 0 ? 'Đang tải ảnh…' : saving ? 'Đang lưu…' : 'Lưu'}
          </button>
          <button
            type="button"
            onClick={() => setPinned((v) => !v)}
            aria-pressed={pinned}
            className={`btn-ghost btn-sm ${pinned ? 'bg-highlight-soft' : ''}`}
          >
            <Pin className={`h-4 w-4 ${pinned ? 'fill-highlight' : ''}`} />
            {pinned ? 'Đã ghim' : 'Ghim'}
          </button>
        </div>
        {note && (
          <ConfirmButton onConfirm={del} question="Xoá ghi chú này?" confirmLabel="Xoá">
            Xoá ghi chú
          </ConfirmButton>
        )}
      </div>
    </div>
  );
}
