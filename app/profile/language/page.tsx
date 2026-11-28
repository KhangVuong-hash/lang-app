import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import PersonalNotes from '@/components/notes/PersonalNotes';
import { SKILL_MAP, type SkillKey } from '@/lib/constants';
import { SKILL_ICON } from '@/lib/skill-icons';
import {
  CATEGORY_COLUMNS,
  NOTES_PAGE_SIZE,
  NOTE_COLUMNS,
  NOTE_SKILLS,
  applyNoteFilters,
  bySkill,
  signImages,
  type NoteCategory,
  type PersonalNote,
} from '@/lib/personal-notes';

/** ?skill=listening|speaking|reading|writing|none (none = ghi chú cũ chưa phân loại) */
export default async function LanguageNotesPage({
  searchParams,
}: {
  searchParams: { skill?: string };
}) {
  const supabase = createClient();
  const user = await getUser();
  const param = searchParams.skill;

  // RLS chỉ trả về ghi chú của chính mình
  const [{ data: cats }, { count: unsorted }, ...counts] = await Promise.all([
    // danh mục của mọi kỹ năng (ít dòng) - editor cần khi chuyển ghi chú sang kỹ năng khác
    supabase.from('note_categories').select(CATEGORY_COLUMNS).order('name'),
    supabase
      .from('personal_notes')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .is('skill', null),
    ...NOTE_SKILLS.map((k) =>
      supabase
        .from('personal_notes')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('skill', k)
    ),
  ]);
  const hasUnsorted = (unsorted ?? 0) > 0;
  const skill: SkillKey | null =
    param === 'none' && hasUnsorted
      ? null
      : NOTE_SKILLS.includes(param as SkillKey)
        ? (param as SkillKey)
        : 'listening';

  const base = bySkill(
    supabase.from('personal_notes').select(NOTE_COLUMNS).is('deleted_at', null),
    skill
  );
  const { data } = await applyNoteFilters(base, 'all', 'updated').range(0, NOTES_PAGE_SIZE - 1);
  const notes = (data ?? []) as PersonalNote[];
  const categories = (cats ?? []) as NoteCategory[];
  // chỉ ký sẵn ảnh bìa; ảnh còn lại ký khi mở ghi chú
  const urls = await signImages(supabase, notes.map((n) => n.image_paths[0]).filter(Boolean));

  return (
    <div className="container-page pb-8 pt-6">
      <PageHeader eyebrow="Trang cá nhân" title="Sổ ghi chú ~Language~" mark />

      <nav aria-label="Kỹ năng" className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-1 border-b border-line">
          {NOTE_SKILLS.map((k, i) => {
            const s = SKILL_MAP[k];
            const Icon = SKILL_ICON[k];
            const active = skill === k;
            return (
              <Link
                key={k}
                href={`/profile/language?skill=${k}`}
                aria-current={active ? 'page' : undefined}
                className={`-mb-px inline-flex items-center gap-2 rounded-t-lg border border-b-2 px-4 py-2 text-sm font-medium ${
                  active ? 'bg-surface text-ink' : 'border-transparent text-ink-soft hover:text-ink'
                }`}
                style={
                  active
                    ? { borderColor: `${s.color}40`, borderBottomColor: s.color }
                    : undefined
                }
              >
                <Icon className="h-4 w-4" style={{ color: s.color }} />
                {s.label}
                <span className="text-xs text-ink-faint">{counts[i].count ?? 0}</span>
              </Link>
            );
          })}
          {hasUnsorted && (
            <Link
              href="/profile/language?skill=none"
              aria-current={skill === null ? 'page' : undefined}
              className={`-mb-px inline-flex items-center gap-2 rounded-t-lg border border-b-2 px-4 py-2 text-sm font-medium ${
                skill === null
                  ? 'border-line border-b-ink bg-surface text-ink'
                  : 'border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              <Inbox className="h-4 w-4" />
              Chưa phân loại
              <span className="text-xs text-ink-faint">{unsorted}</span>
            </Link>
          )}
        </div>
      </nav>

      {skill === null && (
        <p className="mb-4 text-sm text-ink-soft">
          Ghi chú cũ từ mục “Ghi chú” trước đây. Mở từng ghi chú, chọn kỹ năng rồi lưu để chuyển
          vào mục tương ứng.
        </p>
      )}

      <PersonalNotes
        key={skill ?? 'none'}
        userId={user!.id}
        skill={skill}
        initialNotes={notes}
        initialUrls={urls}
        initialCategories={categories}
      />
    </div>
  );
}
