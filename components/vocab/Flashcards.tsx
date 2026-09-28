'use client';

import FlipCards from '@/components/ui/FlipCards';
import { KnownButton, TypePill, WordExample } from '@/components/vocab/WordList';
import type { VocabWord, WordProgress } from '@/lib/vocab';

/** Flashcard của bộ từ: mặt trước là từ, mặt sau là nghĩa + ví dụ; đánh dấu đã thuộc. */
export default function Flashcards({
  words,
  progressOf,
  onToggleKnown,
}: {
  words: VocabWord[];
  progressOf: (id: string) => WordProgress;
  onToggleKnown: (w: VocabWord) => void;
}) {
  return (
    <FlipCards
      items={words}
      getKey={(w) => w.id}
      emptyText="Không có từ nào khớp bộ lọc."
      front={(w) => (
        <>
          <span className="font-display text-3xl font-bold text-ink">{w.word}</span>
          <span className="mt-3">
            <TypePill type={w.type} />
          </span>
        </>
      )}
      back={(w) => (
        <>
          <span className="text-xs font-medium text-ink-faint">{w.word}</span>
          <span className="mt-2 font-display text-2xl font-semibold text-ink">{w.meaning_vi}</span>
          <WordExample word={w} className="mt-4 justify-center text-sm" />
          <span className="mt-4 text-xs text-ink-faint">{w.category}</span>
        </>
      )}
      footer={(w) => (
        <KnownButton known={progressOf(w.id).known} onClick={() => onToggleKnown(w)} size="md" />
      )}
    />
  );
}
