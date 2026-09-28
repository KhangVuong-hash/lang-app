'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { TypePill, WordExample } from '@/components/vocab/WordList';
import { isTyping } from '@/components/vocab/Flashcards';
import {
  applyAnswer,
  buildQuestion,
  isWordFamily,
  shuffle,
  type QuizQuestion,
  type VocabWord,
  type WordProgress,
} from '@/lib/vocab';

const LENGTHS = [10, 20, 30];

/**
 * Trắc nghiệm: từ tiếng Anh -> chọn nghĩa đúng trong 4 đáp án (đáp án nhiễu cùng
 * nhóm). Trả lời sai -> từ vào hàng ôn tập ngắt quãng. Phím 1-4 chọn, Enter qua câu.
 */
export default function Quiz({
  pool,
  all,
  progressOf,
  onAnswer,
  today,
  onReview,
}: {
  /** các từ được hỏi (đã lọc) */
  pool: VocabWord[];
  /** cả bộ, để lấy đáp án nhiễu */
  all: VocabWord[];
  progressOf: (id: string) => WordProgress;
  onAnswer: (p: WordProgress) => void;
  today: string;
  onReview: () => void;
}) {
  const [length, setLength] = useState(10);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<VocabWord[]>([]);

  function start() {
    const words = shuffle(pool).slice(0, length);
    setQuestions(words.map((w) => buildQuestion(w, all)));
    setIndex(0);
    setPicked(null);
    setWrong([]);
  }

  const q = questions?.[index];
  const finished = !!questions && index >= questions.length;

  function pick(option: string) {
    if (!q || picked) return;
    setPicked(option);
    const correct = option === q.answer;
    if (!correct) setWrong((w) => [...w, q.word]);
    onAnswer(applyAnswer(progressOf(q.word.id), correct, today, 'quiz'));
  }

  function next() {
    setIndex((i) => i + 1);
    setPicked(null);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q || isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (!picked && n >= 1 && n <= q.options.length) pick(q.options[n - 1]);
      else if (picked && e.key === 'Enter') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // số câu đã trả lời (kể cả câu đang xem nếu đã chọn) trừ số câu sai
  const score = useMemo(
    () => (questions ? Math.min(index + (picked ? 1 : 0), questions.length) - wrong.length : 0),
    [questions, index, picked, wrong.length]
  );

  if (!pool.length)
    return <p className="py-10 text-center text-sm text-ink-faint">Không có từ nào khớp bộ lọc.</p>;

  if (!questions)
    return (
      <div className="mx-auto max-w-md py-6 text-center">
        <h3 className="font-display text-lg font-semibold text-ink">Trắc nghiệm nghĩa của từ</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Chọn nghĩa tiếng Việt đúng trong 4 đáp án. Từ trả lời sai sẽ được đưa vào mục Ôn tập. Đang
          hỏi trong {pool.length} từ khớp bộ lọc.
        </p>
        <div className="mt-4 inline-flex rounded-lg border border-line p-0.5">
          {LENGTHS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setLength(n)}
              aria-pressed={length === n}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                length === n ? 'bg-brand text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {n} câu
            </button>
          ))}
        </div>
        <div className="mt-4">
          <button type="button" onClick={start} className="btn-primary">
            Bắt đầu
          </button>
        </div>
      </div>
    );

  if (finished)
    return (
      <div className="mx-auto max-w-md py-6 text-center">
        <p className="text-sm text-ink-soft">Kết quả</p>
        <p className="font-display text-4xl font-bold text-ink">
          {score}/{questions.length}
        </p>
        {wrong.length > 0 ? (
          <>
            <p className="mt-4 text-left text-sm font-semibold text-ink">
              Từ trả lời sai (đã thêm vào Ôn tập)
            </p>
            <ul className="mt-1 divide-y divide-line text-left">
              {wrong.map((w) => (
                <li key={w.id} className="py-1.5 text-sm">
                  <span className="font-semibold text-ink">{w.word}</span>
                  <span className="text-ink-soft"> - {w.meaning_vi}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-sm text-success">Chính xác tất cả!</p>
        )}
        <div className="mt-5 flex justify-center gap-2">
          <button type="button" onClick={start} className="btn-primary">
            Làm lượt mới
          </button>
          {wrong.length > 0 && (
            <button type="button" onClick={onReview} className="btn-secondary">
              Ôn các từ sai
            </button>
          )}
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex items-center justify-between text-sm text-ink-soft">
        <span>
          Câu {index + 1} / {questions.length}
        </span>
        <span>Đúng {score}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-paper">
        <div
          className="h-full bg-brand transition-all"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>

      <div className="py-6 text-center">
        <p className="font-display text-3xl font-bold text-ink">{q!.word.word}</p>
        <p className="mt-2">
          <TypePill type={q!.word.type} />
        </p>
      </div>

      <ul className="grid gap-2">
        {q!.options.map((o, i) => {
          const isAnswer = o === q!.answer;
          const state = !picked ? 'idle' : isAnswer ? 'right' : o === picked ? 'wrong' : 'dim';
          return (
            <li key={o}>
              <button
                type="button"
                onClick={() => pick(o)}
                disabled={!!picked}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm ${
                  state === 'right'
                    ? 'border-success bg-success/10 text-ink'
                    : state === 'wrong'
                      ? 'border-danger bg-danger/10 text-ink'
                      : state === 'dim'
                        ? 'border-line text-ink-faint'
                        : 'border-line text-ink hover:border-brand hover:bg-paper'
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-paper text-xs font-semibold text-ink-soft">
                  {state === 'right' ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : state === 'wrong' ? (
                    <X className="h-4 w-4 text-danger" />
                  ) : (
                    i + 1
                  )}
                </span>
                {o}
              </button>
            </li>
          );
        })}
      </ul>

      {picked && (
        <div className="mt-4 rounded-xl bg-paper p-3 text-sm">
          <p
            className={
              picked === q!.answer ? 'font-medium text-success' : 'font-medium text-danger'
            }
          >
            {picked === q!.answer ? 'Chính xác!' : `Sai - đáp án: ${q!.answer}`}
          </p>
          {q!.word.example && (
            <div className="mt-1">
              {isWordFamily(q!.word) && <p className="mb-1 text-xs text-ink-faint">Họ từ:</p>}
              <WordExample word={q!.word} />
            </div>
          )}
          <button type="button" onClick={next} className="btn-primary btn-sm mt-3">
            {index + 1 < questions.length ? 'Câu tiếp (Enter)' : 'Xem kết quả'}
          </button>
        </div>
      )}
    </div>
  );
}
