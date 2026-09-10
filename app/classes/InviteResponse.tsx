'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Spinner from '@/components/ui/Spinner';

export default function InviteResponse({ enrollmentId }: { enrollmentId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState<null | 'active' | 'declined'>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(status: 'active' | 'declined') {
    setBusy(status);
    setError(null);
    const { error } = await supabase
      .from('enrollments')
      .update({ status })
      .eq('id', enrollmentId);
    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          onClick={() => respond('active')}
          disabled={!!busy}
          className="btn-primary btn-sm"
        >
          {busy === 'active' && <Spinner />}
          Tham gia
        </button>
        <button
          onClick={() => respond('declined')}
          disabled={!!busy}
          className="btn-secondary btn-sm"
        >
          {busy === 'declined' && <Spinner />}
          Từ chối
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
