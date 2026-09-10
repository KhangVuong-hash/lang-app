import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { extractYoutubeId } from '@/lib/youtube';

export async function POST(req: NextRequest) {
  try {
    const { youtubeUrl, lang } = await req.json();

    if (!youtubeUrl) {
      return NextResponse.json({ error: 'Thiếu youtubeUrl' }, { status: 400 });
    }

    const videoId = extractYoutubeId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json({ error: 'URL YouTube không hợp lệ' }, { status: 400 });
    }

    // youtube-transcript lấy phụ đề (script) có sẵn trên YouTube (tự động hoặc do người tạo video upload)
    const rawSegments = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: lang || undefined, // ví dụ 'en', 'ja', 'ko', 'zh-Hans' — để trống thì lấy track mặc định
    });

    // Chuẩn hoá dữ liệu: offset (ms) -> start_seconds, duration (ms) -> end_seconds
    const segments = rawSegments.map((seg, idx) => ({
      order_index: idx,
      start_seconds: Math.round((seg.offset / 1000) * 100) / 100,
      end_seconds: Math.round(((seg.offset + seg.duration) / 1000) * 100) / 100,
      text_content: seg.text.replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim(),
    }));

    return NextResponse.json({ videoId, segments });
  } catch (err: any) {
    console.error('Transcript fetch error:', err);
    // Video không có caption / bị chặn / private...
    return NextResponse.json(
      {
        error:
          'Không lấy được script tự động từ video này (có thể video không có phụ đề, hoặc phụ đề bị tắt). Bạn có thể nhập script thủ công.',
        detail: err?.message,
      },
      { status: 422 }
    );
  }
}
