# Kỹ năng Nghe & Nói (cơ chế cốt lõi)

## Lấy script từ YouTube - `POST /api/youtube/transcript`

- Nhận `{ youtubeUrl }`. `extractYoutubeId` để validate.
- Gọi **Google Gemini** (`generateContent`, `fileData.fileUri` = URL YouTube), prompt yêu
  cầu trả mảng JSON `{start, text}`. Thử lần lượt `GEMINI_MODEL` → `gemini-3.6-flash` →
  `gemini-flash-latest` → `gemini-2.0-flash`. Strip ```` ```json ```` rồi parse.
- Cần env `GEMINI_API_KEY` (free tier ở aistudio.google.com/apikey). Không có key hoặc
  Gemini fail → `422` kèm `detail`; UI chuyển sang **dán transcript thủ công**
  (`lib/transcript.ts` `parseTranscript`) hoặc nhập từng dòng.
- Không còn dùng thư viện `youtube-transcript` (hay bị chặn trên IP datacenter).
- Video dài (>20 phút) mất 20-60s và tốn token; có thể bị cắt ở `outputTokenLimit`.

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
