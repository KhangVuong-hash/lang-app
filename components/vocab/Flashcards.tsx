'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';
import { KnownButton, TypePill, WordExample } from '@/components/vocab/WordList';
import { shuffle, type VocabWord, type WordProgress } from '@/lib/vocab';

/** đang gõ trong ô nhập thì không bắt phím tắt */
export function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
}

/** Flashcard: chạm / Space để lật, ← → để chuyển thẻ, có xáo trộn. */
export default function Flashcards({
  words,
  progressOf,
  onToggleKnown,
}: {
  words: VocabWord[];
  progressOf: (id: string) => WordProgress;
  onToggleKnown: (w: VocabWord) => void;
}) {
  // giữ thứ tự thẻ cố định trong phiên, kể cả khi đánh dấu "đã thuộc"
  const [deck, setDeck] = useState(words);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);

  const go = useCallback(
    (step: number) => {
      if (!deck.length) return;
      setIndex((i) => (i + step + deck.length) % deck.length);
      setFlipped(false);
    },
    [deck.length]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === ' ') {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  if (!deck.length)
    return <p className="py-10 text-center text-sm text-ink-faint">Không có từ nào khớp bộ lọc.</p>;

  const w = deck[index];
  const p = progressOf(w.id);

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex items-center justify-between gap-2 text-sm text-ink-soft">
        <span>
          Thẻ {index + 1} / {deck.length}
        </span>
        <button
          type="button"
          onClick={() => {
            setDeck(shuffled ? words : shuffle(words));
            setShuffled((s) => !s);
            setIndex(0);
            setFlipped(false);
          }}
          aria-pressed={shuffled}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium ${
            shuffled ? 'border-brand bg-brand text-white' : 'border-line hover:bg-paper'
          }`}
        >
          <Shuffle className="h-4 w-4" />
          {shuffled ? 'Đang xáo trộn' : 'Xáo trộn'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? 'Lật về mặt từ' : 'Lật xem nghĩa'}
        className="flex min-h-[16rem] w-full flex-col items-center justify-center rounded-2xl border border-line bg-surface p-6 text-center shadow-card transition hover:shadow-lift"
      >
        {!flipped ? (
          <>
            <span className="font-display text-3xl font-bold text-ink">{w.word}</span>
            <span className="mt-3">
              <TypePill type={w.type} />
            </span>
            <span className="mt-6 text-xs text-ink-faint">Chạm hoặc nhấn Space để lật</span>
          </>
        ) : (
          <>
            <span className="text-xs font-medium text-ink-faint">{w.word}</span>
            <span className="mt-2 font-display text-2xl font-semibold text-ink">
              {w.meaning_vi}
            </span>
            <WordExample word={w} className="mt-4 justify-center text-sm" />
            <span className="mt-4 text-xs text-ink-faint">{w.category}</span>
          </>
        )}
      </button>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button type="button" onClick={() => go(-1)} className="btn-secondary btn-sm">
          <ChevronLeft className="h-4 w-4" />
          Trước
        </button>
        <KnownButton known={p.known} onClick={() => onToggleKnown(w)} size="md" />
        <button type="button" onClick={() => go(1)} className="btn-secondary btn-sm">
          Sau
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-3 hidden text-center text-xs text-ink-faint sm:block">
        Phím tắt: ← → chuyển thẻ · Space lật thẻ
      </p>
    </div>
  );
}
