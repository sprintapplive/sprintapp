'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Sprint, Category, CATEGORY_COLORS, formatTimeBlock, isCurrentBlock, isBlockInPast, getScoreColor } from '@/lib/types';
import { Brain, Briefcase, Dumbbell, Moon, Users, XCircle, Clock, ChevronLeft, ChevronRight, MessageSquare, Circle, ArrowLeft, Check } from 'lucide-react';
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

// Optimistic sprint state for immediate UI feedback
interface OptimisticState {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  score: number;
  description: string;
}

export function TimeBlock({ blockStart, sprint, category, categories, onSave, onDelete }: TimeBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editStep, setEditStep] = useState<EditStep>('category');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Optimistic UI state
  const [optimisticState, setOptimisticState] = useState<OptimisticState | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isCurrent = isCurrentBlock(blockStart);
  const isPast = isBlockInPast(blockStart);

  // Use optimistic state if available, otherwise use actual sprint
  const displaySprint = optimisticState || (sprint ? {
    categoryId: sprint.category_id,
    categoryName: category?.name || 'Unknown',
    categoryColor: category?.color || 'laurel-500',
    categoryIcon: category?.icon || 'circle',
    score: sprint.score,
    description: sprint.description || '',
  } : null);

  const hasData = !!displaySprint;

  // Initialize state when entering edit mode
  useEffect(() => {
    if (isEditing) {
      if (sprint) {
        setSelectedCategoryId(sprint.category_id);
        setNotes(sprint.description || '');
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

  // Clear optimistic state when real sprint data changes
  useEffect(() => {
    if (sprint && optimisticState) {
      // Server confirmed, clear optimistic state
      setOptimisticState(null);
    }
  }, [sprint, optimisticState]);

  const handleClick = useCallback(() => {
    if (!isEditing && !isClosing) {
      setIsEditing(true);
    }
  }, [isEditing, isClosing]);

  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategoryId(categoryId);
    if (isMobile) {
      // Slight delay for visual feedback before transition
      requestAnimationFrame(() => {
        setEditStep('score');
      });
    }
  }, [isMobile]);

  const handleScoreSelect = useCallback(async (score: number) => {
    if (!selectedCategoryId) return;

    const selectedCat = categories.find(c => c.id === selectedCategoryId);
    if (!selectedCat) return;

    // Optimistic update - show result immediately
    setOptimisticState({
      categoryId: selectedCategoryId,
      categoryName: selectedCat.name,
      categoryColor: selectedCat.color,
      categoryIcon: selectedCat.icon,
      score,
      description: notes,
    });

    // Start closing animation
    setIsClosing(true);

    // Close editor with smooth animation
    requestAnimationFrame(() => {
      setIsEditing(false);
      setShowNotes(false);
      setEditStep('category');
    });

    // Reset closing state after animation
    setTimeout(() => {
      setIsClosing(false);
    }, 300);

    // Save in background (non-blocking)
    try {
      await onSave({
        categoryId: selectedCategoryId,
        description: notes,
        score,
      });
    } catch (e) {
      // Revert optimistic update on error
      console.error('Save error:', e);
      setOptimisticState(null);
    }
  }, [selectedCategoryId, categories, notes, onSave]);

  const handleCancel = useCallback(() => {
    setIsClosing(true);
    requestAnimationFrame(() => {
      setIsEditing(false);
      setShowNotes(false);
      setNotes('');
      setEditStep('category');
    });
    setTimeout(() => setIsClosing(false), 300);
  }, []);

  const handleBack = useCallback(() => {
    setEditStep('category');
  }, []);

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;

    setOptimisticState(null);
    setIsClosing(true);

    requestAnimationFrame(() => {
      setIsEditing(false);
    });

    setTimeout(() => setIsClosing(false), 300);

    try {
      await onDelete();
    } catch (e) {
      console.error('Delete error:', e);
    }
  }, [onDelete]);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const selectedColor = selectedCategory ? CATEGORY_COLORS[selectedCategory.color] : '#4a6741';
  const SelectedIcon = selectedCategory ? (iconMap[selectedCategory.icon] || Circle) : Circle;

  const bgColor = displaySprint
    ? getScoreColor(displaySprint.score, displaySprint.categoryName)
    : undefined;

  const isLightBg = displaySprint && (displaySprint.score >= 3 && displaySprint.score <= 5);
  const DisplayIcon = displaySprint ? (iconMap[displaySprint.categoryIcon] || Clock) : Clock;

  // EDITING MODE
  if (isEditing) {
    // Mobile: Tap-tap flow with smooth transitions
    if (isMobile) {
      return (
        <div
          data-editing="true"
          className={cn(
            'relative w-full rounded-xl overflow-hidden',
            'border-2 border-gold-400',
            'shadow-[0_0_20px_rgba(212,175,55,0.3)]',
            'transform-gpu transition-all duration-200 ease-out',
            'animate-in fade-in-0 zoom-in-95'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-card border-b border-border/50">
            <div className="flex items-center gap-2">
              {editStep === 'score' && (
                <button
                  onClick={handleBack}
                  className="p-1.5 rounded-lg hover:bg-muted active:scale-95 transition-all text-muted-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <span className="text-sm font-bold text-gold-400">{formatTimeBlock(blockStart)}</span>
            </div>
            <button
              onClick={handleCancel}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 active:scale-95 transition-transform"
            >
              Cancel
            </button>
          </div>

          {/* Step 1: Category Grid */}
          <div
            className={cn(
              'transform-gpu transition-all duration-200 ease-out',
              editStep === 'category'
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-full absolute inset-0 pointer-events-none'
            )}
          >
            {editStep === 'category' && (
              <div className="p-3 bg-card">
                <p className="text-xs text-muted-foreground text-center mb-3">What did you do?</p>
                <div className="grid grid-cols-3 gap-3">
                  {categories.map((cat, idx) => {
                    const CatIcon = iconMap[cat.icon] || Circle;
                    const isSelected = cat.id === selectedCategoryId;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleCategorySelect(cat.id)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-xl',
                          'transform-gpu transition-all duration-150 ease-out',
                          'active:scale-90',
                          isSelected && 'ring-2 ring-gold-400 ring-offset-2 ring-offset-card'
                        )}
                        style={{
                          backgroundColor: CATEGORY_COLORS[cat.color],
                          animationDelay: `${idx * 30}ms`
                        }}
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
          </div>

          {/* Step 2: Score Grid */}
          <div
            className={cn(
              'transform-gpu transition-all duration-200 ease-out',
              editStep === 'score'
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'
            )}
          >
            {editStep === 'score' && selectedCategory && (
              <div className="bg-card">
                {/* Selected category indicator */}
                <div
                  className="flex items-center justify-center gap-3 p-3 transition-colors duration-200"
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
                      'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all duration-150',
                      'active:scale-95',
                      showNotes ? 'bg-gold-400/20 text-gold-400' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {showNotes ? 'Hide notes' : 'Add notes'}
                  </button>
                </div>

                {/* Notes input with smooth expand */}
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-200 ease-out',
                    showNotes ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <div className="px-3 py-2 border-b border-border/50">
                    <Textarea
                      placeholder="What did you work on?"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="resize-none bg-background border-border/50 text-sm"
                    />
                  </div>
                </div>

                {/* Score grid */}
                <div className="p-3">
                  <p className="text-xs text-muted-foreground text-center mb-3">How'd it go?</p>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s, idx) => (
                      <button
                        key={s}
                        onClick={() => handleScoreSelect(s)}
                        className={cn(
                          'aspect-square rounded-xl font-bold text-lg',
                          'transform-gpu transition-all duration-100 ease-out',
                          'active:scale-75',
                          sprint?.score === s
                            ? 'bg-gold-400 text-olympus-900 shadow-[0_0_10px_rgba(212,175,55,0.5)] scale-105'
                            : s === 10
                              ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-olympus-900 hover:scale-105'
                              : s >= 7
                                ? 'bg-laurel-700 text-laurel-200 hover:scale-105'
                                : s >= 4
                                  ? 'bg-muted text-foreground hover:scale-105'
                                  : 'bg-red-900/50 text-red-300 hover:scale-105'
                        )}
                        style={{ animationDelay: `${idx * 20}ms` }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delete option */}
                {sprint && onDelete && (
                  <div className="px-3 py-2 border-t border-border/50">
                    <button
                      onClick={handleDelete}
                      className="w-full text-xs text-red-400 hover:text-red-300 py-1 active:scale-95 transition-transform"
                    >
                      Delete sprint
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Desktop: All visible layout
    return (
      <div
        data-editing="true"
        className={cn(
          'relative w-full rounded-xl overflow-hidden',
          'border-2 border-gold-400',
          'shadow-[0_0_20px_rgba(212,175,55,0.3)]',
          'transform-gpu transition-all duration-200 ease-out',
          'animate-in fade-in-0 zoom-in-95'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-card border-b border-border/50">
          <span className="text-sm font-bold text-gold-400">{formatTimeBlock(blockStart)}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={cn(
                'p-1.5 rounded-lg transition-all duration-150 active:scale-90',
                showNotes ? 'bg-gold-400/20 text-gold-400' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Add notes"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 active:scale-95 transition-transform"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Category Selector */}
        {selectedCategory && (
          <div
            className="flex items-center justify-center gap-2 p-3 transition-colors duration-200"
            style={{ backgroundColor: selectedColor }}
          >
            <button
              onClick={() => {
                const idx = categories.findIndex(c => c.id === selectedCategoryId);
                const newIdx = (idx - 1 + categories.length) % categories.length;
                setSelectedCategoryId(categories[newIdx].id);
              }}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 active:scale-90 transition-all duration-150"
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
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 active:scale-90 transition-all duration-150"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          </div>
        )}

        {/* Category chips */}
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
                    'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all duration-150',
                    'active:scale-95',
                    isSelected
                      ? 'bg-gold-400/20 text-gold-400 ring-1 ring-gold-400'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-full transition-transform duration-150"
                    style={{ backgroundColor: CATEGORY_COLORS[cat.color] }}
                  />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes with smooth expand */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 ease-out',
            showNotes ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="px-3 py-2 bg-card border-t border-border/50">
            <Textarea
              placeholder="What did you work on?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none bg-background border-border/50 text-sm"
            />
          </div>
        </div>

        {/* Score selector */}
        <div className="px-3 py-3 bg-card border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center mb-2">Tap score to save</p>
          <div className="flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
              <button
                key={s}
                onClick={() => handleScoreSelect(s)}
                disabled={!selectedCategoryId}
                className={cn(
                  'w-9 h-9 rounded-lg font-bold text-sm',
                  'transform-gpu transition-all duration-100 ease-out',
                  'active:scale-75',
                  sprint?.score === s
                    ? 'bg-gold-400 text-olympus-900 shadow-[0_0_10px_rgba(212,175,55,0.5)]'
                    : s >= 7
                      ? 'bg-laurel-700/50 text-laurel-300 hover:bg-laurel-700 hover:scale-105'
                      : s >= 4
                        ? 'bg-muted text-muted-foreground hover:bg-muted/80 hover:scale-105'
                        : 'bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:scale-105',
                  !selectedCategoryId && 'opacity-50 cursor-not-allowed'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Delete */}
        {sprint && onDelete && (
          <div className="px-3 py-2 bg-card border-t border-border/50">
            <button
              onClick={handleDelete}
              className="w-full text-xs text-red-400 hover:text-red-300 py-1 active:scale-95 transition-transform"
            >
              Delete sprint
            </button>
          </div>
        )}
      </div>
    );
  }

  // DISPLAY MODE - with optimistic state support
  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative w-full flex items-center gap-3 p-3 rounded-xl',
        'transform-gpu transition-all duration-200 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:ring-offset-2 focus:ring-offset-background',
        'active:scale-[0.98]',
        hasData
          ? 'shadow-[4px_4px_8px_rgba(0,0,0,0.3),-2px_-2px_6px_rgba(255,255,255,0.03)]'
          : cn(
              'bg-card border border-border/50',
              'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.02)]',
              'hover:border-laurel-600/50'
            ),
        isCurrent && !hasData && 'ring-2 ring-gold-400/60 ring-offset-2 ring-offset-background border-gold-400/50',
        optimisticState && 'animate-in fade-in-0 duration-200'
      )}
      style={hasData ? {
        background: `linear-gradient(145deg, ${bgColor}, ${bgColor}dd)`,
      } : undefined}
    >
      {/* Current block pulse */}
      {isCurrent && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-gold-400 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.6)]" />
      )}

      {/* Optimistic save indicator */}
      {optimisticState && (
        <div className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-gold-400 flex items-center justify-center animate-in zoom-in-50 duration-200">
          <Check className="h-3 w-3 text-olympus-900" />
        </div>
      )}

      {/* Time */}
      <div className={cn(
        'flex-shrink-0 text-xs font-bold w-16 text-left transition-colors duration-200',
        hasData
          ? isLightBg ? 'text-gray-700' : 'text-white/90'
          : 'text-muted-foreground'
      )}>
        {formatTimeBlock(blockStart)}
      </div>

      {/* Content */}
      {hasData && displaySprint ? (
        <div className={cn(
          'flex-1 flex items-center gap-3 min-w-0 overflow-hidden',
          isLightBg ? 'text-gray-700' : 'text-white'
        )}>
          <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <DisplayIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden text-left">
            <div className="text-sm font-bold truncate">
              {displaySprint.categoryName}
            </div>
            {displaySprint.description && (
              <div className={cn(
                'text-xs truncate max-w-[150px]',
                isLightBg ? 'text-gray-600' : 'text-white/70'
              )}>
                {displaySprint.description.length > 25
                  ? displaySprint.description.slice(0, 25) + '...'
                  : displaySprint.description}
              </div>
            )}
          </div>
          <div className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
            'bg-white/20 backdrop-blur-sm',
            'text-xl font-black italic',
            isLightBg ? 'text-gray-700' : 'text-white'
          )}>
            {displaySprint.score}
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
