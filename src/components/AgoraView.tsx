'use client';

import { useState, useEffect, useMemo } from 'react';
import { WeeklyStats, Sprint } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Trophy, TrendingUp, TrendingDown, Minus,
  Crown, Sword, Shield, ChevronDown, ChevronUp,
  Clock, Award, Flame, Zap, Star, Target
} from 'lucide-react';

// Greek columns SVG component - slowly rotating
function GreekColumns() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        viewBox="0 0 800 800"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] opacity-[0.03] dark:opacity-[0.05] animate-spin-slow"
      >
        {/* Circular arrangement of columns */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30) * Math.PI / 180;
          const x = 400 + Math.cos(angle) * 300;
          const y = 400 + Math.sin(angle) * 300;
          return (
            <g key={i} transform={`translate(${x}, ${y}) rotate(${i * 30 + 90})`}>
              {/* Column */}
              <rect x="-12" y="-80" width="24" height="160" fill="currentColor" rx="2" />
              {/* Capital (top) */}
              <rect x="-18" y="-90" width="36" height="10" fill="currentColor" rx="1" />
              <rect x="-22" y="-100" width="44" height="10" fill="currentColor" rx="1" />
              {/* Base */}
              <rect x="-18" y="80" width="36" height="10" fill="currentColor" rx="1" />
              <rect x="-22" y="90" width="44" height="10" fill="currentColor" rx="1" />
              {/* Column fluting (vertical lines) */}
              <line x1="-6" y1="-75" x2="-6" y2="75" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              <line x1="0" y1="-75" x2="0" y2="75" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              <line x1="6" y1="-75" x2="6" y2="75" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            </g>
          );
        })}
        {/* Center laurel wreath */}
        <circle cx="400" cy="400" r="80" fill="none" stroke="currentColor" strokeWidth="4" />
        <circle cx="400" cy="400" r="60" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      </svg>
    </div>
  );
}

// Countdown timer to next Friday 11 PM MST
function useCountdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const getNextFriday11PM = () => {
      const now = new Date();
      // Mountain Standard Time is UTC-7
      const mtOffset = -7;

      const target = new Date(now);
      const dayOfWeek = target.getDay();

      // Calculate days until Friday (5)
      let daysUntilFriday = (5 - dayOfWeek + 7) % 7;

      // If it's Friday, check if we're past 11 PM MT
      if (daysUntilFriday === 0) {
        const currentMTHour = (now.getUTCHours() + mtOffset + 24) % 24;
        if (currentMTHour >= 23) {
          daysUntilFriday = 7; // Next Friday
        }
      }

      target.setDate(target.getDate() + daysUntilFriday);
      // Set to 11 PM MST (23:00 MST = 06:00 UTC next day)
      target.setUTCHours(23 - mtOffset, 0, 0, 0);

      return target;
    };

    const updateCountdown = () => {
      const now = new Date();
      const target = getNextFriday11PM();
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  return timeLeft;
}

