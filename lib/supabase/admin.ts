import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// CHỈ dùng trong Route Handlers / Server Actions - KHÔNG bao giờ import vào client component.
// Service role key bỏ qua RLS, nên mọi route dùng client này phải tự kiểm tra quyền thủ công.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
