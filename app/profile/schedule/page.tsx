import { createClient } from '@/lib/supabase/server';
import PageHeader from '@/components/ui/PageHeader';
import ScheduleManager from '@/components/schedule/ScheduleManager';
import { EXCEPTION_COLUMNS, SCHEDULE_COLUMNS } from '@/lib/schedule';

export default async function StudySchedulePage() {
  const supabase = createClient();

  // RLS chỉ trả về lịch của chính mình
  const [{ data: rules }, { data: exceptions }] = await Promise.all([
    supabase
      .from('study_schedules')
      .select(SCHEDULE_COLUMNS)
      .is('deleted_at', null)
      .order('starts_on', { ascending: true }),
    supabase.from('study_schedule_exceptions').select(EXCEPTION_COLUMNS),
  ]);

  return (
    <div className="container-page py-8">
      <PageHeader
        back={{ href: '/profile', label: 'Trang cá nhân' }}
        eyebrow="Trang cá nhân"
        title="Thời khóa biểu ~tự học~"
        mark
      />
      <ScheduleManager rules={(rules ?? []) as any} exceptions={(exceptions ?? []) as any} />
    </div>
  );
}
