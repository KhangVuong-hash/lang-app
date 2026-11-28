'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  ImagePlus,
  Images,
  Pencil,
  Pin,
  Plus,
  Search,
  Settings2,
  StickyNote,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import RichTextEditor, { RichTextToolbar } from '@/components/ui/RichTextEditor';
import RichText from '@/components/ui/RichText';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '@/components/ui/Spinner';
import ConfirmButton from '@/components/ui/ConfirmButton';
import { cleanHtml, isEmptyHtml } from '@/lib/rich-text';
import { SKILL_MAP, type SkillKey } from '@/lib/constants';
import {
  ACCEPTED_IMAGE_TYPES,
  CATEGORY_COLUMNS,
  MAX_CATEGORY_NAME,
  MAX_NOTE_IMAGES,
  NOTES_PAGE_SIZE,
  NOTE_COLUMNS,
  NOTE_SKILLS,
  NOTE_SORTS,
  NOTE_VIEWS,
  applyNoteFilters,
  bySkill,
  compareNotes,
  matchesNoteView,
  removeNoteImages,
  signImages,
  uploadNoteImage,
  validateImage,
  type CategoryFilter,
  type NoteCategory,
  type NoteSort,
  type NoteView,
  type PersonalNote,
} from '@/lib/personal-notes';

type Urls = Record<string, string>;

const byName = (a: NoteCategory, b: NoteCategory) => a.name.localeCompare(b.name, 'vi');

