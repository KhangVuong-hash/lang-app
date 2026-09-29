'use client';

import { useCallback, useMemo, useState } from 'react';
import { BookOpenCheck, Layers, ListChecks, Plus, RotateCcw, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import SimpleSelect from '@/components/ui/SimpleSelect';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import WordList from '@/components/vocab/WordList';
import Flashcards from '@/components/vocab/Flashcards';
import Quiz from '@/components/vocab/Quiz';
import Review from '@/components/vocab/Review';
import WordForm from '@/components/vocab/WordForm';
import { todayLocal } from '@/lib/schedule';
import {
  emptyProgress,
  matchesSearch,
  STUDY_DIRECTIONS,
  type StudyDirection,
  type VocabDeck,
  type VocabWord,
  type WordProgress,
} from '@/lib/vocab';

type Mode = 'list' | 'cards' | 'quiz' | 'review';

const MODES = [
  { v: 'list', label: 'Danh sách', Icon: ListChecks },
  { v: 'cards', label: 'Flashcard', Icon: Layers },
  { v: 'quiz', label: 'Trắc nghiệm', Icon: BookOpenCheck },
  { v: 'review', label: 'Ôn tập', Icon: RotateCcw },
] as const;

const ALL = '';

type KnownFilter = '' | 'unknown' | 'known';

const KNOWN_FILTERS: { value: KnownFilter; label: string }[] = [
  { value: '', label: 'Tất cả từ' },
  { value: 'unknown', label: 'Chỉ từ chưa thuộc' },
  { value: 'known', label: 'Chỉ từ đã thuộc' },
];

function Bar({ value, total }: { value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-paper" aria-hidden>
      <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * Học một bộ từ: danh sách (lọc nhóm, tìm không dấu, ẩn nghĩa), flashcard,
 * trắc nghiệm, ôn tập ngắt quãng; đánh dấu "đã thuộc" + tiến độ theo nhóm.
 * Tiến độ lưu vào vocab_word_progress; admin thêm/sửa/xoá từ ngay tại đây.
 */
export default function DeckStudy({
  deck,
  words: initialWords,
  progress: initialProgress,
  isAdmin,
}: {
  deck: VocabDeck;
  words: VocabWord[];
  progress: WordProgress[];
  isAdmin: boolean;
}) {
  const supabase = createClient();
  const today = todayLocal();
  const [words, setWords] = useState(initialWords);
  const [progress, setProgress] = useState(
    () => new Map(initialProgress.map((p) => [p.word_id, p]))
  );
  const [mode, setMode] = useState<Mode>('list');
  const [category, setCategory] = useState(ALL);
  const [search, setSearch] = useState('');
  const [knownFilter, setKnownFilter] = useState<KnownFilter>('');
  const [direction, setDirection] = useState<StudyDirection>('en-vi');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ word?: VocabWord } | null>(null);

  // nhóm theo thứ tự của bộ, thêm nhóm lạ (nếu admin nhập) ở cuối
  const categories = useMemo(() => {
    const list = [...deck.categories];
    for (const w of words) if (!list.includes(w.category)) list.push(w.category);
    return list;
  }, [deck.categories, words]);

  const progressOf = useCallback((id: string) => progress.get(id) ?? emptyProgress(id), [progress]);

  const stats = useMemo(() => {
    const byCat = new Map<string, { total: number; known: number }>();
    let known = 0;
    let due = 0;
    for (const w of words) {
      const p = progress.get(w.id);
      const c = byCat.get(w.category) ?? { total: 0, known: 0 };
      c.total++;
      if (p?.known) {
        c.known++;
        known++;
      }
      if (p?.due_on && p.due_on <= today) due++;
      byCat.set(w.category, c);
    }
    return { known, due, byCat };
  }, [words, progress, today]);

  // bộ lọc dùng chung cho danh sách, flashcard và trắc nghiệm
  const filtered = useMemo(
    () =>
      words.filter(
        (w) =>
          (!category || w.category === category) &&
          (!knownFilter || !!progress.get(w.id)?.known === (knownFilter === 'known')) &&
          matchesSearch(w, search)
      ),
    [words, category, knownFilter, search, progress]
  );

  /** Lưu tiến độ một từ: cập nhật ngay trên màn hình, lỗi thì hoàn tác. */
  const saveProgress = useCallback(
    async (next: WordProgress) => {
      const prev = progress.get(next.word_id);
      setProgress((m) => new Map(m).set(next.word_id, next));
      const { error } = await supabase
        .from('vocab_word_progress')
        .upsert(
          { ...next, deck_id: deck.id, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,word_id' }
        );
      if (error) {
        setError(`Không lưu được tiến độ: ${error.message}`);
        setProgress((m) => {
          const copy = new Map(m);
          if (prev) copy.set(next.word_id, prev);
          else copy.delete(next.word_id);
          return copy;
        });
      }
    },
    [progress, supabase, deck.id]
  );

  const toggleKnown = (w: VocabWord) => {
    const p = progressOf(w.id);
    saveProgress({ ...p, known: !p.known });
  };

  const dueWords = useMemo(
    () =>
      words
        .filter((w) => {
          const d = progress.get(w.id)?.due_on;
          return d && d <= today && (!category || w.category === category);
        })
        .sort((a, b) => progress.get(a.id)!.due_on!.localeCompare(progress.get(b.id)!.due_on!)),
    // chỉ tính lại khi đổi nhóm / vào lại chế độ ôn, không phải sau mỗi câu trả lời
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [words, category, today, mode]
  );

  return (
    // mobile: tổng tiến độ -> khu học -> tiến độ theo nhóm; desktop: 2 thẻ tiến độ ở cột trái
    <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-6">
      <section className="card self-start p-4 lg:col-start-1 lg:row-start-1">
        <p className="text-xs font-medium text-ink-faint">Đã thuộc</p>
        <p className="mt-1 font-display text-3xl font-bold text-ink">
          {stats.known}
          <span className="ml-1 text-base font-semibold text-ink-soft">/ {words.length} từ</span>
        </p>
        <div className="mt-2">
          <Bar value={stats.known} total={words.length} />
        </div>
        <button
          type="button"
          onClick={() => setMode('review')}
          className="mt-3 text-sm font-medium text-brand hover:underline"
        >
          {stats.due ? `${stats.due} từ cần ôn hôm nay →` : 'Không có từ cần ôn hôm nay'}
        </button>
      </section>

      <section className="card order-3 self-start p-2 lg:order-none lg:col-start-1 lg:row-start-2">
        <h3 className="px-2 pb-1 pt-2 text-sm font-semibold text-ink">Theo nhóm</h3>
        <ul className="max-h-[28rem] overflow-y-auto">
          <li>
            <button
              type="button"
              onClick={() => setCategory(ALL)}
              className={`w-full rounded-lg px-2 py-1.5 text-left text-sm ${
                !category ? 'bg-brand/10 font-medium text-ink' : 'text-ink-soft hover:bg-paper'
              }`}
            >
              Tất cả nhóm
            </button>
          </li>
          {categories.map((c) => {
            const s = stats.byCat.get(c) ?? { total: 0, known: 0 };
            return (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`w-full rounded-lg px-2 py-1.5 text-left ${
                    category === c ? 'bg-brand/10' : 'hover:bg-paper'
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-2 text-sm">
                    <span className={category === c ? 'font-medium text-ink' : 'text-ink-soft'}>
                      {c}
                    </span>
                    <span className="shrink-0 text-xs text-ink-faint">
                      {s.known}/{s.total}
                    </span>
                  </span>
                  <span className="mt-1 block">
                    <Bar value={s.known} total={s.total} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card order-2 min-w-0 p-4 lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="-mx-1 flex overflow-x-auto px-1">
            <div className="inline-flex min-w-max rounded-lg bg-paper p-1">
              {MODES.map(({ v, label, Icon }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMode(v)}
                  aria-pressed={mode === v}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                    mode === v ? 'bg-surface text-ink shadow-card' : 'text-ink-soft'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {v === 'review' && stats.due > 0 && (
                    <span className="rounded-full bg-highlight px-1.5 text-xs text-ink">
                      {stats.due}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => setEditing({})} className="btn-primary btn-sm">
              <Plus className="h-4 w-4" />
              Thêm từ
            </button>
          )}
        </div>

        {mode !== 'review' && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="relative min-w-[12rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tiếng Anh hoặc tiếng Việt (không cần dấu)…"
                className="input pl-9"
                aria-label="Tìm từ"
              />
            </label>
            <SimpleSelect
              value={category}
              onChange={setCategory}
              className="w-auto min-w-[11rem] lg:hidden"
              aria-label="Lọc theo nhóm"
              options={[
                { value: ALL, label: 'Tất cả nhóm' },
                ...categories.map((c) => ({ value: c, label: c })),
              ]}
            />
            <SimpleSelect
              value={knownFilter}
              onChange={(v) => setKnownFilter(v as KnownFilter)}
              className="w-auto min-w-[11rem]"
              aria-label="Lọc theo đã thuộc"
              options={KNOWN_FILTERS}
            />
            {(mode === 'cards' || mode === 'quiz') && (
              <div
                className="inline-flex rounded-lg border border-line p-0.5"
                role="group"
                aria-label="Chiều hỏi"
              >
                {STUDY_DIRECTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDirection(value)}
                    aria-pressed={direction === value}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                      direction === value ? 'bg-brand text-white' : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        {mode === 'list' && (
          <WordList
            words={filtered}
            progressOf={progressOf}
            onToggleKnown={toggleKnown}
            onEdit={isAdmin ? (word) => setEditing({ word }) : undefined}
          />
        )}
        {mode === 'cards' && (
          <Flashcards
            // đổi bộ lọc / chiều hỏi -> bắt đầu lại bộ thẻ
            key={`${category}|${knownFilter}|${search}|${direction}`}
            words={filtered}
            direction={direction}
            progressOf={progressOf}
            onToggleKnown={toggleKnown}
          />
        )}
        {mode === 'quiz' && (
          <Quiz
            key={`${category}|${knownFilter}|${search}|${direction}`}
            pool={filtered}
            all={words}
            direction={direction}
            progressOf={progressOf}
            onAnswer={saveProgress}
            today={today}
            onReview={() => setMode('review')}
          />
        )}
        {mode === 'review' && (
          <Review
            key={category}
            words={dueWords}
            progressOf={progressOf}
            onAnswer={saveProgress}
            today={today}
            onQuiz={() => setMode('quiz')}
          />
        )}
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="mb-4 pr-8 font-display text-lg font-semibold text-ink">
            {editing?.word ? 'Sửa từ' : 'Thêm từ'}
          </DialogTitle>
          {editing && (
            <WordForm
              key={editing.word?.id ?? 'new'}
              deckId={deck.id}
              word={editing.word}
              categories={categories}
              defaultCategory={category || categories[0]}
              nextPosition={Math.max(0, ...words.map((w) => w.position)) + 1}
              onSaved={(w) => {
                setWords((ws) =>
                  ws.some((x) => x.id === w.id)
                    ? ws.map((x) => (x.id === w.id ? w : x))
                    : [...ws, w]
                );
                setEditing(null);
              }}
              onDeleted={(id) => {
                setWords((ws) => ws.filter((x) => x.id !== id));
                setEditing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
