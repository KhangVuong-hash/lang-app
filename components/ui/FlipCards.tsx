'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';

/** đang gõ trong ô nhập / trình soạn thảo, hoặc đang mở hộp thoại -> không bắt phím tắt */
export function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  if (document.querySelector('[role="dialog"]')) return true;
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
}

function shuffled<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Bộ thẻ lật dùng chung: chạm / Space để lật, ← → để chuyển thẻ, có xáo trộn.
 * Thứ tự thẻ giữ cố định trong phiên; `items` đổi (sửa / xoá / thêm) thì thẻ
 * cập nhật nội dung, thẻ bị xoá biến mất, thẻ mới nối vào cuối.
 */
export default function FlipCards<T>({
  items,
  getKey,
  front,
  back,
  footer,
  emptyText = 'Không có thẻ nào.',
}: {
  items: T[];
  getKey: (item: T) => string;
  front: (item: T) => ReactNode;
  back: (item: T) => ReactNode;
  /** nút giữa hai nút Trước / Sau (VD: đánh dấu đã thuộc) */
  footer?: (item: T) => ReactNode;
  emptyText?: string;
}) {
  const [order, setOrder] = useState(() => items.map(getKey));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);

  const byKey = useMemo(() => new Map(items.map((it) => [getKey(it), it])), [items, getKey]);

  // đồng bộ khi danh sách đổi: bỏ thẻ đã xoá, nối thẻ mới
  useEffect(() => {
    setOrder((o) => {
      const kept = o.filter((k) => byKey.has(k));
      const added = [...byKey.keys()].filter((k) => !o.includes(k));
      return added.length || kept.length !== o.length ? [...kept, ...added] : o;
    });
  }, [byKey]);

  const count = order.length;
  const current = Math.min(index, Math.max(0, count - 1));

  const go = useCallback(
    (step: number) => {
      if (!count) return;
      setIndex((i) => (Math.min(i, count - 1) + step + count) % count);
      setFlipped(false);
    },
    [count]
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

  const item = count ? byKey.get(order[current]) : undefined;
  if (!item) return <p className="py-10 text-center text-sm text-ink-faint">{emptyText}</p>;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex items-center justify-between gap-2 text-sm text-ink-soft">
        <span>
          Thẻ {current + 1} / {count}
        </span>
        <button
          type="button"
          onClick={() => {
            setOrder(isShuffled ? items.map(getKey) : shuffled(order));
            setIsShuffled((s) => !s);
            setIndex(0);
            setFlipped(false);
          }}
          aria-pressed={isShuffled}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium ${
            isShuffled ? 'border-brand bg-brand text-white' : 'border-line hover:bg-paper'
          }`}
        >
          <Shuffle className="h-4 w-4" />
          {isShuffled ? 'Đang xáo trộn' : 'Xáo trộn'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? 'Lật về mặt trước' : 'Lật xem mặt sau'}
        className="flex min-h-[16rem] w-full flex-col items-center justify-center rounded-2xl border border-line bg-surface p-6 text-center shadow-card transition hover:shadow-lift"
      >
        {flipped ? back(item) : front(item)}
        {!flipped && (
          <span className="mt-6 text-xs text-ink-faint">Chạm hoặc nhấn Space để lật</span>
        )}
      </button>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button type="button" onClick={() => go(-1)} className="btn-secondary btn-sm">
          <ChevronLeft className="h-4 w-4" />
          Trước
        </button>
        {footer?.(item)}
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
