'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function VocabGrammarNotebook({
  vocab,
  grammar,
  classes,
}: {
  vocab: any[];
  grammar: any[];
  classes: any[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [tab, setTab] = useState<'vocab' | 'grammar'>('vocab');

  const [term, setTerm] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
  const [classId, setClassId] = useState('');
  const [saving, setSaving] = useState(false);

  async function addNote() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const cls = classes.find((c) => c.id === classId);

    if (tab === 'vocab') {
      await supabase.from('vocabulary_notes').insert({
        user_id: user?.id,
        class_id: classId || null,
        language_code: cls?.language_code ?? null,
        term,
        meaning,
        example_sentence: example,
      });
    } else {
      await supabase.from('grammar_notes').insert({
        user_id: user?.id,
        class_id: classId || null,
        language_code: cls?.language_code ?? null,
        title: term,
        explanation: meaning,
        example_sentence: example,
      });
    }

    setTerm('');
    setMeaning('');
    setExample('');
    setSaving(false);
    router.refresh();
  }

  const items = tab === 'vocab' ? vocab : grammar;

  return (
    <div className="card p-5">
      <div className="mb-4 inline-flex rounded-lg bg-paper p-1">
        <button
          onClick={() => setTab('vocab')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            tab === 'vocab' ? 'bg-surface text-ink shadow-card' : 'text-ink-soft'
          }`}
        >
          📘 Từ vựng
        </button>
        <button
          onClick={() => setTab('grammar')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            tab === 'grammar' ? 'bg-surface text-ink shadow-card' : 'text-ink-soft'
          }`}
        >
          📗 Ngữ pháp
        </button>
      </div>

      <div className="mb-4 grid gap-2 rounded-lg bg-paper p-3 sm:grid-cols-2">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={tab === 'vocab' ? 'Từ mới' : 'Điểm ngữ pháp'}
          className="input"
        />
        <input
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          placeholder={tab === 'vocab' ? 'Nghĩa' : 'Giải thích'}
          className="input"
        />
        <input
          value={example}
          onChange={(e) => setExample(e.target.value)}
          placeholder="Câu ví dụ"
          className="input sm:col-span-2"
        />
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="select">
          <option value="">Không gắn lớp</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button onClick={addNote} disabled={!term || saving} className="btn-primary">
          Thêm ghi chú
        </button>
      </div>

      <ul className="space-y-2">
        {items.map((it: any) => (
          <li key={it.id} className="rounded-lg border border-line p-3 text-sm">
            <p className="font-semibold text-ink">{tab === 'vocab' ? it.term : it.title}</p>
            <p className="text-ink-soft">{tab === 'vocab' ? it.meaning : it.explanation}</p>
            {it.example_sentence && (
              <p className="mt-1 text-xs italic text-ink-faint">“{it.example_sentence}”</p>
            )}
            {it.classes?.name && (
              <p className="mt-1 text-xs text-ink-faint">Lớp: {it.classes.name}</p>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <p className="py-4 text-sm text-ink-faint">Chưa có ghi chú nào.</p>
        )}
      </ul>
    </div>
  );
}
