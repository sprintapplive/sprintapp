'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Profile, Category, CATEGORY_COLORS } from '@/lib/types';
import {
  User as UserIcon, Mail, Save, Bell, Palette, Plus, Pencil, Check, X,
  Brain, Briefcase, Dumbbell, Moon, Users, XCircle, Sparkles, BookOpen, Coffee, Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  brain: Brain,
  briefcase: Briefcase,
  dumbbell: Dumbbell,
  moon: Moon,
  users: Users,
  'x-circle': XCircle,
  sparkles: Sparkles,
  book: BookOpen,
  coffee: Coffee,
  heart: Heart,
};

const AVAILABLE_COLORS = [
  { name: 'laurel-700', label: 'Forest' },
  { name: 'laurel-500', label: 'Sage' },
  { name: 'gold-500', label: 'Gold' },
  { name: 'gold-400', label: 'Amber' },
  { name: 'marble-200', label: 'Marble' },
  { name: 'red-400', label: 'Coral' },
  { name: 'blue-500', label: 'Azure' },
  { name: 'purple-500', label: 'Violet' },
];

const AVAILABLE_ICONS = [
  { name: 'brain', label: 'Brain' },
  { name: 'briefcase', label: 'Work' },
  { name: 'dumbbell', label: 'Exercise' },
  { name: 'moon', label: 'Rest' },
  { name: 'users', label: 'Social' },
  { name: 'x-circle', label: 'Wasted' },
  { name: 'sparkles', label: 'Creative' },
  { name: 'book', label: 'Learning' },
  { name: 'coffee', label: 'Break' },
  { name: 'heart', label: 'Personal' },
];

interface AccountViewProps {
  user: User;
  profile: Profile | null;
  categories: Category[];
}

