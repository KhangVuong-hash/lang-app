import Link from 'next/link';
import { BookMarked, GraduationCap, SpellCheck } from 'lucide-react';

/** Link sang bộ từ FCE, cùng kiểu với nút chuyển mục của Sổ tay. */
export const DECK_LINK = {
  href: '/profile/notebook/decks/fce',
  label: 'Bộ từ FCE',
  Icon: GraduationCap,
};

const ITEMS = [
  { href: '/profile/notebook', label: 'Từ vựng', Icon: BookMarked },
  { href: '/profile/notebook?tab=grammar', label: 'Ngữ pháp', Icon: SpellCheck },
  DECK_LINK,
];

/** Thanh chuyển mục Sổ tay dùng ở trang bộ từ (trang Sổ tay tự vẽ nút của nó). */
export default function NotebookNav({ active }: { active: string }) {
  return (
    <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <nav aria-label="Sổ tay" className="inline-flex min-w-max rounded-lg bg-paper p-1">
        {ITEMS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={href === active ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
              href === active ? 'bg-surface text-ink shadow-card' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
