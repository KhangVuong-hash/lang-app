import type { ReactNode } from 'react';

export default function EmptyState({
  icon = '📭',
  title,
  hint,
  children,
}: {
  icon?: string;
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="text-3xl" aria-hidden>
        {icon}
      </span>
      <p className="font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-sm text-sm text-ink-soft">{hint}</p>}
      {children}
    </div>
  );
}
