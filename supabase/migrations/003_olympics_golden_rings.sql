-- Sprint App Database Schema
-- Version: 003_olympics_golden_rings
-- Description: Add Golden Rings economy and Olympics Mode support

-- ============================================================================
-- PROFILES TABLE UPDATES
-- Add golden_rings currency and status field
-- ============================================================================

-- Add golden_rings column (default 20 for new users)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS golden_rings INTEGER DEFAULT 20 NOT NULL;

-- Add status column for display tier
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Spartan'
CHECK (status IN ('Olympian', 'Spartan', 'Helot'));

-- ============================================================================
-- GOLDEN RINGS TRIGGER
-- Award 3 rings whenever a user logs a sprint with score 10
-- ============================================================================

CREATE OR REPLACE FUNCTION award_rings_for_perfect_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on INSERT or when score is updated to 10
  IF NEW.score = 10 THEN
    -- Check if this is a new perfect score (not already 10)
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.score != 10) THEN
      UPDATE profiles
      SET golden_rings = golden_rings + 3
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_perfect_sprint_score ON sprints;

-- Create trigger for both INSERT and UPDATE
CREATE TRIGGER on_perfect_sprint_score
  AFTER INSERT OR UPDATE OF score ON sprints
  FOR EACH ROW EXECUTE FUNCTION award_rings_for_perfect_score();

-- ============================================================================
-- WASTED TIME PENALTY TRIGGER
-- Deduct 3 rings for every hour of wasted time (every 2 wasted sprints)
-- ============================================================================

CREATE OR REPLACE FUNCTION penalize_wasted_time()
RETURNS TRIGGER AS $$
DECLARE
  wasted_category_id UUID;
  wasted_count INTEGER;
BEGIN
  -- Get the Wasted category ID for this user
  SELECT id INTO wasted_category_id
  FROM categories
  WHERE user_id = NEW.user_id AND LOWER(name) = 'wasted'
  LIMIT 1;

  -- Only proceed if this sprint is categorized as Wasted
  IF NEW.category_id IS NOT NULL AND NEW.category_id = wasted_category_id THEN
    -- Count total wasted sprints for this user this week
    SELECT COUNT(*) INTO wasted_count
    FROM sprints s
    JOIN categories c ON s.category_id = c.id
    WHERE s.user_id = NEW.user_id
      AND LOWER(c.name) = 'wasted'
      AND s.block_start >= date_trunc('week', CURRENT_DATE);

    -- Every 2 wasted sprints = 1 hour = -3 rings
    -- Check if this new sprint completes an hour (even count means we just completed a pair)
    IF wasted_count > 0 AND wasted_count % 2 = 0 THEN
      UPDATE profiles
      SET golden_rings = GREATEST(0, golden_rings - 3)
      WHERE id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_wasted_sprint ON sprints;

-- Create trigger for INSERT (only on new sprints, not updates)
CREATE TRIGGER on_wasted_sprint
  AFTER INSERT ON sprints
  FOR EACH ROW EXECUTE FUNCTION penalize_wasted_time();

-- ============================================================================
-- HELPER FUNCTIONS FOR GOLDEN RINGS
-- ============================================================================

