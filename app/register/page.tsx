'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AuthShell from '@/components/layout/AuthShell';
import Spinner from '@/components/ui/Spinner';

export default function RegisterPage() {
  const supabase = createClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }, // đọc bởi trigger handle_new_user
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    // Nếu project bật "Confirm email", session sẽ null cho tới khi user xác nhận qua email.
    if (!data.session) {
      setDone(true);
      return;
    }

    window.location.assign('/');
  }

  if (done) {
    return (
      <AuthShell>
        <div className="card max-w-sm p-6 text-center shadow-card">
          <span
            className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand/10 text-brand"
            aria-hidden
          >
            <MailCheck className="h-6 w-6" />
          </span>
          <h1 className="mt-2 text-lg font-bold">Kiểm tra email của bạn</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Chúng tôi đã gửi link xác nhận tới <strong>{email}</strong>. Xác nhận xong bạn có
            thể đăng nhập.
          </p>
          <Link href="/login" className="btn-secondary mt-4">
            Về trang đăng nhập
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={handleRegister} className="card w-full max-w-sm space-y-4 p-6 shadow-card">
        <div>
          <h1 className="text-xl font-bold">Tạo tài khoản</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Sau khi đăng ký bạn có thể tự tạo lớp để dạy, hoặc nhờ giáo viên thêm vào lớp để
            học.
          </p>
        </div>

        <div>
          <label className="field-label">Họ tên</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input"
          />
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading && <Spinner />}
          {loading ? 'Đang tạo tài khoản…' : 'Đăng ký'}
        </button>

        <p className="text-center text-sm text-ink-soft">
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Đăng nhập
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
