'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Coins, Trophy } from 'lucide-react';
import { OlympicsSetup } from './olympics/OlympicsSetup';
import { OlympicsSession } from './olympics/OlympicsSession';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OlympicsLap } from '@/lib/types';
import { toast } from 'sonner';

const BUY_IN_COST = 5;
const WIN_REWARD = 10;

interface OlympicsViewProps {
  userId: string;
  initialRings: number;
  status: 'Olympian' | 'Spartan' | 'Helot';
  displayName: string;
}

type ViewState = 'intro' | 'setup' | 'session';

export function OlympicsView({ userId, initialRings, status, displayName }: OlympicsViewProps) {
  const router = useRouter();
  const [viewState, setViewState] = useState<ViewState>('intro');
  const [goldenRings, setGoldenRings] = useState(initialRings);
  const [sessionLaps, setSessionLaps] = useState<OlympicsLap[]>([]);

  // Deduct rings from user's balance
  const deductRings = async (amount: number): Promise<boolean> => {
    try {
      const response = await fetch('/api/olympics/rings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deduct', amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to deduct rings');
        return false;
      }

      setGoldenRings(data.newBalance);
      return true;
    } catch {
      toast.error('Network error');
      return false;
    }
  };

  // Add rings to user's balance
  const addRings = async (amount: number): Promise<boolean> => {
    try {
      const response = await fetch('/api/olympics/rings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to add rings');
        return false;
      }

      setGoldenRings(data.newBalance);
      return true;
    } catch {
      toast.error('Network error');
      return false;
    }
  };

  // Handle session start (deduct buy-in)
  const handleStartSession = useCallback(async (laps: OlympicsLap[]) => {
    const success = await deductRings(BUY_IN_COST);
    if (success) {
      setSessionLaps(laps);
      setViewState('session');
    }
  }, []);

  // Handle win
  const handleWin = useCallback(async (bankedSeconds: number) => {
    const bonusRings = Math.floor(bankedSeconds / 180); // 1 ring per 3 minutes banked
    const totalReward = WIN_REWARD + bonusRings;

    await addRings(totalReward);
    toast.success(`Victory! +${totalReward} Golden Rings`, {
      icon: '🏆',
    });
  }, []);

  // Handle loss
  const handleLose = useCallback(() => {
    // Wager already deducted at start, nothing to do
    toast.error('Defeated. Your wager is lost.', {
      icon: '💀',
    });
  }, []);

  // Handle exit (return to intro or navigate away)
  const handleExit = useCallback(() => {
    setViewState('intro');
    setSessionLaps([]);
    router.refresh(); // Refresh to get updated ring count from server
  }, [router]);

  // Intro view
  if (viewState === 'intro') {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center p-6">
        {/* Back button */}
        <div className="absolute top-20 left-4 md:top-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center"
        >
          {/* Stadium illustration */}
          <div className="relative mb-8">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-gold-400/20 to-gold-600/20 flex items-center justify-center"
            >
              <span className="text-6xl">🏟️</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-gold-400 flex items-center justify-center text-olympus-900 font-bold text-sm"
            >
              55m
            </motion.div>
          </div>

          <h1 className="text-3xl font-black italic text-gold-400 mb-2">
            Olympics Mode
          </h1>
          <p className="text-muted-foreground mb-8">
            Enter the arena for a 55-minute structured work session.
            Define your laps, race against time, and earn glory.
          </p>

          {/* Ring balance */}
          <div className="neo-card p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                <Coins className="w-5 h-5 text-olympus-900" />
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Your Golden Rings</p>
                <p className="text-xl font-bold text-gold-400">{goldenRings}</p>
              </div>
            </div>
            <div className={cn(
              'px-3 py-1 rounded-full text-xs font-bold',
              status === 'Olympian' && 'bg-gold-400/20 text-gold-400',
              status === 'Spartan' && 'bg-laurel-400/20 text-laurel-400',
              status === 'Helot' && 'bg-marble-400/20 text-marble-400'
            )}>
              {status}
            </div>
          </div>

          {/* Rules */}
          <div className="neo-card p-4 mb-8 text-left">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gold-400" />
              Rules of the Arena
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-gold-400 font-bold">1.</span>
                Pay 5 Golden Rings to enter
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold-400 font-bold">2.</span>
                Define 2-8 laps totaling exactly 55 minutes
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold-400 font-bold">3.</span>
                Complete each lap before its time runs out
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold-400 font-bold">4.</span>
                Finish early = bank time for bonus rings
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold-400 font-bold">5.</span>
                Run out of time = lose your wager
              </li>
            </ul>
          </div>

          {/* CTA */}
          <Button
            onClick={() => setViewState('setup')}
            disabled={goldenRings < BUY_IN_COST}
            className={cn(
              'w-full h-14 text-lg font-black',
              'bg-gradient-to-r from-gold-500 to-gold-400 text-olympus-900',
              'hover:from-gold-400 hover:to-gold-300',
              'disabled:opacity-50'
            )}
          >
            {goldenRings < BUY_IN_COST ? (
              `Need ${BUY_IN_COST - goldenRings} More Rings`
            ) : (
              <>
                <Trophy className="w-5 h-5 mr-2" />
                Enter the Arena
              </>
            )}
          </Button>

          {goldenRings < BUY_IN_COST && (
            <p className="text-sm text-muted-foreground mt-3">
              Log sprints with a score of 10 to earn more rings!
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  // Setup view
  if (viewState === 'setup') {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-6">
        <OlympicsSetup
          goldenRings={goldenRings}
          onStartSession={handleStartSession}
          onCancel={() => setViewState('intro')}
        />
      </div>
    );
  }

  // Session view
  return (
    <OlympicsSession
      laps={sessionLaps}
      onWin={handleWin}
      onLose={handleLose}
      onExit={handleExit}
    />
  );
}
