'use client';

import { Newspaper } from 'lucide-react';

export function NewsView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <Newspaper className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <h2 className="text-xl font-bold italic text-muted-foreground">News</h2>
      <p className="text-sm text-muted-foreground/60 mt-2">Coming soon</p>
    </div>
  );
}
