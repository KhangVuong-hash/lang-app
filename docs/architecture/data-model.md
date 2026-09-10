# Mô hình dữ liệu

Nguồn sự thật: `supabase/migrations/` (migration đầu tiên `*_initial_schema.sql`).

## Bảng chính

```
auth.users (Supabase)
  └─ profiles (id = auth.users.id)          role: admin | user
                                            full_name, avatar_url, bio

languages (code PK: en/zh/ja/ko, name)

classes (teacher_id → profiles, language_code → languages)
  ├─ class_skills (class_id, skill_type: listening|speaking|writing|reading, is_enabled)
  │                UNIQUE(class_id, skill_type)
  └─ enrollments (class_id, student_id → profiles, status)   UNIQUE(class_id, student_id)

listening_lessons (class_id, youtube_url, youtube_video_id, transcript_source)
  └─ listening_script_segments (lesson_id, order_index, start_seconds, end_seconds, text_content)

speaking_lessons (class_id, source_url, source_type, youtube_video_id)
  ├─ speaking_script_segments (lesson_id, order_index, start/end_seconds, text_content)
  └─ speaking_submissions (segment_id, student_id, audio_storage_path)

writing_topics (class_id, teacher_id, topic_type: essay|translation, prompt, source_text)
  └─ writing_submissions (topic_id, student_id, content, status: draft|submitted|reviewed)
       UNIQUE(topic_id, student_id)
       └─ writing_reviews (submission_id, teacher_id, feedback, score, inline_comments jsonb)

vocabulary_notes / grammar_notes (user_id → profiles, class_id?, language_code?)  - sổ tay riêng
```

## Trigger

| Trigger | Khi | Việc |
|---|---|---|
| `on_auth_user_created` | INSERT `auth.users` | tạo `profiles` role `user`, đọc `full_name` từ metadata |
| `on_class_created` | INSERT `classes` | tạo 4 dòng `class_skills` (reading `is_enabled=false`) |
| `trg_prevent_self_role_escalation` | UPDATE `profiles` | chặn user tự đổi `role` (RLS là row-level, không chặn được cột) |
| `trg_writing_submissions_updated_at` | UPDATE `writing_submissions` | tự bump `updated_at` |
| `set_audit_fields()` (trg_audit_*) | UPDATE `classes` / `listening_lessons` / `speaking_lessons` / `writing_topics` | tự set `updated_at = now()`, `updated_by = auth.uid()` |

**Soft delete + audit:** 4 bảng trên có `created_by`, `updated_at/by`, `deleted_at/by`.
Nút "Xoá" chỉ set `deleted_at`/`deleted_by` (không DELETE). Mọi truy vấn đọc lọc
`deleted_at is null`; policy hướng học sinh cũng thêm điều kiện đó. Segments
(`*_script_segments`) vẫn xoá cứng vì bị thay toàn bộ khi sửa script.

Mọi SECURITY DEFINER function đặt `search_path = ''` + schema-qualify (chuẩn Supabase advisor).

## RLS

Bật trên **mọi** bảng public (kể cả `languages` - chỉ đọc, không ai ghi qua API).
Mọi policy giới hạn `to authenticated`. Ba hàm `security definer` làm helper:

- `is_admin()` - user hiện tại có role admin
- `is_enrolled(class_id)` - đang là học sinh active của lớp
- `is_class_teacher(class_id)` - là giáo viên của lớp

Mẫu chung: giáo viên `FOR ALL` trên nội dung lớp mình; học sinh `FOR SELECT` nếu enrolled;
bài nộp / ghi âm / sổ tay là **owner-only** (`user_id/student_id = auth.uid()`); admin thấy tất cả.
Riêng `writing_submissions` có thêm policy `FOR UPDATE` cho giáo viên (đổi status → reviewed).
`writing_reviews` có `UNIQUE(submission_id)` (app dùng upsert onConflict).

## Storage

Bucket `speaking-recordings` (private). Quy ước path: `{user_id}/{segment_id}-{timestamp}.webm`.
Policy: chủ sở hữu upload/đọc file trong thư mục tên bằng `auth.uid()`. Giáo viên nghe lại
bài học sinh → dự kiến dùng signed URL sinh phía server (service role) - **chưa làm**.
