import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/olympics/leaderboard - Process weekly leaderboard
// This can be called via cron job or manually
export async function POST(request: NextRequest) {
  try {
    // Verify this is an authorized request (you may want to add API key validation)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Allow if valid cron secret or if called from authenticated admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const isAuthorizedCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const isAuthenticatedUser = !!user;

    if (!isAuthorizedCron && !isAuthenticatedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get week_start from request body or default to current week
    const body = await request.json().catch(() => ({}));
    const weekStart = body.week_start || null;

    // Call the database function
    const { data, error } = await supabase.rpc('process_weekly_leaderboard', {
      p_week_start: weekStart,
    });

    if (error) {
      console.error('Leaderboard processing error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      processed: data?.length || 0,
      results: data,
    });
  } catch (error) {
    console.error('Weekly leaderboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/olympics/leaderboard - Get current leaderboard status
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current week's Monday
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const weekStart = monday.toISOString().split('T')[0];

    // Get top 10 from weekly_stats
    const { data: leaderboard, error } = await supabase
      .from('weekly_stats')
      .select('user_id, average_score, total_sprints, ranking_score, tier, rank_position, profiles(display_name)')
      .eq('week_start', weekStart)
      .order('ranking_score', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get user's own stats
    const { data: userStats } = await supabase
      .from('weekly_stats')
      .select('average_score, total_sprints, ranking_score, tier, rank_position')
      .eq('week_start', weekStart)
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      weekStart,
      leaderboard: leaderboard || [],
      userStats,
    });
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
