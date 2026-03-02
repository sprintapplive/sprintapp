import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AgoraView } from '@/components/AgoraView';

export default async function AgoraPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get current week start (Monday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  // Fetch weekly stats for leaderboard
  const { data: weeklyStats } = await supabase
    .from('weekly_stats')
    .select('*, profiles(display_name)')
    .eq('week_start', weekStartStr)
    .order('ranking_score', { ascending: false });

  // Fetch previous week's stats for movement comparison
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const { data: prevWeekStats } = await supabase
    .from('weekly_stats')
    .select('user_id, rank_position')
    .eq('week_start', prevWeekStart.toISOString().split('T')[0]);

  // Fetch user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch all sprints for Journey badges
  const { data: allSprints } = await supabase
    .from('sprints')
    .select('*, categories(name, color, icon)')
    .order('block_start', { ascending: true });

  return (
    <AgoraView
      weeklyStats={weeklyStats || []}
      prevWeekStats={prevWeekStats || []}
      currentUserId={user.id}
      userDisplayName={profile?.display_name || user.email?.split('@')[0] || 'Anonymous'}
      weekStart={weekStart}
      sprints={allSprints || []}
    />
  );
}
