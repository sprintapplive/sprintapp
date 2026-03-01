'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Category, Sprint, formatTimeBlock, CATEGORY_COLORS } from '@/lib/types';
import { Brain, Briefcase, Dumbbell, Moon, Users, XCircle } from 'lucide-react';

interface SprintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockStart: Date;
  categories: Category[];
  existingSprint?: Sprint;
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
};

export function SprintModal({
  open,
  onOpenChange,
  blockStart,
  categories,
  existingSprint,
  onSave,
  onDelete,
}: SprintModalProps) {
  const [categoryId, setCategoryId] = useState(existingSprint?.category_id || '');
  const [description, setDescription] = useState(existingSprint?.description || '');
  const [score, setScore] = useState(existingSprint?.score || 7);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setCategoryId(existingSprint?.category_id || categories[0]?.id || '');
      setDescription(existingSprint?.description || '');
      setScore(existingSprint?.score || 7);
    }
  }, [open, existingSprint, categories]);

  const handleSave = async () => {
    if (!categoryId) return;
    setSaving(true);
    try {
      await onSave({ categoryId, description, score });
      onOpenChange(false);
    } catch {
      // Error handling
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      onOpenChange(false);
    } catch {
      // Error handling
    } finally {
      setDeleting(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedColor = selectedCategory ? CATEGORY_COLORS[selectedCategory.color] : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Log Sprint</span>
            <span className="text-sm font-normal text-muted-foreground">
              {formatTimeBlock(blockStart)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger
                id="category"
                className="w-full"
                style={selectedColor ? { borderColor: selectedColor } : undefined}
              >
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => {
                  const Icon = iconMap[category.icon] || Brain;
                  const color = CATEGORY_COLORS[category.color];
                  return (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span style={{ color }}><Icon className="h-4 w-4" /></span>
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What did you work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Score */}
          <div className="space-y-2">
            <Label htmlFor="score">
              Score: <span className="font-bold text-laurel-700">{score}</span>
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">1</span>
              <Input
                id="score"
                type="range"
                min={1}
                max={10}
                value={score}
                onChange={(e) => setScore(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground">10</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Poor</span>
              <span>Average</span>
              <span>Excellent</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {existingSprint && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="sm:mr-auto"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving || deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!categoryId || saving || deleting}
            className="bg-laurel-700 hover:bg-laurel-800"
          >
            {saving ? 'Saving...' : existingSprint ? 'Update' : 'Log Sprint'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
