import { NextRequest, NextResponse } from 'next/server';
import { extractYoutubeId } from '@/lib/youtube';

export const maxDuration = 60;

type Segment = {
  order_index: number;
  start_seconds: number;
  end_seconds: number;
  text_content: string;
};

function normalize(
  list: { start: number; end?: number; text: string }[]
): Segment[] {
  return list
    .filter((p) => p && typeof p.text === 'string' && p.text.trim())
    .map((p, i, arr) => {
      const start = Number(p.start) || 0;
      const end =
        p.end != null && Number(p.end) > start
          ? Number(p.end)
          : arr[i + 1]
            ? Number(arr[i + 1].start)
            : start + 3;
      return {
        order_index: i,
        start_seconds: Math.round(start * 100) / 100,
        end_seconds: Math.round(Math.max(end, start + 0.5) * 100) / 100,
        text_content: p.text.replace(/\s+/g, ' ').trim(),
      };
    });
}

/** Gộp các mẩu phụ đề ngắn của YouTube thành câu (~ kết thúc bằng dấu câu hoặc ≤ 16 từ). */
function groupChunks(
  chunks: { start: number; end: number; text: string }[]
): { start: number; end: number; text: string }[] {
  const out: { start: number; end: number; text: string }[] = [];
  let cur: { start: number; end: number; text: string } | null = null;

  for (const c of chunks) {
    const t = c.text.replace(/\s+/g, ' ').trim();
    if (!t || /^\[.*\]$/.test(t)) continue; // bỏ [Music], [Applause]...
    if (!cur) {
      cur = { start: c.start, end: c.end, text: t };
      continue;
    }
    cur.text += ' ' + t;
    cur.end = c.end;
    const words = cur.text.split(' ').length;
    if (/[.!?…]["')\]]?$/.test(cur.text) || words >= 16) {
      out.push(cur);
      cur = null;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** Supadata — https://supadata.ai (lấy phụ đề có sẵn của YouTube, nhanh, không timeout). */
async function viaSupadata(youtubeUrl: string, apiKey: string): Promise<Segment[]> {
  const res = await fetch(
    `https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(youtubeUrl)}`,
    { headers: { 'x-api-key': apiKey } }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Supadata HTTP ${res.status}: ${text.slice(0, 200)}`);

  const data = JSON.parse(text);
  const chunks: any[] = data.content ?? data.transcript ?? [];
  const raw = chunks.map((c) => {
    const offMs = Number(c.offset ?? c.start ?? 0);
    const durMs = Number(c.duration ?? 0);
    return { start: offMs / 1000, end: (offMs + durMs) / 1000, text: String(c.text ?? '') };
  });
  return normalize(groupChunks(raw));
}

const GEMINI_PROMPT =
  'Chép lời (transcribe) video YouTube này theo từng câu hoặc cụm ngắn, đúng ngôn ngữ gốc. ' +
  'CHỈ trả về một mảng JSON gồm các object {"start": <giây, số thực>, "text": <chuỗi>} theo thứ tự thời gian. ' +
  'Không kèm giải thích, không markdown.';

function extractJsonArray(text: string): any[] {
  const cleaned = text.replace(/```json\s*|```/g, '').trim();
  try {
    const v = JSON.parse(cleaned);
    if (Array.isArray(v)) return v;
    if (Array.isArray(v?.segments)) return v.segments;
  } catch {
    const m = cleaned.match(/\[[\s\S]*\]/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* ignore */
      }
    }
  }
  return [];
}

async function viaGemini(youtubeUrl: string, apiKey: string): Promise<Segment[]> {
  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const maxSeconds = Number(process.env.GEMINI_MAX_SECONDS || 900);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 50_000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  fileData: { fileUri: youtubeUrl },
                  videoMetadata: { startOffset: '0s', endOffset: `${maxSeconds}s` },
                },
                { text: GEMINI_PROMPT },
              ],
            },
          ],
          generationConfig: { temperature: 0, thinkingConfig: { thinkingLevel: 'LOW' } },
        }),
      }
    );
    const text = await res.text();
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${text.slice(0, 200)}`);
    const data = JSON.parse(text);
    const partText: string = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p?.text)
      .filter(Boolean)
      .join('\n');
    return normalize(
      extractJsonArray(partText).map((p: any) => ({ start: Number(p.start) || 0, text: String(p.text ?? '') }))
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  const { youtubeUrl } = await req.json().catch(() => ({}));

  if (!youtubeUrl) {
    return NextResponse.json({ error: 'Thiếu youtubeUrl' }, { status: 400 });
  }
  const videoId = extractYoutubeId(youtubeUrl);
  if (!videoId) {
    return NextResponse.json({ error: 'URL YouTube không hợp lệ' }, { status: 400 });
  }

  const errors: string[] = [];

  if (process.env.SUPADATA_API_KEY) {
    try {
      const segments = await viaSupadata(youtubeUrl, process.env.SUPADATA_API_KEY);
      if (segments.length) return NextResponse.json({ videoId, segments, source: 'supadata' });
      errors.push('Supadata: 0 câu');
    } catch (e: any) {
      errors.push(String(e?.message ?? e));
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const segments = await viaGemini(youtubeUrl, process.env.GEMINI_API_KEY);
      if (segments.length) return NextResponse.json({ videoId, segments, source: 'gemini' });
      errors.push('Gemini: 0 câu');
    } catch (e: any) {
      const aborted = e?.name === 'AbortError';
      errors.push(aborted ? 'Gemini: quá thời gian' : String(e?.message ?? e));
    }
  }

  return NextResponse.json(
    {
      error:
        errors.length === 0
          ? 'Chưa cấu hình khoá lấy script. Hãy dán transcript từ YouTube vào ô bên dưới.'
          : 'Không lấy được script tự động. Hãy dán transcript từ YouTube vào ô bên dưới.',
      detail: errors.join(' | '),
    },
    { status: 422 }
  );
}
