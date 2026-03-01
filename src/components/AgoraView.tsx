'use client';

import { useState, useEffect } from 'react';
import { WeeklyStats, Phalanx } from '@/lib/types';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Trophy, Users, Shield, TrendingUp, TrendingDown, Minus,
  Crown, Sword, ChevronDown, ChevronUp, Plus, LogIn, Copy, Check,
  Clock
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

interface AgoraViewProps {
  weeklyStats: WeeklyStats[];
  prevWeekStats: { user_id: string; rank_position: number | null }[];
  phalanxes: Phalanx[];
  userPhalanxIds: string[];
  currentUserId: string;
  userDisplayName: string;
  hasCreatedPhalanx: boolean;
  weekStart: Date;
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
  phalanxes,
  userPhalanxIds,
  currentUserId,
  userDisplayName,
  hasCreatedPhalanx,
  weekStart,
}: AgoraViewProps) {
  const [showCreatePhalanx, setShowCreatePhalanx] = useState(false);
  const [showJoinPhalanx, setShowJoinPhalanx] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [phalanxName, setPhalanxName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [newJoinCode, setNewJoinCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
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

  const handleCreatePhalanx = async () => {
    if (!phalanxName.trim() || !newJoinCode.trim()) return;
    setSaving(true);
    setError(null);

    const { data, error: createError } = await supabase
      .from('phalanxes')
      .insert({
        name: phalanxName.trim(),
        join_code: newJoinCode.trim().toUpperCase(),
        created_by: currentUserId,
      })
      .select()
      .single();

    if (createError) {
      setError(createError.message.includes('unique') ? 'Join code already taken' : createError.message);
      setSaving(false);
      return;
    }

    // Auto-join the created phalanx
    if (data) {
      await supabase.from('phalanx_members').insert({
        phalanx_id: data.id,
        user_id: currentUserId,
      });
    }

    setSaving(false);
    setShowCreatePhalanx(false);
    window.location.reload();
  };

  const handleJoinPhalanx = async () => {
    if (!joinCode.trim()) return;
    setSaving(true);
    setError(null);

    // Find phalanx by join code
    const { data: phalanx, error: findError } = await supabase
      .from('phalanxes')
      .select('id')
      .eq('join_code', joinCode.trim().toUpperCase())
      .single();

    if (findError || !phalanx) {
      setError('Phalanx not found. Check the join code.');
      setSaving(false);
      return;
    }

    // Join the phalanx
    const { error: joinError } = await supabase
      .from('phalanx_members')
      .insert({
        phalanx_id: phalanx.id,
        user_id: currentUserId,
      });

    if (joinError) {
      if (joinError.message.includes('maximum of 2')) {
        setError('You can only be in 2 phalanxes');
      } else if (joinError.message.includes('maximum of 6')) {
        setError('This phalanx is full (max 6 members)');
      } else {
        setError(joinError.message);
      }
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowJoinPhalanx(false);
    window.location.reload();
  };

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Group stats by tier
  const olympians = weeklyStats.filter(s => s.tier === 'olympian');
  const spartans = weeklyStats.filter(s => s.tier === 'spartan');
  const helots = weeklyStats.filter(s => s.tier === 'helot');

  // User's phalanxes
  const myPhalanxes = phalanxes.filter(p => userPhalanxIds.includes(p.id));

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

      {/* Phalanx Section */}
      <div className="neo-card p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-gold-400" />
            <h2 className="text-lg font-bold italic text-gold-400">Phalanxes</h2>
          </div>
          <div className="flex gap-2">
            {userPhalanxIds.length < 2 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowJoinPhalanx(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Join
              </Button>
            )}
            {!hasCreatedPhalanx && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreatePhalanx(true)}
                className="text-gold-400 hover:text-gold-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            )}
          </div>
        </div>

        {/* Create Phalanx Form */}
        {showCreatePhalanx && (
          <div className="p-4 rounded-xl border-2 border-gold-400/50 bg-card space-y-4">
            <h3 className="font-bold text-gold-400">Create Your Phalanx</h3>
            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 p-2 rounded">{error}</p>
            )}
            <div className="space-y-2">
              <Label>Phalanx Name</Label>
              <Input
                value={phalanxName}
                onChange={(e) => setPhalanxName(e.target.value)}
                placeholder="e.g., The Spartans"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Join Code (others will use this to join)</Label>
              <Input
                value={newJoinCode}
                onChange={(e) => setNewJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g., SPARTA24"
                maxLength={12}
                className="bg-background uppercase"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreatePhalanx(false);
                  setError(null);
                }}
                className="border-border/50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePhalanx}
                disabled={saving || !phalanxName.trim() || !newJoinCode.trim()}
                className="flex-1 bg-gradient-to-r from-gold-600 to-gold-500"
              >
                {saving ? 'Creating...' : 'Create Phalanx'}
              </Button>
            </div>
          </div>
        )}

        {/* Join Phalanx Form */}
        {showJoinPhalanx && (
          <div className="p-4 rounded-xl border-2 border-laurel-500/50 bg-card space-y-4">
            <h3 className="font-bold text-laurel-400">Join a Phalanx</h3>
            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 p-2 rounded">{error}</p>
            )}
            <div className="space-y-2">
              <Label>Join Code</Label>
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter join code"
                className="bg-background uppercase"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowJoinPhalanx(false);
                  setError(null);
                }}
                className="border-border/50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleJoinPhalanx}
                disabled={saving || !joinCode.trim()}
                className="flex-1 bg-gradient-to-r from-laurel-700 to-laurel-600"
              >
                {saving ? 'Joining...' : 'Join Phalanx'}
              </Button>
            </div>
          </div>
        )}

        {/* My Phalanxes */}
        {myPhalanxes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Your Phalanxes</h3>
            {myPhalanxes.map((phalanx) => (
              <PhalanxCard
                key={phalanx.id}
                phalanx={phalanx}
                isOwner={phalanx.created_by === currentUserId}
                onCopyCode={() => copyJoinCode(phalanx.join_code)}
                copied={copied}
              />
            ))}
          </div>
        )}

        {/* All Phalanxes Leaderboard */}
        {phalanxes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Phalanx Rankings</h3>
            {phalanxes.map((phalanx, index) => (
              <div
                key={phalanx.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl',
                  TIER_STYLES[phalanx.tier || 'spartan'].bg,
                  'border',
                  TIER_STYLES[phalanx.tier || 'spartan'].border,
                  userPhalanxIds.includes(phalanx.id) && 'ring-2 ring-gold-400/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center font-bold',
                    'bg-black/20'
                  )}>
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-bold">{phalanx.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {phalanx.member_count} members
                      {phalanx.has_penalty && (
                        <span className="text-red-400 ml-2">Penalty Active</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn('text-xl font-black italic', TIER_STYLES[phalanx.tier || 'spartan'].text)}>
                    {(phalanx.total_ranking_score * phalanx.penalty_multiplier).toFixed(2)}
                  </div>
                  {phalanx.has_penalty && (
                    <div className="text-xs text-red-400">×{phalanx.penalty_multiplier}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {phalanxes.length === 0 && myPhalanxes.length === 0 && !showCreatePhalanx && !showJoinPhalanx && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No phalanxes yet</p>
            <p className="text-sm text-muted-foreground/70">Create or join one to compete with friends!</p>
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

// Phalanx card component
function PhalanxCard({
  phalanx,
  isOwner,
  onCopyCode,
  copied,
}: {
  phalanx: Phalanx;
  isOwner: boolean;
  onCopyCode: () => void;
  copied: boolean;
}) {
  return (
    <div className={cn(
      'p-4 rounded-xl',
      'bg-gradient-to-br from-laurel-900/50 to-laurel-800/30',
      'border border-laurel-700/30'
    )}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-bold text-gold-400">{phalanx.name}</h4>
          {isOwner && <span className="text-xs text-muted-foreground">Owner</span>}
        </div>
        <button
          onClick={onCopyCode}
          className="flex items-center gap-1 px-2 py-1 rounded bg-card text-xs hover:bg-card/80 transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-laurel-400" /> : <Copy className="h-3 w-3" />}
          {phalanx.join_code}
        </button>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {phalanx.member_count}/6 members
        </div>
        <div className="flex items-center gap-2">
          {phalanx.has_penalty && (
            <span className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
              Penalty ×{phalanx.penalty_multiplier}
            </span>
          )}
          <span className="font-bold text-gold-400">
            Score: {(phalanx.total_ranking_score * phalanx.penalty_multiplier).toFixed(2)}
          </span>
        </div>
      </div>
      {/* Members list */}
      {phalanx.phalanx_members && phalanx.phalanx_members.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex flex-wrap gap-2">
            {phalanx.phalanx_members.map((member) => (
              <div
                key={member.id}
                className={cn(
                  'px-2 py-1 rounded text-xs',
                  member.goal_met ? 'bg-laurel-900/50 text-laurel-300' : 'bg-red-900/30 text-red-400'
                )}
              >
                {member.profiles?.display_name || 'Anonymous'}
                {!member.goal_met && ' (failed)'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
