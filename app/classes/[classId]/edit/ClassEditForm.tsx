'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';
import SimpleSelect from '@/components/ui/SimpleSelect';

export default function ClassEditForm({
  klass,
  languages,
}: {
  klass: any;
  languages: { code: string; name: string }[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(klass.name ?? '');
  const [languageCode, setLanguageCode] = useState(klass.language_code ?? '');
  const [level, setLevel] = useState(klass.level ?? '');
  const [description, setDescription] = useState(klass.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên lớp.');
      return;
    }
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from('classes')
      .update({
        name: name.trim(),
        language_code: languageCode,
        level: level.trim() || null,
        description: description.trim() || null,
      })
      .eq('id', klass.id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
    router.push(`/classes/${klass.id}`);
  }

  return (
    <div className="container-page max-w-xl py-8">
      <PageHeader
        back={{ href: `/classes/${klass.id}`, label: 'Tổng quan lớp' }}
        title="Sửa thông tin lớp"
      />

      <form onSubmit={handleSubmit} className="card space-y-4 p-5">
        <div>
          <label className="field-label">
            Tên lớp <span className="text-danger">*</span>
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label className="field-label">Ngôn ngữ</label>
          <SimpleSelect
            value={languageCode}
            onChange={setLanguageCode}
            options={languages.map((l) => ({ value: l.code, label: l.name }))}
            placeholder="Chọn ngôn ngữ"
          />
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

        <div className="flex gap-2">
          <button disabled={saving} className="btn-primary">
            {saving && <Spinner />}
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
          <a href={`/classes/${klass.id}`} className="btn-secondary">
            Huỷ
          </a>
        </div>
      </form>
    </div>
  );
}
