// Supabase Edge Function for Daily Reports
// This function is triggered at 11 PM Mountain Time to generate daily reports

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DailyStats {
  average_score: number;
  total_sprints: number;
  wasted_minutes: number;
}

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in Mountain Time (UTC-7)
    const now = new Date();
    const mtOffset = -7 * 60; // Mountain Time offset in minutes
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const mtMinutes = utcMinutes + mtOffset;

    // Adjust date if we crossed midnight
    const mtDate = new Date(now);
    if (mtMinutes < 0) {
      mtDate.setUTCDate(mtDate.getUTCDate() - 1);
    } else if (mtMinutes >= 24 * 60) {
      mtDate.setUTCDate(mtDate.getUTCDate() + 1);
    }

    const todayStr = mtDate.toISOString().split('T')[0];

    console.log(`Generating daily reports for ${todayStr}`);

    // Get all users
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, display_name');

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reports = [];

    for (const profile of (profiles || []) as Profile[]) {
      // Calculate daily stats using RPC function
      const { data: stats, error: statsError } = await supabase.rpc('calculate_daily_stats', {
        p_user_id: profile.id,
        p_date: todayStr,
      });

      if (statsError) {
        console.error(`Error calculating stats for ${profile.id}:`, statsError);
        continue;
      }

      const dailyStats: DailyStats = stats?.[0] || {
        average_score: 0,
        total_sprints: 0,
        wasted_minutes: 0,
      };

      // Skip users with no sprints
      if (dailyStats.total_sprints === 0) {
        continue;
      }

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
      sprints?.forEach((sprint: { categories?: { name: string } }) => {
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

      // Send to webhook if configured
      const webhookUrl = Deno.env.get('DAILY_REPORT_WEBHOOK_URL');
      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report),
          });
          console.log(`Report sent for user ${profile.id}`);
        } catch (webhookError) {
          console.error('Webhook delivery failed:', webhookError);
        }
      }
    }

    console.log(`Generated ${reports.length} reports for ${todayStr}`);

    return new Response(
      JSON.stringify({
        success: true,
        date: todayStr,
        reportsGenerated: reports.length,
        reports,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Daily report error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
