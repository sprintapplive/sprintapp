import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatsView } from '@/components/StatsView';

export default async function StatsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get the current week's start (Monday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // Fetch week's sprints with categories
  const { data: sprints } = await supabase
    .from('sprints')
    .select('*, categories(name, color, icon)')
    .gte('block_start', weekStart.toISOString())
    .lt('block_start', weekEnd.toISOString())
    .order('block_start', { ascending: true });

  // Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  // Fetch daily wrapups for the week
  const { data: wrapups } = await supabase
    .from('daily_wrapups')
    .select('*')
    .gte('date', weekStart.toISOString().split('T')[0])
    .lt('date', weekEnd.toISOString().split('T')[0]);

  // Get past 4 weeks of goals for history
  const fourWeeksAgo = new Date(weekStart);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const { data: goals } = await supabase
    .from('weekly_goals')
    .select('*')
    .gte('week_start', fourWeeksAgo.toISOString().split('T')[0])
    .order('week_start', { ascending: false });

  const currentGoal = goals?.find(
    g => g.week_start === weekStart.toISOString().split('T')[0]
  );

  return (
    <StatsView
      sprints={sprints || []}
      categories={categories || []}
      weeklyGoal={currentGoal || null}
      pastGoals={goals?.filter(g => g.week_start !== weekStart.toISOString().split('T')[0]) || []}
      wrapups={wrapups || []}
      weekStart={weekStart}
      userId={user.id}
    />
  );
}
