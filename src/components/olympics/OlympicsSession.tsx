'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flag, Trophy, Skull, Clock, Coins, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OlympicsTrack } from './OlympicsTrack';
import { cn } from '@/lib/utils';
import type { OlympicsLap } from '@/lib/types';

// Total session time is calculated from laps

interface OlympicsSessionProps {
  laps: OlympicsLap[];
  onWin: (bankedSeconds: number) => void;
  onLose: () => void;
  onExit: () => void;
}

type SessionPhase = 'countdown' | 'racing' | 'won' | 'lost';

export function OlympicsSession({ laps, onWin, onLose, onExit }: OlympicsSessionProps) {
  const [phase, setPhase] = useState<SessionPhase>('countdown');
  const [countdownValue, setCountdownValue] = useState(3);

  // Calculate total session time from laps
  const totalSessionSeconds = laps.reduce((sum, lap) => sum + lap.allocatedMinutes * 60, 0);

  // Timer state
  const [masterTimeRemaining, setMasterTimeRemaining] = useState(totalSessionSeconds);
  const [currentLapIndex, setCurrentLapIndex] = useState(0);
  const [lapTimeElapsed, setLapTimeElapsed] = useState(0);
  const [bankedTime, setBankedTime] = useState(0);
  const [sessionLaps, setSessionLaps] = useState<OlympicsLap[]>(laps);

  // Refs for precise timing
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Derived state
  const currentLap = sessionLaps[currentLapIndex];
  const currentLapAllocatedSeconds = (currentLap?.allocatedMinutes || 0) * 60;

  // Calculate if we're in overtime for current lap
  const isOvertime = lapTimeElapsed > currentLapAllocatedSeconds;

  // Calculate lap progress (can exceed 1.0 if overtime)
  const lapProgress = currentLapAllocatedSeconds > 0
    ? lapTimeElapsed / currentLapAllocatedSeconds
    : 0;

  // Calculate total progress through all laps
  const totalAllocatedSeconds = sessionLaps.reduce((sum, lap) => sum + lap.allocatedMinutes * 60, 0);
  const elapsedSeconds = totalSessionSeconds - masterTimeRemaining;
  const totalProgress = totalAllocatedSeconds > 0
    ? elapsedSeconds / totalAllocatedSeconds
    : 0;

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    const sign = seconds < 0 ? '-' : '';
    return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate time remaining for current lap
  const lapTimeRemaining = currentLapAllocatedSeconds - lapTimeElapsed;

  // Start the countdown
  useEffect(() => {
    if (phase === 'countdown') {
      const interval = setInterval(() => {
        setCountdownValue((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setPhase('racing');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [phase]);

  // Main race timer
  useEffect(() => {
    if (phase !== 'racing') return;

    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      setMasterTimeRemaining((prev) => {
        const newTime = prev - 1;

        // Check for loss condition
        if (newTime <= 0) {
          clearInterval(intervalRef.current!);
          setPhase('lost');
          return 0;
        }

        return newTime;
      });

      setLapTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [phase]);

  // Handle effects when phase changes
  useEffect(() => {
    if (phase === 'won') {
      onWin(bankedTime);
    } else if (phase === 'lost') {
      onLose();
    }
  }, [phase, bankedTime, onWin, onLose]);

  // Complete current lap
  const completeLap = useCallback(() => {
    if (phase !== 'racing' || currentLapIndex >= sessionLaps.length) return;

    const allocatedSeconds = currentLap.allocatedMinutes * 60;
    const timeDiff = allocatedSeconds - lapTimeElapsed;

    // Update lap as completed
    setSessionLaps((prev) => {
      const updated = [...prev];
      updated[currentLapIndex] = {
        ...updated[currentLapIndex],
        completed: true,
        actualMinutes: lapTimeElapsed / 60,
      };
      return updated;
    });

    // If finished early, bank the time
    if (timeDiff > 0) {
      setBankedTime((prev) => prev + timeDiff);
    }

    // Check if this was the final lap
    if (currentLapIndex === sessionLaps.length - 1) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setPhase('won');
    } else {
      // Move to next lap
      setCurrentLapIndex((prev) => prev + 1);
      setLapTimeElapsed(0);
    }
  }, [phase, currentLapIndex, sessionLaps, currentLap, lapTimeElapsed]);

  // Countdown screen
  if (phase === 'countdown') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <motion.div
          key={countdownValue}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          className="text-center"
        >
          {countdownValue > 0 ? (
            <>
              <div className="text-9xl font-black italic text-gold-400">
                {countdownValue}
              </div>
              <p className="text-muted-foreground text-xl mt-4">
                {countdownValue === 3 && 'Ready...'}
                {countdownValue === 2 && 'Set...'}
                {countdownValue === 1 && 'GO!'}
              </p>
            </>
          ) : (
            <div className="text-4xl font-black italic text-gold-400">
              <Zap className="w-16 h-16 mx-auto mb-4" />
              GO!
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // Win screen
  if (phase === 'won') {
    const bonusRings = Math.floor(bankedTime / 180); // 1 ring per 3 minutes
    const totalRingsWon = 10 + bonusRings;

    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-8xl mb-6"
          >
            🏆
          </motion.div>

          <h1 className="text-3xl font-black italic text-gold-400 mb-2">
            VICTORY!
          </h1>
          <p className="text-muted-foreground mb-8">
            You conquered the arena!
          </p>

          <div className="neo-card p-6 mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Coins className="w-8 h-8 text-gold-400" />
              <span className="text-4xl font-black text-gold-400">
                +{totalRingsWon}
              </span>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Victory bonus:</span>
                <span className="text-gold-400">+10 rings</span>
              </div>
              {bonusRings > 0 && (
                <div className="flex justify-between">
                  <span>Banked time ({formatTime(bankedTime)}):</span>
                  <span className="text-gold-400">+{bonusRings} rings</span>
                </div>
              )}
            </div>
          </div>

          {/* Lap summary */}
          <div className="neo-card p-4 mb-8">
            <h3 className="text-sm font-bold mb-3">Lap Summary</h3>
            <div className="space-y-2">
              {sessionLaps.map((lap, index) => (
                <div key={lap.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{lap.title}</span>
                  <span className={cn(
                    lap.actualMinutes && lap.actualMinutes < lap.allocatedMinutes
                      ? 'text-gold-400'
                      : 'text-foreground'
                  )}>
                    {lap.actualMinutes ? formatTime(lap.actualMinutes * 60) : '--:--'}
                    <span className="text-muted-foreground">/{lap.allocatedMinutes}m</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={onExit}
            className="w-full bg-gradient-to-r from-gold-500 to-gold-400 text-olympus-900 font-bold"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Claim Victory
          </Button>
        </motion.div>
      </div>
    );
  }

  // Loss screen
  if (phase === 'lost') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            className="text-8xl mb-6"
          >
            💀
          </motion.div>

          <h1 className="text-3xl font-black italic text-red-400 mb-2">
            DEFEATED
          </h1>
          <p className="text-muted-foreground mb-8">
            Time ran out. The arena claims your wager.
          </p>

          <div className="neo-card p-6 mb-8 border-red-500/30">
            <div className="flex items-center justify-center gap-4">
              <Skull className="w-8 h-8 text-red-400" />
              <span className="text-4xl font-black text-red-400">
                -5
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Golden rings lost
            </p>
          </div>

          {/* Progress summary */}
          <div className="neo-card p-4 mb-8">
            <h3 className="text-sm font-bold mb-3">Progress</h3>
            <div className="space-y-2">
              {sessionLaps.map((lap, index) => (
                <div key={lap.id} className="flex items-center justify-between text-sm">
                  <span className={cn(
                    lap.completed ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {lap.completed ? '✓' : '✗'} {lap.title}
                  </span>
                  <span className={cn(
                    lap.completed ? 'text-gold-400' : 'text-red-400'
                  )}>
                    {lap.completed ? 'Complete' : index === currentLapIndex ? 'Failed' : 'Skipped'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={onExit}
            variant="outline"
            className="w-full"
          >
            Leave Arena
          </Button>
        </motion.div>
      </div>
    );
  }

  // Racing screen
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground z-10"
      >
        <X className="h-6 w-6" />
      </button>

      <div className="min-h-full flex flex-col items-center justify-center p-6">
        {/* Master Timer */}
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Total Time Remaining
          </p>
          <motion.div
            className={cn(
              'text-5xl md:text-6xl font-black italic tabular-nums',
              masterTimeRemaining < 60 ? 'text-red-400 animate-pulse' : 'text-foreground'
            )}
          >
            {formatTime(masterTimeRemaining)}
          </motion.div>
        </div>

        {/* Track Visualization */}
        <div className="w-full max-w-md mb-6">
          <OlympicsTrack
            laps={sessionLaps}
            currentLapIndex={currentLapIndex}
            lapProgress={Math.min(lapProgress, 2)} // Cap at 2x for visual
            isOvertime={isOvertime}
            totalProgress={Math.min(totalProgress, 1)}
          />
        </div>

        {/* Lap Timer */}
        <div className={cn(
          'neo-card p-4 mb-6 w-full max-w-md',
          isOvertime && 'border-red-500/50'
        )}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Current Lap
              </p>
              <p className="font-bold">{currentLap?.title}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {isOvertime ? 'Overtime' : 'Remaining'}
              </p>
              <p className={cn(
                'text-2xl font-black tabular-nums',
                isOvertime ? 'text-red-400' : lapTimeRemaining < 30 ? 'text-amber-400' : 'text-gold-400'
              )}>
                {isOvertime ? '+' : ''}{formatTime(Math.abs(lapTimeRemaining))}
              </p>
            </div>
          </div>

          {/* Lap progress bar */}
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full',
                isOvertime
                  ? 'bg-gradient-to-r from-red-600 to-red-400'
                  : 'bg-gradient-to-r from-gold-600 to-gold-400'
              )}
              style={{ width: `${Math.min(lapProgress * 100, 100)}%` }}
            />
            {isOvertime && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(lapProgress - 1) * 100}%` }}
                className="h-full bg-red-500/50 -mt-2"
              />
            )}
          </div>
        </div>

        {/* Banked Time & Stats */}
        <div className="flex gap-4 mb-6 text-sm">
          <div className="neo-card px-4 py-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gold-400" />
            <span className="text-muted-foreground">Banked:</span>
            <span className="font-bold text-gold-400">{formatTime(bankedTime)}</span>
          </div>
          <div className="neo-card px-4 py-2 flex items-center gap-2">
            <Flag className="w-4 h-4 text-laurel-400" />
            <span className="text-muted-foreground">Lap:</span>
            <span className="font-bold">{currentLapIndex + 1}/{sessionLaps.length}</span>
          </div>
        </div>

        {/* Complete Lap Button */}
        <motion.div
          whileTap={{ scale: 0.95 }}
          className="w-full max-w-md"
        >
          <Button
            onClick={completeLap}
            className={cn(
              'w-full h-16 text-lg font-black',
              isOvertime
                ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400'
                : 'bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300',
              'text-olympus-900'
            )}
          >
            <Flag className="w-6 h-6 mr-3" />
            {currentLapIndex === sessionLaps.length - 1 ? 'FINISH!' : 'LAP COMPLETE'}
          </Button>
        </motion.div>

        {/* Motivational text */}
        <p className="mt-6 text-center text-muted-foreground italic max-w-sm">
          {isOvertime && "You're behind! Catch up!"}
          {!isOvertime && lapProgress < 0.25 && "Stay focused. You've got this."}
          {!isOvertime && lapProgress >= 0.25 && lapProgress < 0.5 && "Good pace. Keep pushing."}
          {!isOvertime && lapProgress >= 0.5 && lapProgress < 0.75 && "Halfway through this lap!"}
          {!isOvertime && lapProgress >= 0.75 && lapProgress < 1 && "Almost there! Sprint to the finish!"}
        </p>
      </div>
    </div>
  );
}
