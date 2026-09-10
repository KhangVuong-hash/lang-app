'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import SimpleSelect from '@/components/ui/SimpleSelect';

export default function RoleSelect({ userId, currentRole }: { userId: string; currentRole: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [role, setRole] = useState(currentRole);

  async function handleChange(next: string) {
    setRole(next);
    await supabase.from('profiles').update({ role: next }).eq('id', userId);
    router.refresh();
  }

  return (
    <SimpleSelect
      value={role}
      onChange={handleChange}
      className="h-9 w-40 text-xs"
      aria-label="Vai trò"
      options={[
        { value: 'user', label: 'Thành viên' },
        { value: 'admin', label: 'Quản trị viên' },
      ]}
    />
  );
}
