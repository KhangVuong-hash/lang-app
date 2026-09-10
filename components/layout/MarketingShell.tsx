import type { ReactNode } from 'react';
import TopBar from './TopBar';
import PublicNav from './PublicNav';
import Footer from './Footer';

export default function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar variant="public" />
      <PublicNav />
      <main className="flex-1">{children}</main>
      <Footer variant="public" />
    </div>
  );
}
