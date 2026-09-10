import { SKILL_MAP, type SkillKey } from '@/lib/constants';
import { SKILL_ICON } from '@/lib/skill-icons';

const SIZES = {
  sm: { box: 'h-8 w-8 rounded-lg', icon: 'h-4 w-4' },
  md: { box: 'h-11 w-11 rounded-xl', icon: 'h-5 w-5' },
  lg: { box: 'h-14 w-14 rounded-2xl', icon: 'h-6 w-6' },
};

export default function SkillIcon({
  skill,
  size = 'md',
  muted = false,
}: {
  skill: SkillKey;
  size?: keyof typeof SIZES;
  muted?: boolean;
}) {
  const s = SKILL_MAP[skill];
  const Icon = SKILL_ICON[skill];
  const sz = SIZES[size];
  return (
    <span
      className={`grid place-items-center ${sz.box}`}
      style={{ backgroundColor: muted ? '#00000010' : `${s.color}1A` }}
      aria-hidden
    >
      <Icon className={sz.icon} style={{ color: muted ? '#88A0A7' : s.color }} />
    </span>
  );
}
