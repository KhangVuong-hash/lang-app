'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ConfirmButton from '@/components/ui/ConfirmButton';

/**
 * Soft delete: chỉ set deleted_at / deleted_by, không xoá row khỏi DB.
 * Các bảng dùng được: classes, listening_lessons, speaking_lessons, writing_topics.
 */
export default function DeleteResource({
  table,
  id,
  redirectTo,
  label,
  question = 'Xoá mục này? Dữ liệu vẫn được lưu lại nhưng sẽ không còn hiển thị.',
}: {
  table: 'classes' | 'listening_lessons' | 'speaking_lessons' | 'writing_topics';
  id: string;
  redirectTo: string;
  label: string;
  question?: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function del() {
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id })
      .eq('id', id);

    if (error) {
      setError(error.message);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <ConfirmButton onConfirm={del} question={question} confirmLabel="Xoá">
        {label}
      </ConfirmButton>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
