# Kỹ năng Nghe & Nói (cơ chế cốt lõi)

## Lấy script từ YouTube - `POST /api/youtube/transcript`

Nhận `{ youtubeUrl }`, validate bằng `extractYoutubeId`, rồi thử theo thứ tự:

1. **Supadata** (`SUPADATA_API_KEY`) — `GET api.supadata.ai/v1/youtube/transcript?url=`,
   header `x-api-key`. Trả `content[]` (`offset`/`duration` ms). `groupChunks()` gộp các
   mẩu phụ đề ngắn thành câu (kết thúc bằng dấu câu hoặc ≤16 từ), bỏ `[Music]`. Nhanh (~2s),
   không timeout. Cách chính.
2. **Gemini** (`GEMINI_API_KEY`) — `generateContent`, `fileData.fileUri` = URL YouTube,
   `thinkingLevel: LOW`, `videoMetadata.endOffset` = `GEMINI_MAX_SECONDS` (900). Dùng cho
   video **không có phụ đề**. Chậm; `AbortController` huỷ ở 50s.
3. Cả hai fail → `422` kèm `detail`. UI chuyển sang **dán transcript thủ công**
   (`lib/transcript.ts` `parseTranscript`).

`normalize()` chuẩn hoá về `{order_index, start_seconds, end_seconds, text_content}`.
Không còn dùng `youtube-transcript` (bị chặn trên IP datacenter).

## Tạo bài (giáo viên)

`listening/new` và `speaking/new`: nhập tiêu đề + URL → "Lấy script tự động" → sửa từng
dòng (text, mốc giây), thêm/xoá dòng thủ công → lưu. Ghi `*_lessons` rồi bulk-insert
`*_script_segments` với `order_index` chạy lại từ 0.

## Player (học sinh)

`YouTubeScriptPlayer` (Nghe) và `ShadowingPlayer` (Nói) dùng chung ý tưởng:

- Nạp YouTube IFrame API một lần (promise cache ở module scope).
- `requestAnimationFrame` loop đọc `getCurrentTime()`:
  - xác định segment đang phát (`start ≤ t < end`) → highlight.
  - nếu đang bật **Lặp** và `t ≥ end` của segment mục tiêu → `seekTo(start)`.
- **Tua**: `seekTo(start)` + `playVideo()`.
- **Lặp**: toggle segment mục tiêu (lưu trong `loopSegmentRef`).
- Tốc độ: `setPlaybackRate` (0.5 / 0.75 / 1 / 1.25).

`ShadowingPlayer` thêm `AudioRecorder` mỗi câu (khi `showRecorder`):

- `navigator.mediaDevices.getUserMedia({ audio })` → `MediaRecorder` → Blob `audio/webm`.
- Upload `speaking-recordings/{user_id}/{segment_id}-{timestamp}.webm`, rồi insert
  `speaking_submissions`.

Trang giáo viên xem trước: cùng player, `showRecorder={false}`.
