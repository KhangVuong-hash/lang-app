import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getClassAccess } from '@/lib/access';
import PageHeader from '@/components/ui/PageHeader';
import LessonRow from '@/components/ui/LessonRow';
import EmptyState from '@/components/ui/EmptyState';

export default async function SpeakingListPage({ params }: { params: { classId: string } }) {
  const access = await getClassAccess(params.classId);
  if (!access?.canView) notFound();

  const supabase = createClient();
  const { data: lessons } = await supabase
    .from('speaking_lessons')
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
        eyebrow="🗣️ Kỹ năng Nói"
        title="Bài shadowing"
      >
        {access.canManage && (
          <Link href={`${base}/speaking/new`} className="btn-primary">
            Tạo bài shadowing
          </Link>
        )}
      </PageHeader>

      {list.length === 0 ? (
        <EmptyState
          icon="🗣️"
          title="Chưa có bài shadowing nào"
          hint={
            access.canManage
              ? 'Tạo bài từ video YouTube để học sinh luyện nói theo từng câu.'
              : 'Giáo viên sẽ thêm bài cho lớp.'
          }
        />
      ) : (
        <div className="card divide-y divide-line">
          {list.map((l) => (
            <LessonRow
              key={l.id}
              href={`${base}/speaking/${l.id}`}
              title={l.title}
              thumbnailId={l.youtube_video_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
