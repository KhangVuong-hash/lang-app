export type SkillKey = 'listening' | 'speaking' | 'writing' | 'reading';

export type Skill = {
  key: SkillKey;
  label: string;
  /** màu hex của kỹ năng, dùng cho thanh accent / tint (an toàn với Tailwind vì set qua style) */
  color: string;
  blurb: string;
  comingSoon?: boolean;
};

export const SKILLS: Skill[] = [
  {
    key: 'listening',
    label: 'Nghe',
    color: '#2E7DB2',
    blurb:
      'Xem video YouTube kèm script cắt theo từng câu. Tua lại hoặc lặp một câu tới khi nghe rõ, chỉnh tốc độ 0.5x–1.25x.',
  },
  {
    key: 'speaking',
    label: 'Nói',
    color: '#E06A55',
    blurb:
      'Shadowing theo từng câu của video thật: nghe mẫu, ghi âm lại giọng đọc của bạn rồi so sánh với bản gốc.',
  },
  {
    key: 'writing',
    label: 'Viết',
    color: '#7B5EA7',
    blurb:
      'Làm bài luận theo chủ đề hoặc dịch đoạn văn. Nộp bài rồi nhận nhận xét và điểm số trực tiếp từ giáo viên.',
  },
  {
    key: 'reading',
    label: 'Đọc',
    color: '#5C8A73',
    blurb: 'Bài đọc hiểu theo trình độ. Đang hoàn thiện, sẽ mở trong bản cập nhật tới.',
    comingSoon: true,
  },
];

export const SKILL_MAP: Record<SkillKey, Skill> = Object.fromEntries(
  SKILLS.map((s) => [s.key, s])
) as Record<SkillKey, Skill>;

export type Language = {
  code: string;
  name: string;
  native: string;
  flag: string;
  color: string;
};

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'Tiếng Anh', native: 'English', flag: '🇬🇧', color: '#2E7DB2' },
  { code: 'zh', name: 'Tiếng Trung', native: '中文', flag: '🇨🇳', color: '#B5473C' },
  { code: 'ja', name: 'Tiếng Nhật', native: '日本語', flag: '🇯🇵', color: '#7B5EA7' },
  { code: 'ko', name: 'Tiếng Hàn', native: '한국어', flag: '🇰🇷', color: '#3F7D5A' },
];

export const LANGUAGE_MAP: Record<string, Language> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l])
);

/**
 * Tạm ẩn đăng ký công khai — tài khoản được tạo tay trong Supabase.
 * Đặt lại `true` để mở lại trang/nút đăng ký.
 */
export const SIGNUP_ENABLED = false;

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Quản trị viên',
  user: 'Thành viên',
};

/** hex + alpha (2 ký tự) → chuỗi màu rgba-hex 8 số, tiện set qua inline style */
export function tint(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`;
}

export type PartOfSpeech = { value: string; abbr: string; label: string };

/** Từ loại của từ vựng (cột vocabulary_notes.part_of_speech lưu `value`) */
export const PARTS_OF_SPEECH: PartOfSpeech[] = [
  { value: 'noun', abbr: 'n', label: 'Danh từ (noun)' },
  { value: 'verb', abbr: 'v', label: 'Động từ (verb)' },
  { value: 'phrasal_verb', abbr: 'phr v', label: 'Cụm động từ (phrasal verb)' },
  { value: 'adjective', abbr: 'adj', label: 'Tính từ (adjective)' },
  { value: 'adverb', abbr: 'adv', label: 'Trạng từ (adverb)' },
  { value: 'preposition', abbr: 'prep', label: 'Giới từ (preposition)' },
  { value: 'conjunction', abbr: 'conj', label: 'Liên từ (conjunction)' },
  { value: 'pronoun', abbr: 'pron', label: 'Đại từ (pronoun)' },
  { value: 'idiom', abbr: 'idiom', label: 'Thành ngữ (idiom)' },
  { value: 'collocation', abbr: 'colloc', label: 'Cụm từ cố định (collocation)' },
  { value: 'other', abbr: 'khác', label: 'Khác' },
];

export const POS_MAP: Record<string, PartOfSpeech> = Object.fromEntries(
  PARTS_OF_SPEECH.map((p) => [p.value, p])
);
