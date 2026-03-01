import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DailyView } from '@/components/DailyView';
import { DEFAULT_CATEGORIES } from '@/lib/types';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get today's date range
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch today's sprints
  const { data: sprints } = await supabase
    .from('sprints')
    .select('*')
    .gte('block_start', startOfDay.toISOString())
    .lte('block_start', endOfDay.toISOString())
    .order('block_start', { ascending: true });

  // Fetch user's categories
  let { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  // If user has no categories (signed up before migration), create defaults
  if (!categories || categories.length === 0) {
    const defaultCats = DEFAULT_CATEGORIES.map(cat => ({
      user_id: user.id,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      is_default: true,
    }));

    const { data: newCategories } = await supabase
      .from('categories')
      .insert(defaultCats)
      .select();

    categories = newCategories || [];
  }

  // Check if daily wrapup exists for today
  const todayStr = today.toISOString().split('T')[0];
  const { data: wrapup } = await supabase
    .from('daily_wrapups')
    .select('*')
    .eq('date', todayStr)
    .maybeSingle();

  return (
    <DailyView
      initialSprints={sprints || []}
      initialCategories={categories || []}
      initialWrapup={wrapup}
      initialDate={today}
      userId={user.id}
    />
  );
}
