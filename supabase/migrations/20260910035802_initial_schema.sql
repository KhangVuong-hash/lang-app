-- ============================================================
-- LANGUAGE LEARNING APP - SUPABASE SCHEMA (initial migration)
-- ============================================================
-- Review pass fixes:
--   * RLS bật cho MỌI bảng public (trước đây thiếu `languages`)
--   * writing_reviews: thêm UNIQUE(submission_id) - app dùng upsert onConflict
--   * writing_submissions: thêm policy cho giáo viên UPDATE (đổi status -> reviewed)
--   * mọi SECURITY DEFINER function: set search_path = '' + schema-qualify
--   * mọi policy: giới hạn `to authenticated` (toàn app nằm sau đăng nhập)
--   * FK teacher_id/student_id/created_by: thêm ON DELETE để xoá tài khoản không bị chặn
-- ============================================================

-- ---------- 0. EXTENSIONS ----------
create extension if not exists "pgcrypto";

-- ---------- 1. ROLES & PROFILES ----------
-- Chỉ 2 role: 'admin' (quản trị hệ thống) và 'user' (thành viên thường).
-- Việc "là giáo viên" hay "là học sinh" của một lớp được xác định theo QUAN HỆ:
--   classes.teacher_id = auth.uid()  -> là giáo viên lớp đó (is_class_teacher)
--   enrollments(student_id = auth.uid(), status='active') -> là học sinh lớp đó (is_enrolled)
-- Một 'user' có thể vừa tạo lớp (dạy) vừa tham gia lớp khác (học).
create type user_role as enum ('admin', 'user');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'user',
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamptz default now()
);

-- auto-create profile when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- 2. LANGUAGES ----------
create table languages (
  code text primary key,   -- 'en', 'zh', 'ja', 'ko'
  name text not null
);

insert into languages (code, name) values
  ('en', 'English'),
  ('zh', 'Chinese (Mandarin)'),
  ('ja', 'Japanese'),
  ('ko', 'Korean')
on conflict do nothing;

-- ---------- 3. CLASSES ----------
create table classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  language_code text not null references languages(code),
  level text,
  description text,
  created_at timestamptz default now()
);

create type skill_type as enum ('listening', 'speaking', 'writing', 'reading');

create table class_skills (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  skill_type skill_type not null,
  is_enabled boolean not null default true,
  unique (class_id, skill_type)
);

-- auto-create the 4 skill rows (reading disabled by default) when a class is created
create or replace function public.handle_new_class()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.class_skills (class_id, skill_type, is_enabled) values
    (new.id, 'listening', true),
    (new.id, 'speaking', true),
    (new.id, 'writing', true),
    (new.id, 'reading', false);
  return new;
end;
$$;

create trigger on_class_created
  after insert on classes
  for each row execute procedure public.handle_new_class();

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'active',
  joined_at timestamptz default now(),
  unique (class_id, student_id)
);

-- ---------- 4. LISTENING SKILL ----------
create table listening_lessons (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  title text not null,
  youtube_url text not null,
  youtube_video_id text not null,
  transcript_source text default 'auto', -- 'auto' | 'manual'
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table listening_script_segments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references listening_lessons(id) on delete cascade,
  order_index int not null,
  start_seconds numeric not null,
  end_seconds numeric not null,
  text_content text not null
);
create index idx_listening_segments_lesson on listening_script_segments(lesson_id, order_index);

-- ---------- 5. SPEAKING SKILL (shadowing) ----------
create table speaking_lessons (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  title text not null,
  source_url text not null,
  source_type text not null default 'youtube', -- 'youtube' | 'audio'
  youtube_video_id text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table speaking_script_segments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references speaking_lessons(id) on delete cascade,
  order_index int not null,
  start_seconds numeric not null,
  end_seconds numeric not null,
  text_content text not null
);
create index idx_speaking_segments_lesson on speaking_script_segments(lesson_id, order_index);

