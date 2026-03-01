-- Sprint App Database Schema
-- Version: 001_initial_schema
-- Description: Initial database setup with profiles, categories, sprints, daily_wrapups, and weekly_goals

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- Extended user information linked to auth.users
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  timezone TEXT DEFAULT 'America/Denver', -- Mountain Time default
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- CATEGORIES TABLE
-- User-customizable sprint categories
-- ============================================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, name)
);

-- RLS for categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id AND is_default = FALSE);

-- Function to seed default categories for new users
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, color, icon, is_default) VALUES
    (NEW.id, 'Deep Work', 'laurel-700', 'brain', TRUE),
    (NEW.id, 'Work', 'laurel-500', 'briefcase', TRUE),
    (NEW.id, 'Exercise', 'gold-500', 'dumbbell', TRUE),
    (NEW.id, 'Rest', 'marble-200', 'moon', TRUE),
    (NEW.id, 'Social', 'gold-400', 'users', TRUE),
    (NEW.id, 'Wasted', 'red-400', 'x-circle', TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_seed_categories
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_categories();

-- ============================================================================
-- SPRINTS TABLE
-- 30-minute time blocks with category, description, and score
-- ============================================================================
CREATE TABLE sprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  block_start TIMESTAMPTZ NOT NULL,
  description TEXT,
  score INTEGER CHECK (score >= 1 AND score <= 10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One sprint per user per time block
  UNIQUE(user_id, block_start)
);

-- Index for efficient querying by date
CREATE INDEX idx_sprints_user_date ON sprints(user_id, block_start);

-- RLS for sprints
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sprints"
  ON sprints FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sprints"
  ON sprints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sprints"
  ON sprints FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sprints"
  ON sprints FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- DAILY_WRAPUPS TABLE
-- End-of-day review with eating score, exercise status
-- ============================================================================
CREATE TABLE daily_wrapups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  reflection TEXT,
  eating_score INTEGER CHECK (eating_score >= 1 AND eating_score <= 10),
  exercised BOOLEAN DEFAULT FALSE,
  average_score NUMERIC(3, 1), -- Calculated from sprints
  total_sprints INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, date)
);

-- Index for efficient querying
CREATE INDEX idx_daily_wrapups_user_date ON daily_wrapups(user_id, date);

-- RLS for daily_wrapups
ALTER TABLE daily_wrapups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily wrapups"
  ON daily_wrapups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily wrapups"
  ON daily_wrapups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily wrapups"
  ON daily_wrapups FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- WEEKLY_GOALS TABLE
-- Target average score and max wasted minutes per week
-- ============================================================================
CREATE TABLE weekly_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL, -- Monday of the week
  target_average_score NUMERIC(3, 1) DEFAULT 7.0,
  max_wasted_minutes INTEGER DEFAULT 120, -- 4 sprints worth
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, week_start)
);

-- RLS for weekly_goals
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly goals"
  ON weekly_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly goals"
  ON weekly_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly goals"
  ON weekly_goals FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate daily stats
CREATE OR REPLACE FUNCTION calculate_daily_stats(
  p_user_id UUID,
  p_date DATE
)
RETURNS TABLE (
  average_score NUMERIC,
  total_sprints INTEGER,
  wasted_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(s.score)::NUMERIC, 1) as average_score,
    COUNT(*)::INTEGER as total_sprints,
    (COUNT(*) FILTER (WHERE c.name = 'Wasted') * 30)::INTEGER as wasted_minutes
  FROM sprints s
  LEFT JOIN categories c ON s.category_id = c.id
  WHERE s.user_id = p_user_id
    AND DATE(s.block_start AT TIME ZONE 'America/Denver') = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get weekly stats
CREATE OR REPLACE FUNCTION get_weekly_stats(
  p_user_id UUID,
  p_week_start DATE
)
RETURNS TABLE (
  day DATE,
  average_score NUMERIC,
  total_sprints INTEGER,
  wasted_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(s.block_start AT TIME ZONE 'America/Denver') as day,
    ROUND(AVG(s.score)::NUMERIC, 1) as average_score,
    COUNT(*)::INTEGER as total_sprints,
    (COUNT(*) FILTER (WHERE c.name = 'Wasted') * 30)::INTEGER as wasted_minutes
  FROM sprints s
  LEFT JOIN categories c ON s.category_id = c.id
  WHERE s.user_id = p_user_id
    AND DATE(s.block_start AT TIME ZONE 'America/Denver') >= p_week_start
    AND DATE(s.block_start AT TIME ZONE 'America/Denver') < p_week_start + INTERVAL '7 days'
  GROUP BY DATE(s.block_start AT TIME ZONE 'America/Denver')
  ORDER BY day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sprints_updated_at
  BEFORE UPDATE ON sprints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_weekly_goals_updated_at
  BEFORE UPDATE ON weekly_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
