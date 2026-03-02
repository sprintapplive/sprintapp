'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Trophy, AlertCircle, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { OlympicsLap } from '@/lib/types';

const BUY_IN_COST = 5;
const MIN_LAPS = 2;
const MAX_LAPS = 8;
const MIN_SESSION_MINUTES = 10;
const MAX_SESSION_MINUTES = 120;

interface OlympicsSetupProps {
  goldenRings: number;
  onStartSession: (laps: OlympicsLap[]) => void;
  onCancel: () => void;
}

export function OlympicsSetup({ goldenRings, onStartSession, onCancel }: OlympicsSetupProps) {
  const [laps, setLaps] = useState<Array<{ title: string; minutes: string }>>([
    { title: '', minutes: '' },
    { title: '', minutes: '' },
  ]);
  const [isStarting, setIsStarting] = useState(false);

  const canAfford = goldenRings >= BUY_IN_COST;
  const totalMinutes = laps.reduce((sum, lap) => sum + (parseInt(lap.minutes) || 0), 0);
  const isValidTotal = totalMinutes >= MIN_SESSION_MINUTES && totalMinutes <= MAX_SESSION_MINUTES;
  const allLapsHaveTitles = laps.every(lap => lap.title.trim().length > 0);
  const allLapsHaveMinutes = laps.every(lap => parseInt(lap.minutes) > 0);
  const canStart = canAfford && isValidTotal && allLapsHaveTitles && allLapsHaveMinutes;

  const addLap = () => {
    if (laps.length < MAX_LAPS) {
      setLaps([...laps, { title: '', minutes: '' }]);
    }
  };

  const removeLap = (index: number) => {
    if (laps.length > MIN_LAPS) {
      setLaps(laps.filter((_, i) => i !== index));
    }
  };

  const updateLap = (index: number, field: 'title' | 'minutes', value: string) => {
    const newLaps = [...laps];
    newLaps[index] = { ...newLaps[index], [field]: value };
    setLaps(newLaps);
  };

  const handleStart = async () => {
    if (!canStart) return;

    setIsStarting(true);

    // Convert to OlympicsLap format
    const sessionLaps: OlympicsLap[] = laps.map((lap, index) => ({
      id: index,
      title: lap.title.trim(),
      allocatedMinutes: parseInt(lap.minutes),
      completed: false,
    }));

    onStartSession(sessionLaps);
  };

  // Quick presets
  const presets = [
    {
      name: 'Quick (25m)',
      laps: [
        { title: 'Focus', minutes: '15' },
        { title: 'Sprint', minutes: '10' },
      ],
    },
    {
      name: 'Standard (45m)',
      laps: [
        { title: 'Warm Up', minutes: '10' },
        { title: 'Deep Work', minutes: '25' },
        { title: 'Final Push', minutes: '10' },
      ],
    },
    {
      name: 'Marathon (90m)',
      laps: [
        { title: 'Phase 1', minutes: '25' },
        { title: 'Phase 2', minutes: '25' },
        { title: 'Phase 3', minutes: '25' },
        { title: 'Sprint', minutes: '15' },
      ],
    },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setLaps(preset.laps);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 mb-4"
        >
          <Trophy className="w-8 h-8 text-olympus-900" />
        </motion.div>
        <h1 className="text-2xl font-black italic text-gold-400">Olympics Mode</h1>
        <p className="text-muted-foreground mt-2">
          55 minutes. Multiple laps. One shot at glory.
        </p>
      </div>

      {/* Ring Balance & Buy-in */}
      <div className={cn(
        'neo-card p-4 mb-6',
        !canAfford && 'border-red-500/50'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
              <Coins className="w-5 h-5 text-olympus-900" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Balance</p>
              <p className="text-xl font-bold text-gold-400">{goldenRings} Rings</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Buy-in Cost</p>
            <p className={cn(
              'text-xl font-bold',
              canAfford ? 'text-foreground' : 'text-red-400'
            )}>
              -{BUY_IN_COST} Rings
            </p>
          </div>
        </div>

        {!canAfford && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 flex items-center gap-2 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4" />
            <span>You need at least {BUY_IN_COST} rings to enter Olympics Mode.</span>
          </motion.div>
        )}
      </div>

      {/* Presets */}
      <div className="mb-6">
        <Label className="text-sm text-muted-foreground mb-2 block">Quick Presets</Label>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 text-xs rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Lap Configuration */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">
            Define Your Laps ({laps.length}/{MAX_LAPS})
          </Label>
          <div className={cn(
            'text-sm font-mono px-2 py-0.5 rounded',
            isValidTotal ? 'bg-gold-400/20 text-gold-400' : 'bg-red-400/20 text-red-400'
          )}>
            {totalMinutes}m total
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {laps.map((lap, index) => (
            <motion.div
              key={index}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>
              <Input
                value={lap.title}
                onChange={(e) => updateLap(index, 'title', e.target.value)}
                placeholder={`Lap ${index + 1} title...`}
                className="flex-1"
              />
              <Input
                type="number"
                value={lap.minutes}
                onChange={(e) => updateLap(index, 'minutes', e.target.value)}
                placeholder="min"
                className="w-20 text-center"
                min={1}
                max={55}
              />
              <span className="text-muted-foreground text-sm w-4">m</span>
              {laps.length > MIN_LAPS && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeLap(index)}
                  className="text-red-400 hover:text-red-500 hover:bg-red-400/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {laps.length < MAX_LAPS && (
          <Button
            variant="outline"
            size="sm"
            onClick={addLap}
            className="w-full mt-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Lap
          </Button>
        )}
      </div>

      {/* Validation Messages */}
      <AnimatePresence>
        {!isValidTotal && totalMinutes > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              'mb-6 p-3 rounded-lg text-sm flex items-center gap-2',
              totalMinutes < MIN_SESSION_MINUTES
                ? 'bg-amber-400/10 text-amber-400'
                : 'bg-red-400/10 text-red-400'
            )}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {totalMinutes < MIN_SESSION_MINUTES ? (
              <span>
                Minimum session length is {MIN_SESSION_MINUTES} minutes.
              </span>
            ) : (
              <span>
                Maximum session length is {MAX_SESSION_MINUTES} minutes.
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prize Info */}
      <div className="neo-card p-4 mb-6 bg-gold-400/5">
        <h3 className="text-sm font-bold text-gold-400 mb-2">Rewards</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li className="flex items-center gap-2">
            <span className="text-gold-400">+10</span> rings if you complete all laps
          </li>
          <li className="flex items-center gap-2">
            <span className="text-gold-400">+1</span> bonus ring per 3 minutes of banked time
          </li>
          <li className="flex items-center gap-2">
            <span className="text-red-400">-5</span> rings lost if time runs out
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isStarting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleStart}
          disabled={!canStart || isStarting}
          className={cn(
            'flex-1 font-bold',
            'bg-gradient-to-r from-gold-500 to-gold-400 text-olympus-900',
            'hover:from-gold-400 hover:to-gold-300',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isStarting ? (
            'Starting...'
          ) : (
            <>
              <Trophy className="w-4 h-4 mr-2" />
              Enter the Arena
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