create table speaking_submissions (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references speaking_script_segments(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  audio_storage_path text not null,
  created_at timestamptz default now()
);

-- ---------- 6. WRITING SKILL ----------
create table writing_topics (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  topic_type text not null check (topic_type in ('essay','translation')),
  title text not null,
  prompt text,
  source_text text,
  created_at timestamptz default now()
);

create table writing_submissions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references writing_topics(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  content text,
  status text not null default 'draft' check (status in ('draft','submitted','reviewed')),
  submitted_at timestamptz,
  updated_at timestamptz default now(),
  unique (topic_id, student_id)
);

create table writing_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references writing_submissions(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  feedback text,
  score numeric,
  inline_comments jsonb,
  created_at timestamptz default now(),
  unique (submission_id) -- 1 review / submission - app dùng upsert onConflict: 'submission_id'
);

-- ---------- 7. VOCAB / GRAMMAR NOTEBOOK ----------
create table vocabulary_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  language_code text references languages(code),
  term text not null,
  meaning text,
  example_sentence text,
  created_at timestamptz default now()
);

create table grammar_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  language_code text references languages(code),
  title text not null,
  explanation text,
  example_sentence text,
  created_at timestamptz default now()
);

-- ---------- 8. updated_at cho writing_submissions ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_writing_submissions_updated_at
  before update on writing_submissions
  for each row execute procedure public.touch_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table languages enable row level security;
alter table classes enable row level security;
alter table class_skills enable row level security;
alter table enrollments enable row level security;
alter table listening_lessons enable row level security;
alter table listening_script_segments enable row level security;
alter table speaking_lessons enable row level security;
alter table speaking_script_segments enable row level security;
alter table speaking_submissions enable row level security;
alter table writing_topics enable row level security;
alter table writing_submissions enable row level security;
alter table writing_reviews enable row level security;
alter table vocabulary_notes enable row level security;
alter table grammar_notes enable row level security;

-- helper: is admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- helper: is enrolled in class
create or replace function public.is_enrolled(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments
    where class_id = cid and student_id = auth.uid() and status = 'active'
  );
$$;

-- helper: is teacher of class
create or replace function public.is_class_teacher(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.classes where id = cid and teacher_id = auth.uid()
  );
$$;

-- LANGUAGES (bảng tham chiếu - ai đăng nhập cũng đọc được, không ai ghi được qua API)
create policy "languages: read" on languages for select
  to authenticated using (true);

-- PROFILES
-- Người đã đăng nhập xem được thông tin cơ bản của nhau (tên giáo viên / bạn cùng lớp).
create policy "profiles: read (authenticated)" on profiles for select
  to authenticated using (true);
create policy "profiles: update own or admin" on profiles for update
  to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- SECURITY: chặn user thường tự nâng role qua policy "update own" ở trên
-- (RLS là row-level, không phải column-level, nên phải chặn bằng trigger).
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change user roles';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_self_role_escalation
  before update on profiles
  for each row execute procedure public.prevent_self_role_escalation();

-- CLASSES
create policy "classes: teacher manages own" on classes for all
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (teacher_id = auth.uid() or public.is_admin());
create policy "classes: enrolled students can view" on classes for select
  to authenticated using (public.is_enrolled(id));

-- CLASS SKILLS
create policy "class_skills: view if teacher or enrolled" on class_skills for select
  to authenticated
  using (public.is_class_teacher(class_id) or public.is_enrolled(class_id) or public.is_admin());
create policy "class_skills: teacher toggles" on class_skills for update
  to authenticated
  using (public.is_class_teacher(class_id) or public.is_admin())
  with check (public.is_class_teacher(class_id) or public.is_admin());

-- ENROLLMENTS
create policy "enrollments: teacher manages" on enrollments for all
  to authenticated
  using (public.is_class_teacher(class_id) or public.is_admin())
  with check (public.is_class_teacher(class_id) or public.is_admin());
create policy "enrollments: student views own" on enrollments for select
  to authenticated using (student_id = auth.uid());

-- LISTENING
create policy "listening_lessons: teacher manages" on listening_lessons for all
  to authenticated
  using (public.is_class_teacher(class_id) or public.is_admin())
  with check (public.is_class_teacher(class_id) or public.is_admin());
