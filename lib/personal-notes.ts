import type { SupabaseClient } from '@supabase/supabase-js';
import type { SkillKey } from './constants';

export const NOTE_BUCKET = 'personal-notes';
export const NOTE_COLUMNS =
  'id, skill, category_id, title, content, image_paths, pinned, created_at, updated_at';
export const CATEGORY_COLUMNS = 'id, skill, name';
/** lazy load: 9 thẻ mỗi lần (3 hàng × 3 cột) */
export const NOTES_PAGE_SIZE = 9;
export const MAX_CATEGORY_NAME = 40;
export const MAX_NOTE_IMAGES = 20;
/** signed URL sống 1 giờ - trang tự tải lại link khi mở lại */
const SIGNED_URL_TTL = 3600;

export type PersonalNote = {
  id: string;
  /** null = ghi chú cũ chưa gắn kỹ năng */
  skill: SkillKey | null;
  /** danh mục do người dùng tạo trong kỹ năng; null = chưa có danh mục */
  category_id: string | null;
  title: string | null;
  content: string | null;
  image_paths: string[];
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

/** Danh mục ghi chú - riêng cho từng kỹ năng */
export type NoteCategory = {
  id: string;
  skill: SkillKey;
  name: string;
};

/** Lọc theo danh mục: 'all' = mọi danh mục, 'none' = chưa có danh mục, còn lại là id */
export type CategoryFilter = 'all' | 'none' | string;

/** Thứ tự các mục trong tab Language */
export const NOTE_SKILLS: SkillKey[] = ['listening', 'speaking', 'reading', 'writing'];

/** Lọc truy vấn personal_notes theo kỹ năng (null = chưa phân loại) */
export function bySkill<Q extends { eq: any; is: any }>(req: Q, skill: SkillKey | null): Q {
  return skill ? req.eq('skill', skill) : req.is('skill', null);
}

/** Bộ lọc trong mỗi mục kỹ năng */
export type NoteView = 'all' | 'pinned' | 'images';
export type NoteSort = 'updated' | 'created' | 'oldest';

export const NOTE_VIEWS: { key: NoteView; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pinned', label: 'Đã ghim' },
  { key: 'images', label: 'Có ảnh' },
];
export const NOTE_SORTS: { key: NoteSort; label: string }[] = [
  { key: 'updated', label: 'Mới cập nhật' },
  { key: 'created', label: 'Mới tạo' },
  { key: 'oldest', label: 'Cũ nhất' },
];

/** Áp bộ lọc + thứ tự (ghi chú ghim luôn đứng đầu) cho truy vấn personal_notes */
export function applyNoteFilters<Q extends { eq: any; neq: any; is: any; order: any }>(
  req: Q,
  view: NoteView,
  sort: NoteSort,
  category: CategoryFilter = 'all'
): Q {
  let q = req;
  if (view === 'pinned') q = q.eq('pinned', true);
  if (view === 'images') q = q.neq('image_paths', '{}');
  if (category === 'none') q = q.is('category_id', null);
  else if (category !== 'all') q = q.eq('category_id', category);
  q = q.order('pinned', { ascending: false });
  if (sort === 'updated') return q.order('updated_at', { ascending: false });
  return q.order('created_at', { ascending: sort === 'oldest' });
}

/** Ghi chú có còn thuộc danh sách đang lọc không (dùng sau khi sửa/ghim) */
export function matchesNoteView(n: PersonalNote, view: NoteView, category: CategoryFilter = 'all') {
  if (category !== 'all' && n.category_id !== (category === 'none' ? null : category)) return false;
  if (view === 'pinned') return n.pinned;
  if (view === 'images') return n.image_paths.length > 0;
  return true;
}

/** Cùng thứ tự với applyNoteFilters, để sắp lại danh sách phía client */
export function compareNotes(sort: NoteSort) {
  return (a: PersonalNote, b: PersonalNote) =>
    Number(b.pinned) - Number(a.pinned) ||
    (sort === 'updated'
      ? b.updated_at.localeCompare(a.updated_at)
      : sort === 'created'
        ? b.created_at.localeCompare(a.created_at)
        : a.created_at.localeCompare(b.created_at));
}

/** Tạo signed URL cho các ảnh trong bucket private → { path: url } */
export async function signImages(
  supabase: SupabaseClient,
  paths: string[]
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths));
  if (unique.length === 0) return {};
  const { data } = await supabase.storage
    .from(NOTE_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

/** định dạng người dùng được chọn - mọi ảnh đều được đổi sang WebP khi upload */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 2000;

/** Kiểm tra file trước khi upload, trả về thông báo lỗi hoặc null. */
export function validateImage(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type))
    return `“${file.name}” không phải ảnh JPG, PNG hoặc WebP.`;
  if (file.size > MAX_IMAGE_BYTES) return `“${file.name}” lớn hơn 2MB.`;
  return null;
}

/**
 * Đổi ảnh sang WebP (cạnh dài tối đa 2000px). Nếu vẫn > 2MB thì giảm chất lượng,
 * rồi thu nhỏ dần cho tới khi vừa.
 */
export async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    let scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 6; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const quality = attempt === 0 ? 0.85 : 0.72;
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality));
      // trình duyệt không hỗ trợ mã hoá WebP sẽ trả về PNG
      if (!blob || blob.type !== 'image/webp')
        throw new Error('Trình duyệt không đổi được ảnh sang WebP.');
      if (blob.size <= MAX_IMAGE_BYTES) return blob;
      if (attempt > 0) scale *= 0.8;
    }
    throw new Error('Ảnh quá lớn sau khi nén.');
  } finally {
    bitmap.close();
  }
}

/**
 * Upload một ảnh vào thư mục của user: kiểm tra định dạng/dung lượng, đổi sang WebP,
 * đặt tên ngẫu nhiên (uuid - không lộ tên file gốc). Trả về path trong bucket.
 */
export async function uploadNoteImage(supabase: SupabaseClient, userId: string, file: File) {
  const invalid = validateImage(file);
  if (invalid) throw new Error(invalid);
  const blob = await toWebp(file);
  const path = `${userId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from(NOTE_BUCKET)
    .upload(path, blob, { contentType: 'image/webp', cacheControl: '3600' });
  if (error) throw new Error(error.message);
  return path;
}

/** Xoá file ảnh (bỏ qua lỗi - file mồ côi không ảnh hưởng người dùng) */
export async function removeNoteImages(supabase: SupabaseClient, paths: string[]) {
  if (paths.length) await supabase.storage.from(NOTE_BUCKET).remove(paths);
}
