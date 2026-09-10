'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function RoleSelect({ userId, currentRole }: { userId: string; currentRole: string }) {
  const supabase = createClient();
  const router = useRouter();

  async function handleChange(role: string) {
    await supabase.from('profiles').update({ role }).eq('id', userId);
    router.refresh();
  }

  return (
    <select
      defaultValue={currentRole}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-highlight/60"
    >
      <option value="user">Thành viên</option>
      <option value="admin">Quản trị viên</option>
    </select>
  );
}
