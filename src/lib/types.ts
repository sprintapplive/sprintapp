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
export const SCORE_COLORS: Record<number, string> = {
  1: '#f87171',  // red-400 (wasted)
  2: '#f87171',  // red-400
  3: '#b8d4b8',  // laurel-200 (lightest green)
  4: '#8fb98f',  // laurel-300
  5: '#6a9e6a',  // laurel-400
  6: '#4a6741',  // laurel-500
  7: '#3d5636',  // laurel-600
  8: '#2d4a28',  // laurel-700
  9: '#233a1f',  // laurel-800 (darkest green)
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
