'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from './Logo';
import { SIGNUP_ENABLED } from '@/lib/constants';

const LINKS = [
  { href: '/#tinh-nang', label: 'Tính năng' },
  { href: '/#ky-nang', label: 'Bốn kỹ năng' },
  { href: '/#ngon-ngu', label: 'Ngôn ngữ' },
  { href: '/#ve-chung-toi', label: 'Về chúng tôi' },
];

export default function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-40 transition-colors ${
        scrolled
          ? 'border-b border-line bg-surface/95 shadow-card backdrop-blur'
          : 'border-b border-transparent bg-paper/80 backdrop-blur'
      }`}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:bg-black/5 hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {SIGNUP_ENABLED && (
            <Link href="/login" className="btn-ghost">
              Đăng nhập
            </Link>
          )}
          <Link href={SIGNUP_ENABLED ? '/register' : '/login'} className="btn-primary">
            {SIGNUP_ENABLED ? 'Bắt đầu miễn phí' : 'Đăng nhập'}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface md:hidden"
          aria-label="Mở menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* mobile drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${open ? '' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-ink/40 transition-opacity ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          className={`absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col gap-1 bg-surface p-5 shadow-lift transition-transform ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <Logo />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line"
              aria-label="Đóng menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-black/5 hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/login" onClick={() => setOpen(false)} className="btn-primary">
              Đăng nhập
            </Link>
            {SIGNUP_ENABLED && (
              <Link href="/register" onClick={() => setOpen(false)} className="btn-secondary">
                Bắt đầu miễn phí
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
