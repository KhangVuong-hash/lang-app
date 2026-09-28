'use client';

import { useEffect, useState } from 'react';
import { TypePill, WordExample } from '@/components/vocab/WordList';
import { isTyping } from '@/components/ui/FlipCards';
import {
  SRS_INTERVALS,
  SRS_MAX_BOX,
  applyAnswer,
  type VocabWord,
  type WordProgress,
} from '@/lib/vocab';

/**
 * Ôn tập ngắt quãng (Leitner) các từ đến hạn hôm nay - chủ yếu là từ trả lời
 * sai ở trắc nghiệm. "Nhớ" -> lên hộp, giãn lịch (1, 3, 7, 14, 30 ngày);
 * "Quên" -> về hộp 1, ôn lại ngày mai. Phím: Space hiện nghĩa, 1 Quên, 2 Nhớ.
 */
export default function Review({
  words,
  progressOf,
  onAnswer,
  today,
  onQuiz,
}: {
  /** từ đến hạn, cố định trong lượt ôn */
  words: VocabWord[];
  progressOf: (id: string) => WordProgress;
  onAnswer: (p: WordProgress) => void;
  today: string;
  onQuiz: () => void;
}) {
  const [queue] = useState(words);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [remembered, setRemembered] = useState(0);

  const w = queue[index];

  function grade(ok: boolean) {
    if (!w || !shown) return;
    onAnswer(applyAnswer(progressOf(w.id), ok, today, 'review'));
    if (ok) setRemembered((n) => n + 1);
    setIndex((i) => i + 1);
    setShown(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!w || isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === ' ') {
        e.preventDefault();
        setShown(true);
      } else if (shown && e.key === '1') grade(false);
      else if (shown && e.key === '2') grade(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!queue.length)
    return (
      <div className="py-10 text-center">
        <p className="text-ink-soft">Không có từ nào cần ôn hôm nay.</p>
        <p className="mt-1 text-sm text-ink-faint">
          Từ trả lời sai ở trắc nghiệm sẽ xuất hiện ở đây để ôn lại theo lịch giãn dần.
        </p>
        <button type="button" onClick={onQuiz} className="btn-primary btn-sm mt-4">
          Làm trắc nghiệm
        </button>
      </div>
    );

  if (!w)
    return (
      <div className="py-10 text-center">
        <p className="font-display text-2xl font-bold text-ink">Xong lượt ôn hôm nay!</p>
        <p className="mt-1 text-sm text-ink-soft">
          Nhớ {remembered}/{queue.length} từ. Từ quên sẽ được ôn lại vào ngày mai.
        </p>
      </div>
    );

  const box = progressOf(w.id).srs_box ?? 1;
  const nextDays = box >= SRS_MAX_BOX ? null : SRS_INTERVALS[box];

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex items-center justify-between text-sm text-ink-soft">
        <span>
          Từ {index + 1} / {queue.length}
        </span>
        <span>Hộp {box}</span>
      </div>

      <div className="flex min-h-[15rem] flex-col items-center justify-center rounded-2xl border border-line bg-surface p-6 text-center shadow-card">
        <span className="font-display text-3xl font-bold text-ink">{w.word}</span>
        <span className="mt-3">
          <TypePill type={w.type} />
        </span>
        {shown ? (
          <>
            <span className="mt-5 font-display text-xl font-semibold text-ink">{w.meaning_vi}</span>
            <WordExample word={w} className="mt-3 justify-center text-sm" />
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShown(true)}
            className="btn-secondary btn-sm mt-6"
          >
            Hiện nghĩa (Space)
          </button>
        )}
      </div>

      {shown && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => grade(false)}
            className="rounded-xl border border-danger px-4 py-3 text-sm font-medium text-danger hover:bg-danger/10"
          >
            Quên (1)
            <span className="block text-xs font-normal text-ink-soft">ôn lại ngày mai</span>
          </button>
          <button
            type="button"
            onClick={() => grade(true)}
            className="rounded-xl border border-success px-4 py-3 text-sm font-medium text-success hover:bg-success/10"
          >
            Nhớ (2)
            <span className="block text-xs font-normal text-ink-soft">
              {nextDays ? `ôn lại sau ${nextDays} ngày` : 'đã vững - thôi ôn'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
