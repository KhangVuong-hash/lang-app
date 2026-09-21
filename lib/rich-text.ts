// Rich text của sổ tay lưu dưới dạng HTML, chỉ cho phép vài thẻ định dạng cơ bản.
// Lọc bằng string thuần (không DOMParser) để chạy được cả khi SSR lẫn ở client.

const ALLOWED = new Set(['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div']);

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAngles(s: string): string {
  return s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Giữ lại thẻ trong allowlist (bỏ hết thuộc tính), thẻ khác bị bỏ, `<` `>` lẻ bị escape. */
export function sanitizeHtml(html: string): string {
  const tag = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(html))) {
    out += escapeAngles(html.slice(last, m.index));
    const name = m[2].toLowerCase();
    if (ALLOWED.has(name)) out += name === 'br' ? '<br>' : `<${m[1]}${name}>`;
    last = m.index + m[0].length;
  }
  return out + escapeAngles(html.slice(last));
}

export function isEmptyHtml(html: string | null | undefined): boolean {
  if (!html) return true;
  return sanitizeHtml(html).replace(/<[^>]*>|&nbsp;|\s/g, '') === '';
}

/** Chuẩn hoá trước khi lưu: null nếu rỗng, bỏ dòng trống ở cuối. */
export function cleanHtml(html: string): string | null {
  if (isEmptyHtml(html)) return null;
  return sanitizeHtml(html)
    .replace(/(\s|<br>|<(div|p)><br><\/\2>)+$/g, '')
    .trim();
}
