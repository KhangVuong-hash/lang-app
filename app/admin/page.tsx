import { createClient } from '@/lib/supabase/server';
import PageHeader from '@/components/ui/PageHeader';
import LanguageCrest from '@/components/ui/LanguageCrest';
import { LANGUAGE_MAP } from '@/lib/constants';
import RoleSelect from './RoleSelect';

export default async function AdminPage() {
  const supabase = createClient();

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  const { data: classes } = await supabase
    .from('classes')
    .select('*, languages(name), profiles!classes_teacher_id_fkey(full_name)')
    .order('created_at', { ascending: false });

  return (
    <div className="container-page max-w-5xl py-8">
      <PageHeader eyebrow="Quản trị" title="Người dùng và lớp học" />

      <div className="card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">
          Người dùng ({users?.length ?? 0})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-faint">
                <th className="pb-2 font-medium">Tên</th>
                <th className="pb-2 font-medium">Vai trò</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(users ?? []).map((u) => (
                <tr key={u.id}>
                  <td className="py-2.5 text-ink">{u.full_name ?? '-'}</td>
                  <td className="py-2.5">
                    <RoleSelect userId={u.id} currentRole={u.role} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">
          Lớp học ({classes?.length ?? 0})
        </h2>
        <ul className="divide-y divide-line">
          {(classes ?? []).map((c: any) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm">
              <LanguageCrest code={c.language_code} size="sm" />
              <div>
                <p className="font-medium text-ink">{c.name}</p>
                <p className="text-xs text-ink-faint">
                  {LANGUAGE_MAP[c.language_code]?.name ?? c.languages?.name} · GV:{' '}
                  {c.profiles?.full_name ?? '-'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
