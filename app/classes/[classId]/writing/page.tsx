import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getClassAccess } from '@/lib/access';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';

export default async function WritingListPage({ params }: { params: { classId: string } }) {
  const access = await getClassAccess(params.classId);
  if (!access?.canView) notFound();

  const supabase = createClient();
  const { data: topics } = await supabase
    .from('writing_topics')
    .select('*')
    .eq('class_id', params.classId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const list = topics ?? [];
  const base = `/classes/${params.classId}`;

  return (
    <div className="container-page py-8">
      <PageHeader
        back={{ href: base, label: 'Tổng quan lớp' }}
        eyebrow="✍️ Kỹ năng Viết"
        title="Chủ đề viết"
      >
        {access.canManage && (
          <Link href={`${base}/writing/new`} className="btn-primary">
            Tạo chủ đề
          </Link>
        )}
      </PageHeader>

      {list.length === 0 ? (
        <EmptyState
          icon="✍️"
          title="Chưa có chủ đề viết nào"
          hint={
            access.canManage
              ? 'Tạo bài luận theo chủ đề hoặc đoạn văn cần dịch.'
              : 'Giáo viên sẽ giao chủ đề viết cho lớp.'
          }
        />
      ) : (
        <div className="card divide-y divide-line">
          {list.map((t) => (
            <Link
              key={t.id}
              href={`${base}/writing/${t.id}`}
              className="block px-4 py-3 hover:bg-paper"
            >
              <p className="font-medium text-ink">{t.title}</p>
              <p className="text-xs text-ink-faint">
                {t.topic_type === 'essay' ? 'Bài luận theo chủ đề' : 'Dịch đoạn văn'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
