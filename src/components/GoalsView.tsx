'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Category, WeeklyGoal, CATEGORY_COLORS } from '@/lib/types';
import { Target, Clock, Plus, Edit2, Save, X, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoalsViewProps {
  currentGoal: WeeklyGoal | null;
  pastGoals: WeeklyGoal[];
  categories: Category[];
  weekStart: Date;
}

const AVAILABLE_COLORS = [
  'laurel-700', 'laurel-500', 'gold-500', 'gold-400',
  'marble-200', 'red-400', 'blue-500', 'purple-500'
];

export function GoalsView({ currentGoal, pastGoals, categories: initialCategories, weekStart }: GoalsViewProps) {
  const [goal, setGoal] = useState<WeeklyGoal | null>(currentGoal);
  const [editing, setEditing] = useState(!currentGoal);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  // Category management state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('laurel-500');
  const [savingCategory, setSavingCategory] = useState(false);

  // Form state
  const [targetScore, setTargetScore] = useState(currentGoal?.target_average_score || 7);
  const [maxWasted, setMaxWasted] = useState(currentGoal?.max_wasted_minutes || 120);
  const [notes, setNotes] = useState(currentGoal?.notes || '');

  const supabase = createClient();

  const formatWeekRange = (start: Date) => {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const format = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${format(start)} - ${format(end)}`;
  };

  const handleSave = async () => {
    setSaving(true);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const goalData = {
      week_start: weekStartStr,
      target_average_score: targetScore,
      max_wasted_minutes: maxWasted,
      notes: notes || null,
    };

    if (goal) {
      const { data, error } = await supabase
        .from('weekly_goals')
        .update(goalData)
        .eq('id', goal.id)
        .select()
        .single();

      if (!error && data) {
        setGoal(data);
        setEditing(false);
      }
    } else {
      const { data, error } = await supabase
        .from('weekly_goals')
        .insert(goalData)
        .select()
        .single();

      if (!error && data) {
        setGoal(data);
        setEditing(false);
      }
    }

    setSaving(false);
  };

  const handleCancel = () => {
    if (goal) {
      setTargetScore(goal.target_average_score);
      setMaxWasted(goal.max_wasted_minutes);
      setNotes(goal.notes || '');
      setEditing(false);
    }
  };

  // Category management functions
  const startEditCategory = (category: Category) => {
    // Don't allow editing the "Wasted" category name
    if (category.name === 'Wasted') return;
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };

  const saveCategory = async (categoryId: string) => {
    if (!editingCategoryName.trim()) return;
    setSavingCategory(true);

    const { error } = await supabase
      .from('categories')
      .update({ name: editingCategoryName.trim() })
      .eq('id', categoryId);

    if (!error) {
      setCategories(prev => prev.map(c =>
        c.id === categoryId ? { ...c, name: editingCategoryName.trim() } : c
      ));
    }

    setEditingCategoryId(null);
    setEditingCategoryName('');
    setSavingCategory(false);
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    setSavingCategory(true);

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: newCategoryName.trim(),
        color: newCategoryColor,
        icon: 'circle',
        is_default: false,
      })
      .select()
      .single();

    if (!error && data) {
      setCategories(prev => [...prev, data]);
      setNewCategoryName('');
      setNewCategoryColor('laurel-500');
      setShowAddCategory(false);
    }

    setSavingCategory(false);
  };

  const deleteCategory = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    // Don't allow deleting default categories
    if (category?.is_default) return;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (!error) {
      setCategories(prev => prev.filter(c => c.id !== categoryId));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black italic text-foreground">Weekly Goals</h1>

      {/* Current week goal */}
      <div className="neo-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div>
            <h2 className="text-lg font-bold italic text-gold-400">This Week</h2>
            <p className="text-sm text-muted-foreground">{formatWeekRange(weekStart)}</p>
          </div>
          {goal && !editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              className="text-muted-foreground hover:text-foreground hover:bg-laurel-900/50"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-6">
            {/* Target Average Score */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                <Target className="h-4 w-4 text-gold-400" />
                Target Average Score: <span className="font-black text-gold-400">{targetScore}</span>
              </Label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">1</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={targetScore}
                  onChange={(e) => setTargetScore(parseFloat(e.target.value))}
                  className="flex-1 accent-gold-400"
                />
                <span className="text-xs text-muted-foreground">10</span>
              </div>
            </div>

            {/* Max Wasted Minutes */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                <Clock className="h-4 w-4 text-red-400" />
                Max Wasted Time: <span className="font-black text-red-400">{maxWasted} minutes</span>
              </Label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">0</span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={30}
                  value={maxWasted}
                  onChange={(e) => setMaxWasted(parseInt(e.target.value))}
                  className="flex-1 accent-red-400"
                />
                <span className="text-xs text-muted-foreground">6h</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round(maxWasted / 30)} sprints worth of wasted time
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Notes / Focus Areas
              </Label>
              <Textarea
                id="notes"
                placeholder="What do you want to focus on this week?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={cn(
                  'resize-none bg-card border-border/50',
                  'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.02)]',
                  'focus:border-laurel-500 focus:ring-laurel-500/20'
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {goal && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                  className="border-border/50 hover:bg-card"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  'flex-1 font-bold italic',
                  'bg-gradient-to-r from-laurel-700 to-laurel-600',
                  'hover:from-laurel-600 hover:to-laurel-500',
                  'shadow-[0_4px_15px_rgba(45,74,40,0.4)]'
                )}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : goal ? 'Update Goal' : 'Set Goal'}
              </Button>
            </div>
          </div>
        ) : goal ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className={cn(
                'p-4 rounded-xl',
                'bg-gradient-to-br from-laurel-900/50 to-laurel-800/30',
                'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]',
                'border border-laurel-700/30'
              )}>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Target className="h-4 w-4 text-gold-400" />
                  Target Score
                </div>
                <div className="text-3xl font-black italic text-gold-400">
                  {goal.target_average_score}
                </div>
              </div>
              <div className={cn(
                'p-4 rounded-xl',
                'bg-gradient-to-br from-red-900/30 to-red-800/20',
                'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]',
                'border border-red-700/30'
              )}>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Clock className="h-4 w-4 text-red-400" />
                  Max Wasted
                </div>
                <div className="text-3xl font-black italic text-red-400">
                  {goal.max_wasted_minutes}m
                </div>
              </div>
            </div>

            {goal.notes && (
              <div className={cn(
                'p-4 rounded-xl',
                'bg-card border border-border/50',
                'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.02)]'
              )}>
                <div className="text-sm text-muted-foreground mb-2">Focus Areas</div>
                <p className="text-sm text-foreground">{goal.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No goal set for this week yet</p>
            <Button
              onClick={() => setEditing(true)}
              className={cn(
                'font-bold italic',
                'bg-gradient-to-r from-laurel-700 to-laurel-600',
                'hover:from-laurel-600 hover:to-laurel-500',
                'shadow-[0_4px_15px_rgba(45,74,40,0.4)]'
              )}
            >
              <Plus className="h-4 w-4 mr-2" />
              Set Weekly Goal
            </Button>
          </div>
        )}
      </div>

      {/* Categories - Editable */}
      <div className="neo-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div>
            <h2 className="text-lg font-bold italic text-gold-400">Your Categories</h2>
            <p className="text-sm text-muted-foreground">Tap a category to edit its name</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddCategory(true)}
            className="text-gold-400 hover:text-gold-300 hover:bg-gold-900/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl transition-all',
                'bg-card border border-border/50',
                'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.02)]',
                editingCategoryId !== category.id && category.name !== 'Wasted' && 'cursor-pointer hover:border-gold-400/50'
              )}
              onClick={() => editingCategoryId !== category.id && startEditCategory(category)}
            >
              <div
                className="w-5 h-5 rounded-full shadow-md flex-shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[category.color] }}
              />

              {editingCategoryId === category.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={editingCategoryName}
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    className="h-8 text-sm bg-background"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveCategory(category.id);
                      if (e.key === 'Escape') {
                        setEditingCategoryId(null);
                        setEditingCategoryName('');
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      saveCategory(category.id);
                    }}
                    disabled={savingCategory}
                    className="h-8 w-8 p-0 text-laurel-400"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCategoryId(null);
                      setEditingCategoryName('');
                    }}
                    className="h-8 w-8 p-0 text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-foreground">{category.name}</span>
                  {category.is_default ? (
                    <span className="text-xs text-muted-foreground">Default</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCategory(category.id);
                      }}
                      className="h-6 w-6 p-0 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new category form */}
        {showAddCategory && (
          <div className={cn(
            'p-4 rounded-xl mt-4',
            'bg-card border-2 border-gold-400/50',
            'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]'
          )}>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Category Name
                </Label>
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Learning, Meetings, Creative"
                  className="bg-background"
                  autoFocus
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Color
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {AVAILABLE_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewCategoryColor(color)}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        newCategoryColor === color && 'ring-2 ring-gold-400 ring-offset-2 ring-offset-background'
                      )}
                      style={{ backgroundColor: CATEGORY_COLORS[color] }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddCategory(false);
                    setNewCategoryName('');
                    setNewCategoryColor('laurel-500');
                  }}
                  className="border-border/50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={addCategory}
                  disabled={!newCategoryName.trim() || savingCategory}
                  className={cn(
                    'flex-1 font-bold italic',
                    'bg-gradient-to-r from-gold-600 to-gold-500',
                    'hover:from-gold-500 hover:to-gold-400'
                  )}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {savingCategory ? 'Adding...' : 'Add Category'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Past goals */}
      {pastGoals.length > 0 && (
        <div className="neo-card p-6 space-y-4">
          <div className="pb-4 border-b border-border/50">
            <h2 className="text-lg font-bold italic text-gold-400">Past Goals</h2>
          </div>

          <div className="space-y-3">
            {pastGoals.map((pastGoal) => {
              const goalWeekStart = new Date(pastGoal.week_start);
              return (
                <div
                  key={pastGoal.id}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-xl',
                    'bg-card border border-border/50',
                    'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.02)]'
                  )}
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {formatWeekRange(goalWeekStart)}
                    </div>
                    {pastGoal.notes && (
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {pastGoal.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Target: </span>
                      <span className="font-bold italic text-gold-400">
                        {pastGoal.target_average_score}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Max Wasted: </span>
                      <span className="font-bold italic text-red-400">
                        {pastGoal.max_wasted_minutes}m
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
