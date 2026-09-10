# Kỹ năng Nghe & Nói (cơ chế cốt lõi)

## Lấy script từ YouTube - `POST /api/youtube/transcript`

- Nhận `{ youtubeUrl, lang? }`. `extractYoutubeId` → video ID.
- `YoutubeTranscript.fetchTranscript(videoId, { lang })` lấy phụ đề public timedtext.
- Chuẩn hoá: `offset` (ms) → `start_seconds`, `offset + duration` → `end_seconds`, giải mã
  vài HTML entity trong `text`.
- Lỗi (video không phụ đề / private / YouTube đổi cấu trúc) → trả `422` kèm thông điệp; UI
  luôn có lối thoát: giáo viên nhập / sửa script thủ công.

`youtube-transcript` là thư viện **không chính thức** - coi như best-effort.

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
