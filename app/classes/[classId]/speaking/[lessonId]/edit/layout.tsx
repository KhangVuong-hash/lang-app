import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getClassAccess } from '@/lib/access';

export default async function Guard({
  children,
  params,
}: {
  children: ReactNode;
  params: { classId: string };
}) {
  const access = await getClassAccess(params.classId);
  if (!access?.canView) notFound();
  return <>{children}</>;
}
