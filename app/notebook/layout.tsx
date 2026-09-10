import type { ReactNode } from 'react';
import AppShell from '@/components/layout/AppShell';

export default function NotebookLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
