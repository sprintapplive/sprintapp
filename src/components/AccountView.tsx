'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Profile } from '@/lib/types';
import { User as UserIcon, Mail, Save, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountViewProps {
  user: User;
  profile: Profile | null;
}

export function AccountView({ user, profile }: AccountViewProps) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [dailyEmails, setDailyEmails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