/** Tạo danh mục cho kỹ năng; trả về danh mục mới hoặc thông báo lỗi */
async function createCategory(
  supabase: SupabaseClient,
  skill: SkillKey,
  rawName: string
): Promise<NoteCategory | string> {
  const name = rawName.trim().replace(/\s+/g, ' ');
  if (!name) return 'Hãy nhập tên danh mục.';
  if (name.length > MAX_CATEGORY_NAME) return `Tên danh mục tối đa ${MAX_CATEGORY_NAME} ký tự.`;
  const { data, error } = await supabase
    .from('note_categories')
    .insert({ skill, name })
    .select(CATEGORY_COLUMNS)
    .single();
  if (error?.code === '23505') return `Đã có danh mục “${name}”.`;
  if (error || !data) return error?.message ?? 'Không tạo được danh mục.';
  return data as NoteCategory;
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
  skill,
  initialNotes,
  initialUrls,
  initialCategories,
}: {
  userId: string;
  /** mục kỹ năng đang xem; null = ghi chú cũ chưa phân loại */
  skill: SkillKey | null;
  initialNotes: PersonalNote[];
  initialUrls: Urls;
  /** danh mục của mọi kỹ năng */
  initialCategories: NoteCategory[];
}) {
  const supabase = createClient();
  const [notes, setNotes] = useState(initialNotes);
  const [urls, setUrls] = useState<Urls>(initialUrls);
  const [done, setDone] = useState(initialNotes.length < NOTES_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [view, setView] = useState<NoteView>('all');
  const [sort, setSort] = useState<NoteSort>('updated');
  const [allCategories, setAllCategories] = useState(initialCategories);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [managing, setManaging] = useState(false);
  const [dialog, setDialog] = useState<{ note?: PersonalNote } | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  // bỏ kết quả của truy vấn cũ khi người dùng đổi bộ lọc liên tục
  const reqId = useRef(0);

  const addUrls = (more: Urls) => setUrls((u) => ({ ...u, ...more }));
  const categories = skill ? allCategories.filter((c) => c.skill === skill) : [];
  const categoryName = (id: string | null) =>
    id ? allCategories.find((c) => c.id === id)?.name : undefined;

  function onCategoryCreated(c: NoteCategory) {
    setAllCategories((cs) => [...cs, c].sort(byName));
  }
  function onCategoryRenamed(c: NoteCategory) {
    setAllCategories((cs) => cs.map((x) => (x.id === c.id ? c : x)).sort(byName));
  }
  function onCategoryDeleted(id: string) {
    setAllCategories((cs) => cs.filter((c) => c.id !== id));
    // DB đã set null category_id của các ghi chú thuộc danh mục này
    if (category === id) setCategory('all');
    else
      setNotes((ns) =>
        ns
          .map((n) => (n.category_id === id ? { ...n, category_id: null } : n))
          .filter((n) => matchesNoteView(n, view, category))
      );
  }

  async function fetchPage(q: string, offset: number) {
    let req = applyNoteFilters(
      bySkill(supabase.from('personal_notes').select(NOTE_COLUMNS).is('deleted_at', null), skill),
      view,
      sort,
      category
    ).range(offset, offset + NOTES_PAGE_SIZE - 1);
    // bỏ ký tự đặc biệt của cú pháp filter PostgREST / ilike
    const term = q.replace(/[,()"\\%_*]/g, ' ').trim();
    if (term) req = req.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
    const { data } = await req;
    const rows = (data ?? []) as PersonalNote[];
    addUrls(await signImages(supabase, rows.map((n) => n.image_paths[0]).filter(Boolean)));
    return rows;
  }

  // tìm kiếm: debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // đổi từ khoá / bộ lọc / thứ tự: nạp lại từ đầu
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    fetchPage(debounced, 0).then((rows) => {
      if (id !== reqId.current) return;
      setNotes(rows);
      setDone(rows.length < NOTES_PAGE_SIZE);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, view, sort, category]);

  // Lazy load: cuộn tới cuối lưới thì nạp thêm NOTES_PAGE_SIZE ghi chú
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || done) return;
    const io = new IntersectionObserver(async (entries) => {
      if (!entries[0].isIntersecting || loading) return;
      const id = reqId.current;
      setLoading(true);
      const rows = await fetchPage(debounced, notes.length);
      if (id !== reqId.current) return;
      setNotes((ns) => [...ns, ...rows.filter((r) => !ns.some((n) => n.id === r.id))]);
      setDone(rows.length < NOTES_PAGE_SIZE);
      setLoading(false);
    });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.length, done, loading, debounced, view, sort, category]);

  /** đặt ghi chú vào đúng chỗ, hoặc gỡ khỏi danh sách nếu không còn khớp mục/bộ lọc */
  function upsert(note: PersonalNote) {
    setNotes((ns) => {
      const rest = ns.filter((n) => n.id !== note.id);
      return note.skill === skill && matchesNoteView(note, view, category)
        ? [note, ...rest].sort(compareNotes(sort))
        : rest;
    });
  }

  function onSaved(note: PersonalNote) {
    upsert(note);
    setDialog(null);
  }

  async function togglePin(note: PersonalNote) {
    upsert({ ...note, pinned: !note.pinned });
    const { data, error } = await supabase
      .from('personal_notes')
      .update({ pinned: !note.pinned })
      .eq('id', note.id)
      .select(NOTE_COLUMNS)
      .single();
    upsert(error || !data ? note : (data as PersonalNote));
  }

  const filtered = !!debounced || view !== 'all' || category !== 'all';
  // nhóm "Đã ghim" / "Khác" chỉ khi xem tất cả và có cả hai loại
  const pinnedNotes = notes.filter((n) => n.pinned);
  const grouped = view === 'all' && pinnedNotes.length > 0 && pinnedNotes.length < notes.length;
  const renderGrid = (list: PersonalNote[]) => (
    <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((n) => (
        <NoteCard
          key={n.id}
          note={n}
          cover={urls[n.image_paths[0]]}
          categoryName={categoryName(n.category_id)}
          onOpen={() => setDialog({ note: n })}
          onTogglePin={() => togglePin(n)}
        />
      ))}
    </div>
  );

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
            placeholder={skill ? `Tìm trong ghi chú ${SKILL_MAP[skill].label.toLowerCase()}…` : 'Tìm trong ghi chú…'}
            className="input pl-9"
            aria-label="Tìm ghi chú"
          />
        </div>
        {skill && (
          <button onClick={() => setDialog({})} className="btn-primary h-10">
            <Plus className="h-4 w-4" />
            Ghi chú mới
          </button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lọc ghi chú">
          {NOTE_VIEWS.map((v) => {
            const on = view === v.key;
            const Icon = v.key === 'pinned' ? Pin : v.key === 'images' ? Images : null;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                aria-pressed={on}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${
                  on
                    ? 'border-ink bg-ink text-white'
                    : 'border-line text-ink-soft hover:bg-paper hover:text-ink'
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {v.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {skill && (
            <div className="flex items-center gap-1">
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <Tag className="h-4 w-4" />
                <span className="sr-only">Lọc theo danh mục</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="select h-9 w-auto max-w-[14rem] py-1"
                >
                  <option value="all">Mọi danh mục</option>
                  <option value="none">Chưa có danh mục</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setManaging(true)}
                className="btn-ghost btn-sm h-9 w-9 p-0"
                aria-label="Quản lý danh mục"
                title="Quản lý danh mục"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </div>
          )}
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <ArrowUpDown className="h-4 w-4" />
          <span className="sr-only">Sắp xếp</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as NoteSort)}
            className="select h-9 w-auto py-1"
          >
            {NOTE_SORTS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        </div>
      </div>

      {notes.length === 0 && !loading ? (
        filtered ? (
          <p className="py-10 text-center text-sm text-ink-faint">
            {debounced
              ? `Không có ghi chú nào khớp “${debounced}”.`
              : view === 'pinned'
                ? 'Chưa ghim ghi chú nào - bấm biểu tượng ghim trên thẻ để đưa lên đầu.'
                : view === 'images'
                  ? 'Không có ghi chú nào có ảnh.'
                  : category === 'none'
                    ? 'Mọi ghi chú đều đã có danh mục.'
                    : `Chưa có ghi chú nào trong danh mục “${categoryName(category) ?? ''}”.`}
          </p>
        ) : (
          <EmptyState
            icon={StickyNote}
            title={
              skill
                ? `Chưa có ghi chú kỹ năng ${SKILL_MAP[skill].label}`
                : 'Không còn ghi chú chưa phân loại'
            }
            hint={skill ? EMPTY_HINT[skill] : 'Mọi ghi chú đã được xếp vào một kỹ năng.'}
          >
            {skill && (
              <button onClick={() => setDialog({})} className="btn-primary mt-2">
                <Plus className="h-4 w-4" />
                Ghi chú mới
              </button>
            )}
          </EmptyState>
        )
      ) : grouped ? (
        <div className="space-y-6">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Đã ghim
            </h3>
            {renderGrid(pinnedNotes)}
          </section>
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Khác
            </h3>
            {renderGrid(notes.filter((n) => !n.pinned))}
          </section>
        </div>
      ) : (
        renderGrid(notes)
      )}

      {!done && (
        <div ref={sentinelRef} className="flex h-12 items-center justify-center text-ink-faint">
          {loading && <Spinner />}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="mb-3 pr-8 font-display text-lg font-semibold text-ink">
            {dialog?.note
              ? 'Sửa ghi chú'
              : `Ghi chú mới · ${skill ? SKILL_MAP[skill].label : ''}`}
          </DialogTitle>
          {dialog && (
            <NoteEditor
              key={dialog.note?.id ?? 'new'}
              userId={userId}
              skill={skill}
              defaultCategory={category !== 'all' && category !== 'none' ? category : null}
              categories={allCategories}
              onCategoryCreated={onCategoryCreated}
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

      {skill && (
        <Dialog open={managing} onOpenChange={setManaging}>
          <DialogContent className="max-w-md">
            <DialogTitle className="mb-3 pr-8 font-display text-lg font-semibold text-ink">
              Danh mục · {SKILL_MAP[skill].label}
            </DialogTitle>
            <CategoryManager
              skill={skill}
              categories={categories}
              onCreated={onCategoryCreated}
              onRenamed={onCategoryRenamed}
              onDeleted={onCategoryDeleted}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const EMPTY_HINT: Record<SkillKey, string> = {
  listening: 'Ghi lại mẹo nghe, từ hay nghe nhầm, nguồn podcast/video hữu ích…',
  speaking: 'Ghi lại mẫu câu, cách phát âm, ý tưởng trả lời các chủ đề nói…',
  reading: 'Ghi lại chiến lược làm bài đọc, từ mới gặp trong bài, đoạn văn hay…',
  writing: 'Ghi lại cấu trúc bài viết, cụm từ nối, lỗi hay mắc, bài mẫu…',
};

function NoteCard({
  note,
  cover,
  categoryName,
  onOpen,
  onTogglePin,
}: {
  note: PersonalNote;
  cover?: string;
  categoryName?: string;
  onOpen: () => void;
  onTogglePin: () => void;
}) {
  const count = note.image_paths.length;
  return (
    <div className="group relative">
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
          {categoryName && (
            <span
              className={`pill mb-1.5 max-w-full bg-paper text-ink-soft ${count > 0 ? '' : 'mr-8'}`}
            >
              <Tag className="h-3 w-3 shrink-0" />
              <span className="truncate">{categoryName}</span>
            </span>
          )}
          {/* chừa chỗ cho nút ghim khi thẻ không có ảnh bìa */}
          <p
            className={`font-semibold ${note.title ? 'text-ink' : 'text-ink-faint'} ${count > 0 ? '' : 'pr-8'}`}
          >
            {note.title || 'Không tiêu đề'}
          </p>
          {!isEmptyHtml(note.content) && (
            <RichText
              html={note.content ?? ''}
              className="mt-1 line-clamp-6 break-words text-sm text-ink-soft"
            />
          )}
          <p className="mt-3 text-xs text-ink-faint">{formatDateTime(note.updated_at)}</p>
        </div>
      </button>
      <button
        type="button"
        onClick={onTogglePin}
        aria-pressed={note.pinned}
        aria-label={note.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
        title={note.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
        className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full transition ${
          count > 0 ? 'bg-surface/90 shadow-sm' : ''
        } ${
          note.pinned
            ? 'text-ink'
            : 'text-ink-faint opacity-100 hover:bg-paper hover:text-ink focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
        }`}
      >
        <Pin className={`h-4 w-4 ${note.pinned ? 'fill-highlight' : ''}`} />
      </button>
    </div>
  );
}

function NoteEditor({
  userId,
  skill,
  defaultCategory,
  categories,
  onCategoryCreated,
  note,
  urls,
  onUrls,
  onSaved,
  onDeleted,
  onCancel,
}: {
  userId: string;
  skill: SkillKey | null;
  /** ghi chú mới: gán sẵn danh mục đang lọc */
  defaultCategory: string | null;
  /** danh mục của mọi kỹ năng */
  categories: NoteCategory[];
  onCategoryCreated: (c: NoteCategory) => void;
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
  const [noteSkill, setNoteSkill] = useState<SkillKey | ''>(note?.skill ?? skill ?? '');
  const [categoryId, setCategoryId] = useState<string>(
    (note ? note.category_id : defaultCategory) ?? ''
  );
  // null = đang chọn trong dropdown; chuỗi = đang nhập tên danh mục mới
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const skillCategories = categories.filter((c) => c.skill === noteSkill);
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

  function pickSkill(k: SkillKey) {
    setNoteSkill(k);
    // danh mục thuộc riêng từng kỹ năng
    if (k !== noteSkill) {
      setCategoryId('');
      setNewCategory(null);
    }
  }

  async function addCategory() {
    if (!noteSkill || newCategory === null) return;
    setCreatingCategory(true);
    const res = await createCategory(supabase, noteSkill, newCategory);
    setCreatingCategory(false);
    if (typeof res === 'string') return setError(res);
    setError(null);
    onCategoryCreated(res);
    setCategoryId(res.id);
    setNewCategory(null);
  }

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
    if (!noteSkill) return setError('Hãy chọn kỹ năng cho ghi chú.');
    setSaving(true);
    const payload = {
      skill: noteSkill,
      category_id: categoryId || null,
      title: title.trim() || null, content: body, image_paths: images, pinned };
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
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kỹ năng">
        {NOTE_SKILLS.map((k) => {
          const s = SKILL_MAP[k];
          const on = noteSkill === k;
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => pickSkill(k)}
              className="pill border"
              style={
                on
                  ? { backgroundColor: s.color, borderColor: s.color, color: '#fff' }
                  : { borderColor: `${s.color}55`, color: s.color }
              }
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {noteSkill && (
        <div className="flex flex-wrap items-center gap-2">
          <Tag className="h-4 w-4 text-ink-faint" />
          {newCategory === null ? (
            <select
              value={categoryId}
              onChange={(e) => {
                if (e.target.value === '__new') setNewCategory('');
                else setCategoryId(e.target.value);
              }}
              className="select h-9 w-auto min-w-[12rem] max-w-full py-1"
              aria-label="Danh mục"
            >
              <option value="">Không có danh mục</option>
              {skillCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="__new">+ Tạo danh mục mới…</option>
            </select>
          ) : (
            <>
              <input
                autoFocus
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCategory();
                  }
                }}
                maxLength={MAX_CATEGORY_NAME}
                placeholder={`Tên danh mục ${SKILL_MAP[noteSkill].label.toLowerCase()}…`}
                className="input h-9 w-auto min-w-0 flex-1 py-1 sm:max-w-xs"
                aria-label="Tên danh mục mới"
              />
              <button
                type="button"
                onClick={addCategory}
                disabled={creatingCategory || !newCategory.trim()}
                className="btn-secondary btn-sm h-9"
              >
                {creatingCategory ? <Spinner /> : <Check className="h-4 w-4" />}
                Tạo
              </button>
              <button
                type="button"
                onClick={() => setNewCategory(null)}
                className="btn-ghost btn-sm h-9"
              >
                Huỷ
              </button>
            </>
          )}
        </div>
      )}

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

function CategoryManager({
  skill,
  categories,
  onCreated,
  onRenamed,
  onDeleted,
}: {
  skill: SkillKey;
  categories: NoteCategory[];
  onCreated: (c: NoteCategory) => void;
  onRenamed: (c: NoteCategory) => void;
  onDeleted: (id: string) => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    const res = await createCategory(supabase, skill, name);
    setBusy(false);
    if (typeof res === 'string') return setError(res);
    setError(null);
    setName('');
    onCreated(res);
  }

  async function rename() {
    if (!editing) return;
    const next = editing.name.trim().replace(/\s+/g, ' ');
    if (!next) return setError('Hãy nhập tên danh mục.');
    setBusy(true);
    const { data, error } = await supabase
      .from('note_categories')
      .update({ name: next })
      .eq('id', editing.id)
      .select(CATEGORY_COLUMNS)
      .single();
    setBusy(false);
    if (error?.code === '23505') return setError(`Đã có danh mục “${next}”.`);
    if (error || !data) return setError(error?.message ?? 'Không đổi tên được.');
    setError(null);
    setEditing(null);
    onRenamed(data as NoteCategory);
  }

  async function del(id: string) {
    const { error } = await supabase.from('note_categories').delete().eq('id', id);
    if (error) return setError(error.message);
    setError(null);
    onDeleted(id);
  }

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_CATEGORY_NAME}
          placeholder="Tên danh mục mới"
          className="input h-10 flex-1"
          aria-label="Tên danh mục mới"
        />
        <button type="submit" disabled={busy || !name.trim()} className="btn-primary h-10">
          <Plus className="h-4 w-4" />
          Thêm
        </button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}

      {categories.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-faint">
          Chưa có danh mục nào. Danh mục giúp gom ghi chú cùng chủ đề, vd. “Task 1”, “Từ nối”.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {categories.map((c) => (
            <li key={c.id} className="flex min-h-[2.75rem] items-center gap-2 px-3 py-1.5">
              {editing?.id === c.id ? (
                <form
                  className="flex flex-1 items-center gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    rename();
                  }}
                >
                  <input
                    autoFocus
                    value={editing.name}
                    onChange={(e) => setEditing({ id: c.id, name: e.target.value })}
                    maxLength={MAX_CATEGORY_NAME}
                    className="input h-8 flex-1 py-1"
                    aria-label="Tên danh mục"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="btn-ghost btn-sm h-8 w-8 p-0"
                    aria-label="Lưu tên"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="btn-ghost btn-sm h-8 w-8 p-0"
                    aria-label="Huỷ"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <>
                  <Tag className="h-4 w-4 shrink-0 text-ink-faint" />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => setEditing({ id: c.id, name: c.name })}
                    className="btn-ghost btn-sm h-8 w-8 p-0"
                    aria-label={`Đổi tên ${c.name}`}
                    title="Đổi tên"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <ConfirmButton
                    onConfirm={() => del(c.id)}
                    question="Xoá? Ghi chú vẫn giữ lại."
                    confirmLabel="Xoá"
                    className="btn-ghost btn-sm h-8 w-8 p-0 text-ink-faint hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" aria-label={`Xoá ${c.name}`} />
                  </ConfirmButton>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
