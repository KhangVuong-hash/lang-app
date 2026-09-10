import type { ReactNode } from 'react';
import Link from 'next/link';

export default function PageHeader({
  title,
  eyebrow,
  back,
  mark,
  children,
}: {
  title: string;
  eyebrow?: string;
  back?: { href: string; label: string };
  /** đánh dấu từ khoá trong title bằng cú pháp ~từ khoá~ */
  mark?: boolean;
  children?: ReactNode;
}) {
  const parts = mark ? title.split('~') : [title];
  return (
    <div className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
        >
          <span aria-hidden>‹</span> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {eyebrow && <p className="text-sm font-medium text-ink-faint">{eyebrow}</p>}
          <h1 className="text-2xl font-bold sm:text-3xl">
            {parts.map((p, i) =>
              i % 2 === 1 ? (
                <span key={i} className="mark">
                  {p}
                </span>
              ) : (
                <span key={i}>{p}</span>
              )
            )}
          </h1>
        </div>
        {children}
      </div>
    </div>
  );
}
