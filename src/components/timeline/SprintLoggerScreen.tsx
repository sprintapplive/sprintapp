'use client';

import { useState, useEffect, useRef, TouchEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Category, Sprint, formatTimeBlock, CATEGORY_COLORS } from '@/lib/types';
import { Brain, Briefcase, Dumbbell, Moon, Users, XCircle, ArrowLeft, Trash2, ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SprintLoggerScreenProps {
  blockStart: Date;
  categories: Category[];
  existingSprint?: Sprint;
  onSave: (data: { categoryId: string; description: string; score: number }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
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

export function SprintLoggerScreen({
  blockStart,
  categories,
  existingSprint,
  onSave,
  onDelete,
  onClose,
}: SprintLoggerScreenProps) {
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [description, setDescription] = useState(existingSprint?.description || '');
  const [score, setScore] = useState(existingSprint?.score || 7);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showScoreExpanded, setShowScoreExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(!!existingSprint?.description);

  // Touch handling
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  useEffect(() => {
    if (existingSprint) {
      const idx = categories.findIndex(c => c.id === existingSprint.category_id);
      setCategoryIndex(idx >= 0 ? idx : 0);
      setDescription(existingSprint.description || '');
      setScore(existingSprint.score);
    } else {
      setCategoryIndex(0);
      setDescription('');
      setScore(7);
    }
  }, [existingSprint, categories]);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe left - next category
        setCategoryIndex(prev => (prev + 1) % categories.length);
      } else {
        // Swipe right - previous category
        setCategoryIndex(prev => (prev - 1 + categories.length) % categories.length);
      }
    }
  };

  const goToCategory = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      setCategoryIndex(prev => (prev + 1) % categories.length);
    } else {
      setCategoryIndex(prev => (prev - 1 + categories.length) % categories.length);
    }
  };

  const handleSave = async () => {
    const selectedCategory = categories[categoryIndex];
    if (!selectedCategory) return;

    setSaving(true);
    try {
      await onSave({ categoryId: selectedCategory.id, description, score });
      onClose();
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (e) {
      console.error('Delete error:', e);
    } finally {
      setDeleting(false);
    }
  };

  const selectedCategory = categories[categoryIndex];
  const Icon = selectedCategory ? (iconMap[selectedCategory.icon] || Circle) : Circle;
  const categoryColor = selectedCategory ? CATEGORY_COLORS[selectedCategory.color] : '#4a6741';

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-laurel-900/50">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <h2 className="text-lg font-bold italic text-gold-400">{formatTimeBlock(blockStart)}</h2>
        </div>
        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center px-4 py-6 space-y-8">

        {/* Swipeable Category Selector */}
        <div
          className="relative"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Swipe hint */}
          <p className="text-center text-xs text-muted-foreground mb-4">
            Swipe or tap arrows to change category
          </p>

          <div className="flex items-center justify-center gap-4">
            {/* Left Arrow */}
            <button
              onClick={() => goToCategory('prev')}
              className={cn(
                'p-3 rounded-full transition-all',
                'bg-card border border-border/50',
                'hover:border-gold-400/50 active:scale-95'
              )}
            >
              <ChevronLeft className="h-6 w-6 text-muted-foreground" />
            </button>

            {/* Current Category - Large Display */}
            <div
              className={cn(
                'flex flex-col items-center justify-center',
                'w-40 h-40 rounded-2xl transition-all',
                'border-4 border-gold-400',
                'shadow-[0_0_30px_rgba(212,175,55,0.3)]'
              )}
              style={{ backgroundColor: categoryColor }}
            >
              <Icon className="h-12 w-12 text-white mb-2" />
              <span className="text-white font-bold text-lg text-center px-2">
                {selectedCategory?.name}
              </span>
            </div>

            {/* Right Arrow */}
            <button
              onClick={() => goToCategory('next')}
              className={cn(
                'p-3 rounded-full transition-all',
                'bg-card border border-border/50',
                'hover:border-gold-400/50 active:scale-95'
              )}
            >
              <ChevronRight className="h-6 w-6 text-muted-foreground" />
            </button>
          </div>

          {/* Category Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {categories.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCategoryIndex(idx)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  idx === categoryIndex
                    ? 'bg-gold-400 w-4'
                    : 'bg-muted-foreground/30'
                )}
              />
            ))}
          </div>
        </div>

        {/* Score Selector */}
        <div className="space-y-3">
          {!showScoreExpanded ? (
            // Collapsed view - tap to expand
            <button
              onClick={() => setShowScoreExpanded(true)}
              className={cn(
                'w-full flex items-center justify-center gap-4 p-4 rounded-xl',
                'bg-card border border-border/50',
                'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]',
                'active:scale-[0.98] transition-all'
              )}
            >
              <span className="text-muted-foreground text-sm uppercase tracking-wide">Score</span>
              <span className={cn(
                'text-4xl font-black italic',
                score >= 7 ? 'text-gold-400' : score >= 4 ? 'text-foreground' : 'text-red-400'
              )}>
                {score}
              </span>
              <span className="text-xs text-muted-foreground">tap to change</span>
            </button>
          ) : (
            // Expanded view - full score picker
            <div className={cn(
              'p-4 rounded-xl',
              'bg-card border-2 border-gold-400/50',
              'shadow-[0_0_20px_rgba(212,175,55,0.2)]'
            )}>
              <div className="flex flex-wrap justify-center gap-2 mb-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setScore(s);
                      setShowScoreExpanded(false);
                    }}
                    className={cn(
                      'w-12 h-12 rounded-xl font-black text-lg transition-all',
                      score === s
                        ? 'bg-gold-400 text-olympus-900 shadow-[0_0_15px_rgba(212,175,55,0.5)] scale-110'
                        : s >= 7
                          ? 'bg-laurel-700/50 text-laurel-300 hover:bg-laurel-700'
                          : s >= 4
                            ? 'bg-card border border-border text-muted-foreground hover:border-gold-400/50'
                            : 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground px-2">
                <span>Wasted</span>
                <span>Decent</span>
                <span>Excellent</span>
              </div>
            </div>
          )}
        </div>

        {/* Notes Toggle & Input */}
        {!showNotes ? (
          <button
            onClick={() => setShowNotes(true)}
            className="text-sm text-muted-foreground hover:text-gold-400 transition-colors"
          >
            + Add notes (optional)
          </button>
        ) : (
          <Textarea
            placeholder="What did you work on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={cn(
              'resize-none bg-card border-border/50',
              'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]',
              'focus:border-laurel-500 focus:ring-laurel-500/20'
            )}
            autoFocus
          />
        )}
      </div>

      {/* Footer - Save Button */}
      <div className="p-4 border-t border-border/50 space-y-3">
        <Button
          onClick={handleSave}
          disabled={saving || deleting}
          className={cn(
            'w-full h-14 font-black italic text-xl',
            'bg-gradient-to-r from-laurel-700 to-laurel-600',
            'hover:from-laurel-600 hover:to-laurel-500',
            'shadow-[0_4px_20px_rgba(45,74,40,0.5)]',
            'disabled:opacity-50',
            'active:scale-[0.98] transition-all'
          )}
        >
          {saving ? 'Saving...' : existingSprint ? 'Update' : 'Log Sprint'}
        </Button>

        {existingSprint && onDelete && (
          <Button
            variant="ghost"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="w-full text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        )}
      </div>
    </div>
  );
}
