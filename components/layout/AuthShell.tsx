import type { ReactNode } from 'react';
import Logo from './Logo';

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="container-page flex h-16 items-center">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">{children}</main>
      <footer className="container-page py-6 text-center text-xs text-ink-faint">
        © {new Date().getFullYear()} LangApp
      </footer>
    </div>
  );
}
