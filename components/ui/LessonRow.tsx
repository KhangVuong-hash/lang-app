import Link from 'next/link';

export default function LessonRow({
  href,
  title,
  subtitle,
  thumbnailId,
}: {
  href: string;
  title: string;
  subtitle?: string;
  thumbnailId?: string | null;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-paper">
      {thumbnailId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://img.youtube.com/vi/${thumbnailId}/default.jpg`}
          className="h-12 w-[72px] shrink-0 rounded-md object-cover"
          alt=""
        />
      ) : (
        <span
          className="grid h-12 w-[72px] shrink-0 place-items-center rounded-md bg-paper text-ink-faint"
          aria-hidden
        >
          ▷
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{title}</p>
        {subtitle && <p className="truncate text-xs text-ink-faint">{subtitle}</p>}
      </div>
    </Link>
  );
}
