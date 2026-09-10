import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Đích của link xác nhận email / magic link / reset mật khẩu (luồng PKCE của @supabase/ssr).
 * Cần thêm URL này vào Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback`);
}
