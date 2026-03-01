'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Timeline, DateNavigator } from '@/components/timeline/Timeline';
import { WrapupForm } from '@/components/daily-wrapup/WrapupForm';
import { SprintMode } from '@/components/SprintMode';
import { Category, Sprint, DailyWrapup } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface DailyViewProps {
  initialSprints: Sprint[];
  initialCategories: Category[];
  initialWrapup: DailyWrapup | null;
  initialDate: Date;
  userId: string;
}

export function DailyView({
  initialSprints,
  initialCategories,
  initialWrapup,
  initialDate,
  userId,
}: DailyViewProps) {
  const [date, setDate] = useState(new Date(initialDate));
  const [sprints, setSprints] = useState<Sprint[]>(initialSprints);
  const [wrapup, setWrapup] = useState<DailyWrapup | null>(initialWrapup);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  // Fetch data for a specific date
  const fetchData = useCallback(async (targetDate: Date, showLoading = true) => {
    if (showLoading) setLoading(true);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [sprintsResult, wrapupResult] = await Promise.all([
      supabase
        .from('sprints')
        .select('*')
        .gte('block_start', startOfDay.toISOString())
        .lte('block_start', endOfDay.toISOString())
        .order('block_start', { ascending: true }),
      supabase
        .from('daily_wrapups')
        .select('*')
        .eq('date', targetDate.toISOString().split('T')[0])
        .maybeSingle(),
    ]);

    setSprints(sprintsResult.data || []);
    setWrapup(wrapupResult.data);
    if (showLoading) setLoading(false);
  }, [supabase]);

  // Fetch data when date changes
  useEffect(() => {
    fetchData(date);
  }, [date, fetchData]);

  // Auto-refresh when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData(date, false); // Silent refresh
      }
    };

    const handleFocus = () => {
      fetchData(date, false); // Silent refresh
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [date, fetchData]);

  const handleDateChange = (newDate: Date) => {
    setDate(newDate);
  };

  return (
    <div className="space-y-4">
      <DateNavigator date={date} onDateChange={handleDateChange} />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-400" />
        </div>
      ) : (
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className={cn(
            'grid w-full grid-cols-2 mb-4 p-1 rounded-xl',
            'bg-muted/50',
            'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)]',
            'dark:bg-olympus-900/50',
            'dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]'
          )}>
            <TabsTrigger
              value="timeline"
              className={cn(
                'rounded-lg font-bold italic transition-all',
                'data-[state=active]:bg-laurel-700 data-[state=active]:text-white',
                'data-[state=active]:shadow-[0_2px_8px_rgba(45,74,40,0.5)]'
              )}
            >
              Timeline
            </TabsTrigger>
            <TabsTrigger
              value="wrapup"
              className={cn(
                'rounded-lg font-bold italic transition-all',
                'data-[state=active]:bg-laurel-700 data-[state=active]:text-white',
                'data-[state=active]:shadow-[0_2px_8px_rgba(45,74,40,0.5)]'
              )}
            >
              Daily Wrap-up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-0">
            <Timeline
              initialSprints={sprints}
              initialCategories={initialCategories}
              date={date}
              userId={userId}
            />
          </TabsContent>

          <TabsContent value="wrapup" className="mt-0">
            <WrapupForm
              date={date}
              sprints={sprints}
              existingWrapup={wrapup}
              onSave={setWrapup}
              userId={userId}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Sprint Mode - Pomodoro Timer */}
      <SprintMode />
    </div>
  );
}
