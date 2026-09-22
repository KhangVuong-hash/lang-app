'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BookMarked, Plus, SpellCheck } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import ConfirmButton from '@/components/ui/ConfirmButton';
import SimpleSelect from '@/components/ui/SimpleSelect';
import RichText from '@/components/ui/RichText';
import RichTextEditor, { RichTextToolbar } from '@/components/ui/RichTextEditor';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cleanHtml, isEmptyHtml, sanitizeHtml } from '@/lib/rich-text';
import { PARTS_OF_SPEECH, POS_MAP } from '@/lib/constants';

type Cls = { id: string; name: string; language_code: string };
type Kind = 'vocab' | 'grammar';
// name / desc / example / synonyms là HTML (xem lib/rich-text.ts)
type Draft = {
  name: string;
  desc: string;
  example: string;
  synonyms: string;
  classId: string;
  pos: string; // chỉ dùng cho từ vựng
};
type DialogState = { mode: 'view' | 'edit'; item: any } | { mode: 'create'; item?: undefined };

const EMPTY_DRAFT: Draft = { name: '', desc: '', example: '', synonyms: '', classId: '', pos: '' };

const CFG = {
  vocab: {
    table: 'vocabulary_notes',
    name: 'term',
    desc: 'meaning',
    nameCol: 'Từ',
    namePh: 'Từ mới',
    descPh: 'Nghĩa',
    synPh: 'Từ đồng nghĩa',
    hasPos: true,
    Icon: BookMarked,
    label: 'Từ vựng',
  },
  grammar: {
    table: 'grammar_notes',
    name: 'title',
    desc: 'explanation',
    nameCol: 'Điểm ngữ pháp',
    namePh: 'Điểm ngữ pháp',
    descPh: 'Giải thích',
    synPh: 'Ngữ pháp đồng nghĩa',
    hasPos: false,
    Icon: SpellCheck,
    label: 'Ngữ pháp',
  },
} as const;

const ALL = '';
const NONE = '__none__';

function PosPill({ value, className }: { value?: string | null; className?: string }) {
  const pos = value ? POS_MAP[value] : null;
  if (!pos) return null;
  return (
    <span className={`pill bg-brand/10 text-brand ${className ?? ''}`} title={pos.label}>
      {pos.abbr}
    </span>
  );
}