-- Function to deduct rings (returns false if insufficient balance)
CREATE OR REPLACE FUNCTION deduct_golden_rings(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  SELECT golden_rings INTO current_balance
  FROM profiles
  WHERE id = p_user_id;

  IF current_balance >= p_amount THEN
    UPDATE profiles
    SET golden_rings = golden_rings - p_amount
    WHERE id = p_user_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add rings
CREATE OR REPLACE FUNCTION add_golden_rings(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  UPDATE profiles
  SET golden_rings = golden_rings + p_amount
  WHERE id = p_user_id
  RETURNING golden_rings INTO new_balance;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- WEEKLY LEADERBOARD FUNCTION
-- Ranks users by average score, awards bonus rings to top 5, updates status
-- Call this function weekly (e.g., via cron or manual trigger)
-- ============================================================================

CREATE OR REPLACE FUNCTION process_weekly_leaderboard(
  p_week_start DATE DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  rank_position INTEGER,
  average_score NUMERIC,
  rings_awarded INTEGER,
  new_status TEXT
) AS $$
DECLARE
  target_week DATE;
  total_users INTEGER;
BEGIN
  -- Default to current week's Monday
  IF p_week_start IS NULL THEN
    target_week := get_week_start(CURRENT_DATE);
  ELSE
    target_week := p_week_start;
  END IF;

  -- Create temp table with rankings
  CREATE TEMP TABLE IF NOT EXISTS weekly_rankings AS
  SELECT
    ws.user_id,
    ws.average_score,
    ROW_NUMBER() OVER (ORDER BY ws.average_score DESC, ws.total_sprints DESC) as rank_pos
  FROM weekly_stats ws
  WHERE ws.week_start = target_week
    AND ws.total_sprints >= 5  -- Minimum 5 sprints to qualify
  ORDER BY ws.average_score DESC;

  -- Count total qualifying users
  SELECT COUNT(*) INTO total_users FROM weekly_rankings;

  -- Award bonus rings to top 5
  -- 1st: 5 rings, 2nd: 4 rings, 3rd: 3 rings, 4th: 2 rings, 5th: 1 ring
  UPDATE profiles p
  SET golden_rings = golden_rings +
    CASE
      WHEN wr.rank_pos = 1 THEN 5
      WHEN wr.rank_pos = 2 THEN 4
      WHEN wr.rank_pos = 3 THEN 3
      WHEN wr.rank_pos = 4 THEN 2
      WHEN wr.rank_pos = 5 THEN 1
      ELSE 0
    END
  FROM weekly_rankings wr
  WHERE p.id = wr.user_id
    AND wr.rank_pos <= 5;

  -- Update status based on percentile
  -- Top 20% = Olympian, Bottom 20% = Helot, Middle 60% = Spartan
  UPDATE profiles p
  SET status =
    CASE
      WHEN wr.rank_pos <= GREATEST(1, total_users * 0.2) THEN 'Olympian'
      WHEN wr.rank_pos > total_users * 0.8 THEN 'Helot'
      ELSE 'Spartan'
    END
  FROM weekly_rankings wr
  WHERE p.id = wr.user_id;

  -- Update rank positions in weekly_stats
  UPDATE weekly_stats ws
  SET rank_position = wr.rank_pos,
      tier = CASE
        WHEN wr.rank_pos <= GREATEST(1, total_users * 0.2) THEN 'olympian'
        WHEN wr.rank_pos > total_users * 0.8 THEN 'helot'
        ELSE 'spartan'
      END
  FROM weekly_rankings wr
  WHERE ws.user_id = wr.user_id
    AND ws.week_start = target_week;

  -- Return results
  RETURN QUERY
  SELECT
    wr.user_id,
    wr.rank_pos::INTEGER as rank_position,
    wr.average_score,
    CASE
      WHEN wr.rank_pos = 1 THEN 5
      WHEN wr.rank_pos = 2 THEN 4
      WHEN wr.rank_pos = 3 THEN 3
      WHEN wr.rank_pos = 4 THEN 2
      WHEN wr.rank_pos = 5 THEN 1
      ELSE 0
    END as rings_awarded,
    CASE
      WHEN wr.rank_pos <= GREATEST(1, total_users * 0.2) THEN 'Olympian'
      WHEN wr.rank_pos > total_users * 0.8 THEN 'Helot'
      ELSE 'Spartan'
    END as new_status
  FROM weekly_rankings wr
  ORDER BY wr.rank_pos;

  -- Cleanup
  DROP TABLE IF EXISTS weekly_rankings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE handle_new_user TO INCLUDE golden_rings
-- (Re-create to ensure new users get rings)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, golden_rings, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    20,  -- Starting golden rings
    'Spartan'  -- Default status
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
