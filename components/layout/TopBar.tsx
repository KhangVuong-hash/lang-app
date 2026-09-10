export default function TopBar({ variant = 'public' }: { variant?: 'public' | 'app' }) {
  return (
    <div className="bg-brand-dark text-white/75">
      <div className="container-page flex h-9 items-center justify-between text-xs">
        <p className="hidden truncate sm:block">
          {variant === 'public'
            ? 'Học ngoại ngữ - Nghe · Nói · Viết · Đọc'
            : 'Chúc bạn một buổi học hiệu quả'}
        </p>
        <div className="flex items-center gap-3">
          <a href="mailto:hotro@BanThuApp.vn" className="hover:text-white">
            hotro@BanThuApp.vn
          </a>
          <span aria-hidden className="text-white/25">
            |
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="font-semibold text-white">VI</span>
            <span className="text-white/40" title="Giao diện tiếng Anh đang được phát triển">
              EN
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