// Form thêm / sửa trong dialog: thanh định dạng, các ô nhập, nút lưu.
function NoteForm({
  cfg,
  value,
  onChange,
  classes,
  saving,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  cfg: (typeof CFG)[Kind];
  value: Draft;
  onChange: (d: Draft) => void;
  classes: Cls[];
  saving: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const set = (k: keyof Draft) => (v: string) => onChange({ ...value, [k]: v });

  // vào form là gõ được ngay
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[contenteditable]')?.focus();
  }, []);

  return (
    <div ref={ref}>
      <RichTextToolbar className="mb-2" />
      <div className="grid gap-2 sm:grid-cols-2">
        <RichTextEditor value={value.name} onChange={set('name')} placeholder={cfg.namePh} />
        <RichTextEditor value={value.desc} onChange={set('desc')} placeholder={cfg.descPh} />
        <RichTextEditor
          value={value.example}
          onChange={set('example')}
          placeholder="Câu ví dụ"
          tall
          className="sm:col-span-2"
        />
        <RichTextEditor
          value={value.synonyms}
          onChange={set('synonyms')}
          placeholder={cfg.synPh}
          className="sm:col-span-2"
        />
        <SimpleSelect
          value={value.classId}
          onChange={set('classId')}
          aria-label="Gắn lớp"
          options={[
            { value: '', label: 'Không gắn lớp' },
            ...classes.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        {cfg.hasPos && (
          <SimpleSelect
            value={value.pos}
            onChange={set('pos')}
            aria-label="Từ loại"
            options={[
              { value: '', label: 'Chưa chọn từ loại' },
              ...PARTS_OF_SPEECH.map((p) => ({ value: p.value, label: p.label })),
            ]}
          />
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost btn-sm">
          Huỷ
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isEmptyHtml(value.name) || saving}
          className="btn-primary btn-sm"
        >
          {saving && <Spinner />}
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function Section({ label, html }: { label: string; html?: string | null }) {
  if (isEmptyHtml(html)) return null;
  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-ink-faint">{label}</p>
      <RichText html={html!} className="mt-0.5 text-sm text-ink" />
    </div>
  );
}

export default function Notebook({
  classes,
  initialVocab,
  initialGrammar,
  pageSize,
}: {
  classes: Cls[];
  initialVocab: any[];
  initialGrammar: any[];
  pageSize: number;
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<Kind>('vocab');
  const [filter, setFilter] = useState<string>(ALL);
  const [posFilter, setPosFilter] = useState<string>(ALL); // chỉ áp cho từ vựng

  const [lists, setLists] = useState<Record<Kind, any[]>>({
    vocab: initialVocab,
    grammar: initialGrammar,
  });
  const [done, setDone] = useState<Record<Kind, boolean>>({
    vocab: initialVocab.length < pageSize,
    grammar: initialGrammar.length < pageSize,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  // bộ lọc của dữ liệu đang hiển thị từng tab (lần đầu server đã nạp không lọc)
  const loadedKey = useRef<Record<Kind, string>>({ vocab: `${ALL}|${ALL}`, grammar: ALL });
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // nhớ dữ liệu đã nạp theo từng tổ hợp tab + bộ lọc, để bấm qua lại filter cũ
  // không phải gọi Supabase lại (chỉ tồn tại trong lần vào trang này, mất khi rời trang)
  const cache = useRef<Record<string, { rows: any[]; done: boolean }>>({
    [`vocab:${ALL}|${ALL}`]: { rows: initialVocab, done: initialVocab.length < pageSize },
    [`grammar:${ALL}`]: { rows: initialGrammar, done: initialGrammar.length < pageSize },
  });

  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cfg = CFG[tab];
  const items = lists[tab];

  function query(kind: Kind) {
    let q = supabase
      .from(CFG[kind].table)
      .select('*, classes(name)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (filter === NONE) q = q.is('class_id', null);
    else if (filter) q = q.eq('class_id', filter);
    if (kind === 'vocab' && posFilter) q = q.eq('part_of_speech', posFilter);
    return q;
  }

  function matchesFilter(row: any) {
    const classOk =
      filter === ALL || (filter === NONE && !row.class_id) || row.class_id === filter;
    const posOk = tab !== 'vocab' || !posFilter || row.part_of_speech === posFilter;
    return classOk && posOk;
  }

  // cập nhật danh sách hiển thị và đồng bộ vào cache của bộ lọc đang xem
  function setList(k: Kind, rows: any[], doneFlag?: boolean) {
    setLists((p) => ({ ...p, [k]: rows }));
    const key = loadedKey.current[k];
    if (key) cache.current[`${k}:${key}`] = { rows, done: doneFlag ?? done[k] };
  }

  // đổi bộ lọc -> dùng lại cache nếu đã từng nạp, không thì mới gọi Supabase
  // (từ loại chỉ ảnh hưởng từ vựng)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const k of ['vocab', 'grammar'] as Kind[]) {
        const key = k === 'vocab' ? `${filter}|${posFilter}` : filter;
        if (loadedKey.current[k] === key) continue;
        const cached = cache.current[`${k}:${key}`];
        if (cached) {
          loadedKey.current[k] = key;
          setLists((p) => ({ ...p, [k]: cached.rows }));
          setDone((p) => ({ ...p, [k]: cached.done }));
          continue;
        }
        const { data } = await query(k).range(0, pageSize - 1);
        if (cancelled) return;
        loadedKey.current[k] = key;
        const rows = data ?? [];
        const doneFlag = rows.length < pageSize;
        setList(k, rows, doneFlag);
        setDone((p) => ({ ...p, [k]: doneFlag }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, posFilter]);

  // Lazy load: cuộn tới cuối bảng thì nạp thêm `pageSize` dòng. Phân trang theo mốc
  // created_at (không theo offset) nên thêm/xoá dòng giữa chừng không làm lệch trang.
  async function loadMore() {
    const last = items[items.length - 1];
    if (loadingRef.current || !last) return;
    loadingRef.current = true;
    setLoadingMore(true);
    const { data } = await query(tab).lt('created_at', last.created_at).limit(pageSize);
    loadingRef.current = false;
    setLoadingMore(false);
    const rows = data ?? [];
    const merged = [...items, ...rows.filter((r) => !items.some((x) => x.id === r.id))];
    const doneFlag = rows.length < pageSize;
    setList(tab, merged, doneFlag || done[tab]);
    if (doneFlag) setDone((p) => ({ ...p, [tab]: true }));
  }

  // chạy lại sau mỗi lần nạp để kiểm tra sentinel còn trong khung nhìn không
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || done[tab] || items.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filter, posFilter, items.length, done[tab]]);

  function fields(d: Draft) {
    return {
      [cfg.name]: cleanHtml(d.name),
      [cfg.desc]: cleanHtml(d.desc),
      example_sentence: cleanHtml(d.example),
      synonyms: cleanHtml(d.synonyms),
      // grammar_notes không có cột này
      ...(cfg.hasPos ? { part_of_speech: d.pos || null } : {}),
    };
  }

  function openCreate() {
    setError(null);
    setDraft({ ...EMPTY_DRAFT, classId: filter && filter !== NONE ? filter : '' });
    setDialog({ mode: 'create' });
  }

  function openEdit(it: any) {
    setError(null);
    setDraft({
      name: sanitizeHtml(it[cfg.name] ?? ''),
      desc: sanitizeHtml(it[cfg.desc] ?? ''),
      example: sanitizeHtml(it.example_sentence ?? ''),
      synonyms: sanitizeHtml(it.synonyms ?? ''),
      classId: it.class_id ?? '',
      pos: it.part_of_speech ?? '',
    });
    setDialog({ mode: 'edit', item: it });
  }

  async function add() {
    if (isEmptyHtml(draft.name)) return;
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const cls = classes.find((c) => c.id === draft.classId);

    const { data, error } = await supabase
      .from(cfg.table)
      .insert({
        user_id: user?.id,
        class_id: draft.classId || null,
        language_code: cls?.language_code ?? null,
        ...fields(draft),
      })
      .select('*, classes(name)')
      .single();

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    // chỉ hiện lên đầu danh sách nếu khớp bộ lọc hiện tại
    if (matchesFilter(data)) setList(tab, [data, ...items]);
    setDialog(null);
  }

  async function saveEdit(id: string) {
    if (isEmptyHtml(draft.name)) return;
    setSaving(true);
    setError(null);
    const cls = classes.find((c) => c.id === draft.classId);
    const { data, error } = await supabase
      .from(cfg.table)
      .update({
        ...fields(draft),
        class_id: draft.classId || null,
        language_code: cls?.language_code ?? null,
      })
      .eq('id', id)
      .select('*, classes(name)')
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setList(
      tab,
      matchesFilter(data) ? items.map((x) => (x.id === id ? data : x)) : items.filter((x) => x.id !== id)
    );
    setDialog({ mode: 'view', item: data });
  }

  async function remove(id: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from(cfg.table)
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id })
      .eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    setList(tab, items.filter((x) => x.id !== id));
    setDialog(null);
  }

  const editing = dialog?.mode === 'create' || dialog?.mode === 'edit';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-paper p-1">
          {(['vocab', 'grammar'] as Kind[]).map((k) => {
            const I = CFG[k].Icon;
            return (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                  tab === k ? 'bg-surface text-ink shadow-card' : 'text-ink-soft'
                }`}
              >
                <I className="h-4 w-4" />
                {CFG[k].label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <SimpleSelect
            value={filter}
            onChange={setFilter}
            className="w-auto min-w-[10rem]"
            aria-label="Lọc theo lớp"
            options={[
              { value: ALL, label: 'Tất cả lớp' },
              { value: NONE, label: 'Không gắn lớp' },
              ...classes.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          {cfg.hasPos && (
            <SimpleSelect
              value={posFilter}
              onChange={setPosFilter}
              className="w-auto min-w-[10rem]"
              aria-label="Lọc theo từ loại"
              options={[
                { value: ALL, label: 'Tất cả từ loại' },
                ...PARTS_OF_SPEECH.map((p) => ({ value: p.value, label: p.label })),
              ]}
            />
          )}
          <button onClick={openCreate} className="btn-primary h-10">
            <Plus className="h-4 w-4" />
            Thêm
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs text-ink-faint">
            <tr>
              <th className="w-[35%] px-3 py-2 font-medium">{cfg.nameCol}</th>
              {cfg.hasPos && <th className="w-20 px-3 py-2 font-medium sm:w-28">Từ loại</th>}
              <th className="px-3 py-2 font-medium">{cfg.descPh}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((it: any) => (
              <tr
                key={it.id}
                tabIndex={0}
                onClick={() => {
                  setError(null);
                  setDialog({ mode: 'view', item: it });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setError(null);
                    setDialog({ mode: 'view', item: it });
                  }
                }}
                className="cursor-pointer align-top hover:bg-paper focus-visible:bg-paper"
              >
                <td className="px-3 py-2.5 font-semibold text-ink">
                  <RichText html={it[cfg.name] ?? ''} className="line-clamp-2 break-words" />
                </td>
                {cfg.hasPos && (
                  <td className="px-3 py-2.5">
                    <PosPill value={it.part_of_speech} />
                  </td>
                )}
                <td className="px-3 py-2.5 text-ink-soft">
                  <RichText html={it[cfg.desc] ?? ''} className="line-clamp-2 break-words" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-faint">
            Chưa có {cfg.label.toLowerCase()} nào
            {filter || (cfg.hasPos && posFilter) ? ' cho lựa chọn này' : ''}.
          </p>
        )}
      </div>

      {!done[tab] && items.length > 0 && (
        <div ref={sentinelRef} className="flex h-10 items-center justify-center text-ink-faint">
          {loadingMore && <Spinner />}
        </div>
      )}

      <Dialog
        open={dialog !== null}
        onOpenChange={(o) => {
          if (!o) setDialog(null);
        }}
      >
        <DialogContent
          // đang nhập dở thì chỉ đóng bằng nút, tránh mất chữ vì lỡ bấm ra ngoài / Esc
          onInteractOutside={(e) => editing && e.preventDefault()}
          onEscapeKeyDown={(e) => editing && e.preventDefault()}
          onOpenAutoFocus={(e) => editing && e.preventDefault()}
        >
          {dialog?.mode === 'view' && (
            <div>
              <DialogTitle className="text-xs font-medium text-ink-faint">{cfg.label}</DialogTitle>
              <RichText
                html={dialog.item[cfg.name] ?? ''}
                className="mt-1 pr-8 font-display text-xl font-semibold text-ink"
              />
              <PosPill value={dialog.item.part_of_speech} className="mt-2" />
              <Section label={cfg.descPh} html={dialog.item[cfg.desc]} />
              <Section label="Câu ví dụ" html={dialog.item.example_sentence} />
              <Section label="Đồng nghĩa" html={dialog.item.synonyms} />
              {dialog.item.classes?.name && (
                <p className="mt-4 text-xs text-ink-faint">Lớp: {dialog.item.classes.name}</p>
              )}
              {error && <p className="mt-3 text-xs text-danger">{error}</p>}
              <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
                <ConfirmButton
                  onConfirm={() => remove(dialog.item.id)}
                  question="Xoá ghi chú này?"
                  confirmLabel="Xoá"
                  className="text-sm font-medium text-danger hover:underline"
                >
                  Xoá
                </ConfirmButton>
                <button onClick={() => openEdit(dialog.item)} className="btn-secondary btn-sm">
                  Sửa
                </button>
              </div>
            </div>
          )}

          {editing && (
            <div>
              <DialogTitle className="mb-3 pr-8 font-display text-lg font-semibold text-ink">
                {dialog.mode === 'create' ? 'Thêm' : 'Sửa'} {cfg.label.toLowerCase()}
              </DialogTitle>
              <NoteForm
                cfg={cfg}
                value={draft}
                onChange={setDraft}
                classes={classes}
                saving={saving}
                submitLabel={dialog.mode === 'create' ? `Thêm ${cfg.label.toLowerCase()}` : 'Lưu'}
                onSubmit={() => (dialog.mode === 'create' ? add() : saveEdit(dialog.item.id))}
                onCancel={() =>
                  dialog.mode === 'create' ? setDialog(null) : setDialog({ mode: 'view', item: dialog.item })
                }
              />
              {error && <p className="mt-3 text-xs text-danger">{error}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
