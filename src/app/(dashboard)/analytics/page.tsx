import { createClient } from '@/lib/supabase/server';
import { AnalyticsView } from '@/components/AnalyticsView';

export default async function AnalyticsPage() {
  const supabase = await createClient();

  // Get the current week's start (Monday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // Fetch week's sprints
  const { data: sprints } = await supabase
    .from('sprints')
    .select('*, categories(name, color, icon)')
    .gte('block_start', weekStart.toISOString())
    .lt('block_start', weekEnd.toISOString())
    .order('block_start', { ascending: true });

  // Fetch categories for reference
  const { data: categories } = await supabase
    .from('categories')
    .select('*');

  // Fetch weekly goal if exists
  const { data: weeklyGoal } = await supabase
    .from('weekly_goals')
    .select('*')
    .eq('week_start', weekStart.toISOString().split('T')[0])
    .single();

  // Fetch daily wrapups for the week
  const { data: wrapups } = await supabase
    .from('daily_wrapups')
    .select('*')
    .gte('date', weekStart.toISOString().split('T')[0])
    .lt('date', weekEnd.toISOString().split('T')[0]);

  return (
    <AnalyticsView
      sprints={sprints || []}
      categories={categories || []}
      weeklyGoal={weeklyGoal}
      wrapups={wrapups || []}
      weekStart={weekStart}
    />
  );
}
