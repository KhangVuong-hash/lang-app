import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { extractYoutubeId } from '@/lib/youtube';

export const maxDuration = 60; // Gemini có thể mất vài chục giây với video dài

type Segment = {
  order_index: number;
  start_seconds: number;
  end_seconds: number;
  text_content: string;
};

/** Cách 1: dịch vụ transcript của Google Gemini (nhận thẳng URL YouTube). */
async function viaGemini(youtubeUrl: string, apiKey: string): Promise<Segment[]> {
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { fileData: { fileUri: youtubeUrl } },
              {
                text:
                  'Chép lời video này theo từng câu hoặc cụm ngắn, đúng ngôn ngữ gốc. ' +
                  'Trả về JSON: mảng các object {"start": <giây, số>, "text": <chuỗi>} theo thứ tự thời gian. ' +
                  'Không thêm giải thích, không markdown.',
              },
            ],
          },
        ],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  const parsed = JSON.parse(raw) as { start: number; text: string }[];

  return parsed
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

/** Cách 2 (dự phòng): cào phụ đề public - hay bị chặn trên IP datacenter. */
async function viaScrape(videoId: string, lang?: string): Promise<Segment[]> {
  const raw = await YoutubeTranscript.fetchTranscript(videoId, { lang: lang || undefined });
  return raw.map((seg, idx) => ({
    order_index: idx,
    start_seconds: Math.round((seg.offset / 1000) * 100) / 100,
    end_seconds: Math.round(((seg.offset + seg.duration) / 1000) * 100) / 100,
    text_content: seg.text.replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim(),
  }));
}

export async function POST(req: NextRequest) {
  const { youtubeUrl, lang } = await req.json();

  if (!youtubeUrl) {
    return NextResponse.json({ error: 'Thiếu youtubeUrl' }, { status: 400 });
  }
  const videoId = extractYoutubeId(youtubeUrl);
  if (!videoId) {
    return NextResponse.json({ error: 'URL YouTube không hợp lệ' }, { status: 400 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const attempts: string[] = [];

  if (geminiKey) {
    try {
      const segments = await viaGemini(youtubeUrl, geminiKey);
      if (segments.length) return NextResponse.json({ videoId, segments, source: 'gemini' });
      attempts.push('Gemini không trả về câu nào');
    } catch (e: any) {
      attempts.push(`Gemini: ${e.message}`);
    }
  }

  try {
    const segments = await viaScrape(videoId, lang);
    return NextResponse.json({ videoId, segments, source: 'scrape' });
  } catch (e: any) {
    attempts.push(`Cào phụ đề: ${e?.message}`);
  }

  return NextResponse.json(
    {
      error:
        'Không lấy được script tự động cho video này. Bạn có thể dán transcript từ YouTube ' +
        '("Hiển thị bản chép lời") hoặc nhập tay bên dưới.',
      detail: attempts.join(' | '),
    },
    { status: 422 }
  );
}
