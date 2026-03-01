import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AccountView } from '@/components/AccountView';

export default async function AccountPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <AccountView
      user={user}
      profile={profile}
    />
  );
}
