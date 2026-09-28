'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import SimpleSelect from '@/components/ui/SimpleSelect';
import Spinner from '@/components/ui/Spinner';
import ConfirmButton from '@/components/ui/ConfirmButton';
import { WORD_COLUMNS, WORD_TYPES, type VocabWord } from '@/lib/vocab';

/** Admin thêm / sửa / xoá một từ trong bộ (RLS chỉ cho admin ghi). */
export default function WordForm({
  deckId,
  word,
  categories,
  defaultCategory,
  nextPosition,
  onSaved,
  onDeleted,
}: {
  deckId: string;
  word?: VocabWord;
  categories: string[];
  defaultCategory: string;
  nextPosition: number;
  onSaved: (w: VocabWord) => void;
  onDeleted: (id: string) => void;
}) {
  const supabase = createClient();
  const [text, setText] = useState(word?.word ?? '');
  const [type, setType] = useState(word?.type ?? WORD_TYPES[0]);
  const [meaning, setMeaning] = useState(word?.meaning_vi ?? '');
  const [example, setExample] = useState(word?.example ?? '');
  const [category, setCategory] = useState(word?.category ?? defaultCategory);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const family = type === 'word family';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!text.trim() || !meaning.trim()) return setError('Nhập từ và nghĩa.');
    const payload = {
      word: text.trim(),
      type,
      meaning_vi: meaning.trim(),
      example: example.trim() || null,
      category,
    };
    setSaving(true);
    const { data, error } = word
      ? await supabase
          .from('vocab_deck_words')
          .update(payload)
          .eq('id', word.id)
          .select(WORD_COLUMNS)
          .single()
      : await supabase
          .from('vocab_deck_words')
          .insert({ ...payload, deck_id: deckId, position: nextPosition })
          .select(WORD_COLUMNS)
          .single();
    setSaving(false);
    if (error) return setError(error.message);
    onSaved(data as VocabWord);
  }

  async function remove() {
    if (!word) return;
    const { error } = await supabase.from('vocab_deck_words').delete().eq('id', word.id);
    if (error) return setError(error.message);
    onDeleted(word.id);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="field-label">Từ / cụm từ</label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input"
          placeholder="VD: break down"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Loại</label>
          <SimpleSelect
            value={type}
            onChange={setType}
            aria-label="Loại từ"
            options={WORD_TYPES.map((t) => ({ value: t, label: t }))}
          />
        </div>
        <div>
          <label className="field-label">Nhóm</label>
          <SimpleSelect
            value={category}
            onChange={setCategory}
            aria-label="Nhóm"
            options={categories.map((c) => ({ value: c, label: c }))}
          />
        </div>
      </div>
      <div>
        <label className="field-label">Nghĩa tiếng Việt</label>
        <input
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          className="input"
          placeholder="VD: hỏng (máy); suy sụp"
        />
      </div>
      <div>
        <label className="field-label">
          {family ? 'Các từ cùng họ (cách nhau bằng dấu phẩy)' : 'Câu ví dụ (tuỳ chọn)'}
        </label>
        <textarea
          value={example}
          onChange={(e) => setExample(e.target.value)}
          rows={2}
          className="textarea"
          placeholder={
            family ? 'VD: action, active, actively, activity' : 'VD: Our car broke down.'
          }
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button disabled={saving} className="btn-primary">
          {saving && <Spinner />}
          {word ? 'Lưu thay đổi' : 'Thêm từ'}
        </button>
        {word && (
          <ConfirmButton
            onConfirm={remove}
            question="Xoá từ này khỏi bộ? Tiến độ học của mọi người với từ này cũng bị xoá."
            confirmLabel="Xoá"
          >
            Xoá từ
          </ConfirmButton>
        )}
      </div>
    </form>
  );
}
