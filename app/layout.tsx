import './globals.css';
import type { ReactNode } from 'react';
import { Space_Grotesk, Be_Vietnam_Pro } from 'next/font/google';

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
  title: 'LangApp — Học ngoại ngữ theo lớp: Nghe, Nói, Viết, Đọc',
  description:
    'Nền tảng học ngoại ngữ đa ngôn ngữ (Anh, Trung, Nhật, Hàn) theo lớp học, luyện đủ 4 kỹ năng với video thật và giáo viên theo dõi sát.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-paper text-ink">{children}</body>
    </html>
  );
}
