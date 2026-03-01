import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// This endpoint generates daily reports for all users
// It's designed to be called by a cron job or Supabase Edge Function at 11 PM MT

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  // Verify the request is authorized (use a secret key in production)
  const authHeader = request.headers.get('Authorization');
  const expectedKey = process.env.DAILY_REPORT_SECRET;

  if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Create admin client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in Mountain Time
    const now = new Date();
    const mtOffset = -7; // Mountain Time offset (adjust for DST if needed)
    const mtDate = new Date(now.getTime() + mtOffset * 60 * 60 * 1000);
    const todayStr = mtDate.toISOString().split('T')[0];

    // Get all users
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, display_name');

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    const reports = [];

    for (const profile of profiles || []) {
      // Calculate daily stats
      const { data: stats } = await supabase.rpc('calculate_daily_stats', {
        p_user_id: profile.id,
        p_date: todayStr,
      });

      const dailyStats = stats?.[0] || { average_score: 0, total_sprints: 0, wasted_minutes: 0 };

      // Get sprint breakdown by category
      const startOfDay = `${todayStr}T00:00:00.000Z`;
      const endOfDay = `${todayStr}T23:59:59.999Z`;

      const { data: sprints } = await supabase
        .from('sprints')
        .select('score, categories(name)')
        .eq('user_id', profile.id)
        .gte('block_start', startOfDay)
        .lte('block_start', endOfDay);

      // Category breakdown
      const categoryCount: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sprints?.forEach((sprint: any) => {
        const categoryName = sprint.categories?.name || 'Unknown';
        categoryCount[categoryName] = (categoryCount[categoryName] || 0) + 1;
      });

      // Get daily wrapup if exists
      const { data: wrapup } = await supabase
        .from('daily_wrapups')
        .select('*')
        .eq('user_id', profile.id)
        .eq('date', todayStr)
        .single();

      // Build report
      const report = {
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.display_name,
        },
        date: todayStr,
        stats: {
          totalSprints: dailyStats.total_sprints,
          averageScore: dailyStats.average_score,
          wastedMinutes: dailyStats.wasted_minutes,
          totalMinutes: dailyStats.total_sprints * 30,
        },
        categoryBreakdown: categoryCount,
        wrapup: wrapup
          ? {
              reflection: wrapup.reflection,
              eatingScore: wrapup.eating_score,
              exercised: wrapup.exercised,
            }
          : null,
      };

      reports.push(report);

      // If webhook URL is configured, send the report
      const webhookUrl = process.env.DAILY_REPORT_WEBHOOK_URL;
      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report),
          });
        } catch (webhookError) {
          console.error('Webhook delivery failed:', webhookError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      date: todayStr,
      reportsGenerated: reports.length,
      reports,
    });
  } catch (error) {
    console.error('Daily report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Daily Report API',
    usage: 'POST to this endpoint to generate daily reports',
    note: 'Requires SUPABASE_SERVICE_ROLE_KEY and optionally DAILY_REPORT_SECRET env vars',
  });
}
