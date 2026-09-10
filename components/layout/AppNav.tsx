'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import UserMenu from './UserMenu';
import { ROLE_LABEL } from '@/lib/constants';

function navFor(role: string) {
  const links = [
    { href: '/classes', label: 'Lớp học' },
    { href: '/profile', label: 'Sổ tay' },
  ];
  if (role === 'admin') links.unshift({ href: '/admin', label: 'Quản trị' });
  return links;
}

export default function AppNav({
  name,
  role,
  avatarUrl,
  inviteCount = 0,
}: {
  name: string;
  role: string;
  avatarUrl?: string | null;
  inviteCount?: number;
}) {
  const pathname = usePathname();
  const links = navFor(role);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Logo />
          <span
            className="pill hidden bg-highlight-soft text-ink sm:inline-flex"
            title="Vai trò của bạn"
          >
            {ROLE_LABEL[role] ?? 'Thành viên'}
          </span>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active =
              pathname === l.href || (l.href !== '/profile' && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${
                  active ? 'bg-brand/10 text-brand' : 'text-ink-soft hover:bg-black/5 hover:text-ink'
                }`}
              >
                {l.label}
                {l.href === '/classes' && inviteCount > 0 && (
                  <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-skill-speaking px-1 text-xs font-semibold text-white">
                    {inviteCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <UserMenu name={name} role={role} avatarUrl={avatarUrl} />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-line md:hidden"
            aria-label="Menu"
            aria-expanded={open}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-line bg-surface px-4 py-2 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-black/5 hover:text-ink"
            >
              {l.label}
              {l.href === '/classes' && inviteCount > 0 && (
                <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-skill-speaking px-1 text-xs font-semibold text-white">
                  {inviteCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
