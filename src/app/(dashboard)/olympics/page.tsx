import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OlympicsView } from '@/components/OlympicsView';

export const metadata = {
  title: 'Olympics Mode | Sprint',
  description: 'Enter the arena. 55 minutes. Multiple laps. One shot at glory.',
};

export default async function OlympicsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile with golden rings
  const { data: profile } = await supabase
    .from('profiles')
    .select('golden_rings, status, display_name')
    .eq('id', user.id)
    .single();

  return (
    <OlympicsView
      userId={user.id}
      initialRings={profile?.golden_rings ?? 20}
      status={profile?.status ?? 'Spartan'}
      displayName={profile?.display_name ?? user.email?.split('@')[0] ?? 'Athlete'}
    />
  );
}
