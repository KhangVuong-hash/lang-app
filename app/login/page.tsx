'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AuthShell from '@/components/layout/AuthShell';
import Spinner from '@/components/ui/Spinner';
import { SIGNUP_ENABLED } from '@/lib/constants';

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    // Điều hướng cứng để chắc chắn cookie phiên mới được gửi kèm (không cần F5).
    // `/` (server) sẽ chuyển tiếp đúng theo vai trò.
    window.location.assign('/');
  }

  return (
    <AuthShell>
      <form onSubmit={handleLogin} className="card w-full max-w-sm space-y-4 p-6 shadow-card">
        <div>
          <h1 className="text-xl font-bold">Đăng nhập</h1>
          <p className="mt-1 text-sm text-ink-soft">Tiếp tục hành trình học của bạn.</p>
        </div>

        <div>
          <label className="field-label">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label className="field-label">Mật khẩu</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading && <Spinner />}
          {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>

        {SIGNUP_ENABLED && (
          <p className="text-center text-sm text-ink-soft">
            Chưa có tài khoản?{' '}
            <Link href="/register" className="font-medium text-brand hover:underline">
              Đăng ký
            </Link>
          </p>
        )}
      </form>
    </AuthShell>
  );
}
