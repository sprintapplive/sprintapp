import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { DashboardNav } from '@/components/DashboardNav';
import { Footer } from '@/components/Footer';
import { SwipePages } from '@/components/SwipePages';
import { DEFAULT_CATEGORIES, getTodayInTimezone, getWeekStartInTimezone, getDayBoundsInTimezone } from '@/lib/types';
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

  // Fetch profile first to get timezone
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Use user's timezone or default to browser timezone
  const userTimezone = profileData?.timezone || 'America/Denver';

  // Get today's date in user's timezone
  const todayStr = getTodayInTimezone(userTimezone);
  const { start: startOfDay, end: endOfDay } = getDayBoundsInTimezone(todayStr, userTimezone);

  // Create a local Date object for the client to use
  const [year, month, day] = todayStr.split('-').map(Number);
  const today = new Date(year, month - 1, day);

  // Get the current week's start (Monday) in user's timezone
  const weekStartStr = getWeekStartInTimezone(todayStr, userTimezone);
  const [wYear, wMonth, wDay] = weekStartStr.split('-').map(Number);
  const weekStart = new Date(wYear, wMonth - 1, wDay);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // Check if this is a non-swipeable route (like /account)
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const isAccountRoute = pathname === '/account';

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
    allSprintsResult,
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
    // All sprints for Journey badges (with date for grouping by day)
    supabase
      .from('sprints')
      .select('*, categories(name, color, icon)')
      .order('block_start', { ascending: true }),
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

  // For non-swipeable routes like /account, render children directly
  if (isAccountRoute) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <DashboardNav user={user} />
        <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
          <Suspense fallback={<Loading />}>
            {children}
          </Suspense>
        </main>
        <Footer />
      </div>
    );
  }

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
          allSprints={allSprintsResult.data || []}
          weeklyGoal={currentGoal}
          pastGoals={pastGoals}
          weekWrapups={weekWrapupsResult.data || []}
          weekStart={weekStart}
          weeklyStats={weeklyStatsResult.data || []}
          prevWeekStats={prevWeekStatsResult.data || []}
          userDisplayName={profileData?.display_name || user.email?.split('@')[0] || 'Anonymous'}
        />
      </Suspense>
      <Footer />
    </div>
  );
}
