/**
 * Bộ từ vựng dùng chung (VD: FCE): kiểu dữ liệu, tìm kiếm không dấu, ôn tập
 * ngắt quãng (Leitner) và sinh câu hỏi trắc nghiệm.
 * Từ do admin sửa (vocab_deck_words); tiến độ riêng từng user (vocab_word_progress).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type VocabDeck = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  /** thứ tự hiển thị các nhóm */
  categories: string[];
};

export type VocabWord = {
  id: string;
  position: number;
  word: string;
  type: string;
  meaning_vi: string;
  /** câu ví dụ; với type = 'word family' là danh sách từ cùng họ, cách nhau bằng dấu phẩy */
  example: string | null;
  category: string;
};

export type WordProgress = {
  word_id: string;
  known: boolean;
  correct_count: number;
  wrong_count: number;
  /** hộp Leitner 1-5; null = không nằm trong hàng ôn tập */
  srs_box: number | null;
  due_on: string | null;
};

export const DECK_COLUMNS = 'id, slug, title, description, categories';
export const WORD_COLUMNS = 'id, position, word, type, meaning_vi, example, category';
export const PROGRESS_COLUMNS = 'word_id, known, correct_count, wrong_count, srs_box, due_on';

export const WORD_TYPES = [
  'phr v',
  'colloc',
  'adj + prep',
  'v + prep',
  'n + prep',
  'prep phr',
  'idiom',
  'expr',
  'structure',
  'linker',
  'word family',
  'n',
  'v',
  'adj',
  'adv',
  'n/v',
  'adj/n',
  'adj/adv',
  'v/n',
  'n/adj',
];

export const isWordFamily = (w: Pick<VocabWord, 'type'>) => w.type === 'word family';

/** 'action, active, actively' -> ['action', 'active', 'actively'] */
export function familyMembers(example: string | null) {
  return (example ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Bỏ dấu, dấu câu, chữ thường để so khớp: "Hỏng (máy); suy sụp" -> "hong may suy sup",
 * nên gõ "hong may" vẫn tìm ra.
 */
export function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function matchesSearch(w: VocabWord, q: string) {
  const n = normalize(q);
  if (!n) return true;
  return normalize(w.word).includes(n) || normalize(w.meaning_vi).includes(n);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Ôn tập ngắt quãng (Leitner) ----------

/** số ngày tới lần ôn kế tiếp khi nhớ, theo hộp hiện tại (1-5) */
export const SRS_INTERVALS = [1, 3, 7, 14, 30];
export const SRS_MAX_BOX = SRS_INTERVALS.length;

function addDays(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/**
 * Cập nhật tiến độ sau một lần trả lời.
 *  - quiz sai / "Quên" khi ôn: vào hộp 1, ôn lại ngay hôm nay (quiz) hoặc ngày mai (ôn tập)
 *  - đúng khi đang trong hàng ôn: lên hộp, giãn lịch; qua hộp cuối thì ra khỏi hàng ôn
 *  - đúng khi không trong hàng ôn: chỉ tăng số lần đúng
 */
export function applyAnswer(
  p: WordProgress,
  correct: boolean,
  today: string,
  source: 'quiz' | 'review'
): WordProgress {
  if (!correct)
    return {
      ...p,
      wrong_count: p.wrong_count + 1,
      srs_box: 1,
      due_on: source === 'quiz' ? today : addDays(today, 1),
    };
  const next = { ...p, correct_count: p.correct_count + 1 };
  if (p.srs_box == null) return next;
  if (p.srs_box >= SRS_MAX_BOX) return { ...next, srs_box: null, due_on: null };
  return {
    ...next,
    srs_box: p.srs_box + 1,
    due_on: addDays(today, SRS_INTERVALS[p.srs_box]),
  };
}

export function emptyProgress(wordId: string): WordProgress {
  return {
    word_id: wordId,
    known: false,
    correct_count: 0,
    wrong_count: 0,
    srs_box: null,
    due_on: null,
  };
}

// ---------- Trắc nghiệm ----------

export type QuizQuestion = {
  word: VocabWord;
  /** 4 nghĩa, đã xáo */
  options: string[];
  answer: string;
};

/**
 * Câu hỏi: từ tiếng Anh -> chọn nghĩa đúng trong 4 đáp án. 3 đáp án nhiễu lấy
 * trong cùng nhóm (ưu tiên cùng loại từ), thiếu thì lấy từ nhóm khác.
 */
export function buildQuestion(word: VocabWord, all: VocabWord[]): QuizQuestion {
  const seen = new Set([normalize(word.meaning_vi)]);
  const distractors: string[] = [];
  const take = (pool: VocabWord[]) => {
    for (const w of shuffle(pool)) {
      if (distractors.length >= 3) return;
      const key = normalize(w.meaning_vi);
      if (w.id === word.id || seen.has(key)) continue;
      seen.add(key);
      distractors.push(w.meaning_vi);
    }
  };
  const sameCat = all.filter((w) => w.category === word.category);
  take(sameCat.filter((w) => w.type === word.type));
  take(sameCat);
  take(all);
  return { word, options: shuffle([word.meaning_vi, ...distractors]), answer: word.meaning_vi };
}

// ---------- Nạp dữ liệu ----------

/** API trả tối đa 1000 dòng / lần (max_rows) - nạp theo trang cho đủ cả bộ. */
export async function fetchDeckWords(supabase: SupabaseClient, deckId: string) {
  const PAGE = 1000;
  const out: VocabWord[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('vocab_deck_words')
      .select(WORD_COLUMNS)
      .eq('deck_id', deckId)
      .order('position', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...((data ?? []) as VocabWord[]));
    if (!data || data.length < PAGE) return out;
  }
}

export async function fetchDeckProgress(supabase: SupabaseClient, deckId: string) {
  const PAGE = 1000;
  const out: WordProgress[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('vocab_word_progress')
      .select(PROGRESS_COLUMNS)
      .eq('deck_id', deckId)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...((data ?? []) as WordProgress[]));
    if (!data || data.length < PAGE) return out;
  }
}
