'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import RouteLoading from '@/components/ui/RouteLoading';
import CommentThread from '@/components/CommentThread';
import WritingEditor from './WritingEditor';

export default function StudentWriteTopic({
  classId,
  topicId,
  userId,
}: {
  classId: string;
  topicId: string;
  userId: string;
}) {
  const supabase = createClient();

  const [topic, setTopic] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from('writing_topics').select('*').eq('id', topicId).is('deleted_at', null).single();
      setTopic(t);
    })();
  }, [topicId]); // eslint-disable-line

  if (!topic) return <RouteLoading label="Đang tải bài viết…" />;

  return (
    <div className="container-page py-8">
      <a
        href={`/classes/${classId}/writing`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <span aria-hidden>‹</span> Chủ đề viết
      </a>

      <p className="text-sm font-medium text-ink-faint">
        {topic.topic_type === 'essay' ? 'Bài luận' : 'Dịch đoạn văn'}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold sm:text-3xl">{topic.title}</h1>
        <a href={`/classes/${classId}/writing/${topicId}/edit`} className="btn-secondary btn-sm">
          Sửa chủ đề
        </a>
      </div>
      {topic.prompt && <p className="mt-2 text-sm text-ink-soft">{topic.prompt}</p>}
      {topic.source_text && (
        <p className="mt-3 whitespace-pre-wrap rounded-lg bg-paper p-3 text-sm text-ink-soft">
          {topic.source_text}
        </p>
      )}

      <WritingEditor topicId={topicId} topicType={topic.topic_type} userId={userId} />

      <CommentThread
        classId={classId}
        subjectType="writing"
        subjectId={topicId}
        currentUserId={userId}
        canModerate={false}
      />
    </div>
  );
}
