import Link from 'next/link';
import LanguageCrest from './LanguageCrest';
import { SKILLS, type SkillKey } from '@/lib/constants';
import { SKILL_ICON } from '@/lib/skill-icons';

export default function ClassCard({
  href,
  name,
  languageCode,
  level,
  meta,
  enabledSkills,
}: {
  href: string;
  name: string;
  languageCode?: string | null;
  level?: string | null;
  meta?: string;
  /** danh sách kỹ năng đang mở; nếu không truyền thì không hiện hàng icon */
  enabledSkills?: SkillKey[];
}) {
  return (
    <Link href={href} className="card card-hover flex gap-4 p-4">
      <LanguageCrest code={languageCode} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{name}</p>
        <p className="mt-0.5 text-xs text-ink-faint">
          {[level || 'Chưa xếp trình độ', meta].filter(Boolean).join(' · ')}
        </p>
        {enabledSkills && (
          <div className="mt-3 flex gap-1.5">
            {SKILLS.map((s) => {
              const on = enabledSkills.includes(s.key);
              const Icon = SKILL_ICON[s.key];
              return (
                <span
                  key={s.key}
                  title={`${s.label}: ${on ? 'đang mở' : 'đang đóng'}`}
                  className="grid h-6 w-6 place-items-center rounded-md"
                  style={{ backgroundColor: on ? `${s.color}1A` : '#00000010' }}
                  aria-hidden
                >
                  <Icon
                    className="h-3.5 w-3.5"
                    style={{ color: on ? s.color : '#88A0A7' }}
                  />
                </span>
              );
            })}
          </div>
        )}
      </div>
    </Link>
  );
}
