create table listening_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  lesson_id uuid not null references listening_lessons(id) on delete cascade,
  last_position numeric not null default 0 check (last_position >= 0),
  completed_segment_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

alter table listening_progress enable row level security;

create policy "listening_progress: owner all" on listening_progress for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());