// Badge definitions
const BADGES = [
  {
    id: 'spartans_discipline',
    name: "Spartan's Discipline",
    description: 'Get 3 perfect scores (10) in one day',
    icon: Sword,
    color: 'from-red-600 to-red-800',
    borderColor: 'border-red-500/50',
    textColor: 'text-red-400',
    requirement: (sprints: SprintWithCategory[]) => {
      // Group by date and count 10s per day
      const sprintsByDate: Record<string, number> = {};
      sprints.forEach(sprint => {
        if (sprint.score === 10) {
          const date = sprint.block_start.split('T')[0];
          sprintsByDate[date] = (sprintsByDate[date] || 0) + 1;
        }
      });
      // Count days with 3+ perfect scores
      return Object.values(sprintsByDate).filter(count => count >= 3).length;
    },
  },
  {
    id: 'marathon_runner',
    name: 'Marathon Runner',
    description: 'Log sprints for 7 consecutive days',
    icon: Flame,
    color: 'from-orange-500 to-amber-600',
    borderColor: 'border-orange-500/50',
    textColor: 'text-orange-400',
    requirement: (sprints: SprintWithCategory[]) => {
      // Get all unique dates with sprints
      const dates = [...new Set(sprints.map(s => s.block_start.split('T')[0]))].sort();
      if (dates.length < 7) return 0;

      let streaks = 0;
      let currentStreak = 1;

      for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i - 1]);
        const currDate = new Date(dates[i]);
        const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
          currentStreak++;
          if (currentStreak === 7) {
            streaks++;
            currentStreak = 0; // Reset to count next streak
          }
        } else {
          currentStreak = 1;
        }
      }
      return streaks;
    },
  },
  {
    id: 'hercules_labor',
    name: "Hercules' Labor",
    description: 'Log 30+ sprints in a single day',
    icon: Zap,
    color: 'from-purple-600 to-violet-700',
    borderColor: 'border-purple-500/50',
    textColor: 'text-purple-400',
    requirement: (sprints: SprintWithCategory[]) => {
      // Group by date and count
      const sprintsByDate: Record<string, number> = {};
      sprints.forEach(sprint => {
        const date = sprint.block_start.split('T')[0];
        sprintsByDate[date] = (sprintsByDate[date] || 0) + 1;
      });
      // Count days with 30+ sprints
      return Object.values(sprintsByDate).filter(count => count >= 30).length;
    },
  },
  {
    id: 'athenas_wisdom',
    name: "Athena's Wisdom",
    description: 'Maintain weekly average above 8',
    icon: Star,
    color: 'from-blue-500 to-cyan-600',
    borderColor: 'border-blue-500/50',
    textColor: 'text-blue-400',
    requirement: (sprints: SprintWithCategory[]) => {
      // Group sprints by week (Monday-Sunday)
      const sprintsByWeek: Record<string, { total: number; count: number }> = {};

      sprints.forEach(sprint => {
        const date = new Date(sprint.block_start);
        const dayOfWeek = date.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() + mondayOffset);
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!sprintsByWeek[weekKey]) {
          sprintsByWeek[weekKey] = { total: 0, count: 0 };
        }
        sprintsByWeek[weekKey].total += sprint.score;
        sprintsByWeek[weekKey].count++;
      });

      // Count weeks with average > 8 (minimum 10 sprints to qualify)
      return Object.values(sprintsByWeek).filter(
        week => week.count >= 10 && week.total / week.count > 8
      ).length;
    },
  },
  {
    id: 'apollos_focus',
    name: "Apollo's Focus",
    description: 'Zero wasted minutes in a week',
    icon: Target,
    color: 'from-gold-500 to-gold-700',
    borderColor: 'border-gold-400/50',
    textColor: 'text-gold-400',
    requirement: (sprints: SprintWithCategory[]) => {
      // Group sprints by week
      const weekData: Record<string, { hasWasted: boolean; sprintCount: number }> = {};

      sprints.forEach(sprint => {
        const date = new Date(sprint.block_start);
        const dayOfWeek = date.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() + mondayOffset);
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weekData[weekKey]) {
          weekData[weekKey] = { hasWasted: false, sprintCount: 0 };
        }
        weekData[weekKey].sprintCount++;
        if (sprint.categories?.name === 'Wasted') {
          weekData[weekKey].hasWasted = true;
        }
      });

      // Count weeks with no wasted time (minimum 20 sprints to qualify)
      return Object.values(weekData).filter(
        week => !week.hasWasted && week.sprintCount >= 20
      ).length;
    },
  },
];

interface SprintWithCategory extends Sprint {
  categories?: {
    name: string;
    color: string;
    icon: string;
  };
}

interface AgoraViewProps {
  weeklyStats: WeeklyStats[];
  prevWeekStats: { user_id: string; rank_position: number | null }[];
  currentUserId: string;
  userDisplayName: string;
  weekStart: Date;
  sprints: SprintWithCategory[];
}

