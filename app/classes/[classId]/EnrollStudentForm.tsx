'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EnrollStudentForm({ classId }: { classId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch('/api/enroll-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId, email }),
    });
    const data = await res.json();

    setLoading(false);
    if (!res.ok) {
      setMessage({ type: 'error', text: data.error });
      return;
    }
    setMessage({ type: 'success', text: `Đã thêm ${data.studentName} vào lớp.` });
    setEmail('');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email.hocsinh@vidu.com"
          className="input sm:flex-1"
        />
        <button disabled={loading} className="btn-primary shrink-0">
          {loading ? 'Đang thêm…' : 'Thêm học sinh'}
        </button>
      </div>
      {message && (
        <p className={`text-xs ${message.type === 'success' ? 'text-success' : 'text-danger'}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
