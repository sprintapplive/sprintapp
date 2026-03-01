'use client';

import { useMemo } from 'react';
import { ScoreChart } from '@/components/analytics/ScoreChart';
import { CategoryPieChart } from '@/components/analytics/CategoryPieChart';
import { WeeklyTrends } from '@/components/analytics/WeeklyTrends';
import { Sprint, Category, WeeklyGoal, DailyWrapup } from '@/lib/types';
import { TrendingUp, Target, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SprintWithCategory extends Sprint {
  categories?: {
    name: string;
    color: string;
    icon: string;
  };
}

interface AnalyticsViewProps {
  sprints: SprintWithCategory[];
  categories: Category[];
  weeklyGoal: WeeklyGoal | null;
  wrapups: DailyWrapup[];
  weekStart: Date;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function AnalyticsView({
  sprints,
  weeklyGoal,
  wrapups,
  weekStart,
}: AnalyticsViewProps) {
  // Process data for charts
  const { scoreData, categoryData, weeklyData, stats } = useMemo(() => {
    // Group sprints by day
    const sprintsByDay: Record<string, SprintWithCategory[]> = {};
    DAYS.forEach((day, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      const dateStr = date.toISOString().split('T')[0];
      sprintsByDay[dateStr] = [];
    });

    sprints.forEach(sprint => {
      const dateStr = new Date(sprint.block_start).toISOString().split('T')[0];
      if (sprintsByDay[dateStr]) {
        sprintsByDay[dateStr].push(sprint);
      }
    });

    // Score data for line chart
    const scoreData = Object.entries(sprintsByDay).map(([date, daySprints], index) => {
      const avgScore = daySprints.length > 0
        ? daySprints.reduce((sum, s) => sum + s.score, 0) / daySprints.length
        : 0;
      return {
        date,
        day: DAYS[index],
        averageScore: Math.round(avgScore * 10) / 10,
        totalSprints: daySprints.length,
      };
    });

    // Category data for pie chart
    const categoryCount: Record<string, { count: number; color: string }> = {};
    sprints.forEach(sprint => {
      const categoryName = sprint.categories?.name || 'Unknown';
      const categoryColor = sprint.categories?.color || 'marble-200';
      if (!categoryCount[categoryName]) {
        categoryCount[categoryName] = { count: 0, color: categoryColor };
      }
      categoryCount[categoryName].count++;
    });

    const categoryData = Object.entries(categoryCount).map(([name, data]) => ({
      name,
      value: data.count,
      color: data.color,
      minutes: data.count * 30,
    }));

    // Weekly trends data
    const weeklyData = Object.entries(sprintsByDay).map(([, daySprints], index) => {
      const wasted = daySprints.filter(s => s.categories?.name === 'Wasted').length;
      const productive = daySprints.length - wasted;
      return {
        day: DAYS[index],
        sprints: daySprints.length,
        productive,
        wasted,
      };
    });

    // Calculate overall stats
    const totalSprints = sprints.length;
    const totalMinutes = totalSprints * 30;
    const averageScore = totalSprints > 0
      ? sprints.reduce((sum, s) => sum + s.score, 0) / totalSprints
      : 0;
    const wastedMinutes = sprints.filter(s => s.categories?.name === 'Wasted').length * 30;
    const exerciseDays = wrapups.filter(w => w.exercised).length;

    return {
      scoreData,
      categoryData,
      weeklyData,
      stats: {
        totalSprints,
        totalMinutes,
        averageScore: Math.round(averageScore * 10) / 10,
        wastedMinutes,
        exerciseDays,
      },
    };
  }, [sprints, wrapups, weekStart]);

  const formatWeekRange = () => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const format = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${format(weekStart)} - ${format(weekEnd)}`;
  };

  return (
    <div className="space-y-6">
      {/* Week header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black italic text-foreground">Weekly Analytics</h1>
        <span className="text-muted-foreground italic">{formatWeekRange()}</span>
      </div>

      {/* Stats cards - neomorphic */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={cn(
          'p-4 rounded-xl',
          'bg-gradient-to-br from-laurel-900/50 to-laurel-800/30',
          'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]',
          'border border-laurel-700/30'
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-laurel-700/50 flex items-center justify-center">
              <Clock className="h-5 w-5 text-gold-400" />
            </div>
            <div>
              <div className="text-2xl font-black italic text-gold-400">
                {Math.round(stats.totalMinutes / 60 * 10) / 10}h
              </div>
              <div className="text-xs text-muted-foreground">Total Tracked</div>
            </div>
          </div>
        </div>

        <div className={cn(
          'p-4 rounded-xl',
          'bg-gradient-to-br from-gold-900/30 to-gold-800/20',
          'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]',
          'border border-gold-700/30'
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold-700/50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-gold-400" />
            </div>
            <div>
              <div className="text-2xl font-black italic text-gold-400">{stats.averageScore}</div>
              <div className="text-xs text-muted-foreground">Avg Score</div>
            </div>
          </div>
        </div>

        <div className={cn(
          'p-4 rounded-xl',
          'bg-gradient-to-br from-red-900/30 to-red-800/20',
          'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]',
          'border border-red-700/30'
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-700/50 flex items-center justify-center">
              <Target className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-black italic text-red-400">{stats.wastedMinutes}m</div>
              <div className="text-xs text-muted-foreground">Wasted</div>
            </div>
          </div>
        </div>

        <div className={cn(
          'p-4 rounded-xl',
          'bg-gradient-to-br from-laurel-900/50 to-laurel-800/30',
          'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]',
          'border border-laurel-700/30'
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-laurel-700/50 flex items-center justify-center">
              <Zap className="h-5 w-5 text-gold-400" />
            </div>
            <div>
              <div className="text-2xl font-black italic text-gold-400">{stats.exerciseDays}</div>
              <div className="text-xs text-muted-foreground">Exercise Days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <ScoreChart data={scoreData} targetScore={weeklyGoal?.target_average_score || 7} />
        <CategoryPieChart data={categoryData} />
      </div>

      <WeeklyTrends data={weeklyData} />

      {/* Goal progress */}
      {weeklyGoal && (
        <div className="neo-card p-6 space-y-4">
          <h3 className="text-lg font-bold italic text-foreground">Goal Progress</h3>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Average Score Target: {weeklyGoal.target_average_score}</span>
              <span className={stats.averageScore >= weeklyGoal.target_average_score ? 'text-laurel-400 font-bold' : 'text-amber-400 font-bold'}>
                Current: {stats.averageScore}
              </span>
            </div>
            <div className="h-3 bg-card rounded-full overflow-hidden shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]">
              <div
                className="h-full bg-gradient-to-r from-laurel-600 to-laurel-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (stats.averageScore / weeklyGoal.target_average_score) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Max Wasted Time: {weeklyGoal.max_wasted_minutes}min</span>
              <span className={stats.wastedMinutes <= weeklyGoal.max_wasted_minutes ? 'text-laurel-400 font-bold' : 'text-red-400 font-bold'}>
                Current: {stats.wastedMinutes}min
              </span>
            </div>
            <div className="h-3 bg-card rounded-full overflow-hidden shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  stats.wastedMinutes <= weeklyGoal.max_wasted_minutes
                    ? 'bg-gradient-to-r from-laurel-600 to-laurel-500'
                    : 'bg-gradient-to-r from-red-600 to-red-500'
                )}
                style={{ width: `${Math.min(100, (stats.wastedMinutes / weeklyGoal.max_wasted_minutes) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
