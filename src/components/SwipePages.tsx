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
  todayDate: Date;
  userId: string;
  weekSprints: SprintWithCategory[];
  weeklyGoal: WeeklyGoal | null;
  pastGoals: WeeklyGoal[];
  weekWrapups: DailyWrapup[];
  weekStart: Date;
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

  const getPageIndex = (path: string) => {
    const idx = PAGES.indexOf(path as typeof PAGES[number]);
    return idx >= 0 ? idx : 1;
  };

  const [currentIndex, setCurrentIndex] = useState(() => getPageIndex(pathname));
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const canSwipe = useRef<boolean>(true);

  // Detect mobile vs desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with pathname on navigation
  useEffect(() => {
    const newIndex = getPageIndex(pathname);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  }, [pathname, currentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;

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
    if (!isMobile || !canSwipe.current || touchStartX.current === null || touchStartY.current === null) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;

    if (isHorizontalSwipe.current === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
    }

    if (isHorizontalSwipe.current) {
      let offset = deltaX;
      if ((currentIndex === 0 && deltaX > 0) || (currentIndex === PAGES.length - 1 && deltaX < 0)) {
        offset = deltaX * 0.3;
      }
      setDragOffset(offset);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || !canSwipe.current || touchStartX.current === null) {
      resetTouch();
      return;
    }

    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    const velocity = Math.abs(deltaX) / (Date.now() - touchStartTime.current);

    const threshold = window.innerWidth * 0.25;
    const isFastSwipe = velocity > 0.5;
    const shouldChange = Math.abs(deltaX) > threshold || isFastSwipe;

    if (shouldChange && isHorizontalSwipe.current) {
      if (deltaX > 0 && currentIndex > 0) {
        navigateToPage(currentIndex - 1);
      } else if (deltaX < 0 && currentIndex < PAGES.length - 1) {
        navigateToPage(currentIndex + 1);
      } else {
        setDragOffset(0);
      }
    } else {
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
    window.history.replaceState(null, '', PAGES[index]);
  };

  // Render the current page content
  const renderPage = (index: number) => {
    switch (index) {
      case 0:
        return <NewsView />;
      case 1:
        return (
          <DailyView
            initialSprints={todaySprints}
            initialCategories={categories}
            initialWrapup={todayWrapup}
            initialDate={todayDate}
            userId={userId}
          />
        );
      case 2:
        return (
          <StatsView
            sprints={weekSprints}
            categories={categories}
            weeklyGoal={weeklyGoal}
            pastGoals={pastGoals}
            wrapups={weekWrapups}
            weekStart={weekStart}
          />
        );
      case 3:
        return (
          <AgoraView
            weeklyStats={weeklyStats}
            prevWeekStats={prevWeekStats}
            phalanxes={phalanxes}
            userPhalanxIds={userPhalanxIds}
            currentUserId={userId}
            userDisplayName={userDisplayName}
            hasCreatedPhalanx={hasCreatedPhalanx}
            weekStart={weekStart}
          />
        );
      default:
        return null;
    }
  };

  // Desktop: Simple single-page render
  if (!isMobile) {
    return (
      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        {renderPage(currentIndex)}
      </main>
    );
  }

  // Mobile: Swipeable pages
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="flex-1 flex flex-col touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex-1 flex"
          style={{
            width: `${PAGES.length * 100}vw`,
            transform: `translateX(calc(-${currentIndex * 100}vw + ${dragOffset}px))`,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)',
          }}
        >
          {PAGES.map((_, index) => (
            <div
              key={PAGES[index]}
              className="w-screen flex-shrink-0 overflow-y-auto"
            >
              <div className="container mx-auto px-4 py-6 max-w-4xl">
                {renderPage(index)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Page indicator dots */}
      <div className="flex items-center justify-center gap-2 py-3 bg-background">
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
