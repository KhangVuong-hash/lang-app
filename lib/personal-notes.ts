import type { SupabaseClient } from '@supabase/supabase-js';

export const NOTE_BUCKET = 'personal-notes';
export const NOTE_COLUMNS = 'id, title, content, image_paths, pinned, created_at, updated_at';
export const NOTES_PAGE_SIZE = 12;
export const MAX_NOTE_IMAGES = 20;
/** signed URL sống 1 giờ - trang tự tải lại link khi mở lại */
const SIGNED_URL_TTL = 3600;

export type PersonalNote = {
  id: string;
  title: string | null;
  content: string | null;
  image_paths: string[];
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

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
