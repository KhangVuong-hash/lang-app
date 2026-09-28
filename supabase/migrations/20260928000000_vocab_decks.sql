-- ============================================================
-- Bộ từ vựng dùng chung (VD: FCE - Cambridge B2 First)
--   vocab_decks          : một bộ từ; categories = thứ tự các nhóm
--   vocab_deck_words     : từ trong bộ - mọi người đọc, CHỈ admin thêm/sửa/xoá
--   vocab_word_progress  : tiến độ riêng từng user: đã thuộc, số lần đúng/sai,
--                          ôn tập ngắt quãng (hộp Leitner 1-5 + ngày ôn kế tiếp)
-- Dữ liệu bộ FCE nằm ở migration kế tiếp (sinh từ new features/fce-vocab.json).
-- ============================================================

create table vocab_decks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  categories text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table vocab_deck_words (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references vocab_decks(id) on delete cascade,
  -- thứ tự trong bộ (giữ id gốc của file JSON)
  position integer not null,
  word text not null,
  type text not null,
  meaning_vi text not null,
  -- câu ví dụ; với type = 'word family' là danh sách từ cùng họ, cách nhau bằng dấu phẩy
  example text,
  category text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null,
  constraint vocab_deck_words_word_not_blank check (length(trim(word)) > 0),
  constraint vocab_deck_words_meaning_not_blank check (length(trim(meaning_vi)) > 0)
);

create index idx_vocab_deck_words_deck on vocab_deck_words (deck_id, position);

drop trigger if exists trg_audit_vocab_deck_words on vocab_deck_words;
create trigger trg_audit_vocab_deck_words before update on vocab_deck_words
  for each row execute procedure public.set_audit_fields();

create table vocab_word_progress (
  user_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  word_id uuid not null references vocab_deck_words(id) on delete cascade,
  -- lặp lại từ vocab_deck_words để lọc tiến độ theo bộ không cần join
  deck_id uuid not null references vocab_decks(id) on delete cascade,
  known boolean not null default false,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  srs_box smallint,
  due_on date,
  updated_at timestamptz not null default now(),
  primary key (user_id, word_id),
  constraint vocab_word_progress_srs check (
    (srs_box is null and due_on is null) or (srs_box between 1 and 5 and due_on is not null)
  )
);

create index idx_vocab_word_progress_deck on vocab_word_progress (user_id, deck_id);

alter table vocab_decks enable row level security;
alter table vocab_deck_words enable row level security;
alter table vocab_word_progress enable row level security;

create policy "vocab_decks: read" on vocab_decks for select to authenticated using (true);
create policy "vocab_decks: admin write" on vocab_decks for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "vocab_deck_words: read" on vocab_deck_words for select to authenticated
  using (true);
create policy "vocab_deck_words: admin write" on vocab_deck_words for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- deck_id phải khớp với bộ của từ
create policy "vocab_word_progress: owner all" on vocab_word_progress for all
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from vocab_deck_words w where w.id = word_id and w.deck_id = vocab_word_progress.deck_id
    )
  );
