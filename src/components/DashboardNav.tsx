'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Calendar, BarChart3, Users, LogOut, User as UserIcon,
  Settings, ChevronDown, Mail, Sun, Moon, Newspaper
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardNavProps {
  user: User;
}

const navItems = [
  { href: '/news', label: 'News', icon: Newspaper },
  { href: '/', label: 'Today', icon: Calendar },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/agora', label: 'Agora', icon: Users },
];

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0];

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Sprint"
              width={32}
              height={32}
              className="w-8 h-8 dark:invert dark:brightness-200"
            />
            <span className="text-xl font-black italic text-foreground">Sprint</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold italic transition-all',
                    isActive
                      ? 'bg-laurel-700/50 text-gold-400 shadow-[0_0_15px_rgba(74,103,65,0.3)]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Theme Toggle & Account Menu */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={cn(
                'relative p-2 rounded-xl transition-all',
                'hover:bg-card/50 text-muted-foreground hover:text-foreground'
              )}
              aria-label="Toggle theme"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute top-2 left-2 h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </button>

            {/* Account Menu */}
            <div className="relative">
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl transition-all',
                  'hover:bg-card/50',
                  showAccountMenu && 'bg-card/50'
                )}
              >
              <div className="w-8 h-8 rounded-full bg-laurel-700/50 flex items-center justify-center">
                <UserIcon className="h-4 w-4 text-gold-400" />
              </div>
              <span className="hidden sm:block text-sm font-medium truncate max-w-[100px]">
                {displayName}
              </span>
              <ChevronDown className={cn(
                'h-4 w-4 transition-transform',
                showAccountMenu && 'rotate-180'
              )} />
            </button>

            {/* Dropdown */}
            {showAccountMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowAccountMenu(false)}
                />
                <div className={cn(
                  'absolute right-0 top-full mt-2 w-64 z-50',
                  'neo-card p-2'
                )}>
                  {/* User info */}
                  <div className="px-3 py-2 border-b border-border/50 mb-2">
                    <p className="font-bold text-foreground">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>

                  {/* Menu items */}
                  <Link
                    href="/account"
                    onClick={() => setShowAccountMenu(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-card/50 transition-colors"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Account Settings</span>
                  </Link>
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-card/50 transition-colors text-left"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm">Daily Email Reports</span>
                      <p className="text-xs text-muted-foreground">Coming soon</p>
                    </div>
                  </button>

                  <div className="border-t border-border/50 mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-900/20 transition-colors text-red-400"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="text-sm">Log out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
            </div>
          </div>
        </div>

        {/* Mobile navigation - hidden, using swipe navigation instead */}
      </div>
    </header>
  );
}
