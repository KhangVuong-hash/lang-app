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

  let profile: { full_name: string | null; role: string; avatar_url: string | null } | null =
    null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, role, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    // Tự chữa: nếu trigger handle_new_user không chạy (cấu hình DB thiếu), tạo profile ở đây.
    if (!data) {
      const { data: created } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: (user.user_metadata?.full_name as string) ?? null,
          role: 'user',
        })
        .select('full_name, role, avatar_url')
        .maybeSingle();
      profile = created ?? null;
    } else {
      profile = data;
    }
  }

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
