import { NextRequest, NextResponse } from 'next/server';
import { extractYoutubeId } from '@/lib/youtube';

export const maxDuration = 60; // Vercel: Hobby tối đa 60s

type Segment = {
  order_index: number;
  start_seconds: number;
  end_seconds: number;
  text_content: string;
};

const PROMPT =
  'Chép lời (transcribe) video YouTube này theo từng câu hoặc cụm ngắn, đúng ngôn ngữ gốc. ' +
  'CHỈ trả về một mảng JSON gồm các object {"start": <giây tính từ đầu video, số thực>, "text": <chuỗi>}, ' +
  'theo thứ tự thời gian. Không kèm giải thích, không markdown.';

function toSegments(list: { start: number; text: string }[]): Segment[] {
  return list
    .filter((p) => p && typeof p.text === 'string' && p.text.trim())
    .map((p, i, arr) => {
      const start = Number(p.start) || 0;
      const next = arr[i + 1] ? Number(arr[i + 1].start) : start + 3;
      return {
        order_index: i,
        start_seconds: Math.round(start * 100) / 100,
        end_seconds: Math.round(Math.max(next, start + 0.5) * 100) / 100,
        text_content: p.text.trim(),
      };
    });
}

function extractJsonArray(text: string): { start: number; text: string }[] {
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

export async function POST(req: NextRequest) {
  const { youtubeUrl } = await req.json().catch(() => ({}));

  if (!youtubeUrl) {
    return NextResponse.json({ error: 'Thiếu youtubeUrl' }, { status: 400 });
  }
  const videoId = extractYoutubeId(youtubeUrl);
  if (!videoId) {
    return NextResponse.json({ error: 'URL YouTube không hợp lệ' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Chưa cấu hình GEMINI_API_KEY. Hãy dán transcript từ YouTube ("Hiển thị bản chép lời") vào ô bên dưới.',
      },
      { status: 422 }
    );
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  // Chép hết video dài (30+ phút) vượt quá giới hạn thời gian của serverless.
  // Giới hạn cửa sổ xử lý; giáo viên dán phần còn lại nếu cần.
  const maxSeconds = Number(process.env.GEMINI_MAX_SECONDS || 900);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55_000);

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
                { text: PROMPT },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            thinkingConfig: { thinkingLevel: 'LOW' }, // giảm độ trễ; 3.6-flash chấp nhận
          },
        }),
      }
    );

    const bodyText = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        {
          error: 'Gemini không lấy được script. Hãy dán transcript từ YouTube vào ô bên dưới.',
          detail: `${model} HTTP ${res.status}: ${bodyText.slice(0, 300)}`,
        },
        { status: 422 }
      );
    }

    const data = JSON.parse(bodyText);
    const partText: string = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p?.text)
      .filter(Boolean)
      .join('\n');

    const segments = toSegments(extractJsonArray(partText));
    if (!segments.length) {
      return NextResponse.json(
        {
          error: 'Gemini không trả về câu nào. Hãy dán transcript thủ công.',
          detail: `finishReason=${data?.candidates?.[0]?.finishReason ?? '?'}`,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ videoId, segments, source: model });
  } catch (e: any) {
    const aborted = e?.name === 'AbortError';
    return NextResponse.json(
      {
        error: aborted
          ? 'Video quá dài nên lấy script tự động bị quá thời gian. Hãy dùng video ngắn hơn hoặc dán transcript thủ công.'
          : 'Không gọi được Gemini. Hãy dán transcript từ YouTube vào ô bên dưới.',
        detail: String(e?.message ?? e),
      },
      { status: 422 }
    );
  } finally {
    clearTimeout(timer);
  }
}
