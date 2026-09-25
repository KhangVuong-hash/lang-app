import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export type AuthUser = {
  id: string;
  email: string | null;
  user_metadata: Record<string, any>;
};

/**
 * User hiện tại cho Server Component / route handler - gọi bao nhiêu lần trong
 * một request cũng chỉ xác thực một lần (React `cache`).
 *
 * Dùng `getClaims()`: với project dùng JWT signing key bất đối xứng, chữ ký được
 * kiểm tra tại chỗ bằng JWKS (đã cache) - không tốn round-trip tới Supabase Auth.
 * Project còn dùng secret HS256 thì tự rơi về `getUser()` như trước.
 */
export const getUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const c = data.claims;
  return {
    id: c.sub,
    email: (c.email as string) ?? null,
    user_metadata: (c.user_metadata as Record<string, any>) ?? {},
  };
});

export type MyProfile = {
  id: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  bio: string | null;
};

/** Profile của user hiện tại, dùng chung cho layout + page trong cùng request. */
export const getMyProfile = cache(async (): Promise<MyProfile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url, bio')
    .eq('id', user.id)
    .maybeSingle();
  if (data) return data as MyProfile;

  // Tự chữa: nếu trigger handle_new_user không chạy (cấu hình DB thiếu), tạo profile ở đây.
  const { data: created } = await supabase
    .from('profiles')
    .insert({ id: user.id, full_name: user.user_metadata.full_name ?? null, role: 'user' })
    .select('id, full_name, role, avatar_url, bio')
    .maybeSingle();
  return (created as MyProfile) ?? null;
});
