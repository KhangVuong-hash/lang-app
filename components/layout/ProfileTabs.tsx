'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartColumn, CalendarDays, NotebookPen, StickyNote, UserRound } from 'lucide-react';

const TABS = [
  { href: '/profile', label: 'Tổng quan', Icon: UserRound },
  { href: '/profile/schedule', label: 'Thời khóa biểu', Icon: CalendarDays },
  { href: '/profile/stats', label: 'Thống kê', Icon: ChartColumn },
  { href: '/profile/notes', label: 'Ghi chú', Icon: StickyNote },
  { href: '/profile/notebook', label: 'Sổ tay', Icon: NotebookPen },
];

/** Thanh tab chuyển nhanh giữa các mục của trang cá nhân. */
export default function ProfileTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Trang cá nhân" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex min-w-max rounded-lg bg-surface p-1 shadow-card">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === '/profile' ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                active ? 'bg-brand text-white' : 'text-ink-soft hover:bg-paper hover:text-ink'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