create policy "listening_lessons: students view" on listening_lessons for select
  to authenticated using (public.is_enrolled(class_id));

create policy "listening_segments: teacher manages" on listening_script_segments for all
  to authenticated
  using (public.is_class_teacher((select class_id from listening_lessons where id = lesson_id)) or public.is_admin())
  with check (public.is_class_teacher((select class_id from listening_lessons where id = lesson_id)) or public.is_admin());
create policy "listening_segments: students view" on listening_script_segments for select
  to authenticated
  using (public.is_enrolled((select class_id from listening_lessons where id = lesson_id)));

-- SPEAKING (mirrors listening)
create policy "speaking_lessons: teacher manages" on speaking_lessons for all
  to authenticated
  using (public.is_class_teacher(class_id) or public.is_admin())
  with check (public.is_class_teacher(class_id) or public.is_admin());
create policy "speaking_lessons: students view" on speaking_lessons for select
  to authenticated using (public.is_enrolled(class_id));

create policy "speaking_segments: teacher manages" on speaking_script_segments for all
  to authenticated
  using (public.is_class_teacher((select class_id from speaking_lessons where id = lesson_id)) or public.is_admin())
  with check (public.is_class_teacher((select class_id from speaking_lessons where id = lesson_id)) or public.is_admin());
create policy "speaking_segments: students view" on speaking_script_segments for select
  to authenticated
  using (public.is_enrolled((select class_id from speaking_lessons where id = lesson_id)));

create policy "speaking_submissions: student manages own" on speaking_submissions for all
  to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());
create policy "speaking_submissions: teacher views class" on speaking_submissions for select
  to authenticated
  using (public.is_class_teacher((select sl.class_id
                                  from speaking_lessons sl
                                  join speaking_script_segments ss on ss.lesson_id = sl.id
                                  where ss.id = segment_id)));

-- WRITING
create policy "writing_topics: teacher manages" on writing_topics for all
  to authenticated
  using (public.is_class_teacher(class_id) or public.is_admin())
  with check (public.is_class_teacher(class_id) or public.is_admin());
create policy "writing_topics: students view" on writing_topics for select
  to authenticated using (public.is_enrolled(class_id));

create policy "writing_submissions: student manages own" on writing_submissions for all
  to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());
create policy "writing_submissions: teacher views class" on writing_submissions for select
  to authenticated
  using (public.is_class_teacher((select class_id from writing_topics where id = topic_id)));
-- giáo viên đổi trạng thái bài nộp (draft/submitted -> reviewed) khi chấm
create policy "writing_submissions: teacher grades" on writing_submissions for update
  to authenticated
  using (public.is_class_teacher((select class_id from writing_topics where id = topic_id)))
  with check (public.is_class_teacher((select class_id from writing_topics where id = topic_id)));

create policy "writing_reviews: teacher manages" on writing_reviews for all
  to authenticated
  using (public.is_class_teacher((select wt.class_id
                                  from writing_topics wt
                                  join writing_submissions ws on ws.topic_id = wt.id
                                  where ws.id = submission_id)))
  with check (public.is_class_teacher((select wt.class_id
                                       from writing_topics wt
                                       join writing_submissions ws on ws.topic_id = wt.id
                                       where ws.id = submission_id)));
create policy "writing_reviews: student views own feedback" on writing_reviews for select
  to authenticated
  using ((select student_id from writing_submissions where id = submission_id) = auth.uid());

-- VOCAB / GRAMMAR (sổ tay riêng, chỉ chủ sở hữu)
create policy "vocab: owner manages" on vocabulary_notes for all
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "grammar: owner manages" on grammar_notes for all
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public)
values ('speaking-recordings', 'speaking-recordings', false)
on conflict (id) do nothing;

-- Quy ước path của app: {user_id}/{segment_id}-{timestamp}.webm
create policy "speaking-recordings: owner can upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'speaking-recordings'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "speaking-recordings: owner can read own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'speaking-recordings'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Giáo viên nghe lại bài ghi âm của học sinh: nên phục vụ qua signed URL sinh phía
-- server (service role) thay vì mở SELECT rộng ở đây.
