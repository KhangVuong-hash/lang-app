import type { ReactNode } from 'react';

/**
 * Tiêu đề section. Đánh dấu từ khoá bằng vệt bút dạ quang qua cú pháp
 * "văn bản ~từ khoá~ còn lại".
 */
export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  children?: ReactNode;
}) {
  const parts = title.split('~');
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && (
        <p className="mb-2 text-sm font-semibold text-brand-light">{eyebrow}</p>
      )}
      <h2 className="text-2xl font-bold sm:text-3xl">
        {parts.map((p, i) =>
          i % 2 === 1 ? (
            <span key={i} className="mark">
              {p}
            </span>
          ) : (
            <span key={i}>{p}</span>
          )
        )}
      </h2>
      {description && <p className="mt-3 text-ink-soft">{description}</p>}
      {children}
    </div>
  );
}
