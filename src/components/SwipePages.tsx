'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DailyView } from '@/components/DailyView';
import { StatsView } from '@/components/StatsView';
import { AgoraView } from '@/components/AgoraView';
import { SprintMode } from '@/components/SprintMode';
import { Category, Sprint, DailyWrapup, WeeklyGoal, WeeklyStats } from '@/lib/types';

const PAGES = ['/agora', '/', '/stats'] as const;
const PAGE_LABELS = ['Agora', 'Today', 'Stats'] as const;

// Animation constants for smooth swiping
const SPRING_TENSION = 300;
const SPRING_DAMPING = 30;
const VELOCITY_THRESHOLD = 0.3; // Lower threshold for more responsive swipes
const DISTANCE_THRESHOLD = 0.15; // 15% of screen width

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
  todayDateStr: string; // YYYY-MM-DD format to avoid timezone issues
  userId: string;
  weekSprints: SprintWithCategory[];
  allSprints: SprintWithCategory[];
  weeklyGoal: WeeklyGoal | null;
  pastGoals: WeeklyGoal[];
  weekWrapups: DailyWrapup[];
  weekStartStr: string; // YYYY-MM-DD format to avoid timezone issues
  weeklyStats: WeeklyStats[];
  prevWeekStats: { user_id: string; rank_position: number | null }[];
  userDisplayName: string;
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

  const getPageIndex = (path: string) => {
    const idx = PAGES.indexOf(path as typeof PAGES[number]);
    return idx >= 0 ? idx : 1;
  };

  const [currentIndex, setCurrentIndex] = useState(() => getPageIndex(pathname));
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const lastTouchX = useRef<number | null>(null);
  const lastTouchTime = useRef<number>(0);
  const velocityX = useRef<number>(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const canSwipe = useRef<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Smooth velocity calculation using exponential moving average
  const updateVelocity = useCallback((currentX: number, currentTime: number) => {
    if (lastTouchX.current !== null && lastTouchTime.current !== 0) {
      const deltaTime = currentTime - lastTouchTime.current;
      if (deltaTime > 0) {
        const instantVelocity = (currentX - lastTouchX.current) / deltaTime;
        // Exponential smoothing for more natural feel
        velocityX.current = velocityX.current * 0.7 + instantVelocity * 0.3;
      }
    }
    lastTouchX.current = currentX;
    lastTouchTime.current = currentTime;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || isAnimating) return;

    const isEditorOpen = document.querySelector('[data-editing="true"]') !== null;
    canSwipe.current = !isEditorOpen;

    if (!canSwipe.current) return;

    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    lastTouchX.current = touch.clientX;
    lastTouchTime.current = Date.now();
    velocityX.current = 0;
    isHorizontalSwipe.current = null;
    // Don't set isDragging yet - wait until we confirm it's a horizontal swipe
  }, [isMobile, isAnimating]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !canSwipe.current || touchStartX.current === null || touchStartY.current === null) return;

    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;
    const currentTime = Date.now();

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe.current === null && (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8)) {
      isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
      // Only start dragging mode once we confirm it's a horizontal swipe
      if (isHorizontalSwipe.current) {
        setIsDragging(true);
      }
    }

    if (isHorizontalSwipe.current) {
      // Prevent vertical scrolling while horizontal swiping
      e.preventDefault();

      // Update velocity for momentum
      updateVelocity(currentX, currentTime);

      // Apply resistance at boundaries with smoother curve
      let offset = deltaX;
      const resistance = 0.25;
      if ((currentIndex === 0 && deltaX > 0) || (currentIndex === PAGES.length - 1 && deltaX < 0)) {
        // Exponential resistance for more natural boundary feel
        offset = Math.sign(deltaX) * Math.pow(Math.abs(deltaX), 0.7) * resistance;
      }

      // Use requestAnimationFrame for smoother updates
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        setDragOffset(offset);
      });
    }
  }, [isMobile, currentIndex, updateVelocity]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !canSwipe.current || touchStartX.current === null) {
      resetTouch();
      return;
    }

    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    const screenWidth = window.innerWidth;

    // Use both velocity and distance for determining page change
    const velocity = velocityX.current;
    const distanceRatio = Math.abs(deltaX) / screenWidth;

    // More responsive: either fast swipe OR sufficient distance
    const isFastSwipe = Math.abs(velocity) > VELOCITY_THRESHOLD;
    const isSufficientDistance = distanceRatio > DISTANCE_THRESHOLD;
    const shouldChangePage = (isFastSwipe || isSufficientDistance) && isHorizontalSwipe.current;

    if (shouldChangePage) {
      // Determine direction based on velocity if fast swipe, otherwise by distance
      const direction = isFastSwipe ? Math.sign(velocity) : Math.sign(deltaX);

      if (direction > 0 && currentIndex > 0) {
        navigateToPage(currentIndex - 1);
      } else if (direction < 0 && currentIndex < PAGES.length - 1) {
        navigateToPage(currentIndex + 1);
      } else {
        // Bounce back with animation
        animateToPosition(0);
      }
    } else {
      // Snap back to current page
      animateToPosition(0);
    }

    resetTouch();
  }, [isMobile, currentIndex]);

  const animateToPosition = useCallback((targetOffset: number) => {
    setIsAnimating(true);
    setDragOffset(targetOffset);
    // Reset animation state after transition completes
    setTimeout(() => {
      setIsAnimating(false);
    }, 350);
  }, []);

  const resetTouch = useCallback(() => {
    touchStartX.current = null;
    touchStartY.current = null;
    lastTouchX.current = null;
    lastTouchTime.current = 0;
    velocityX.current = 0;
    isHorizontalSwipe.current = null;
    setIsDragging(false);
  }, []);

  const navigateToPage = useCallback((index: number) => {
    setIsAnimating(true);
    setCurrentIndex(index);
    setDragOffset(0);
    window.history.replaceState(null, '', PAGES[index]);
    setTimeout(() => {
      setIsAnimating(false);
    }, 350);
  }, []);

  // Render the current page content
  const renderPage = (index: number) => {
    switch (index) {
      case 0:
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
            userId={userId}
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
        {/* Sprint Mode - rendered outside main for proper fixed positioning */}
        {currentIndex === 1 && <SprintMode />}
      </>
    );
  }

  // Mobile: Swipeable pages with smooth animations
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        ref={containerRef}
        className="flex-1 flex flex-col touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex-1 flex will-change-transform"
          style={{
            width: `${PAGES.length * 100}vw`,
            transform: `translate3d(calc(-${currentIndex * 100}vw + ${dragOffset}px), 0, 0)`,
            transition: isDragging
              ? 'none'
              : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {PAGES.map((_, index) => (
            <div
              key={PAGES[index]}
              className="w-screen flex-shrink-0 overflow-y-auto overscroll-y-contain"
              style={{
                // Enable smooth scrolling within pages
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <div className="container mx-auto px-4 py-6 max-w-4xl">
                {renderPage(index)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Page indicator dots with smooth transitions */}
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

      {/* Sprint Mode - rendered outside overflow container for proper fixed positioning on mobile */}
      {currentIndex === 1 && <SprintMode />}
    </div>
  );
}
