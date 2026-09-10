import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Landing from '@/components/marketing/Landing';

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    redirect(profile?.role === 'admin' ? '/admin' : '/classes');
  }

  return <Landing />;
}
