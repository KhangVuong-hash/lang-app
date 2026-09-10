export type ParsedSegment = {
  order_index: number;
  start_seconds: number;
  end_seconds: number;
  text_content: string;
};

const TS_ONLY = /^(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.\d+)?$/;
const TS_INLINE = /^(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.\d+)?[\s\]\)-]+(.+)$/;

function toSec(h: string | undefined, m: string, s: string) {
  return (h ? Number(h) * 3600 : 0) + Number(m) * 60 + Number(s);
}

function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?…]+[.!?…]+["'”’)]?|\S[^.!?…]*$/g);
  return (parts ?? [text]).map((s) => s.trim()).filter(Boolean);
}

/**
 * Chuyển transcript dán từ YouTube ("Show transcript") hoặc văn bản thô thành segments.
 * Hỗ trợ:
 *   - dòng timestamp "m:ss" / "h:mm:ss" rồi dòng text bên dưới
 *   - "m:ss  text" trên cùng một dòng
 *   - không có timestamp: tự tách theo câu, mỗi câu ~3s
 */
export function parseTranscript(raw: string): ParsedSegment[] {
  const lines = raw
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const items: { t: number; text: string }[] = [];
  let pendingT: number | null = null;

  for (const line of lines) {
    const inline = line.match(TS_INLINE);
    if (inline) {
      items.push({ t: toSec(inline[1], inline[2], inline[3]), text: inline[4].trim() });
      pendingT = null;
      continue;
    }
    const tsOnly = line.match(TS_ONLY);
    if (tsOnly) {
      pendingT = toSec(tsOnly[1], tsOnly[2], tsOnly[3]);
      continue;
    }
    if (pendingT != null) {
      items.push({ t: pendingT, text: line });
      pendingT = null;
    } else if (items.length && items[items.length - 1].t >= 0) {
      items[items.length - 1].text += ' ' + line;
    } else {
      items.push({ t: -1, text: line });
    }
  }

  const hasTs = items.some((i) => i.t >= 0);

  if (!hasTs) {
    const sentences = splitSentences(items.map((i) => i.text).join(' '));
    return sentences.map((text, i) => ({
      order_index: i,
      start_seconds: i * 3,
      end_seconds: i * 3 + 3,
      text_content: text,
    }));
  }

  const withTs = items.filter((i) => i.t >= 0);
  return withTs.map((it, i) => ({
    order_index: i,
    start_seconds: it.t,
    end_seconds: i + 1 < withTs.length ? Math.max(withTs[i + 1].t, it.t + 0.5) : it.t + 3,
    text_content: it.text,
  }));
}
