'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TimeBlock } from './TimeBlock';
import { SprintLoggerScreen } from './SprintLoggerScreen';
import { Category, Sprint, getTimeBlocks, getCurrentTimeBlock } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';

interface TimelineProps {
  initialSprints: Sprint[];
  initialCategories: Category[];
  date: Date;
  userId: string;
}

export function Timeline({ initialSprints, initialCategories, date, userId }: TimelineProps) {
  const [sprints, setSprints] = useState<Sprint[]>(initialSprints);
  const [categories] = useState<Category[]>(initialCategories);
  const [selectedBlock, setSelectedBlock] = useState<Date | null>(null);
  const [showLogger, setShowLogger] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleRange, setVisibleRange] = useState({ start: 12, end: 44 }); // 6am to 10pm default

  const supabase = createClient();
  const allTimeBlocks = getTimeBlocks(date);
  const timeBlocks = allTimeBlocks.slice(visibleRange.start, visibleRange.end);

  // Find sprint for a specific block
  const getSprintForBlock = useCallback((blockStart: Date) => {
    return sprints.find(s => {
      const sprintStart = new Date(s.block_start);
      return sprintStart.getTime() === blockStart.getTime();
    });
  }, [sprints]);

  // Get category for a sprint
  const getCategoryForSprint = (sprint: Sprint) => {
    return categories.find(c => c.id === sprint.category_id);
  };

  // Refresh sprints from database
  const refreshSprints = async () => {
    setRefreshing(true);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from('sprints')
      .select('*')
      .gte('block_start', startOfDay.toISOString())
      .lte('block_start', endOfDay.toISOString())
      .order('block_start', { ascending: true });

    if (data) {
      setSprints(data);
    }
    setRefreshing(false);
  };

  // Handle block click
  const handleBlockClick = (blockStart: Date) => {
    setSelectedBlock(blockStart);
    setShowLogger(true);
  };

  // Save sprint
  const handleSaveSprint = async (data: { categoryId: string; description: string; score: number }) => {
    if (!selectedBlock) return;

    const existingSprint = getSprintForBlock(selectedBlock);

    if (existingSprint) {
      // Update existing sprint
      const { error } = await supabase
        .from('sprints')
        .update({
          category_id: data.categoryId,
          description: data.description || null,
          score: data.score,
        })
        .eq('id', existingSprint.id);

      if (!error) {
        setSprints(prev => prev.map(s =>
          s.id === existingSprint.id
            ? { ...s, category_id: data.categoryId, description: data.description || null, score: data.score }
            : s
        ));
      } else {
        console.error('Error updating sprint:', error);
      }
    } else {
      // Create new sprint - INCLUDE user_id!
      const { data: newSprint, error } = await supabase
        .from('sprints')
        .insert({
          user_id: userId,
          block_start: selectedBlock.toISOString(),
          category_id: data.categoryId,
          description: data.description || null,
          score: data.score,
        })
        .select()
        .single();

      if (!error && newSprint) {
        setSprints(prev => [...prev, newSprint]);
      } else {
        console.error('Error creating sprint:', error);
      }
    }
  };

  // Delete sprint
  const handleDeleteSprint = async () => {
    if (!selectedBlock) return;
    const existingSprint = getSprintForBlock(selectedBlock);
    if (!existingSprint) return;

    const { error } = await supabase
      .from('sprints')
      .delete()
      .eq('id', existingSprint.id);

    if (!error) {
      setSprints(prev => prev.filter(s => s.id !== existingSprint.id));
    }
  };

  // Expand time range
  const expandTimeRange = (direction: 'earlier' | 'later') => {
    if (direction === 'earlier' && visibleRange.start > 0) {
      setVisibleRange(prev => ({ ...prev, start: Math.max(0, prev.start - 4) }));
    } else if (direction === 'later' && visibleRange.end < 48) {
      setVisibleRange(prev => ({ ...prev, end: Math.min(48, prev.end + 4) }));
    }
  };

  // Scroll to current block on mount
  useEffect(() => {
    const currentBlock = getCurrentTimeBlock();
    const blockIndex = timeBlocks.findIndex(b => b.getTime() === currentBlock.getTime());
    if (blockIndex >= 0) {
      setTimeout(() => {
        const element = document.getElementById(`block-${blockIndex}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [timeBlocks]);

  // Calculate daily stats
  const totalSprints = sprints.length;
  const averageScore = totalSprints > 0
    ? (sprints.reduce((sum, s) => sum + s.score, 0) / totalSprints).toFixed(1)
    : '-';

  const selectedSprint = selectedBlock ? getSprintForBlock(selectedBlock) : undefined;

  // If showing logger, render full screen
  if (showLogger && selectedBlock) {
    return (
      <SprintLoggerScreen
        blockStart={selectedBlock}
        categories={categories}
        existingSprint={selectedSprint}
        onSave={handleSaveSprint}
        onDelete={selectedSprint ? handleDeleteSprint : undefined}
        onClose={() => setShowLogger(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Sprints: </span>
            <span className="font-bold text-gold-400">{totalSprints}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Avg Score: </span>
            <span className="font-bold text-gold-400">{averageScore}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshSprints}
          disabled={refreshing}
          className="text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Expand earlier button */}
      {visibleRange.start > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => expandTimeRange('earlier')}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          <ChevronUp className="h-4 w-4 mr-2" />
          Show earlier times
        </Button>
      )}

      {/* Timeline blocks */}
      <div className="space-y-2">
        {timeBlocks.map((block, index) => {
          const sprint = getSprintForBlock(block);
          const category = sprint ? getCategoryForSprint(sprint) : undefined;

          return (
            <div key={block.toISOString()} id={`block-${index}`}>
              <TimeBlock
                blockStart={block}
                sprint={sprint}
                category={category}
                onClick={() => handleBlockClick(block)}
              />
            </div>
          );
        })}
      </div>

      {/* Expand later button */}
      {visibleRange.end < 48 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => expandTimeRange('later')}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className="h-4 w-4 mr-2" />
          Show later times
        </Button>
      )}
    </div>
  );
}

interface DateNavigatorProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

export function DateNavigator({ date, onDateChange }: DateNavigatorProps) {
  const isToday = date.toDateString() === new Date().toDateString();

  const goToPrevDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <Button variant="ghost" size="icon" onClick={goToPrevDay} className="hover:bg-laurel-900/50">
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold italic text-foreground">
          {isToday ? 'Today' : formatDate(date)}
        </h2>
        {!isToday && (
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-xs border-laurel-700 text-laurel-400 hover:bg-laurel-900/50"
          >
            Today
          </Button>
        )}
      </div>

      <Button variant="ghost" size="icon" onClick={goToNextDay} className="hover:bg-laurel-900/50">
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
