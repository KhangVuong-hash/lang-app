import Link from 'next/link';
import Logo from './Logo';
import { SKILLS, LANGUAGES, SIGNUP_ENABLED } from '@/lib/constants';

export default function Footer({ variant = 'public' }: { variant?: 'public' | 'app' }) {
  if (variant === 'app') {
    return (
      <footer className="border-t border-line bg-surface">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-ink-faint sm:flex-row">
          <p>© {new Date().getFullYear()} BanThuApp - Học ngoại ngữ theo lớp</p>
          <Link href="/notebook" className="hover:text-ink">
            Sổ tay từ vựng &amp; ngữ pháp
          </Link>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-ink-soft">
            Nền tảng học ngoại ngữ theo lớp học: giáo viên xây bài từ video thật, học sinh
            luyện đủ bốn kỹ năng và được theo dõi tiến độ.
          </p>
        </div>

        <nav className="space-y-2 text-sm">
          <p className="font-display font-semibold text-ink">Bốn kỹ năng</p>
          {SKILLS.map((s) => (
            <p key={s.key} className="text-ink-soft">
              <span aria-hidden>{s.icon}</span> {s.label}
              {s.comingSoon && <span className="text-ink-faint"> - sắp có</span>}
            </p>
          ))}
        </nav>

        <nav className="space-y-2 text-sm">
          <p className="font-display font-semibold text-ink">Ngôn ngữ hỗ trợ</p>
          {LANGUAGES.map((l) => (
            <p key={l.code} className="text-ink-soft">
              <span aria-hidden>{l.flag}</span> {l.name} · {l.native}
            </p>
          ))}
          <p className="text-ink-faint">Thêm ngôn ngữ mới đang được chuẩn bị</p>
        </nav>

        <div className="space-y-2 text-sm">
          <p className="font-display font-semibold text-ink">Liên hệ</p>
          <a href="mailto:hotro@BanThuApp.vn" className="block text-ink-soft hover:text-ink">
            hotro@BanThuApp.vn
          </a>
          {SIGNUP_ENABLED && (
            <Link href="/register" className="block text-ink-soft hover:text-ink">
              Tạo tài khoản học sinh
            </Link>
          )}
          <Link href="/login" className="block text-ink-soft hover:text-ink">
            Đăng nhập
          </Link>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page py-4 text-xs text-ink-faint">
          © {new Date().getFullYear()} BanThuApp. Ảnh minh hoạ và lời chứng thực trên trang này
          chỉ mang tính ví dụ.
        </div>
      </div>
    </footer>
  );
}
