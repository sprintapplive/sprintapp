'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';
import { DailyView } from '@/components/DailyView';
import { StatsView } from '@/components/StatsView';
import { AgoraView } from '@/components/AgoraView';
import { AccountView } from '@/components/AccountView';
import { OlympicsView } from '@/components/OlympicsView';
import { SprintMode } from '@/components/SprintMode';
import { Category, Sprint, DailyWrapup, WeeklyGoal, WeeklyStats, Profile } from '@/lib/types';

const PAGES = ['/olympics', '/agora', '/', '/stats', '/account'] as const;
const PAGE_LABELS = ['Olympics', 'Agora', 'Today', 'Stats', 'Account'] as const;

interface SprintWithCategory extends Sprint {
  categories?: {
    name: string;
    color: string;
    icon: string;
  };
}

interface SwipePagesProps {
  todaySprints: Sprint[];
  categories: Category[];
  todayWrapup: DailyWrapup | null;
  todayDateStr: string;
  userId: string;
  weekSprints: SprintWithCategory[];
  allSprints: SprintWithCategory[];
  weeklyGoal: WeeklyGoal | null;
  pastGoals: WeeklyGoal[];
  weekWrapups: DailyWrapup[];
  weekStartStr: string;
  weeklyStats: WeeklyStats[];
  prevWeekStats: { user_id: string; rank_position: number | null }[];
  userDisplayName: string;
  user: User;
  profile: Profile | null;
}

export function SwipePages({
  todaySprints,
  categories,
  todayWrapup,
  todayDateStr,
  userId,
  weekSprints,
  allSprints,
  weeklyGoal,
  pastGoals,
  weekWrapups,
  weekStartStr,
  weeklyStats,
  prevWeekStats,
  userDisplayName,
  user,
  profile,
}: SwipePagesProps) {
  // Convert date strings to local Date objects on client side
  const todayDate = (() => {
    const [year, month, day] = todayDateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  })();

  const weekStart = (() => {
    const [year, month, day] = weekStartStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  })();

  const pathname = usePathname();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getPageIndex = (path: string) => {
    const idx = PAGES.indexOf(path as typeof PAGES[number]);
    return idx >= 0 ? idx : 2; // Default to Today (index 2)
  };

  const [currentIndex, setCurrentIndex] = useState(() => getPageIndex(pathname));
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile vs desktop
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll to initial page on mount (for mobile)
  useEffect(() => {
    if (isMobile && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const initialIndex = getPageIndex(pathname);
      // Use instant scroll on mount
      container.scrollTo({
        left: initialIndex * container.offsetWidth,
        behavior: 'instant',
      });
    }
  }, [isMobile, pathname]);

  // Handle scroll end to detect which page we're on
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isScrollingRef.current) return;

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Debounce scroll end detection
    scrollTimeoutRef.current = setTimeout(() => {
      if (!scrollContainerRef.current) return;

      const container = scrollContainerRef.current;
      const pageWidth = container.offsetWidth;
      const scrollLeft = container.scrollLeft;
      const newIndex = Math.round(scrollLeft / pageWidth);

      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < PAGES.length) {
        setCurrentIndex(newIndex);
        window.history.replaceState(null, '', PAGES[newIndex]);
      }
    }, 50);
  }, [currentIndex]);

  // Navigate to a specific page
  const navigateToPage = useCallback((index: number) => {
    if (!scrollContainerRef.current) return;

    isScrollingRef.current = true;
    setCurrentIndex(index);
    window.history.replaceState(null, '', PAGES[index]);

    scrollContainerRef.current.scrollTo({
      left: index * scrollContainerRef.current.offsetWidth,
      behavior: 'smooth',
    });

    // Reset scrolling flag after animation
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 400);
  }, []);

  // Render page content
  const renderPage = (index: number) => {
    switch (index) {
      case 0:
        return (
          <OlympicsView
            userId={userId}
            initialRings={profile?.golden_rings ?? 20}
            status={(profile?.status as 'Olympian' | 'Spartan' | 'Helot') ?? 'Spartan'}
            displayName={userDisplayName}
          />
        );
      case 1:
        return (
          <AgoraView
            weeklyStats={weeklyStats}
            prevWeekStats={prevWeekStats}
            currentUserId={userId}
            userDisplayName={userDisplayName}
            weekStart={weekStart}
            sprints={allSprints}
          />
        );
      case 2:
        return (
          <DailyView
            initialSprints={todaySprints}
            initialCategories={categories}
            initialWrapup={todayWrapup}
            initialDate={todayDate}
            userId={userId}
          />
        );
      case 3:
        return (
          <StatsView
            sprints={weekSprints}
            categories={categories}
            weeklyGoal={weeklyGoal}
            pastGoals={pastGoals}
            wrapups={weekWrapups}
            weekStart={weekStart}
            userId={userId}
          />
        );
      case 4:
        return (
          <AccountView
            user={user}
            profile={profile}
            categories={categories}
          />
        );
      default:
        return null;
    }
  };

  // Desktop: Simple single-page render
  if (!isMobile) {
    return (
      <>
        <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
          {renderPage(currentIndex)}
        </main>
        {currentIndex === 2 && <SprintMode />}
      </>
    );
  }

  // Mobile: CSS scroll-snap for native smooth swiping
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Horizontal scroll container with snap */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide"
        onScroll={handleScroll}
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {PAGES.map((page, index) => (
          <div
            key={page}
            className="w-full h-full flex-shrink-0 snap-start snap-always overflow-y-auto"
            style={{
              minWidth: '100%',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div className="container mx-auto px-4 py-6 max-w-4xl">
              {renderPage(index)}
            </div>
          </div>
        ))}
      </div>

      {/* Page indicator dots */}
      <div className="flex items-center justify-center gap-2 py-3 bg-background border-t border-border/20">
        {PAGES.map((page, index) => (
          <button
            key={page}
            onClick={() => navigateToPage(index)}
            className={cn(
              'transition-all duration-300 ease-out',
              index === currentIndex
                ? 'w-6 h-2 bg-gold-400 rounded-full shadow-[0_0_8px_rgba(212,175,55,0.4)]'
                : 'w-2 h-2 bg-muted-foreground/30 rounded-full hover:bg-muted-foreground/50 active:scale-90'
            )}
            aria-label={`Go to ${PAGE_LABELS[index]}`}
          />
        ))}
      </div>

      {/* Sprint Mode */}
      {currentIndex === 1 && <SprintMode />}
    </div>
  );
}
