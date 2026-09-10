import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import TopBar from './TopBar';
import AppNav from './AppNav';
import Footer from './Footer';

export default async function AppShell({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('full_name, role, avatar_url')
        .eq('id', user.id)
        .single()
    : { data: null };

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar variant="app" />
      <AppNav
        name={profile?.full_name || 'Bạn'}
        role={profile?.role || 'user'}
        avatarUrl={profile?.avatar_url}
      />
      <main className="flex-1">{children}</main>
      <Footer variant="app" />
    </div>
  );
}
