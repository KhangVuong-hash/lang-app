import { sanitizeHtml } from '@/lib/rich-text';

// Hiển thị HTML đã lưu từ RichTextEditor (luôn lọc lại trước khi render).
export default function RichText({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}
