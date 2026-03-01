'use client';

import { useMemo, useState } from 'react';
import { ScoreChart } from '@/components/analytics/ScoreChart';
import { CategoryPieChart } from '@/components/analytics/CategoryPieChart';
import { WeeklyTrends } from '@/components/analytics/WeeklyTrends';
import { Sprint, Category, WeeklyGoal, DailyWrapup, CATEGORY_COLORS } from '@/lib/types';
import { TrendingUp, Target, Clock, Zap, Edit2, Save, X, Plus, Settings } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';

interface SprintWithCategory extends Sprint {
  categories?: {
    name: string;
    color: string;
    icon: string;
  };
}

interface StatsViewProps {
  sprints: SprintWithCategory[];
  categories: Category[];
  weeklyGoal: WeeklyGoal | null;
  pastGoals: WeeklyGoal[];
  wrapups: DailyWrapup[];
  weekStart: Date;
  userId: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Helper to get local date string (YYYY-MM-DD) to avoid timezone issues
const getLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function StatsView({
  sprints,
  categories,
  weeklyGoal: initialGoal,
  pastGoals,
  wrapups,
  weekStart,
  userId,
}: StatsViewProps) {
  const [goal, setGoal] = useState<WeeklyGoal | null>(initialGoal);
  const [editingGoal, setEditingGoal] = useState(!initialGoal);
  const [saving, setSaving] = useState(false);
  const [targetScore, setTargetScore] = useState(initialGoal?.target_average_score || 7);
  const [maxWasted, setMaxWasted] = useState(initialGoal?.max_wasted_minutes || 120);
  const [notes, setNotes] = useState(initialGoal?.notes || '');

  const supabase = createClient();

  // Process data for charts
  const { scoreData, categoryData, weeklyData, stats, todayStats } = useMemo(() => {
    const sprintsByDay: Record<string, SprintWithCategory[]> = {};
    DAYS.forEach((day, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      const dateStr = getLocalDateStr(date);
      sprintsByDay[dateStr] = [];
    });

    sprints.forEach(sprint => {
      const dateStr = getLocalDateStr(new Date(sprint.block_start));
      if (sprintsByDay[dateStr]) {
        sprintsByDay[dateStr].push(sprint);
      }
    });

    // Today's stats
    const todayStr = getLocalDateStr(new Date());
    const todaySprints = sprintsByDay[todayStr] || [];
    const todayAvgScore = todaySprints.length > 0
      ? todaySprints.reduce((sum, s) => sum + s.score, 0) / todaySprints.length
      : 0;
    const todayWasted = todaySprints.filter(s => s.categories?.name === 'Wasted').length * 30;
    const todayHighScore = todaySprints.length > 0
      ? Math.max(...todaySprints.map(s => s.score))
      : 0;

    // Today's category breakdown
    const todayCategoryCount: Record<string, { count: number; color: string }> = {};
    todaySprints.forEach(sprint => {
      const categoryName = sprint.categories?.name || 'Unknown';
      const categoryColor = sprint.categories?.color || 'marble-200';
      if (!todayCategoryCount[categoryName]) {
        todayCategoryCount[categoryName] = { count: 0, color: categoryColor };
      }
      todayCategoryCount[categoryName].count++;
    });
    const todayCategories = Object.entries(todayCategoryCount)
      .map(([name, data]) => ({
        name,
        count: data.count,
        minutes: data.count * 30,
        color: data.color,
        percentage: todaySprints.length > 0 ? Math.round((data.count / todaySprints.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

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
      todayStats: {
        sprints: todaySprints.length,
        minutes: todaySprints.length * 30,
        averageScore: Math.round(todayAvgScore * 10) / 10,
        wastedMinutes: todayWasted,
        highScore: todayHighScore,
        categories: todayCategories,
      },
    };
  }, [sprints, wrapups, weekStart]);

  const formatWeekRange = () => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const format = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${format(weekStart)} - ${format(weekEnd)}`;
  };

  const handleSaveGoal = async () => {
    setSaving(true);
    const weekStartStr = getLocalDateStr(weekStart);

    const goalData = {
      user_id: userId,
      week_start: weekStartStr,
      target_average_score: targetScore,
      max_wasted_minutes: maxWasted,
      notes: notes || null,
    };

    if (goal) {
      const { data, error } = await supabase
        .from('weekly_goals')
        .update(goalData)
        .eq('id', goal.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating goal:', error);
      } else if (data) {
        setGoal(data);
        setEditingGoal(false);
      }
    } else {
      const { data, error } = await supabase
        .from('weekly_goals')
        .insert(goalData)
        .select()
        .single();

      if (error) {
        console.error('Error inserting goal:', error);
      } else if (data) {
        setGoal(data);
        setEditingGoal(false);
      }
    }
    setSaving(false);
  };

  const formatToday = () => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Today's Stats */}
      <div className={cn(
        'rounded-xl overflow-hidden',
        'bg-gradient-to-br from-gold-900/20 via-laurel-900/30 to-olympus-900/50',
        'border border-gold-400/20',
        'shadow-[0_4px_20px_rgba(212,175,55,0.1)]'
      )}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-400/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-gold-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold italic text-gold-400">Today</h2>
              <p className="text-xs text-muted-foreground">{formatToday()}</p>
            </div>
          </div>
          {todayStats.sprints > 0 && (
            <div className="text-right">
              <div className={cn(
                'text-3xl font-black italic',
                todayStats.averageScore >= 7 ? 'text-gold-400' : todayStats.averageScore >= 5 ? 'text-foreground' : 'text-red-400'
              )}>
                {todayStats.averageScore}
              </div>
              <div className="text-xs text-muted-foreground">avg score</div>
            </div>
          )}
        </div>

        {todayStats.sprints > 0 ? (
          <div className="p-5 space-y-5">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className={cn(
                'p-3 rounded-xl text-center',
                'bg-background/50 border border-border/30'
              )}>
                <div className="text-2xl font-black italic text-foreground">{todayStats.sprints}</div>
                <div className="text-xs text-muted-foreground">Sprints</div>
              </div>
              <div className={cn(
                'p-3 rounded-xl text-center',
                'bg-background/50 border border-border/30'
              )}>
                <div className="text-2xl font-black italic text-foreground">
                  {todayStats.minutes >= 60
                    ? `${Math.floor(todayStats.minutes / 60)}h ${todayStats.minutes % 60}m`
                    : `${todayStats.minutes}m`
                  }
                </div>
                <div className="text-xs text-muted-foreground">Tracked</div>
              </div>
              <div className={cn(
                'p-3 rounded-xl text-center',
                'bg-background/50 border border-border/30'
              )}>
                <div className={cn(
                  'text-2xl font-black italic',
                  todayStats.highScore === 10 ? 'text-gold-400' : 'text-foreground'
                )}>
                  {todayStats.highScore}
                </div>
                <div className="text-xs text-muted-foreground">Best</div>
              </div>
            </div>

            {/* Category Breakdown */}
            {todayStats.categories.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Time Breakdown
                </h3>

                {/* Stacked bar */}
                <div className="h-3 rounded-full overflow-hidden flex bg-background/30">
                  {todayStats.categories.map((cat, idx) => (
                    <div
                      key={cat.name}
                      className="h-full transition-all"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: CATEGORY_COLORS[cat.color] || '#4a6741',
                      }}
                      title={`${cat.name}: ${cat.minutes}m (${cat.percentage}%)`}
                    />
                  ))}
                </div>

                {/* Category list */}
                <div className="grid grid-cols-2 gap-2">
                  {todayStats.categories.slice(0, 6).map((cat) => (
                    <div
                      key={cat.name}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[cat.color] || '#4a6741' }}
                      />
                      <span className="truncate text-muted-foreground">{cat.name}</span>
                      <span className="ml-auto font-bold text-foreground">{cat.minutes}m</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No sprints logged today</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Start tracking on the Today page</p>
          </div>
        )}
      </div>

      {/* Week header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black italic text-foreground">Weekly Stats</h1>
        <span className="text-muted-foreground italic">{formatWeekRange()}</span>
      </div>

      {/* Stats cards */}
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
        <ScoreChart data={scoreData} targetScore={goal?.target_average_score || 7} />
        <CategoryPieChart data={categoryData} />
      </div>

      <WeeklyTrends data={weeklyData} />

      {/* Weekly Goal Section */}
      <div className="neo-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div>
            <h2 className="text-lg font-bold italic text-gold-400">Weekly Goal</h2>
            <p className="text-sm text-muted-foreground">{formatWeekRange()}</p>
          </div>
          {goal && !editingGoal && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingGoal(true)}
              className="text-muted-foreground hover:text-foreground hover:bg-laurel-900/50"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        {editingGoal ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                <Target className="h-4 w-4 text-gold-400" />
                Target Average Score: <span className="font-black text-gold-400">{targetScore}</span>
              </Label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">1</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={targetScore}
                  onChange={(e) => setTargetScore(parseFloat(e.target.value))}
                  className="flex-1 accent-gold-400"
                />
                <span className="text-xs text-muted-foreground">10</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                <Clock className="h-4 w-4 text-red-400" />
                Max Wasted Time: <span className="font-black text-red-400">{maxWasted} minutes</span>
              </Label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">0</span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={30}
                  value={maxWasted}
                  onChange={(e) => setMaxWasted(parseInt(e.target.value))}
                  className="flex-1 accent-red-400"
                />
                <span className="text-xs text-muted-foreground">6h</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Notes / Focus Areas
              </Label>
              <Textarea
                placeholder="What do you want to focus on this week?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="resize-none bg-card border-border/50"
              />
            </div>

            <div className="flex gap-3">
              {goal && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingGoal(false);
                    setTargetScore(goal.target_average_score);
                    setMaxWasted(goal.max_wasted_minutes);
                    setNotes(goal.notes || '');
                  }}
                  disabled={saving}
                  className="border-border/50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSaveGoal}
                disabled={saving}
                className={cn(
                  'flex-1 font-bold italic',
                  'bg-gradient-to-r from-laurel-700 to-laurel-600',
                  'hover:from-laurel-600 hover:to-laurel-500'
                )}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : goal ? 'Update' : 'Set Goal'}
              </Button>
            </div>
          </div>
        ) : goal ? (
          <div className="space-y-4">
            {/* Goal progress bars */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Average Score Target: {goal.target_average_score}</span>
                <span className={stats.averageScore >= goal.target_average_score ? 'text-laurel-400 font-bold' : 'text-amber-400 font-bold'}>
                  Current: {stats.averageScore}
                </span>
              </div>
              <div className="h-3 bg-card rounded-full overflow-hidden shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]">
                <div
                  className="h-full bg-gradient-to-r from-laurel-600 to-laurel-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (stats.averageScore / goal.target_average_score) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Max Wasted Time: {goal.max_wasted_minutes}min</span>
                <span className={stats.wastedMinutes <= goal.max_wasted_minutes ? 'text-laurel-400 font-bold' : 'text-red-400 font-bold'}>
                  Current: {stats.wastedMinutes}min
                </span>
              </div>
              <div className="h-3 bg-card rounded-full overflow-hidden shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    stats.wastedMinutes <= goal.max_wasted_minutes
                      ? 'bg-gradient-to-r from-laurel-600 to-laurel-500'
                      : 'bg-gradient-to-r from-red-600 to-red-500'
                  )}
                  style={{ width: `${Math.min(100, (stats.wastedMinutes / goal.max_wasted_minutes) * 100)}%` }}
                />
              </div>
            </div>

            {goal.notes && (
              <div className="p-3 rounded-xl bg-card border border-border/50">
                <p className="text-sm text-muted-foreground">{goal.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">No goal set for this week</p>
            <Button
              onClick={() => setEditingGoal(true)}
              className={cn(
                'font-bold italic',
                'bg-gradient-to-r from-laurel-700 to-laurel-600'
              )}
            >
              <Plus className="h-4 w-4 mr-2" />
              Set Weekly Goal
            </Button>
          </div>
        )}
      </div>

      {/* Categories - Links to settings */}
      <Link href="/account" className="block">
        <div className="neo-card p-6 space-y-4 hover:ring-2 hover:ring-gold-400/30 transition-all cursor-pointer">
          <div className="flex items-center justify-between pb-4 border-b border-border/50">
            <h2 className="text-lg font-bold italic text-gold-400">
              Your Categories
            </h2>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm">Edit</span>
              <Settings className="h-4 w-4" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50"
              >
                <div
                  className="w-4 h-4 rounded-full shadow-md"
                  style={{ backgroundColor: CATEGORY_COLORS[category.color] }}
                />
                <span className="text-sm font-medium">{category.name}</span>
              </div>
            ))}
          </div>
        </div>
      </Link>
    </div>
  );
}
