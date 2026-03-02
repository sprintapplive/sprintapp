'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sprint, Category, CATEGORY_COLORS, formatTimeBlock, isCurrentBlock, isBlockInPast, getScoreColor } from '@/lib/types';
import { Brain, Briefcase, Dumbbell, Moon, Users, XCircle, Clock, ChevronLeft, ChevronRight, MessageSquare, Circle, ArrowLeft } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface TimeBlockProps {
  blockStart: Date;
  sprint?: Sprint;
  category?: Category;
  categories: Category[];
  onSave: (data: { categoryId: string; description: string; score: number }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  brain: Brain,
  briefcase: Briefcase,
  dumbbell: Dumbbell,
  moon: Moon,
  users: Users,
  'x-circle': XCircle,
  'circle': Circle,
};

type EditStep = 'category' | 'score';

export function TimeBlock({ blockStart, sprint, category, categories, onSave, onDelete }: TimeBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editStep, setEditStep] = useState<EditStep>('category');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isCurrent = isCurrentBlock(blockStart);
  const isPast = isBlockInPast(blockStart);
  const hasData = !!sprint;

  // Initialize state when entering edit mode
  useEffect(() => {
    if (isEditing) {
      if (sprint) {
        setSelectedCategoryId(sprint.category_id);
        setNotes(sprint.description || '');
        // If editing existing sprint on mobile, go straight to score step
        if (isMobile) {
          setEditStep('score');
        }
      } else {
        setSelectedCategoryId(null);
        setNotes('');
        setEditStep('category');
      }
    }
  }, [isEditing, sprint, isMobile]);

  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    if (isMobile) {
      // On mobile, immediately go to score step
      setEditStep('score');
    }
  };

  const handleScoreSelect = async (score: number) => {
    if (!selectedCategoryId) return;

    setSaving(true);
    try {
      await onSave({
        categoryId: selectedCategoryId,
        description: notes,
        score,
      });
      setIsEditing(false);
      setShowNotes(false);
      setEditStep('category');
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowNotes(false);
    setNotes('');
    setEditStep('category');
  };

  const handleBack = () => {
    setEditStep('category');
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const selectedColor = selectedCategory ? CATEGORY_COLORS[selectedCategory.color] : '#4a6741';
  const SelectedIcon = selectedCategory ? (iconMap[selectedCategory.icon] || Circle) : Circle;

  const bgColor = hasData && sprint
    ? getScoreColor(sprint.score, category?.name)
    : undefined;

  // Scores 3-5 have light backgrounds requiring dark text
  const isLightBg = sprint && (sprint.score >= 3 && sprint.score <= 5);

  const Icon = category ? iconMap[category.icon] || Clock : Clock;

  // EDITING MODE
  if (isEditing) {
    // Mobile: Tap-tap flow
    if (isMobile) {
      return (
        <div
          data-editing="true"
          className={cn(
            'relative w-full rounded-xl overflow-hidden transition-all',
            'border-2 border-gold-400',
            'shadow-[0_0_20px_rgba(212,175,55,0.3)]'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-card border-b border-border/50">
            <div className="flex items-center gap-2">
              {editStep === 'score' && (
                <button
                  onClick={handleBack}
                  className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <span className="text-sm font-bold text-gold-400">{formatTimeBlock(blockStart)}</span>
            </div>
            <button
              onClick={handleCancel}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              Cancel
            </button>
          </div>

          {/* Step 1: Category Grid */}
          {editStep === 'category' && (
            <div className="p-3 bg-card">
              <p className="text-xs text-muted-foreground text-center mb-3">What did you do?</p>
              <div className="grid grid-cols-3 gap-3">
                {categories.map((cat) => {
                  const CatIcon = iconMap[cat.icon] || Circle;
                  const isSelected = cat.id === selectedCategoryId;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-xl transition-all active:scale-95',
                        isSelected
                          ? 'ring-2 ring-gold-400 ring-offset-2 ring-offset-card'
                          : 'hover:bg-muted/50'
                      )}
                      style={{ backgroundColor: CATEGORY_COLORS[cat.color] }}
                    >
                      <CatIcon className="h-6 w-6 text-white" />
                      <span className="text-xs font-bold text-white truncate w-full text-center">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Score Grid */}
          {editStep === 'score' && selectedCategory && (
            <div className="bg-card">
              {/* Selected category indicator */}
              <div
                className="flex items-center justify-center gap-3 p-3"
                style={{ backgroundColor: selectedColor }}
              >
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <SelectedIcon className="h-4 w-4 text-white" />
                </div>
                <span className="text-white font-bold">{selectedCategory.name}</span>
              </div>

              {/* Notes toggle */}
              <div className="flex justify-center py-2 border-b border-border/50">
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-colors',
                    showNotes ? 'bg-gold-400/20 text-gold-400' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {showNotes ? 'Hide notes' : 'Add notes'}
                </button>
              </div>

              {/* Notes input */}
              {showNotes && (
                <div className="px-3 py-2 border-b border-border/50">
                  <Textarea
                    placeholder="What did you work on?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="resize-none bg-background border-border/50 text-sm"
                    autoFocus
                  />
                </div>
              )}

              {/* Score grid */}
              <div className="p-3">
                <p className="text-xs text-muted-foreground text-center mb-3">How'd it go?</p>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleScoreSelect(s)}
                      disabled={saving}
                      className={cn(
                        'aspect-square rounded-xl font-bold text-lg transition-all',
                        'active:scale-90',
                        sprint?.score === s
                          ? 'bg-gold-400 text-olympus-900 shadow-[0_0_10px_rgba(212,175,55,0.5)]'
                          : s === 10
                            ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-olympus-900'
                            : s >= 7
                              ? 'bg-laurel-700 text-laurel-200'
                              : s >= 4
                                ? 'bg-muted text-foreground'
                                : 'bg-red-900/50 text-red-300',
                        saving && 'opacity-50'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delete option for existing sprints */}
              {sprint && onDelete && (
                <div className="px-3 py-2 border-t border-border/50">
                  <button
                    onClick={async () => {
                      setSaving(true);
                      await onDelete();
                      setIsEditing(false);
                      setSaving(false);
                    }}
                    disabled={saving}
                    className="w-full text-xs text-red-400 hover:text-red-300 py-1"
                  >
                    Delete sprint
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Desktop: Original layout with all visible
    return (
      <div
        data-editing="true"
        className={cn(
          'relative w-full rounded-xl overflow-hidden transition-all',
          'border-2 border-gold-400',
          'shadow-[0_0_20px_rgba(212,175,55,0.3)]'
        )}
      >
        {/* Header with time and cancel */}
        <div className="flex items-center justify-between px-3 py-2 bg-card border-b border-border/50">
          <span className="text-sm font-bold text-gold-400">{formatTimeBlock(blockStart)}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                showNotes ? 'bg-gold-400/20 text-gold-400' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Add notes"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Category Selector Display */}
        {selectedCategory && (
          <div
            className="flex items-center justify-center gap-2 p-3"
            style={{ backgroundColor: selectedColor }}
          >
            <button
              onClick={() => {
                const idx = categories.findIndex(c => c.id === selectedCategoryId);
                const newIdx = (idx - 1 + categories.length) % categories.length;
                setSelectedCategoryId(categories[newIdx].id);
              }}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>

            <div className="flex items-center gap-3 px-4">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <SelectedIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-white font-bold text-lg min-w-[100px] text-center">
                {selectedCategory.name}
              </span>
            </div>

            <button
              onClick={() => {
                const idx = categories.findIndex(c => c.id === selectedCategoryId);
                const newIdx = (idx + 1) % categories.length;
                setSelectedCategoryId(categories[newIdx].id);
              }}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          </div>
        )}

        {/* Desktop: Category chips */}
        <div className="px-3 py-2 bg-card border-t border-border/50">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => {
              const CatIcon = iconMap[cat.icon] || Circle;
              const isSelected = cat.id === selectedCategoryId;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all',
                    isSelected
                      ? 'bg-gold-400/20 text-gold-400 ring-1 ring-gold-400'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[cat.color] }}
                  />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes input */}
        {showNotes && (
          <div className="px-3 py-2 bg-card border-t border-border/50">
            <Textarea
              placeholder="What did you work on?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none bg-background border-border/50 text-sm"
              autoFocus
            />
          </div>
        )}

        {/* Score selector */}
        <div className="px-3 py-3 bg-card border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center mb-2">Tap score to save</p>
          <div className="flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
              <button
                key={s}
                onClick={() => handleScoreSelect(s)}
                disabled={saving || !selectedCategoryId}
                className={cn(
                  'w-9 h-9 rounded-lg font-bold text-sm transition-all',
                  'active:scale-95',
                  sprint?.score === s
                    ? 'bg-gold-400 text-olympus-900 shadow-[0_0_10px_rgba(212,175,55,0.5)]'
                    : s >= 7
                      ? 'bg-laurel-700/50 text-laurel-300 hover:bg-laurel-700'
                      : s >= 4
                        ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                        : 'bg-red-900/30 text-red-400 hover:bg-red-900/50',
                  (saving || !selectedCategoryId) && 'opacity-50'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Delete option for existing sprints */}
        {sprint && onDelete && (
          <div className="px-3 py-2 bg-card border-t border-border/50">
            <button
              onClick={async () => {
                setSaving(true);
                await onDelete();
                setIsEditing(false);
                setSaving(false);
              }}
              disabled={saving}
              className="w-full text-xs text-red-400 hover:text-red-300 py-1"
            >
              Delete sprint
            </button>
          </div>
        )}
      </div>
    );
  }

  // DISPLAY MODE - Normal time block
  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative w-full flex items-center gap-3 p-3 rounded-xl transition-all',
        'focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:ring-offset-2 focus:ring-offset-background',
        hasData
          ? 'shadow-[4px_4px_8px_rgba(0,0,0,0.3),-2px_-2px_6px_rgba(255,255,255,0.03)]'
          : cn(
              'bg-card border border-border/50',
              'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.02)]',
              'hover:border-laurel-600/50 hover:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2),inset_-1px_-1px_2px_rgba(255,255,255,0.02)]'
            ),
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
          ? isLightBg
            ? 'text-gray-700'
            : 'text-white/90'
          : 'text-muted-foreground'
      )}>
        {formatTimeBlock(blockStart)}
      </div>

      {/* Content */}
      {hasData ? (
        <div className={cn(
          'flex-1 flex items-center gap-3 min-w-0 overflow-hidden',
          isLightBg ? 'text-gray-700' : 'text-white'
        )}>
          <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden text-left">
            <div className="text-sm font-bold truncate">
              {category?.name || 'Unknown'}
            </div>
            {sprint.description && (
              <div className={cn(
                'text-xs truncate max-w-[150px]',
                isLightBg ? 'text-gray-600' : 'text-white/70'
              )}>
                {sprint.description.length > 25
                  ? sprint.description.slice(0, 25) + '...'
                  : sprint.description}
              </div>
            )}
          </div>
          <div className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
            'bg-white/20 backdrop-blur-sm',
            'text-xl font-black italic',
            isLightBg ? 'text-gray-700' : 'text-white'
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
            {isCurrent ? 'Tap to log' : isPast ? 'Tap to log' : 'Upcoming'}
          </span>
        </div>
      )}
    </button>
  );
}
