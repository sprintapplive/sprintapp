import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NewsView } from '@/components/NewsView';

export default async function NewsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  return <NewsView />;
}
