'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, X, RotateCcw, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const SPRINT_DURATION = 25 * 60; // 25 minutes in seconds

type SprintState = 'idle' | 'ready' | 'running' | 'paused' | 'complete';

export function SprintMode() {
  const [state, setState] = useState<SprintState>('idle');
  const [timeRemaining, setTimeRemaining] = useState(SPRINT_DURATION);
  const [runnerPosition, setRunnerPosition] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Calculate progress (0 to 1)
  const progress = 1 - timeRemaining / SPRINT_DURATION;

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start the timer
  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setState('complete');
          // Play completion sound (browser beep)
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVktkLbU5/Odzj0aVYrN5/DHjkMtZJzQ6+rJm1UoVYfL5+/Wrnc8LmSd0OvpyJhRJVOGy+fx16x0Oy1km9Ds6siYUSRTh8vn8teqcjotY5zR7OrIl1AkU4jM6PHXqXE6LWOd0e3qx5ZPIlKIzOny2KpwOS1jntLu68eWTiFSic3p89mqbzgtY57S7+vGlU4gUYnO6vTaq245LGKe0+/sxpRNH1GKz+v12qptOSxinubw68WTSx5Qis/s9turbjkrYZ7U8e3GlEweUInQ7fXcq2w3K2Ge1fLtxZNLHU+J0e719d2rbDYrYJ/V8+7Fk0odT4rR7vb23atrNiphINbyAAA=');
            audio.play();
          } catch {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setState('running');
  }, []);

  // Pause the timer
  const pauseTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState('paused');
  };

  // Reset the timer
  const resetTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimeRemaining(SPRINT_DURATION);
    setRunnerPosition(0);
    setState('idle');
  };

  // Handle ready state countdown
  useEffect(() => {
    if (state === 'ready') {
      const timeout = setTimeout(() => {
        startTimer();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [state, startTimer]);

  // Animate runner position
  useEffect(() => {
    setRunnerPosition(progress * 100);
  }, [progress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Floating action button (when idle)
  if (state === 'idle') {
    return (
      <button
        onClick={() => setState('ready')}
        className={cn(
          'fixed bottom-6 right-6 z-40',
          'w-14 h-14 rounded-full',
          'bg-gradient-to-br from-gold-400 to-gold-600',
          'shadow-[0_4px_20px_rgba(212,175,55,0.4)]',
          'flex items-center justify-center',
          'hover:scale-110 active:scale-95 transition-transform',
          'animate-pulse'
        )}
        title="Start Sprint Mode"
      >
        <Zap className="h-6 w-6 text-olympus-900" />
      </button>
    );
  }

  // Sprint mode overlay
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Close button */}
      <button
        onClick={resetTimer}
        className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Ready state */}
        {state === 'ready' && (
          <div className="text-center animate-pulse">
            <Zap className="h-16 w-16 text-gold-400 mx-auto mb-4" />
            <h2 className="text-3xl font-black italic text-gold-400">GET READY TO SPRINT</h2>
            <p className="text-muted-foreground mt-2">Starting in 2 seconds...</p>
          </div>
        )}

        {/* Running / Paused / Complete states */}
        {(state === 'running' || state === 'paused' || state === 'complete') && (
          <>
            {/* Timer display */}
            <div className="text-center mb-8">
              <div className={cn(
                'text-7xl font-black italic tabular-nums',
                state === 'complete' ? 'text-gold-400' : 'text-foreground'
              )}>
                {formatTime(timeRemaining)}
              </div>
              <p className="text-muted-foreground mt-2">
                {state === 'complete' ? 'Sprint Complete!' : state === 'paused' ? 'Paused' : 'Focus time'}
              </p>
            </div>

            {/* Progress track with runner */}
            <div className="w-full max-w-md mb-8">
              {/* Track */}
              <div className="relative h-16 bg-muted/30 rounded-xl overflow-hidden">
                {/* Progress fill */}
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-laurel-700/50 to-gold-400/50"
                  style={{ width: `${progress * 100}%` }}
                />

                {/* Colosseum at the end */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-2xl">
                  🏛️
                </div>

                {/* Runner */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-linear"
                  style={{ left: `calc(${runnerPosition}% - 12px)` }}
                >
                  <div className="text-2xl -scale-x-100">
                    🏃
                  </div>
                </div>

                {/* Track markers */}
                <div className="absolute inset-0 flex justify-between px-4 items-center pointer-events-none">
                  {[0, 25, 50, 75, 100].map((mark) => (
                    <div
                      key={mark}
                      className={cn(
                        'w-0.5 h-3 rounded-full',
                        progress * 100 >= mark ? 'bg-gold-400/60' : 'bg-muted-foreground/20'
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Time markers */}
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>0:00</span>
                <span>6:15</span>
                <span>12:30</span>
                <span>18:45</span>
                <span>25:00</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {state === 'complete' ? (
                <button
                  onClick={resetTimer}
                  className={cn(
                    'flex items-center gap-2 px-6 py-3 rounded-xl',
                    'bg-gold-400 text-olympus-900 font-bold',
                    'hover:bg-gold-500 transition-colors'
                  )}
                >
                  <RotateCcw className="h-5 w-5" />
                  New Sprint
                </button>
              ) : (
                <>
                  <button
                    onClick={resetTimer}
                    className="p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                    title="Reset"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>

                  <button
                    onClick={state === 'running' ? pauseTimer : startTimer}
                    className={cn(
                      'flex items-center gap-2 px-8 py-4 rounded-xl font-bold',
                      'bg-gold-400 text-olympus-900',
                      'hover:bg-gold-500 transition-colors'
                    )}
                  >
                    {state === 'running' ? (
                      <>
                        <Pause className="h-6 w-6" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-6 w-6" />
                        Resume
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Motivational message */}
            {state === 'running' && (
              <p className="mt-8 text-center text-muted-foreground italic max-w-sm">
                {progress < 0.25 && "You've got this! Deep focus starts now."}
                {progress >= 0.25 && progress < 0.5 && "Quarter done! Keep the momentum."}
                {progress >= 0.5 && progress < 0.75 && "Halfway there! Stay strong."}
                {progress >= 0.75 && progress < 1 && "Final stretch! The Colosseum awaits."}
              </p>
            )}

            {state === 'complete' && (
              <div className="mt-8 text-center">
                <p className="text-2xl mb-2">🏆</p>
                <p className="text-gold-400 font-bold italic">Victory! You've earned your rest.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
