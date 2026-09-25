'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

/**
 * Chọn giờ 24h theo màu của app (thay cho <input type="time"> - popup gốc của
 * trình duyệt không đổi màu được). Giá trị dạng 'HH:MM'; phút theo bước 5.
 */
export default function TimePicker({
  value,
  onChange,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [h, m] = value ? value.split(':') : ['', ''];
  // giữ phút lẻ (VD dữ liệu cũ 07:47) trong danh sách để vẫn thấy được
  const minutes = m && !MINUTES.includes(m) ? [...MINUTES, m].sort() : MINUTES;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    // cuộn giờ/phút đang chọn vào giữa cột
    ref.current
      ?.querySelectorAll<HTMLElement>('[aria-selected="true"]')
      .forEach((el) => el.scrollIntoView({ block: 'center' }));
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const column = (items: string[], current: string, pick: (v: string) => void, label: string) => (
    <ul role="listbox" aria-label={label} className="h-56 w-14 overflow-y-auto py-1">
      {items.map((v) => {
        const selected = v === current;
        return (
          <li key={v}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => pick(v)}
              className={`mx-auto block w-11 rounded-md py-1.5 text-center text-sm tabular-nums ${
                selected ? 'bg-brand font-semibold text-white' : 'text-ink hover:bg-highlight-soft'
              }`}
            >
              {v}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="input flex items-center justify-between text-left tabular-nums"
      >
        <span className={value ? 'text-ink' : 'text-ink-faint'}>{value || '--:--'}</span>
        <Clock className="h-4 w-4 text-ink-faint" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 flex divide-x divide-line rounded-lg border border-line bg-surface shadow-lift">
          {column(HOURS, h, (v) => onChange(`${v}:${m || '00'}`), 'Giờ')}
          {column(
            minutes,
            m,
            (v) => {
              onChange(`${h || '00'}:${v}`);
              setOpen(false);
            },
            'Phút'
          )}
        </div>
      )}
    </div>
  );
}
