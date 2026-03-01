import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { DashboardNav } from '@/components/DashboardNav';
import { Footer } from '@/components/Footer';
import { SwipePages } from '@/components/SwipePages';
import { DEFAULT_CATEGORIES } from '@/lib/types';
import Loading from './loading';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
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
  const todayStr = today.toISOString().split('T')[0];

  // Get the current week's start (Monday)
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  // Fetch all data in parallel
  const [
    todaySprintsResult,
    categoriesResult,
    todayWrapupResult,
    weekSprintsResult,
    weekWrapupsResult,
    goalsResult,
    weeklyStatsResult,
    prevWeekStatsResult,
    phalanxesResult,
    userPhalanxesResult,
    profileResult,
    createdPhalanxResult,
  ] = await Promise.all([
    // Today page data
    supabase
      .from('sprints')
      .select('*')
      .gte('block_start', startOfDay.toISOString())
      .lte('block_start', endOfDay.toISOString())
      .order('block_start', { ascending: true }),
    supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true }),
    supabase
      .from('daily_wrapups')
      .select('*')
      .eq('date', todayStr)
      .maybeSingle(),
    // Stats page data
    supabase
      .from('sprints')
      .select('*, categories(name, color, icon)')
      .gte('block_start', weekStart.toISOString())
      .lt('block_start', weekEnd.toISOString())
      .order('block_start', { ascending: true }),
    supabase
      .from('daily_wrapups')
      .select('*')
      .gte('date', weekStartStr)
      .lt('date', weekEnd.toISOString().split('T')[0]),
    supabase
      .from('weekly_goals')
      .select('*')
      .gte('week_start', new Date(weekStart.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('week_start', { ascending: false }),
    // Agora page data
    supabase
      .from('weekly_stats')
      .select('*, profiles(display_name)')
      .eq('week_start', weekStartStr)
      .order('ranking_score', { ascending: false }),
    supabase
      .from('weekly_stats')
      .select('user_id, rank_position')
      .eq('week_start', new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
    supabase
      .from('phalanxes')
      .select('*, phalanx_members(*, profiles(display_name))')
      .order('total_ranking_score', { ascending: false }),
    supabase
      .from('phalanx_members')
      .select('phalanx_id')
      .eq('user_id', user.id),
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('phalanxes')
      .select('id')
      .eq('created_by', user.id)
      .maybeSingle(),
  ]);

  // Handle categories - create defaults if none exist
  let categories = categoriesResult.data || [];
  if (categories.length === 0) {
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

  // Extract weekly goal
  const currentGoal = goalsResult.data?.find(
    g => g.week_start === weekStartStr
  ) || null;
  const pastGoals = goalsResult.data?.filter(g => g.week_start !== weekStartStr) || [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardNav user={user} />
      <Suspense fallback={<Loading />}>
        <SwipePages
          todaySprints={todaySprintsResult.data || []}
          categories={categories}
          todayWrapup={todayWrapupResult.data}
          todayDate={today}
          userId={user.id}
          weekSprints={weekSprintsResult.data || []}
          weeklyGoal={currentGoal}
          pastGoals={pastGoals}
          weekWrapups={weekWrapupsResult.data || []}
          weekStart={weekStart}
          weeklyStats={weeklyStatsResult.data || []}
          prevWeekStats={prevWeekStatsResult.data || []}
          phalanxes={phalanxesResult.data || []}
          userPhalanxIds={userPhalanxesResult.data?.map(p => p.phalanx_id) || []}
          userDisplayName={profileResult.data?.display_name || user.email?.split('@')[0] || 'Anonymous'}
          hasCreatedPhalanx={!!createdPhalanxResult.data}
        />
      </Suspense>
      <Footer />
    </div>
  );
}