export function AccountView({ user, profile, categories: initialCategories }: AccountViewProps) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [dailyEmails, setDailyEmails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Category state
  const [categories, setCategories] = useState(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('laurel-500');
  const [newCategoryIcon, setNewCategoryIcon] = useState('sparkles');

  const supabase = createClient();

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName || null,
      })
      .eq('id', user.id);

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }

    setSaving(false);
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color);
    setEditIcon(category.icon);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
    setEditIcon('');
  };

  const saveCategory = async (categoryId: string) => {
    const { error } = await supabase
      .from('categories')
      .update({
        name: editName,
        color: editColor,
        icon: editIcon,
      })
      .eq('id', categoryId);

    if (!error) {
      setCategories(categories.map(c =>
        c.id === categoryId ? { ...c, name: editName, color: editColor, icon: editIcon } : c
      ));
      cancelEditing();
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: newCategoryName.trim(),
        color: newCategoryColor,
        icon: newCategoryIcon,
        is_default: false,
      })
      .select()
      .single();

    if (!error && data) {
      setCategories([...categories, data]);
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const getCategoryIcon = (iconName: string) => {
    const IconComponent = ICON_MAP[iconName] || Sparkles;
    return IconComponent;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black italic text-foreground">Account Settings</h1>

      {/* Profile Section */}
      <div className={cn(
        'neo-card p-6 space-y-6'
      )}>
        <div className="flex items-center gap-3 pb-4 border-b border-border/50">
          <div className="w-12 h-12 rounded-full bg-laurel-700/50 flex items-center justify-center">
            <UserIcon className="h-6 w-6 text-gold-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold italic">Profile</h2>
            <p className="text-sm text-muted-foreground">Manage your account details</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Email
            </Label>
            <div className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl',
              'bg-card border border-border/50',
              'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.02)]'
            )}>
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{user.email}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Display Name
            </Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={cn(
                'bg-card border-border/50 h-12',
                'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.02)]',
                'focus:border-laurel-500 focus:ring-laurel-500/20'
              )}
            />
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className={cn('neo-card p-6 space-y-6')}>
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-laurel-700/30 flex items-center justify-center">
              <Palette className="h-6 w-6 text-gold-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold italic">Categories</h2>
              <p className="text-sm text-muted-foreground">Customize your sprint categories</p>
            </div>
          </div>
          {!showAddCategory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddCategory(true)}
              className="text-gold-400 hover:text-gold-300"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>

        {/* Add new category form */}
        {showAddCategory && (
          <div className="p-4 rounded-xl border-2 border-gold-400/50 bg-card space-y-4">
            <h3 className="font-bold text-gold-400">New Category</h3>
            <div className="space-y-3">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
                className="bg-background"
              />
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase">Color</Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setNewCategoryColor(color.name)}
                      className={cn(
                        'w-8 h-8 rounded-lg transition-all',
                        newCategoryColor === color.name && 'ring-2 ring-gold-400 ring-offset-2 ring-offset-background'
                      )}
                      style={{ backgroundColor: CATEGORY_COLORS[color.name] }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase">Icon</Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ICONS.map((icon) => {
                    const IconComp = ICON_MAP[icon.name];
                    return (
                      <button
                        key={icon.name}
                        onClick={() => setNewCategoryIcon(icon.name)}
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center bg-card border border-border/50 transition-all',
                          newCategoryIcon === icon.name && 'ring-2 ring-gold-400 border-gold-400'
                        )}
                        title={icon.label}
                      >
                        <IconComp className="h-5 w-5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategoryName('');
                }}
                className="border-border/50"
              >
                Cancel
              </Button>
              <Button
                onClick={addCategory}
                disabled={!newCategoryName.trim()}
                className="flex-1 bg-gradient-to-r from-gold-600 to-gold-500"
              >
                Add Category
              </Button>
            </div>
          </div>
        )}

        {/* Category list */}
        <div className="space-y-2">
          {categories.map((category) => {
            const IconComp = getCategoryIcon(category.icon);
            const isEditing = editingId === category.id;

            return (
              <div
                key={category.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl transition-all',
                  'bg-card border border-border/50',
                  isEditing && 'ring-2 ring-gold-400/50'
                )}
              >
                {isEditing ? (
                  // Editing mode
                  <div className="flex-1 space-y-3">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-background"
                    />
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_COLORS.map((color) => (
                        <button
                          key={color.name}
                          onClick={() => setEditColor(color.name)}
                          className={cn(
                            'w-6 h-6 rounded transition-all',
                            editColor === color.name && 'ring-2 ring-gold-400 ring-offset-1 ring-offset-background'
                          )}
                          style={{ backgroundColor: CATEGORY_COLORS[color.name] }}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {AVAILABLE_ICONS.map((icon) => {
                        const IC = ICON_MAP[icon.name];
                        return (
                          <button
                            key={icon.name}
                            onClick={() => setEditIcon(icon.name)}
                            className={cn(
                              'w-8 h-8 rounded flex items-center justify-center bg-background transition-all',
                              editIcon === icon.name && 'ring-2 ring-gold-400'
                            )}
                          >
                            <IC className="h-4 w-4" />
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={cancelEditing}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveCategory(category.id)}
                        className="bg-laurel-700"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Display mode
                  <>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: CATEGORY_COLORS[category.color] || category.color }}
                    >
                      <IconComp className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="font-medium">{category.name}</span>
                      {category.is_default && (
                        <span className="ml-2 text-xs text-muted-foreground">(default)</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditing(category)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Notifications Section */}
      <div className={cn(
        'neo-card p-6 space-y-6'
      )}>
        <div className="flex items-center gap-3 pb-4 border-b border-border/50">
          <div className="w-12 h-12 rounded-full bg-gold-900/30 flex items-center justify-center">
            <Bell className="h-6 w-6 text-gold-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold italic">Notifications</h2>
            <p className="text-sm text-muted-foreground">Manage email preferences</p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setDailyEmails(!dailyEmails)}
            className={cn(
              'w-full flex items-center justify-between p-4 rounded-xl transition-all',
              'border-2',
              dailyEmails
                ? 'border-gold-400/50 bg-gold-900/20'
                : 'border-border bg-card',
              'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.02)]'
            )}
          >
            <div className="text-left">
              <p className="font-bold">Daily Summary Emails</p>
              <p className="text-sm text-muted-foreground">Receive a daily report at 11 PM MT</p>
            </div>
            <div className={cn(
              'w-12 h-6 rounded-full transition-all flex items-center px-1',
              dailyEmails ? 'bg-gold-400' : 'bg-muted'
            )}>
              <div className={cn(
                'w-4 h-4 rounded-full bg-white transition-transform',
                dailyEmails && 'translate-x-6'
              )} />
            </div>
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Coming soon - email integration is under development
          </p>
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          'w-full h-12 font-bold italic text-lg',
          saved
            ? 'bg-gradient-to-r from-gold-600 to-gold-500'
            : 'bg-gradient-to-r from-laurel-700 to-laurel-600 hover:from-laurel-600 hover:to-laurel-500',
          'shadow-[0_4px_15px_rgba(45,74,40,0.4)]',
          'disabled:opacity-50'
        )}
      >
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
      </Button>
    </div>
  );
}
