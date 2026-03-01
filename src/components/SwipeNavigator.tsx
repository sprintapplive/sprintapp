'use client';

import { useRef, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const PAGES = ['/', '/stats', '/agora'] as const;
const PAGE_LABELS = ['Today', 'Stats', 'Agora'] as const;

interface SwipeNavigatorProps {
  children: ReactNode;
}

export function SwipeNavigator({ children }: SwipeNavigatorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const currentIndex = PAGES.indexOf(pathname as typeof PAGES[number]);

  useEffect(() => {
    // Prefetch all pages for instant navigation
    PAGES.forEach(page => router.prefetch(page));
  }, [router]);

  useEffect(() => {
    // Reset navigating state when pathname changes
    setIsNavigating(false);
  }, [pathname]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Only trigger if horizontal swipe is dominant and significant
    const minSwipeDistance = 80;
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 1.5;

    if (isHorizontalSwipe && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - go to previous page
        setIsNavigating(true);
        router.push(PAGES[currentIndex - 1]);
      } else if (deltaX < 0 && currentIndex < PAGES.length - 1) {
        // Swipe left - go to next page
        setIsNavigating(true);
        router.push(PAGES[currentIndex + 1]);
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex-1 flex flex-col"
    >
      <div className={cn(
        'flex-1 flex flex-col transition-opacity duration-150',
        isNavigating && 'opacity-50'
      )}>
        {children}
      </div>

      {/* Page indicator dots - mobile only */}
      <div className="md:hidden flex items-center justify-center gap-2 py-3">
        {PAGES.map((page, index) => (
          <button
            key={page}
            onClick={() => {
              if (index !== currentIndex) {
                setIsNavigating(true);
                router.push(page);
              }
            }}
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
