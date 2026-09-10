'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Spinner from '@/components/ui/Spinner';
import ConfirmButton from '@/components/ui/ConfirmButton';

type Comment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  profiles: { full_name: string | null } | null;
};

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  const s = (p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '');
  return (s || name[0] || '?').toUpperCase();
}

function relTime(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'vừa xong';
  if (d < 3600) return `${Math.floor(d / 60)} phút trước`;
  if (d < 86400) return `${Math.floor(d / 3600)} giờ trước`;
  if (d < 604800) return `${Math.floor(d / 86400)} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

export default function CommentThread({
  classId,
  subjectType,
  subjectId,
  initialComments = [],
  currentUserId,
  canModerate,
}: {
  classId: string;
  subjectType?: 'listening' | 'speaking' | 'writing';
  subjectId?: string;
  initialComments?: Comment[];
  currentUserId: string;
  canModerate: boolean;
}) {
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  function baseQuery() {
    let q = supabase
      .from('comments')
      .select('id, user_id, body, created_at, updated_at, profiles:profiles!comments_user_id_fkey(full_name)')
      .eq('class_id', classId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    q = subjectType
      ? q.eq('subject_type', subjectType).eq('subject_id', subjectId!)
      : q.is('subject_type', null);
    return q;
  }

  async function reload() {
    const { data } = await baseQuery();
    setComments((data ?? []) as any);
  }

  // đồng bộ lại từ server sau khi mount (initialComments chỉ là gợi ý cho lần vẽ đầu)
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subjectType, subjectId]);

  async function post() {
    if (!body.trim()) return;
    setPosting(true);
    setError(null);
    const { error } = await supabase.from('comments').insert({
      class_id: classId,
      subject_type: subjectType ?? null,
      subject_id: subjectType ? subjectId : null,
      user_id: currentUserId,
      body: body.trim(),
    });
    setPosting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setBody('');
    reload();
  }

  async function saveEdit(id: string) {
    if (!editBody.trim()) return;
    const { error } = await supabase
      .from('comments')
      .update({ body: editBody.trim() })
      .eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    setEditingId(null);
    reload();
  }

  async function hide(id: string) {
    const { error } = await supabase
      .from('comments')
      .update({ deleted_at: new Date().toISOString(), deleted_by: currentUserId })
      .eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    reload();
  }

  return (
    <section className="card mt-8 p-5">
      <h2 className="font-display text-lg font-semibold">
        Bình luận ({comments.length})
      </h2>

      <ul className="mt-4 space-y-4">
        {comments.map((c) => {
          const name = c.profiles?.full_name || 'Thành viên';
          const mine = c.user_id === currentUserId;
          const edited = c.updated_at !== c.created_at;
          return (
            <li key={c.id} className="flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-xs font-semibold text-white">
                {initials(name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold text-ink">{name}</span>{' '}
                  <span className="text-ink-faint">
                    · {relTime(c.created_at)}
                    {edited && ' · đã sửa'}
                  </span>
                </p>

                {editingId === c.id ? (
                  <div className="mt-1">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={2}
                      className="textarea"
                    />
                    <div className="mt-1 flex gap-2">
                      <button onClick={() => saveEdit(c.id)} className="btn-primary btn-sm">
                        Lưu
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn-ghost btn-sm">
                        Huỷ
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink">{c.body}</p>
                )}

                {editingId !== c.id && (mine || canModerate) && (
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    {mine && (
                      <button
                        onClick={() => {
                          setEditingId(c.id);
                          setEditBody(c.body);
                        }}
                        className="font-medium text-ink-soft hover:text-ink"
                      >
                        Sửa
                      </button>
                    )}
                    <ConfirmButton
                      onConfirm={() => hide(c.id)}
                      question="Ẩn bình luận này?"
                      confirmLabel="Ẩn"
                      className="font-medium text-danger hover:underline"
                    >
                      {mine ? 'Xoá' : 'Ẩn'}
                    </ConfirmButton>
                  </div>
                )}
              </div>
            </li>
          );
        })}
        {comments.length === 0 && (
          <li className="text-sm text-ink-faint">Chưa có bình luận nào.</li>
        )}
      </ul>

      <div className="mt-5 border-t border-line pt-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Viết bình luận…"
          className="textarea"
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        <button
          onClick={post}
          disabled={posting || !body.trim()}
          className="btn-primary btn-sm mt-2"
        >
          {posting && <Spinner />}
          Gửi
        </button>
      </div>
    </section>
  );
}
