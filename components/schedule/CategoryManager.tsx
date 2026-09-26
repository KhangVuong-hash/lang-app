'use client';

import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ConfirmButton from '@/components/ui/ConfirmButton';
import Spinner from '@/components/ui/Spinner';
import { CATEGORY_COLORS } from '@/components/schedule/categoryColors';
import type { StudyCategory } from '@/lib/schedule';

/** Chọn một trong các màu cố định của bảng màu danh mục. */
function ColorPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Màu">
      {CATEGORY_COLORS.map((c, i) => (
        <button
          key={c.hex}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={c.name}
          title={c.name}
          onClick={() => onChange(i)}
          className={`flex h-6 w-6 items-center justify-center rounded-full ${
            value === i ? 'ring-2 ring-ink ring-offset-2' : ''
          }`}
          style={{ backgroundColor: c.hex }}
        >
          {value === i && <Check className="h-3.5 w-3.5 text-white" />}
        </button>
      ))}
    </div>
  );
}

function CategoryRow({ category, onChange }: { category: StudyCategory; onChange: () => void }) {
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!name.trim()) return setError('Nhập tên danh mục.');
    setSaving(true);
    const { error } = await supabase
      .from('study_categories')
      .update({ name: name.trim(), color })
      .eq('id', category.id);
    setSaving(false);
    if (error) return setError(error.message);
    setEditing(false);
    onChange();
  }

  async function remove() {
    const { error } = await supabase.from('study_categories').delete().eq('id', category.id);
    if (error) return setError(error.message);
    onChange();
  }

  if (!editing)
    return (
      <li className="flex items-center gap-2.5 py-2">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: CATEGORY_COLORS[category.color]?.hex }}
        />
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{category.name}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm font-medium text-brand hover:underline"
        >
          Sửa
        </button>
        <ConfirmButton
          onConfirm={remove}
          question="Xoá danh mục? Các buổi thuộc danh mục này sẽ thành “Chưa phân loại”."
          confirmLabel="Xoá"
          className="text-sm font-medium text-danger hover:underline"
        >
          Xoá
        </ConfirmButton>
        {error && <p className="text-sm text-danger">{error}</p>}
      </li>
    );

  return (
    <li className="space-y-2 py-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
        className="input"
        aria-label="Tên danh mục"
        autoFocus
      />
      <ColorPicker value={color} onChange={setColor} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving} className="btn-primary btn-sm">
          {saving && <Spinner />}
          Lưu
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setName(category.name);
            setColor(category.color);
          }}
          className="btn-ghost btn-sm"
        >
          Huỷ
        </button>
      </div>
    </li>
  );
}

/** Thêm / sửa tên, màu / xoá danh mục học (VD: Học tiếng Anh, Học trên lớp). */
export default function CategoryManager({
  categories,
  onChange,
}: {
  categories: StudyCategory[];
  onChange: () => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState('');
  // danh mục mới lấy màu kế tiếp theo thứ tự cố định
  const [color, setColor] = useState(categories.length % CATEGORY_COLORS.length);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Nhập tên danh mục.');
    setSaving(true);
    const { error } = await supabase.from('study_categories').insert({ name: name.trim(), color });
    setSaving(false);
    if (error) return setError(error.message);
    setName('');
    setColor((categories.length + 1) % CATEGORY_COLORS.length);
    onChange();
  }

  return (
    <div className="space-y-4">
      {categories.length > 0 && (
        <ul className="divide-y divide-line">
          {categories.map((c) => (
            <CategoryRow key={c.id} category={c} onChange={onChange} />
          ))}
        </ul>
      )}

      <form onSubmit={add} className="space-y-2 rounded-lg bg-paper p-3">
        <label className="field-label">Thêm danh mục</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="input"
          placeholder="VD: Học tiếng Anh, Học công nghệ, Học trên lớp…"
        />
        <ColorPicker value={color} onChange={setColor} />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button disabled={saving} className="btn-primary btn-sm">
          {saving ? <Spinner /> : <Plus className="h-4 w-4" />}
          Thêm
        </button>
      </form>
    </div>
  );
}
