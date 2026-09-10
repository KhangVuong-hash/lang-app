import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getClassAccess } from '@/lib/access';

export default async function ClassScopeLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { classId: string };
}) {
  const access = await getClassAccess(params.classId);
  if (access?.isInvited && !access.canView) redirect('/classes');
  if (!access?.canView) notFound();
  return <>{children}</>;
}