const TIER_STYLES = {
  olympian: {
    bg: 'bg-gradient-to-br from-gold-900/40 to-laurel-900/40',
    border: 'border-gold-400/50',
    text: 'text-gold-400',
    icon: Crown,
    label: 'Olympian',
    description: 'Top 20%',
  },
  spartan: {
    bg: 'bg-gradient-to-br from-amber-900/30 to-amber-800/20',
    border: 'border-amber-600/30',
    text: 'text-amber-500',
    icon: Sword,
    label: 'Spartan',
    description: 'Middle 60%',
  },
  helot: {
    bg: 'bg-gradient-to-br from-marble-700/20 to-marble-600/10',
    border: 'border-marble-500/20',
    text: 'text-marble-400',
    icon: Shield,
    label: 'Helot',
    description: 'Bottom 20%',
  },
};

export function AgoraView({
  weeklyStats,
  prevWeekStats,
  currentUserId,
  userDisplayName,
  weekStart,
  sprints,
}: AgoraViewProps) {
  const [expandedHistory, setExpandedHistory] = useState(false);
  const countdown = useCountdown();

  const formatWeekRange = () => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const format = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${format(weekStart)} - ${format(weekEnd)}`;
  };

  const getRankMovement = (userId: string, currentRank: number | null) => {
    const prevRank = prevWeekStats.find(s => s.user_id === userId)?.rank_position;
    if (!prevRank || !currentRank) return null;
    return prevRank - currentRank; // Positive = moved up
  };

  // Calculate badge counts from all-time sprints
  const badgeCounts = useMemo(() => {
    return BADGES.map(badge => ({
      ...badge,
      count: badge.requirement(sprints),
    }));
  }, [sprints]);

  // Group stats by tier
  const olympians = weeklyStats.filter(s => s.tier === 'olympian');
  const spartans = weeklyStats.filter(s => s.tier === 'spartan');
  const helots = weeklyStats.filter(s => s.tier === 'helot');

  return (
    <div className="relative space-y-6">
      {/* Rotating Greek columns background */}
      <GreekColumns />

      {/* Header with countdown */}
      <div className="relative neo-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black italic text-foreground tracking-tight">The Agora</h1>
            <p className="text-sm text-muted-foreground mt-1">{formatWeekRange()}</p>
          </div>

          {/* Countdown timer */}
          <div className="flex items-center gap-3 bg-card/50 rounded-xl px-4 py-3 border border-border/50">
            <Clock className="h-5 w-5 text-gold-400" />
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">Rankings in</span>
              <div className="flex items-center gap-1 font-mono font-bold text-foreground">
                {countdown.days > 0 && (
                  <>
                    <span className="bg-laurel-900/50 px-2 py-1 rounded">{countdown.days}d</span>
                  </>
                )}
                <span className="bg-laurel-900/50 px-2 py-1 rounded">{String(countdown.hours).padStart(2, '0')}h</span>
                <span className="bg-laurel-900/50 px-2 py-1 rounded">{String(countdown.minutes).padStart(2, '0')}m</span>
                <span className="bg-laurel-900/50 px-2 py-1 rounded text-gold-400">{String(countdown.seconds).padStart(2, '0')}s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Journey / Badges Section */}
      <div className="neo-card p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border/50">
          <Award className="h-6 w-6 text-gold-400" />
          <div>
            <h2 className="text-lg font-bold italic text-gold-400">Your Journey</h2>
            <p className="text-xs text-muted-foreground">All-time achievements</p>
          </div>
        </div>

        <div className="grid gap-4">
          {badgeCounts.map((badge) => {
            const Icon = badge.icon;
            const isUnlocked = badge.count > 0;

            return (
              <div
                key={badge.id}
                className={cn(
                  'relative flex items-center gap-4 p-4 rounded-xl border transition-all',
                  isUnlocked
                    ? `bg-gradient-to-br ${badge.color} ${badge.borderColor}`
                    : 'bg-card/50 border-border/30 opacity-60'
                )}
              >
                {/* Badge icon */}
                <div
                  className={cn(
                    'w-14 h-14 rounded-xl flex items-center justify-center',
                    isUnlocked
                      ? 'bg-black/20'
                      : 'bg-muted/30'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-7 w-7',
                      isUnlocked ? 'text-white' : 'text-muted-foreground/50'
                    )}
                  />
                </div>

                {/* Badge info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3
                      className={cn(
                        'font-bold text-lg',
                        isUnlocked ? 'text-white' : 'text-muted-foreground'
                      )}
                    >
                      {badge.name}
                    </h3>
                    {isUnlocked && (
                      <span className="px-2 py-0.5 rounded-full bg-black/30 text-white text-xs font-bold">
                        ×{badge.count}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      'text-sm',
                      isUnlocked ? 'text-white/70' : 'text-muted-foreground/50'
                    )}
                  >
                    {badge.description}
                  </p>
                </div>

                {/* Lock indicator for locked badges */}
                {!isUnlocked && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Individual Leaderboard */}
      <div className="neo-card p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border/50">
          <Trophy className="h-6 w-6 text-gold-400" />
          <h2 className="text-lg font-bold italic text-gold-400">Individual Rankings</h2>
        </div>

        {weeklyStats.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Rankings publish every Friday at 5 PM MT</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Keep logging your sprints!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Olympians */}
            {olympians.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gold-400">
                  <Crown className="h-4 w-4" />
                  <span className="text-sm font-bold uppercase tracking-wide">Olympians</span>
                  <span className="text-xs text-muted-foreground">Top 20%</span>
                </div>
                <div className="space-y-2">
                  {olympians.map((stat) => (
                    <LeaderboardRow
                      key={stat.id}
                      stat={stat}
                      tier="olympian"
                      movement={getRankMovement(stat.user_id, stat.rank_position)}
                      isCurrentUser={stat.user_id === currentUserId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Spartans */}
            {spartans.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-500">
                  <Sword className="h-4 w-4" />
                  <span className="text-sm font-bold uppercase tracking-wide">Spartans</span>
                  <span className="text-xs text-muted-foreground">Middle 60%</span>
                </div>
                <div className="space-y-2">
                  {spartans.map((stat) => (
                    <LeaderboardRow
                      key={stat.id}
                      stat={stat}
                      tier="spartan"
                      movement={getRankMovement(stat.user_id, stat.rank_position)}
                      isCurrentUser={stat.user_id === currentUserId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Helots */}
            {helots.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-marble-400">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-bold uppercase tracking-wide">Helots</span>
                  <span className="text-xs text-muted-foreground">Bottom 20%</span>
                </div>
                <div className="space-y-2">
                  {helots.map((stat) => (
                    <LeaderboardRow
                      key={stat.id}
                      stat={stat}
                      tier="helot"
                      movement={getRankMovement(stat.user_id, stat.rank_position)}
                      isCurrentUser={stat.user_id === currentUserId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Expand history button */}
            <button
              onClick={() => setExpandedHistory(!expandedHistory)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {expandedHistory ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide history
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show movement history
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Leaderboard row component
function LeaderboardRow({
  stat,
  tier,
  movement,
  isCurrentUser,
}: {
  stat: WeeklyStats;
  tier: 'olympian' | 'spartan' | 'helot';
  movement: number | null;
  isCurrentUser: boolean;
}) {
  const styles = TIER_STYLES[tier];

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-xl',
        styles.bg,
        'border',
        styles.border,
        isCurrentUser && 'ring-2 ring-gold-400/50'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm',
          'bg-black/20',
          styles.text
        )}>
          #{stat.rank_position}
        </div>
        <div>
          <div className="font-bold flex items-center gap-2">
            {stat.profiles?.display_name || 'Anonymous'}
            {isCurrentUser && (
              <span className="text-xs text-gold-400">(You)</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Score: {stat.average_score} · Wasted: {stat.wasted_minutes}m
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {movement !== null && movement !== 0 && (
          <div className={cn(
            'flex items-center gap-1 text-sm',
            movement > 0 ? 'text-laurel-400' : 'text-red-400'
          )}>
            {movement > 0 ? (
              <>
                <TrendingUp className="h-4 w-4" />
                +{movement}
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4" />
                {movement}
              </>
            )}
          </div>
        )}
        {movement === 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Minus className="h-4 w-4" />
          </div>
        )}
        <div className={cn('text-xl font-black italic', styles.text)}>
          {stat.ranking_score.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
