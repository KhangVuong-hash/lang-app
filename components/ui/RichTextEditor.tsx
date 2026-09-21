'use client';

import { useEffect, useRef } from 'react';
import { Bold, Italic, Underline } from 'lucide-react';
import { cn } from '@/lib/utils';
import { escapeHtml, isEmptyHtml, sanitizeHtml } from '@/lib/rich-text';

const FORMATS = [
  { cmd: 'bold', label: 'In đậm (Ctrl+B)', Icon: Bold },
  { cmd: 'italic', label: 'In nghiêng (Ctrl+I)', Icon: Italic },
  { cmd: 'underline', label: 'Gạch chân (Ctrl+U)', Icon: Underline },
] as const;

// Áp định dạng lên vùng chọn trong ô đang focus. mousedown bị chặn để ô không mất focus.
export function RichTextToolbar({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {FORMATS.map(({ cmd, label, Icon }) => (
        <button
          key={cmd}
          type="button"
          title={label}
          aria-label={label}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => document.execCommand(cmd)}
          className="rounded-md p-1.5 text-ink-soft hover:bg-black/5 hover:text-ink"
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
      <span className="ml-1 text-xs text-ink-faint">Chọn chữ rồi bấm để định dạng</span>
    </div>
  );
}

// Ô nhập nhiều dòng có in đậm / nghiêng / gạch chân. Giá trị là HTML.
// `value` chỉ được ghi vào DOM khi khác nội dung hiện tại (vd: reset form, bắt đầu sửa),
// nên gõ phím không bị nhảy con trỏ.
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  tall,
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder: string;
  /** ô cao hơn cho nội dung dài (câu ví dụ...) */
  tall?: boolean;
  /** áp lên phần tử bao ngoài (vd: col-span trong grid) */
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) el.innerHTML = sanitizeHtml(value);
  }, [value]);

  return (
    <div className={cn('relative h-full', className)}>
      {isEmptyHtml(value) && (
        <span className="pointer-events-none absolute left-3 top-2 text-sm text-ink-faint">
          {placeholder}
        </span>
      )}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        onInput={(e) => {
          const el = e.currentTarget;
          // xoá hết chữ thì trình duyệt để lại <br> trơ trọi
          if (el.innerHTML === '<br>') el.innerHTML = '';
          onChange(el.innerHTML);
        }}
        onPaste={(e) => {
          // dán dưới dạng chữ thường, tránh kéo theo style của trang nguồn
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          document.execCommand('insertHTML', false, escapeHtml(text).replace(/\r?\n/g, '<br>'));
        }}
        className={cn('input h-full break-words', tall ? 'min-h-[4.5rem]' : 'min-h-[2.375rem]')}
      />
    </div>
  );
}
