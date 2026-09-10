import './globals.css';
import type { ReactNode } from 'react';
import { Space_Grotesk, Be_Vietnam_Pro } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';

const display = Space_Grotesk({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata = {
  title: 'BanThuApp - Học ngoại ngữ: Nghe, Nói, Viết, Đọc',
  description:
    'Nền tảng học ngoại ngữ đa ngôn ngữ (Anh, Trung, Nhật, Hàn) theo lớp học, luyện đủ 4 kỹ năng với video thật và giáo viên theo dõi sát.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-paper text-ink">
        <NextTopLoader color="#1C4A57" height={3} showSpinner={false} shadow="0 0 8px #1C4A57" />
        {children}
      </body>
    </html>
  );
}
