import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import PersonalNotes from '@/components/notes/PersonalNotes';
import { NOTES_PAGE_SIZE, NOTE_COLUMNS, signImages, type PersonalNote } from '@/lib/personal-notes';

export default async function PersonalNotesPage() {
  const supabase = createClient();
  const user = await getUser();

  // RLS chỉ trả về ghi chú của chính mình
  const { data } = await supabase
    .from('personal_notes')
    .select(NOTE_COLUMNS)
    .is('deleted_at', null)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .range(0, NOTES_PAGE_SIZE - 1);
  const notes = (data ?? []) as PersonalNote[];
  // chỉ ký sẵn ảnh bìa; ảnh còn lại ký khi mở ghi chú
  const urls = await signImages(supabase, notes.map((n) => n.image_paths[0]).filter(Boolean));

  return (
    <div className="container-page py-8">
      <PageHeader
        back={{ href: '/profile', label: 'Trang cá nhân' }}
        eyebrow="Trang cá nhân"
        title="Ghi chú ~của tôi~"
        mark
      />
      <PersonalNotes userId={user!.id} initialNotes={notes} initialUrls={urls} />
    </div>
  );
}
