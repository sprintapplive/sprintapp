export type Category = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  is_default: boolean;
  created_at: string;
};

export type Sprint = {
  id: string;
  user_id: string;
  category_id: string;
  block_start: string;
  description: string | null;
  score: number;
  created_at: string;
  updated_at: string;
  category?: Category;
};

export type DailyWrapup = {
  id: string;
  user_id: string;
  date: string;
  reflection: string | null;
  eating_score: number | null;
  exercised: boolean;
  average_score: number | null;
  total_sprints: number;
  created_at: string;
};

export type WeeklyGoal = {
  id: string;
  user_id: string;
  week_start: string;
  target_average_score: number;
  max_wasted_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
};

// Default categories with Greek-inspired colors
export const DEFAULT_CATEGORIES = [
  { name: 'Deep Work', color: 'laurel-700', icon: 'brain' },
  { name: 'Work', color: 'laurel-500', icon: 'briefcase' },
  { name: 'Exercise', color: 'gold-500', icon: 'dumbbell' },
  { name: 'Rest', color: 'marble-200', icon: 'moon' },
  { name: 'Social', color: 'gold-400', icon: 'users' },
  { name: 'Wasted', color: 'red-400', icon: 'x-circle' },
] as const;

// Color mapping for category colors to actual CSS values
export const CATEGORY_COLORS: Record<string, string> = {
  'laurel-700': '#2d4a28',
  'laurel-500': '#4a6741',
  'gold-500': '#c9a227',
  'gold-400': '#d4af37',
  'marble-200': '#e7e5e4',
  'red-400': '#f87171',
  'blue-500': '#3b82f6',
  'purple-500': '#a855f7',
};

// Helper to get 30-minute time blocks for a day
export function getTimeBlocks(date: Date = new Date()): Date[] {
  const blocks: Date[] = [];
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  for (let i = 0; i < 48; i++) {
    const block = new Date(startOfDay);
    block.setMinutes(i * 30);
    blocks.push(block);
  }

  return blocks;
}

// Format time block as HH:MM
export function formatTimeBlock(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Get the current time block
export function getCurrentTimeBlock(): Date {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = minutes < 30 ? 0 : 30;
  now.setMinutes(roundedMinutes, 0, 0);
  return now;
}

// Check if a time block is in the past
export function isBlockInPast(blockStart: Date): boolean {
  const now = new Date();
  const currentBlock = getCurrentTimeBlock();
  return blockStart < currentBlock;
}

// Check if a time block is the current block
export function isCurrentBlock(blockStart: Date): boolean {
  const currentBlock = getCurrentTimeBlock();
  return blockStart.getTime() === currentBlock.getTime();
}
