'use client';

import FlipCards from '@/components/ui/FlipCards';
import { KnownButton, TypePill, WordExample } from '@/components/vocab/WordList';
import type { StudyDirection, VocabWord, WordProgress } from '@/lib/vocab';

/**
 * Flashcard của bộ từ; đánh dấu đã thuộc.
 *  - 'en-vi': mặt trước là từ, mặt sau là nghĩa + ví dụ
 *  - 'vi-en': mặt trước là nghĩa, mặt sau là từ + ví dụ (ví dụ chứa từ nên chỉ ở mặt sau)
 */
export default function Flashcards({
  words,
  direction,
  progressOf,
  onToggleKnown,
}: {
  words: VocabWord[];
  direction: StudyDirection;
  progressOf: (id: string) => WordProgress;
  onToggleKnown: (w: VocabWord) => void;
}) {
  const reverse = direction === 'vi-en';
  return (
    <FlipCards
      items={words}
      getKey={(w) => w.id}
      emptyText="Không có từ nào khớp bộ lọc."
      front={(w) => (
        <>
          <span className={`font-display font-bold text-ink ${reverse ? 'text-2xl' : 'text-3xl'}`}>
            {reverse ? w.meaning_vi : w.word}
          </span>
          <span className="mt-3">
            <TypePill type={w.type} />
          </span>
        </>
      )}
      back={(w) => (
        <>
          <span className="text-xs font-medium text-ink-faint">
            {reverse ? w.meaning_vi : w.word}
          </span>
          <span
            className={`mt-2 font-display font-semibold text-ink ${reverse ? 'text-3xl' : 'text-2xl'}`}
          >
            {reverse ? w.word : w.meaning_vi}
          </span>
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
