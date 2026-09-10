import Link from 'next/link';

export default function Logo({
  href = '/',
  tone = 'ink',
  className = '',
}: {
  href?: string;
  tone?: 'ink' | 'light';
  className?: string;
}) {
  const light = tone === 'light';
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 font-display text-lg font-bold ${
        light ? 'text-white' : 'text-ink'
      } ${className}`}
    >
      <span
        className={`grid h-8 w-8 place-items-center rounded-lg ${
          light ? 'bg-white/15' : 'bg-brand'
        }`}
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H10l-4.15 3.5A1 1 0 0 1 4 17.75V5.5Z"
            fill="#fff"
          />
          <path
            d="M8 8h8M8 11h5"
            stroke="#1C4A57"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span>BanThuApp</span>
    </Link>
  );
}
