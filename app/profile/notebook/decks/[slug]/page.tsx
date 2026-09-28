import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import NotebookNav, { DECK_LINK } from '@/components/vocab/NotebookNav';
import DeckStudy from '@/components/vocab/DeckStudy';
import { DECK_COLUMNS, fetchDeckProgress, fetchDeckWords, type VocabDeck } from '@/lib/vocab';

export default async function VocabDeckPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const [{ data: deck }, profile] = await Promise.all([
    supabase.from('vocab_decks').select(DECK_COLUMNS).eq('slug', params.slug).maybeSingle(),
    getMyProfile(),
  ]);
  if (!deck) notFound();

  // từ của bộ + tiến độ của chính mình (RLS)
  const [words, progress] = await Promise.all([
    fetchDeckWords(supabase, deck.id),
    fetchDeckProgress(supabase, deck.id),
  ]);

  return (
    <div className="container-page pb-8 pt-6">
      <PageHeader eyebrow="Sổ tay" title={deck.title}>
        {deck.description && <p className="text-sm text-ink-soft">{deck.description}</p>}
      </PageHeader>
      <NotebookNav active={DECK_LINK.href} />
      <DeckStudy
        deck={deck as VocabDeck}
        words={words}
        progress={progress}
        isAdmin={profile?.role === 'admin'}
      />
    </div>
  );
}
