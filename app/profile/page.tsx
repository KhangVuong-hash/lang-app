import Link from 'next/link';
import { NotebookPen, ChevronRight, CalendarDays, StickyNote } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile, getUser } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import LanguageCrest from '@/components/ui/LanguageCrest';
import { ROLE_LABEL } from '@/lib/constants';
import {
  EXCEPTION_COLUMNS,
  SCHEDULE_COLUMNS,
  formatDate,
  nextOccurrence,
} from '@/lib/schedule';

function ClassList({ title, items }: { title: string; items: any[] }) {
  if (items.length === 0) return null;
  return (
    <div className="card p-5">
      <h2 className="mb-3 font-display text-lg font-semibold">{title}</h2>
      <ul className="divide-y divide-line">
        {items.map((c: any) => (
          <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm">
            <LanguageCrest code={c.language_code} size="sm" />
            <span className="text-ink">{c.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ProfilePage() {
  const supabase = createClient();
  const user = await getUser();

  const [
    profile,
    { data: teaching },
    { data: enrollments },
    { data: studyRules },
    { data: studyExceptions },
  ] = await Promise.all([
    getMyProfile(),
    supabase
      .from('classes')
      .select('id, name, language_code')
      .eq('teacher_id', user?.id)
      .is('deleted_at', null),
    supabase
      .from('enrollments')
      .select('classes(id, name, language_code)')
      .eq('student_id', user?.id)
      .eq('status', 'active'),
    supabase.from('study_schedules').select(SCHEDULE_COLUMNS).is('deleted_at', null),
    supabase.from('study_schedule_exceptions').select(EXCEPTION_COLUMNS),
  ]);

  const taught = teaching ?? [];
  const learning = (enrollments ?? []).map((e: any) => e.classes).filter(Boolean);
  const allClasses = [...taught, ...learning];
  const nextStudy = nextOccurrence((studyRules ?? []) as any[], (studyExceptions ?? []) as any[]);

  return (
    <div className="container-page pb-8 pt-6">
      <PageHeader eyebrow="Trang cá nhân" title={profile?.full_name ?? 'Chưa có tên'}>
        <span className="pill bg-highlight-soft text-ink">
          {ROLE_LABEL[profile?.role ?? 'user'] ?? 'Thành viên'}
        </span>
      </PageHeader>

      <div className="space-y-6">
        <Link
          href="/profile/schedule"
          className="card card-hover flex items-center justify-between gap-3 p-5"
        >
          <span className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 shrink-0 text-brand" />
            <span>
              <span className="block font-display font-semibold text-ink">
                Thời khóa biểu tự học
              </span>
              <span className="block text-sm text-ink-soft">
                {nextStudy
                  ? `Buổi tới: ${formatDate(nextStudy.date)} · ${nextStudy.start}-${nextStudy.end}${
                      nextStudy.rule.title ? ` · ${nextStudy.rule.title}` : ''
                    }`
                  : (studyRules ?? []).length
                    ? 'Không còn buổi học nào sắp tới'
                    : 'Tự xếp lịch học lặp hằng tuần cho bản thân'}
              </span>
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-ink-faint" />
        </Link>
        <ClassList title="Lớp tôi dạy" items={taught} />
        <ClassList title="Lớp tôi học" items={learning} />
        {allClasses.length === 0 && (
          <div className="card p-5 text-sm text-ink-faint">Bạn chưa dạy hay học lớp nào.</div>
        )}
        <Link
          href="/profile/notes"
          className="card card-hover flex items-center justify-between gap-3 p-5"
        >
          <span className="flex items-center gap-3">
            <StickyNote className="h-5 w-5 shrink-0 text-brand" />
            <span>
              <span className="block font-display font-semibold text-ink">Ghi chú của tôi</span>
              <span className="block text-sm text-ink-soft">
                Ghi lại thông tin cần nhớ, kèm hình ảnh
              </span>
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-ink-faint" />
        </Link>
        <Link href="/profile/notebook" className="card card-hover flex items-center justify-between p-5">
          <span className="flex items-center gap-2 font-display font-semibold text-ink">
            <NotebookPen className="h-5 w-5 text-brand" />
            Sổ tay từ vựng &amp; ngữ pháp
          </span>
          <ChevronRight className="h-5 w-5 text-ink-faint" />
        </Link>
      </div>
    </div>
  );
}
