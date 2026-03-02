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

// Agora types
export type WeeklyStats = {
  id: string;
  user_id: string;
  week_start: string;
  average_score: number;
  total_sprints: number;
  wasted_minutes: number;
  exercise_days: number;
  ranking_score: number;
  tier: 'olympian' | 'spartan' | 'helot';
  rank_position: number | null;
  previous_rank: number | null;
  goal_met: boolean;
  created_at: string;
  // Joined from profiles
  profiles?: {
    display_name: string | null;
  };
};

export type Phalanx = {
  id: string;
  name: string;
  join_code: string;
  created_by: string | null;
  total_ranking_score: number;
  member_count: number;
  has_penalty: boolean;
  penalty_multiplier: number;
  tier: 'olympian' | 'spartan' | 'helot';
  rank_position: number | null;
  created_at: string;
  updated_at: string;
  // Joined members
  phalanx_members?: PhalanxMember[];
};

export type PhalanxMember = {
  id: string;
  phalanx_id: string;
  user_id: string;
  weekly_ranking_score: number;
  goal_met: boolean;
  joined_at: string;
  // Joined from profiles
  profiles?: {
    display_name: string | null;
  };
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

// Score-based colors for time blocks
// Gradient: 3 is almost white/pale, progressively darker to 9
export const SCORE_COLORS: Record<number, string> = {
  1: '#f87171',  // red-400 (wasted)
  2: '#f87171',  // red-400
  3: '#e8f5e8',  // very pale green (almost white)
  4: '#c5e6c5',  // light mint green
  5: '#8fcc8f',  // soft green
  6: '#5aad5a',  // medium green
  7: '#3d8b3d',  // forest green
  8: '#2d6b2d',  // dark green
  9: '#1a4a1a',  // very dark green
  10: '#d4af37', // gold-400
};

// Get color based on score value
export function getScoreColor(score: number, categoryName?: string): string {
  // "Wasted" category always uses red regardless of score
  if (categoryName?.toLowerCase() === 'wasted') {
    return '#f87171';
  }
  return SCORE_COLORS[score] || '#4a6741';
}

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

// Timezone-aware date utilities

// Get the current date in a specific timezone as YYYY-MM-DD
export function getTodayInTimezone(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

// Get start and end of day in timezone (returns UTC Date objects)
export function getDayBoundsInTimezone(dateStr: string, timezone: string): { start: Date; end: Date } {
  // Parse the date string
  const [year, month, day] = dateStr.split('-').map(Number);

  // Create a date at midnight in the target timezone
  // We need to calculate the UTC time that corresponds to midnight in the timezone
  const tempDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // noon UTC as reference

  // Get timezone offset at this date
  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  });

  // Calculate offset by comparing local time to UTC
  const parts = tzFormatter.formatToParts(tempDate);
  const hourInTz = parseInt(parts.find(p => p.type === 'hour')?.value || '12');
  const offsetHours = 12 - hourInTz;

  // Start of day in timezone (converted to UTC)
  const start = new Date(Date.UTC(year, month - 1, day, offsetHours, 0, 0, 0));
  // End of day in timezone (converted to UTC)
  const end = new Date(Date.UTC(year, month - 1, day, offsetHours + 23, 59, 59, 999));

  return { start, end };
}

// Get the week start (Monday) for a date in a specific timezone
// Uses pure date math without timezone conversion issues
export function getWeekStartInTimezone(dateStr: string, _timezone: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date at noon to avoid any DST edge cases
  const date = new Date(year, month - 1, day, 12, 0, 0);
  const dayOfWeek = date.getDay();
  // Sunday = 0, Monday = 1, ..., Saturday = 6
  // We want Monday as start of week
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  date.setDate(date.getDate() + mondayOffset);

  // Format back as YYYY-MM-DD using local date parts
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Convert a Date to local date string in timezone
export function formatDateInTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}
