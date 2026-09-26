import { createClient } from '@/lib/supabase/server';
import PageHeader from '@/components/ui/PageHeader';
import StatsDashboard from '@/components/schedule/StatsDashboard';
import { CATEGORY_COLUMNS, EXCEPTION_COLUMNS, LOG_COLUMNS, SCHEDULE_COLUMNS } from '@/lib/schedule';

export default async function StudyStatsPage() {
  const supabase = createClient();

  // RLS chỉ trả về dữ liệu của chính mình
  const [{ data: rules }, { data: exceptions }, { data: categories }, { data: logs }] =
    await Promise.all([
      supabase.from('study_schedules').select(SCHEDULE_COLUMNS).is('deleted_at', null),
      supabase.from('study_schedule_exceptions').select(EXCEPTION_COLUMNS),
      supabase
        .from('study_categories')
        .select(CATEGORY_COLUMNS)
        .order('created_at', { ascending: true }),
      supabase.from('study_session_logs').select(LOG_COLUMNS),
    ]);

  return (
    <div className="container-page pb-8 pt-6">
      <PageHeader eyebrow="Trang cá nhân" title="Thống kê ~tự học~" mark />
      <StatsDashboard
        rules={(rules ?? []) as any}
        exceptions={(exceptions ?? []) as any}
        categories={(categories ?? []) as any}
        logs={(logs ?? []) as any}
      />
    </div>
  );
}
