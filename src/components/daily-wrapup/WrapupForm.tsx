'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DailyWrapup, Sprint } from '@/lib/types';
import { Dumbbell, Utensils, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WrapupFormProps {
  date: Date;
  sprints: Sprint[];
  existingWrapup: DailyWrapup | null;
  onSave: (wrapup: DailyWrapup) => void;
  userId: string;
}

export function WrapupForm({ date, sprints, existingWrapup, onSave, userId }: WrapupFormProps) {
  const [reflection, setReflection] = useState(existingWrapup?.reflection || '');
  const [eatingScore, setEatingScore] = useState(existingWrapup?.eating_score || 7);
  const [exercised, setExercised] = useState(existingWrapup?.exercised || false);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  // Calculate stats
  const totalSprints = sprints.length;
  const averageScore = totalSprints > 0
    ? sprints.reduce((sum, s) => sum + s.score, 0) / totalSprints
    : 0;

  useEffect(() => {
    setReflection(existingWrapup?.reflection || '');
    setEatingScore(existingWrapup?.eating_score || 7);
    setExercised(existingWrapup?.exercised || false);
  }, [existingWrapup]);

  const handleSave = async () => {
    setSaving(true);
    const dateStr = date.toISOString().split('T')[0];

    const wrapupData = {
      user_id: userId,
      date: dateStr,
      reflection: reflection || null,
      eating_score: eatingScore,
      exercised,
      average_score: averageScore,
      total_sprints: totalSprints,
    };

    if (existingWrapup) {
      const { data, error } = await supabase
        .from('daily_wrapups')
        .update(wrapupData)
        .eq('id', existingWrapup.id)
        .select()
        .single();

      if (!error && data) {
        onSave(data);
      }
    } else {
      const { data, error } = await supabase
        .from('daily_wrapups')
        .insert(wrapupData)
        .select()
        .single();

      if (!error && data) {
        onSave(data);
      }
    }

    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats summary - neomorphic */}
      <div className="grid grid-cols-2 gap-4">
        <div className={cn(
          'p-4 rounded-xl',
          'bg-gradient-to-br from-laurel-900/50 to-laurel-800/30',
          'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]',
          'border border-laurel-700/30'
        )}>
          <div className="text-3xl font-bold italic text-gold-400">{totalSprints}</div>
          <div className="text-sm text-muted-foreground">Sprints Logged</div>
        </div>
        <div className={cn(
          'p-4 rounded-xl',
          'bg-gradient-to-br from-gold-900/30 to-gold-800/20',
          'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]',
          'border border-gold-700/30'
        )}>
          <div className="text-3xl font-bold italic text-gold-400">
            {averageScore > 0 ? averageScore.toFixed(1) : '-'}
          </div>
          <div className="text-sm text-muted-foreground">Avg Score</div>
        </div>
      </div>

      {/* Exercise toggle */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
          <Dumbbell className="h-4 w-4 text-gold-400" />
          Did you exercise today?
        </Label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setExercised(true)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 p-4 rounded-xl transition-all font-bold',
              'border-2',
              exercised
                ? 'border-laurel-500 bg-laurel-700/50 text-laurel-300 shadow-[0_0_20px_rgba(74,103,65,0.3)]'
                : 'border-border bg-card hover:border-laurel-700',
              'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]'
            )}
          >
            <CheckCircle className="h-5 w-5" />
            Yes
          </button>
          <button
            type="button"
            onClick={() => setExercised(false)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 p-4 rounded-xl transition-all font-bold',
              'border-2',
              !exercised
                ? 'border-marble-500 bg-marble-700/30 text-marble-300'
                : 'border-border bg-card hover:border-marble-600',
              'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]'
            )}
          >
            <XCircle className="h-5 w-5" />
            No
          </button>
        </div>
      </div>

      {/* Eating score */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
          <Utensils className="h-4 w-4 text-gold-400" />
          Eating Score
        </Label>
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
            <button
              key={s}
              onClick={() => setEatingScore(s)}
              className={cn(
                'w-9 h-9 rounded-lg font-bold text-sm transition-all',
                eatingScore === s
                  ? 'bg-gold-400 text-olympus-900 shadow-[0_0_15px_rgba(212,175,55,0.5)]'
                  : 'bg-card border border-border text-muted-foreground hover:border-gold-600',
                'shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2),inset_-1px_-1px_2px_rgba(255,255,255,0.05)]'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Reflection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Daily Reflection
        </Label>
        <Textarea
          placeholder="How was your day? What did you accomplish? What could you improve?"
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={4}
          className={cn(
            'resize-none bg-card border-border',
            'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]',
            'focus:border-laurel-500 focus:ring-laurel-500/20'
          )}
        />
      </div>

      {/* Save button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          'w-full h-12 font-bold italic text-lg',
          'bg-gradient-to-r from-laurel-700 to-laurel-600',
          'hover:from-laurel-600 hover:to-laurel-500',
          'shadow-[0_4px_15px_rgba(45,74,40,0.4)]',
          'disabled:opacity-50'
        )}
      >
        {saving ? 'Saving...' : existingWrapup ? 'Update Wrap-up' : 'Save Wrap-up'}
      </Button>
    </div>
  );
}
