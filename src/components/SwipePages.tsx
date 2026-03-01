'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NewsView } from '@/components/NewsView';
import { DailyView } from '@/components/DailyView';
import { StatsView } from '@/components/StatsView';
import { AgoraView } from '@/components/AgoraView';
import { Category, Sprint, DailyWrapup, WeeklyGoal, WeeklyStats, Phalanx } from '@/lib/types';

const PAGES = ['/news', '/', '/stats', '/agora'] as const;
const PAGE_LABELS = ['News', 'Today', 'Stats', 'Agora'] as const;

// Props for each page's data
interface SprintWithCategory extends Sprint {
  categories?: {
    name: string;
    color: string;
    icon: string;
  };
}

interface SwipePagesProps {
  // Today page data
  todaySprints: Sprint[];
  categories: Category[];
  todayWrapup: DailyWrapup | null;
  todayDate: Date;
  userId: string;
  // Stats page data
  weekSprints: SprintWithCategory[];
  weeklyGoal: WeeklyGoal | null;
  pastGoals: WeeklyGoal[];
  weekWrapups: DailyWrapup[];
  weekStart: Date;
  // Agora page data
  weeklyStats: WeeklyStats[];
  prevWeekStats: { user_id: string; rank_position: number | null }[];
  phalanxes: Phalanx[];
  userPhalanxIds: string[];
  userDisplayName: string;
  hasCreatedPhalanx: boolean;
}

export function SwipePages({
  todaySprints,
  categories,
  todayWrapup,
  todayDate,
  userId,
  weekSprints,
  weeklyGoal,
  pastGoals,
  weekWrapups,
  weekStart,
  weeklyStats,
  prevWeekStats,
  phalanxes,
  userPhalanxIds,
  userDisplayName,
  hasCreatedPhalanx,
}: SwipePagesProps) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  // Get initial index from current pathname
  const getPageIndex = (path: string) => {
    const idx = PAGES.indexOf(path as typeof PAGES[number]);
    return idx >= 0 ? idx : 1; // Default to Today (index 1)
  };

  const [currentIndex, setCurrentIndex] = useState(() => getPageIndex(pathname));
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Touch tracking refs
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const canSwipe = useRef<boolean>(true);

  // Sync with pathname on navigation (e.g., from navbar on desktop)
  useEffect(() => {
    const newIndex = getPageIndex(pathname);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  }, [pathname, currentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Check if any editor/modal is open
    const isEditorOpen = document.querySelector('[data-editing="true"]') !== null;
    canSwipe.current = !isEditorOpen;

    if (!canSwipe.current) return;

    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    isHorizontalSwipe.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!canSwipe.current || touchStartX.current === null || touchStartY.current === null) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe.current === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
    }

    // Only handle horizontal swipes
    if (isHorizontalSwipe.current) {
      // Apply resistance at edges
      let offset = deltaX;
      if ((currentIndex === 0 && deltaX > 0) || (currentIndex === PAGES.length - 1 && deltaX < 0)) {
        offset = deltaX * 0.3; // Rubber band effect
      }
      setDragOffset(offset);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!canSwipe.current || touchStartX.current === null) {
      resetTouch();
      return;
    }

    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    const velocity = Math.abs(deltaX) / (Date.now() - touchStartTime.current);

    // Threshold for page change: either 25% of screen width or fast swipe
    const threshold = window.innerWidth * 0.25;
    const isFastSwipe = velocity > 0.5;
    const shouldChange = Math.abs(deltaX) > threshold || isFastSwipe;

    if (shouldChange && isHorizontalSwipe.current) {
      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - go to previous page
        navigateToPage(currentIndex - 1);
      } else if (deltaX < 0 && currentIndex < PAGES.length - 1) {
        // Swipe left - go to next page
        navigateToPage(currentIndex + 1);
      } else {
        // Edge bounce back
        setDragOffset(0);
      }
    } else {
      // Snap back
      setDragOffset(0);
    }

    resetTouch();
  };

  const resetTouch = () => {
    touchStartX.current = null;
    touchStartY.current = null;
    isHorizontalSwipe.current = null;
    setIsDragging(false);
  };

  const navigateToPage = (index: number) => {
    setCurrentIndex(index);
    setDragOffset(0);
    // Update URL without navigation
    window.history.replaceState(null, '', PAGES[index]);
  };

  // Render pages array
  const pages = [
    <NewsView key="news" />,
    <DailyView
      key="today"
      initialSprints={todaySprints}
      initialCategories={categories}
      initialWrapup={todayWrapup}
      initialDate={todayDate}
      userId={userId}
    />,
    <StatsView
      key="stats"
      sprints={weekSprints}
      categories={categories}
      weeklyGoal={weeklyGoal}
      pastGoals={pastGoals}
      wrapups={weekWrapups}
      weekStart={weekStart}
    />,
    <AgoraView
      key="agora"
      weeklyStats={weeklyStats}
      prevWeekStats={prevWeekStats}
      phalanxes={phalanxes}
      userPhalanxIds={userPhalanxIds}
      currentUserId={userId}
      userDisplayName={userDisplayName}
      hasCreatedPhalanx={hasCreatedPhalanx}
      weekStart={weekStart}
    />,
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden md:overflow-visible">
      {/* Swipe container - only on mobile */}
      <div
        ref={containerRef}
        className="flex-1 flex flex-col md:block touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pages container - horizontal layout on mobile */}
        <div
          className="flex-1 flex md:block"
          style={{
            width: typeof window !== 'undefined' ? `${PAGES.length * 100}vw` : '400vw',
            transform: `translateX(calc(-${currentIndex * 100}vw + ${dragOffset}px))`,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)',
          }}
        >
          {pages.map((page, index) => (
            <div
              key={PAGES[index]}
              className={cn(
                'w-screen flex-shrink-0 md:w-auto',
                'overflow-y-auto',
                // On desktop, only show current page
                'md:hidden',
                index === currentIndex && 'md:block'
              )}
            >
              <div className="container mx-auto px-4 py-6 max-w-4xl">
                {page}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Page indicator dots - mobile only */}
      <div className="md:hidden flex items-center justify-center gap-2 py-3 bg-background">
        {PAGES.map((page, index) => (
          <button
            key={page}
            onClick={() => navigateToPage(index)}
            className={cn(
              'transition-all duration-200',
              index === currentIndex
                ? 'w-6 h-2 bg-gold-400 rounded-full'
                : 'w-2 h-2 bg-muted-foreground/30 rounded-full hover:bg-muted-foreground/50'
            )}
            aria-label={`Go to ${PAGE_LABELS[index]}`}
          />
        ))}
      </div>
    </div>
  );
}
