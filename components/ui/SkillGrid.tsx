import Link from 'next/link';
import SkillIcon from './SkillIcon';
import StatusPill from './StatusPill';
import { SKILLS, type SkillKey } from '@/lib/constants';

export default function SkillGrid({
  basePath,
  enabledMap,
  counts,
}: {
  /** ví dụ: /classes/abc */
  basePath: string;
  enabledMap: Partial<Record<SkillKey, boolean>>;
  counts?: Partial<Record<SkillKey, number>>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SKILLS.map((s) => {
        const enabled = !!enabledMap[s.key];
        const count = counts?.[s.key];
        const inner = (
          <>
            <div className="flex items-start justify-between">
              <SkillIcon skill={s.key} size="lg" muted={!enabled} />
              {enabled ? (
                <StatusPill tone="open">Đang mở</StatusPill>
              ) : (
                <StatusPill tone="closed">Đang đóng</StatusPill>
              )}
            </div>
            <h3 className="mt-4 text-lg font-semibold">{s.label}</h3>
            <p className="mt-1 text-sm text-ink-soft">
              {enabled
                ? count != null
                  ? `${count} nội dung`
                  : s.blurb
                : s.comingSoon
                  ? 'Kỹ năng này đang được hoàn thiện'
                  : 'Giáo viên chưa mở kỹ năng này'}
            </p>
          </>
        );

        return enabled ? (
          <Link
            key={s.key}
            href={`${basePath}/${s.key}`}
            className="card card-hover p-5"
            style={{ borderLeft: `4px solid ${s.color}` }}
          >
            {inner}
          </Link>
        ) : (
          <div
            key={s.key}
            className="card cursor-not-allowed p-5 opacity-70"
            style={{ borderLeft: '4px solid #D9E1DF' }}
            aria-disabled
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}
