'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';

export default function NewClassPage() {
  const router = useRouter();
  const supabase = createClient();
  const [languages, setLanguages] = useState<{ code: string; name: string }[]>([]);
  const [name, setName] = useState('');
  const [languageCode, setLanguageCode] = useState('');
  const [level, setLevel] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('languages')
      .select('*')
      .then(({ data }) => {
        setLanguages(data ?? []);
        if (data?.[0]) setLanguageCode(data[0].code);
      });
  }, []); // eslint-disable-line

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên lớp.');
      return;
    }
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('classes')
      .insert({
        teacher_id: user?.id,
        created_by: user?.id,
        name: name.trim(),
        language_code: languageCode,
        level,
        description,
      })
      .select()
      .single();

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
    router.push(`/classes/${data.id}`);
  }

  return (
    <div className="container-page max-w-xl py-8">
      <PageHeader back={{ href: '/classes', label: 'Lớp học của tôi' }} title="Tạo lớp học mới" />

      <form onSubmit={handleSubmit} className="card space-y-4 p-5">
        <div>
          <label className="field-label">Tên lớp <span className="text-danger">*</span></label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="VD: Tiếng Nhật N4 - Lớp tối T2/T4"
          />
        </div>

        <div>
          <label className="field-label">Ngôn ngữ</label>
          <select
            value={languageCode}
            onChange={(e) => setLanguageCode(e.target.value)}
            className="select"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">Trình độ</label>
          <input
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="input"
            placeholder="VD: N4, B1, Sơ cấp…"
          />
        </div>

        <div>
          <label className="field-label">Mô tả</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="textarea"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button disabled={saving} className="btn-primary w-full">
          {saving && <Spinner />}
          {saving ? 'Đang tạo…' : 'Tạo lớp'}
        </button>
      </form>
    </div>
  );
}
