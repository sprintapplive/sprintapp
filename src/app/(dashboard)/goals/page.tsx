import { createClient } from '@/lib/supabase/server';
import { GoalsView } from '@/components/GoalsView';

export default async function GoalsPage() {
  const supabase = await createClient();

  // Get the current week's start (Monday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  // Get past 4 weeks of goals for history
  const fourWeeksAgo = new Date(weekStart);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const { data: goals } = await supabase
    .from('weekly_goals')
    .select('*')
    .gte('week_start', fourWeeksAgo.toISOString().split('T')[0])
    .order('week_start', { ascending: false });

  // Get current week's goal
  const currentGoal = goals?.find(
    g => g.week_start === weekStart.toISOString().split('T')[0]
  );

  // Get user's categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  return (
    <GoalsView
      currentGoal={currentGoal || null}
      pastGoals={goals?.filter(g => g.week_start !== weekStart.toISOString().split('T')[0]) || []}
      categories={categories || []}
      weekStart={weekStart}
    />
  );
}
