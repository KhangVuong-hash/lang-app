import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getClassAccess } from '@/lib/access';
import PageHeader from '@/components/ui/PageHeader';
import LessonRow from '@/components/ui/LessonRow';
import EmptyState from '@/components/ui/EmptyState';

export default async function ListeningListPage({ params }: { params: { classId: string } }) {
  const access = await getClassAccess(params.classId);
  if (!access?.canView) notFound();

  const supabase = createClient();
  const { data: lessons } = await supabase
    .from('listening_lessons')
    .select('*')
    .eq('class_id', params.classId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const list = lessons ?? [];
  const base = `/classes/${params.classId}`;

  return (
    <div className="container-page py-8">
      <PageHeader
        back={{ href: base, label: 'Tổng quan lớp' }}
        eyebrow="🎧 Kỹ năng Nghe"
        title="Bài nghe"
      >
        {access.canManage && (
          <Link href={`${base}/listening/new`} className="btn-primary">
            Tạo bài nghe
          </Link>
        )}
      </PageHeader>

      {list.length === 0 ? (
        <EmptyState
          icon="🎧"
          title="Chưa có bài nghe nào"
          hint={
            access.canManage
              ? 'Dán link YouTube để hệ thống tự cắt script theo câu.'
              : 'Giáo viên sẽ thêm bài nghe cho lớp.'
          }
        />
      ) : (
        <div className="card divide-y divide-line">
          {list.map((l) => (
            <LessonRow
              key={l.id}
              href={`${base}/listening/${l.id}`}
              title={l.title}
              subtitle={
                access.canManage
                  ? l.transcript_source === 'auto'
                    ? 'Script tự động từ YouTube'
                    : 'Script thủ công'
                  : undefined
              }
              thumbnailId={l.youtube_video_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
