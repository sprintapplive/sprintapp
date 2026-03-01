'use client';

import { cn } from '@/lib/utils';
import { Sprint, Category, CATEGORY_COLORS, formatTimeBlock, isCurrentBlock, isBlockInPast } from '@/lib/types';
import { Brain, Briefcase, Dumbbell, Moon, Users, XCircle, Clock } from 'lucide-react';

interface TimeBlockProps {
  blockStart: Date;
  sprint?: Sprint;
  category?: Category;
  onClick: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  brain: Brain,
  briefcase: Briefcase,
  dumbbell: Dumbbell,
  moon: Moon,
  users: Users,
  'x-circle': XCircle,
};

export function TimeBlock({ blockStart, sprint, category, onClick }: TimeBlockProps) {
  const isCurrent = isCurrentBlock(blockStart);
  const isPast = isBlockInPast(blockStart);
  const hasData = !!sprint;

  const bgColor = hasData && category
    ? CATEGORY_COLORS[category.color] || '#1f2e1d'
    : undefined;

  const Icon = category ? iconMap[category.icon] || Clock : Clock;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full flex items-center gap-3 p-3 rounded-xl transition-all',
        'focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:ring-offset-2 focus:ring-offset-background',
        // Neomorphic styling
        hasData
          ? 'shadow-[4px_4px_8px_rgba(0,0,0,0.3),-2px_-2px_6px_rgba(255,255,255,0.03)]'
          : cn(
              'bg-card border border-border/50',
              'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.02)]',
              'hover:border-laurel-600/50 hover:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2),inset_-1px_-1px_2px_rgba(255,255,255,0.02)]'
            ),
        // Current block highlight
        isCurrent && !hasData && 'ring-2 ring-gold-400/60 ring-offset-2 ring-offset-background border-gold-400/50'
      )}
      style={hasData ? {
        background: `linear-gradient(145deg, ${bgColor}, ${bgColor}dd)`,
      } : undefined}
    >
      {/* Current block pulse indicator */}
      {isCurrent && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-gold-400 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.6)]" />
      )}

      {/* Time indicator */}
      <div className={cn(
        'flex-shrink-0 text-xs font-bold w-16 text-left',
        hasData
          ? category?.color === 'marble-200'
            ? 'text-gray-700'
            : 'text-white/90'
          : 'text-muted-foreground'
      )}>
        {formatTimeBlock(blockStart)}
      </div>

      {/* Content */}
      {hasData ? (
        <div className={cn(
          'flex-1 flex items-center gap-3',
          category?.color === 'marble-200' ? 'text-gray-700' : 'text-white'
        )}>
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-bold truncate">
              {category?.name || 'Unknown'}
            </div>
            {sprint.description && (
              <div className={cn(
                'text-xs truncate',
                category?.color === 'marble-200' ? 'text-gray-600' : 'text-white/70'
              )}>
                {sprint.description}
              </div>
            )}
          </div>
          <div className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
            'bg-white/20 backdrop-blur-sm',
            'text-xl font-black italic',
            category?.color === 'marble-200' ? 'text-gray-700' : 'text-white'
          )}>
            {sprint.score}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center">
            <Clock className="h-4 w-4 opacity-50" />
          </div>
          <span className="text-sm italic">
            {isCurrent ? 'Log current sprint' : isPast ? 'Empty' : 'Upcoming'}
          </span>
        </div>
      )}
    </button>
  );
}
