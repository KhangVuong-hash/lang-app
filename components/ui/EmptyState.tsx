import type { ReactNode } from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  hint,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-paper text-ink-faint">
        <Icon className="h-6 w-6" />
      </span>
      <p className="font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-sm text-sm text-ink-soft">{hint}</p>}
      {children}
    </div>
  );
}
