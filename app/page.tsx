import { redirect } from 'next/navigation';
import { getMyProfile, getUser } from '@/lib/auth';
import Landing from '@/components/marketing/Landing';

export default async function HomePage() {
  const user = await getUser();

  if (user) {
    const profile = await getMyProfile();
    redirect(profile?.role === 'admin' ? '/admin' : '/classes');
  }

  return <Landing />;
}
