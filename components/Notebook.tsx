'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BookMarked, SpellCheck } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import ConfirmButton from '@/components/ui/ConfirmButton';
import SimpleSelect from '@/components/ui/SimpleSelect';

type Cls = { id: string; name: string; language_code: string };
type Kind = 'vocab' | 'grammar';

const CFG = {
  vocab: {
    table: 'vocabulary_notes',
    name: 'term',
    desc: 'meaning',
    namePh: 'Từ mới',
    descPh: 'Nghĩa',
    Icon: BookMarked,
    label: 'Từ vựng',
  },
  grammar: {
    table: 'grammar_notes',
    name: 'title',
    desc: 'explanation',
    namePh: 'Điểm ngữ pháp',
    descPh: 'Giải thích',
    Icon: SpellCheck,
    label: 'Ngữ pháp',
  },
} as const;

const ALL = '';
const NONE = '__none__';

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

  const [lists, setLists] = useState<Record<Kind, any[]>>({
    vocab: initialVocab,
    grammar: initialGrammar,
  });
  const [done, setDone] = useState<Record<Kind, boolean>>({
    vocab: initialVocab.length < pageSize,
    grammar: initialGrammar.length < pageSize,
  });
  const [loadingMore, setLoadingMore] = useState(false);

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [example, setExample] = useState('');
  const [classId, setClassId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ name: '', desc: '', example: '', classId: '' });

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
    return q;
  }

  function setList(k: Kind, fn: (prev: any[]) => any[]) {
    setLists((p) => ({ ...p, [k]: fn(p[k]) }));
  }

  // đổi bộ lọc -> nạp lại cả hai danh sách từ đầu
  useEffect(() => {
    if (filter === ALL) return; // lần đầu (ALL) đã có dữ liệu từ server
    let cancelled = false;
    (async () => {
      for (const k of ['vocab', 'grammar'] as Kind[]) {
        const { data } = await query(k).range(0, pageSize - 1);
        if (cancelled) return;
        const rows = data ?? [];
        setList(k, () => rows);
        setDone((p) => ({ ...p, [k]: rows.length < pageSize }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function loadMore() {
    setLoadingMore(true);
    const { data } = await query(tab).range(items.length, items.length + pageSize - 1);
    setLoadingMore(false);
    const rows = data ?? [];
    setList(tab, (p) => [...p, ...rows]);
    if (rows.length < pageSize) setDone((p) => ({ ...p, [tab]: true }));
  }

  async function add() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const cls = classes.find((c) => c.id === classId);

    const { data, error } = await supabase
      .from(cfg.table)
      .insert({
        user_id: user?.id,
        class_id: classId || null,
        language_code: cls?.language_code ?? null,
        [cfg.name]: name.trim(),
        [cfg.desc]: desc.trim() || null,
        example_sentence: example.trim() || null,
      })
      .select('*, classes(name)')
      .single();

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    // chỉ hiện lên đầu danh sách nếu khớp bộ lọc hiện tại
    const matches =
      filter === ALL ||
      (filter === NONE && !data.class_id) ||
      data.class_id === filter;
    if (matches) setList(tab, (p) => [data, ...p]);
    setName('');
    setDesc('');
    setExample('');
  }

  function startEdit(it: any) {
    setEditId(it.id);
    setEdit({
      name: it[cfg.name] ?? '',
      desc: it[cfg.desc] ?? '',
      example: it.example_sentence ?? '',
      classId: it.class_id ?? '',
    });
  }

  async function saveEdit(id: string) {
    if (!edit.name.trim()) return;
    const cls = classes.find((c) => c.id === edit.classId);
    const { data, error } = await supabase
      .from(cfg.table)
      .update({
        [cfg.name]: edit.name.trim(),
        [cfg.desc]: edit.desc.trim() || null,
        example_sentence: edit.example.trim() || null,
        class_id: edit.classId || null,
        language_code: cls?.language_code ?? null,
      })
      .eq('id', id)
      .select('*, classes(name)')
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    const stillMatches =
      filter === ALL ||
      (filter === NONE && !data.class_id) ||
      data.class_id === filter;
    setList(tab, (p) =>
      stillMatches ? p.map((x) => (x.id === id ? data : x)) : p.filter((x) => x.id !== id)
    );
    setEditId(null);
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
    setList(tab, (p) => p.filter((x) => x.id !== id));
  }

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
      </div>

      <div className="mt-4 grid gap-2 rounded-lg bg-paper p-3 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={cfg.namePh}
          className="input"
        />
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={cfg.descPh}
          className="input"
        />
        <input
          value={example}
          onChange={(e) => setExample(e.target.value)}
          placeholder="Câu ví dụ"
          className="input sm:col-span-2"
        />
        <SimpleSelect
          value={classId}
          onChange={setClassId}
          aria-label="Gắn lớp"
          options={[
            { value: '', label: 'Không gắn lớp' },
            ...classes.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <button onClick={add} disabled={!name.trim() || saving} className="btn-primary">
          {saving && <Spinner />}
          Thêm {cfg.label.toLowerCase()}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <ul className="mt-4 space-y-2">
        {items.map((it: any) =>
          editId === it.id ? (
            <li key={it.id} className="rounded-lg border border-brand/40 bg-surface p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  className="input"
                  placeholder={cfg.namePh}
                />
                <input
                  value={edit.desc}
                  onChange={(e) => setEdit({ ...edit, desc: e.target.value })}
                  className="input"
                  placeholder={cfg.descPh}
                />
                <input
                  value={edit.example}
                  onChange={(e) => setEdit({ ...edit, example: e.target.value })}
                  className="input sm:col-span-2"
                  placeholder="Câu ví dụ"
                />
                <SimpleSelect
                  value={edit.classId}
                  onChange={(v) => setEdit({ ...edit, classId: v })}
                  aria-label="Gắn lớp"
                  options={[
                    { value: '', label: 'Không gắn lớp' },
                    ...classes.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => saveEdit(it.id)} className="btn-primary btn-sm">
                  Lưu
                </button>
                <button onClick={() => setEditId(null)} className="btn-ghost btn-sm">
                  Huỷ
                </button>
              </div>
            </li>
          ) : (
            <li key={it.id} className="rounded-lg border border-line p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{it[cfg.name]}</p>
                  <p className="text-ink-soft">{it[cfg.desc]}</p>
                  {it.example_sentence && (
                    <p className="mt-1 text-xs italic text-ink-faint">“{it.example_sentence}”</p>
                  )}
                  {it.classes?.name && (
                    <p className="mt-1 text-xs text-ink-faint">Lớp: {it.classes.name}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs">
                  <button
                    onClick={() => startEdit(it)}
                    className="font-medium text-ink-soft hover:text-ink"
                  >
                    Sửa
                  </button>
                  <ConfirmButton
                    onConfirm={() => remove(it.id)}
                    question="Xoá ghi chú này?"
                    confirmLabel="Xoá"
                    className="font-medium text-danger hover:underline"
                  >
                    Xoá
                  </ConfirmButton>
                </div>
              </div>
            </li>
          )
        )}
        {items.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-faint">
            Chưa có {cfg.label.toLowerCase()} nào{filter ? ' cho lựa chọn này' : ''}.
          </p>
        )}
      </ul>

      {!done[tab] && items.length > 0 && (
        <button onClick={loadMore} disabled={loadingMore} className="btn-secondary btn-sm mt-3">
          {loadingMore && <Spinner />}
          Xem thêm {pageSize}
        </button>
      )}
    </div>
  );
}
