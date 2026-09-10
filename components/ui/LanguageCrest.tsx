import { LANGUAGE_MAP } from '@/lib/constants';

const SIZES = {
  sm: 'h-9 w-9 text-xs rounded-lg',
  md: 'h-12 w-12 text-sm rounded-xl',
  lg: 'h-16 w-16 text-lg rounded-2xl',
};

export default function LanguageCrest({
  code,
  size = 'md',
}: {
  code?: string | null;
  size?: keyof typeof SIZES;
}) {
  const lang = (code && LANGUAGE_MAP[code]) || null;
  const label = lang?.native ?? '?';
  const color = lang?.color ?? '#4C666F';
  return (
    <span
      className={`grid shrink-0 place-items-center font-display font-bold ${SIZES[size]}`}
      style={{ backgroundColor: `${color}1A`, color }}
      title={lang?.name}
      aria-hidden
    >
      {label}
    </span>
  );
}
