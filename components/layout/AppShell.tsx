import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile, getUser } from '@/lib/auth';
import TopBar from './TopBar';
import AppNav from './AppNav';
import Footer from './Footer';

export default async function AppShell({ children }: { children: ReactNode }) {
  const user = await getUser();

  // profile + số lời mời chạy song song (getMyProfile được cache, page dùng lại được)
  const [profile, inviteCount] = user
    ? await Promise.all([
        getMyProfile(),
        createClient()
          .from('enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', user.id)
          .eq('status', 'invited')
          .then(({ count }) => count ?? 0),
      ])
    : [null, 0];

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar variant="app" />
      <AppNav
        name={profile?.full_name || 'Bạn'}
        role={profile?.role || 'user'}
        avatarUrl={profile?.avatar_url}
        inviteCount={inviteCount}
      />
      <main className="flex-1">{children}</main>
      <Footer variant="app" />
    </div>
  );
}
