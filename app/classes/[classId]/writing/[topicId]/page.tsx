import { notFound } from 'next/navigation';
import { getClassAccess } from '@/lib/access';
import TeacherTopicView from './TeacherTopicView';
import StudentWriteTopic from './StudentWriteTopic';

export default async function WritingTopicPage({
  params,
}: {
  params: { classId: string; topicId: string };
}) {
  const access = await getClassAccess(params.classId);
  if (!access?.canView) notFound();

  if (access.canManage) {
    return (
      <TeacherTopicView
        classId={params.classId}
        topicId={params.topicId}
        userId={access.userId}
      />
    );
  }
  return (
    <StudentWriteTopic
      classId={params.classId}
      topicId={params.topicId}
      userId={access.userId}
    />
  );
}
