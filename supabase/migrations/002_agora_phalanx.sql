-- Sprint App Database Schema
-- Version: 002_agora_phalanx
-- Description: Add Agora (social leaderboard) and Phalanx (friend pods) features

-- ============================================================================
-- WEEKLY_STATS TABLE
-- Published weekly statistics for the Agora leaderboard
-- Calculated every Friday at 5 PM MT
-- ============================================================================
CREATE TABLE weekly_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL, -- Monday of the week

  -- Raw metrics
  average_score NUMERIC(3, 1) DEFAULT 0,
  total_sprints INTEGER DEFAULT 0,
  wasted_minutes INTEGER DEFAULT 0,
  exercise_days INTEGER DEFAULT 0,

  -- Calculated ranking score: 0.7 * (score/10) + 0.3 * (1 - wasted/360)
  ranking_score NUMERIC(5, 4) DEFAULT 0,

  -- Tier assignment (calculated based on percentile)
  -- 'olympian' = Top 20%, 'spartan' = Middle 60%, 'helot' = Bottom 20%
  tier TEXT CHECK (tier IN ('olympian', 'spartan', 'helot')) DEFAULT 'spartan',

  -- Rank position (1 = highest)
  rank_position INTEGER,

  -- Previous week's rank for movement tracking
  previous_rank INTEGER,

  -- Whether user met their weekly goal
  goal_met BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, week_start)
);

-- Index for leaderboard queries
CREATE INDEX idx_weekly_stats_week_rank ON weekly_stats(week_start, ranking_score DESC);
CREATE INDEX idx_weekly_stats_user_week ON weekly_stats(user_id, week_start);

-- RLS for weekly_stats - all logged-in users can view (public leaderboard)
ALTER TABLE weekly_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all weekly stats"
  ON weekly_stats FOR SELECT
  TO authenticated
  USING (true);

-- Only system (via service role) can insert/update
CREATE POLICY "Service role can manage weekly stats"
  ON weekly_stats FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- PHALANXES TABLE
-- Friend pods of 3-6 members
-- ============================================================================
CREATE TABLE phalanxes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Current week stats (aggregated from members)
  total_ranking_score NUMERIC(6, 4) DEFAULT 0,
  member_count INTEGER DEFAULT 0,

  -- Penalty tracking - true if any member failed their goal this week
  has_penalty BOOLEAN DEFAULT FALSE,
  penalty_multiplier NUMERIC(3, 2) DEFAULT 1.0,

  -- Tier for phalanx rankings
  tier TEXT CHECK (tier IN ('olympian', 'spartan', 'helot')) DEFAULT 'spartan',
  rank_position INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for join code lookups
CREATE INDEX idx_phalanxes_join_code ON phalanxes(join_code);

-- RLS for phalanxes - viewable by all authenticated users (public in Agora)
ALTER TABLE phalanxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all phalanxes"
  ON phalanxes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create phalanxes"
  ON phalanxes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Phalanx creators can update"
  ON phalanxes FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- ============================================================================
-- PHALANX_MEMBERS TABLE
-- Membership in phalanxes (users can be in max 2)
-- ============================================================================
CREATE TABLE phalanx_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phalanx_id UUID REFERENCES phalanxes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Member's contribution to phalanx this week
  weekly_ranking_score NUMERIC(5, 4) DEFAULT 0,
  goal_met BOOLEAN DEFAULT TRUE,

  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(phalanx_id, user_id)
);

-- Index for user's phalanxes lookup
CREATE INDEX idx_phalanx_members_user ON phalanx_members(user_id);
CREATE INDEX idx_phalanx_members_phalanx ON phalanx_members(phalanx_id);

-- RLS for phalanx_members
ALTER TABLE phalanx_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all memberships"
  ON phalanx_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join phalanxes"
  ON phalanx_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave phalanxes"
  ON phalanx_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================

-- Ensure users can only be in max 2 phalanxes
CREATE OR REPLACE FUNCTION check_max_phalanx_membership()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM phalanx_members WHERE user_id = NEW.user_id) >= 2 THEN
    RAISE EXCEPTION 'User can only be in a maximum of 2 phalanxes';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_phalanx_membership
  BEFORE INSERT ON phalanx_members
  FOR EACH ROW EXECUTE FUNCTION check_max_phalanx_membership();

-- Ensure phalanxes have max 6 members
CREATE OR REPLACE FUNCTION check_phalanx_size()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM phalanx_members WHERE phalanx_id = NEW.phalanx_id) >= 6 THEN
    RAISE EXCEPTION 'Phalanx can have a maximum of 6 members';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_phalanx_size
  BEFORE INSERT ON phalanx_members
  FOR EACH ROW EXECUTE FUNCTION check_phalanx_size();

-- Ensure users can only create 1 phalanx
CREATE OR REPLACE FUNCTION check_phalanx_creation_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM phalanxes WHERE created_by = NEW.created_by) >= 1 THEN
    RAISE EXCEPTION 'User can only create 1 phalanx';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_phalanx_creation_limit
  BEFORE INSERT ON phalanxes
  FOR EACH ROW EXECUTE FUNCTION check_phalanx_creation_limit();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate ranking score
-- Formula: 0.7 * (avg_score / 10) + 0.3 * (1 - wasted_minutes / 360)
CREATE OR REPLACE FUNCTION calculate_ranking_score(
  p_average_score NUMERIC,
  p_wasted_minutes INTEGER
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND(
    0.7 * (COALESCE(p_average_score, 0) / 10.0) +
    0.3 * (1.0 - LEAST(COALESCE(p_wasted_minutes, 0), 360) / 360.0),
    4
  );
END;
$$ LANGUAGE plpgsql;

-- Function to update phalanx stats
CREATE OR REPLACE FUNCTION update_phalanx_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update member count and check for penalties
  UPDATE phalanxes p
  SET
    member_count = (SELECT COUNT(*) FROM phalanx_members WHERE phalanx_id = p.id),
    total_ranking_score = (SELECT COALESCE(SUM(weekly_ranking_score), 0) FROM phalanx_members WHERE phalanx_id = p.id),
    has_penalty = EXISTS (SELECT 1 FROM phalanx_members WHERE phalanx_id = p.id AND goal_met = FALSE),
    penalty_multiplier = CASE
      WHEN EXISTS (SELECT 1 FROM phalanx_members WHERE phalanx_id = p.id AND goal_met = FALSE)
      THEN 0.8
      ELSE 1.0
    END,
    updated_at = NOW()
  WHERE p.id = COALESCE(NEW.phalanx_id, OLD.phalanx_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_phalanx_stats_on_member_change
  AFTER INSERT OR UPDATE OR DELETE ON phalanx_members
  FOR EACH ROW EXECUTE FUNCTION update_phalanx_stats();

-- Function to get current week's Monday
CREATE OR REPLACE FUNCTION get_week_start(p_date DATE DEFAULT CURRENT_DATE)
RETURNS DATE AS $$
BEGIN
  -- Return Monday of the week containing p_date
  RETURN p_date - EXTRACT(DOW FROM p_date)::INTEGER + 1;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to phalanxes
CREATE TRIGGER update_phalanxes_updated_at
  BEFORE UPDATE ON phalanxes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
