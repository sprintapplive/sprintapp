'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { User } from '@supabase/supabase-js';
import {
  Calendar, BarChart3, Users, Sun, Moon, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardNavProps {
  user: User;
}

const navItems = [
  { href: '/agora', label: 'Agora', icon: Users },
  { href: '/', label: 'Today', icon: Calendar },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/account', label: 'Account', icon: Settings },
];

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  // Hide on scroll state
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle scroll to hide/show navbar on mobile
  useEffect(() => {
    if (!isMobile) {
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY;

      // Only hide/show after scrolling a bit to avoid jitter
      if (Math.abs(scrollDiff) < 10) return;

      if (currentScrollY < 50) {
        // Always show at top of page
        setIsVisible(true);
      } else if (scrollDiff > 0 && currentScrollY > 100) {
        // Scrolling down - hide
        setIsVisible(false);
      } else if (scrollDiff < 0) {
        // Scrolling up - show
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, lastScrollY]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md transition-transform duration-300',
        !isVisible && isMobile && '-translate-y-full'
      )}
    >
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex h-14 items-center justify-between">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Sprint"
              width={28}
              height={28}
              className="w-7 h-7 dark:invert dark:brightness-200"
            />
            <span className="text-lg font-black italic text-foreground">Sprint</span>
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

          {/* Theme Toggle */}
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
        </div>
      </div>
    </header>
  );
}
