import type { ReactNode } from 'react';
import AppShell from '@/components/layout/AppShell';
import ProfileTabs from '@/components/layout/ProfileTabs';

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="container-page pt-6">
        <ProfileTabs />
      </div>
      {children}
    </AppShell>
  );
}
