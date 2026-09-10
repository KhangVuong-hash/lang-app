import { NextRequest, NextResponse } from 'next/server';
import { extractYoutubeId } from '@/lib/youtube';

export const maxDuration = 60; // Gemini có thể mất vài chục giây với video dài

type Segment = {
  order_index: number;
  start_seconds: number;
  end_seconds: number;
  text_content: string;
};

const PROMPT =
  'Chép lời (transcribe) video YouTube này theo từng câu hoặc cụm ngắn, đúng ngôn ngữ gốc. ' +
  'CHỈ trả về một mảng JSON gồm các object {"start": <giây tính từ đầu video, số thực>, "text": <chuỗi>}, ' +
  'theo thứ tự thời gian. Không kèm giải thích, không markdown, không ```json.';

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
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
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

async function callGemini(model: string, youtubeUrl: string, apiKey: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { parts: [{ fileData: { fileUri: youtubeUrl } }, { text: PROMPT }] },
        ],
        generationConfig: { temperature: 0 },
      }),
    }
  );

  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`${model} → HTTP ${res.status}: ${bodyText.slice(0, 400)}`);
  }

  let data: any;
  try {
    data = JSON.parse(bodyText);
  } catch {
    throw new Error(`${model} → phản hồi không phải JSON`);
  }

  const cand = data?.candidates?.[0];
  const partText = cand?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('\n');
  if (!partText) {
    throw new Error(`${model} → không có nội dung (${cand?.finishReason ?? 'unknown'})`);
  }

  return toSegments(extractJsonArray(partText));
}

export async function POST(req: NextRequest) {
  const { youtubeUrl } = await req.json();

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

  const models = [
    ...new Set(
      [
        process.env.GEMINI_MODEL,
        'gemini-3.6-flash',
        'gemini-flash-latest',
        'gemini-2.0-flash',
      ].filter(Boolean) as string[]
    ),
  ];

  const errors: string[] = [];
  for (const model of models) {
    try {
      const segments = await callGemini(model, youtubeUrl, apiKey);
      if (segments.length) return NextResponse.json({ videoId, segments, source: model });
      errors.push(`${model}: 0 câu`);
    } catch (e: any) {
      errors.push(e?.message ?? String(e));
    }
  }

  return NextResponse.json(
    {
      error: 'Gemini không lấy được script. Hãy dán transcript từ YouTube vào ô bên dưới.',
      detail: errors.join(' | '),
    },
    { status: 422 }
  );
}
