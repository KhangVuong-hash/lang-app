import { SKILL_MAP, type SkillKey } from '@/lib/constants';

const SIZES = {
  sm: 'h-8 w-8 text-base rounded-lg',
  md: 'h-11 w-11 text-xl rounded-xl',
  lg: 'h-14 w-14 text-2xl rounded-2xl',
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
  return (
    <span
      className={`grid place-items-center ${SIZES[size]} ${muted ? 'grayscale' : ''}`}
      style={{ backgroundColor: `${s.color}1A` }}
      aria-hidden
    >
      {s.icon}
    </span>
  );
}
