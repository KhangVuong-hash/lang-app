'use client';

import { useState } from 'react';
import { Check, Eye, EyeOff, Pencil } from 'lucide-react';
import { familyMembers, isWordFamily, type VocabWord, type WordProgress } from '@/lib/vocab';

/** số từ hiện thêm mỗi lần bấm "Xem thêm" */
const STEP = 60;

export function TypePill({ type }: { type: string }) {
  return <span className="pill shrink-0 bg-brand/10 text-brand">{type}</span>;
}

/** Câu ví dụ, hoặc các từ cùng họ dạng chip với type = 'word family'. */
export function WordExample({ word, className }: { word: VocabWord; className?: string }) {
  if (!word.example) return null;
  if (isWordFamily(word))
    return (
      <span className={`flex flex-wrap gap-1 ${className ?? ''}`}>
        {familyMembers(word.example).map((m) => (
          <span
            key={m}
            className="rounded-md border border-line bg-paper px-1.5 py-0.5 text-xs text-ink"
          >
            {m}
          </span>
        ))}
      </span>
    );
  return <span className={`block italic text-ink-soft ${className ?? ''}`}>{word.example}</span>;
}

export function KnownButton({
  known,
  onClick,
  size = 'sm',
}: {
  known: boolean;
  onClick: () => void;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-pressed={known}
      title={known ? 'Bỏ đánh dấu đã thuộc' : 'Đánh dấu đã thuộc'}
      className={`inline-flex shrink-0 items-center gap-1 rounded-lg border font-medium ${
        size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs'
      } ${
        known
          ? 'border-success bg-success text-white'
          : 'border-line text-ink-soft hover:bg-paper hover:text-ink'
      }`}
    >
      <Check className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
      {known ? 'Đã thuộc' : 'Thuộc'}
    </button>
  );
}

/**
 * Danh sách từ. Chế độ "ẩn nghĩa": nghĩa bị che, chạm vào từ để hiện - dùng để
 * tự kiểm tra.
 */
export default function WordList({
  words,
  progressOf,
  onToggleKnown,
  onEdit,
}: {
  words: VocabWord[];
  progressOf: (id: string) => WordProgress;
  onToggleKnown: (w: VocabWord) => void;
  /** chỉ admin */
  onEdit?: (w: VocabWord) => void;
}) {
  const [hideMeaning, setHideMeaning] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(STEP);

  const toggleReveal = (id: string) =>
    setRevealed((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-soft">{words.length} từ</p>
        <button
          type="button"
          onClick={() => {
            setHideMeaning((h) => !h);
            setRevealed(new Set());
          }}
          aria-pressed={hideMeaning}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${
            hideMeaning
              ? 'border-brand bg-brand text-white'
              : 'border-line text-ink-soft hover:bg-paper'
          }`}
        >
          {hideMeaning ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {hideMeaning ? 'Đang ẩn nghĩa' : 'Ẩn nghĩa để tự kiểm tra'}
        </button>
      </div>

      {words.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-faint">Không có từ nào khớp bộ lọc.</p>
      ) : (
        <ul className="divide-y divide-line">
          {words.slice(0, limit).map((w) => {
            const p = progressOf(w.id);
            const hidden = hideMeaning && !revealed.has(w.id);
            return (
              <li key={w.id}>
                <div
                  role={hideMeaning ? 'button' : undefined}
                  tabIndex={hideMeaning ? 0 : undefined}
                  onClick={hideMeaning ? () => toggleReveal(w.id) : undefined}
                  onKeyDown={
                    hideMeaning
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleReveal(w.id);
                          }
                        }
                      : undefined
                  }
                  className={`flex items-start gap-3 py-2.5 ${
                    hideMeaning ? 'cursor-pointer rounded-lg hover:bg-paper' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{w.word}</span>
                      <TypePill type={w.type} />
                    </div>
                    {hidden ? (
                      <p className="mt-0.5 text-sm text-ink-faint">Chạm để xem nghĩa</p>
                    ) : (
                      <>
                        <p className="mt-0.5 text-sm text-ink">{w.meaning_vi}</p>
                        <WordExample word={w} className="mt-1 text-sm" />
                      </>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(w);
                        }}
                        className="rounded-lg p-1.5 text-ink-faint hover:bg-paper hover:text-ink"
                        aria-label={`Sửa ${w.word}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    <KnownButton known={p.known} onClick={() => onToggleKnown(w)} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {words.length > limit && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setLimit((l) => l + STEP)}
            className="btn-secondary btn-sm"
          >
            Xem thêm ({words.length - limit} từ)
          </button>
        </div>
      )}
    </div>
  );
}
