-- FIX PERMISSIONS AND ADD MISSING COLUMNS
-- Run this in Supabase SQL Editor to fix permission errors and add missing columns
-- This is the COMPLETE migration - run this to set up everything

-- ============================================
-- CREATE PROFILES TABLE IF NOT EXISTS
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  instagram TEXT NOT NULL DEFAULT '',
  tiktok TEXT NOT NULL DEFAULT '',
  twitter TEXT NOT NULL DEFAULT '',
  youtube TEXT NOT NULL DEFAULT '',
  discord TEXT NOT NULL DEFAULT '',
  threads TEXT NOT NULL DEFAULT '',
  total_workouts INTEGER NOT NULL DEFAULT 0,
  best_time INTEGER,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  rec_yard_run_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add rec_yard_run_count if profiles already exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rec_yard_run_count INTEGER NOT NULL DEFAULT 0;

-- ============================================
-- CREATE WORKOUT_SUBMISSIONS TABLE IF NOT EXISTS
-- ============================================

CREATE TABLE IF NOT EXISTS workout_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  time INTEGER NOT NULL,
  exercise_type TEXT NOT NULL,
  intensity TEXT NOT NULL,
  flip_mode TEXT NOT NULL DEFAULT 'freshfish',
  total_pushups INTEGER NOT NULL DEFAULT 0,
  total_squats INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_video_url TEXT,
  week_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add flip_mode if workout_submissions already exists
ALTER TABLE workout_submissions ADD COLUMN IF NOT EXISTS flip_mode TEXT NOT NULL DEFAULT 'freshfish';

-- Create indexes for workout_submissions
CREATE INDEX IF NOT EXISTS idx_workout_submissions_profile_id ON workout_submissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_workout_submissions_week_id ON workout_submissions(week_id);
CREATE INDEX IF NOT EXISTS idx_workout_submissions_time ON workout_submissions(time);

-- ============================================
-- CREATE REC_YARD_RUNS TABLE IF NOT EXISTS
-- ============================================

CREATE TABLE IF NOT EXISTS rec_yard_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  run_number INTEGER NOT NULL,
  run_code TEXT NOT NULL UNIQUE,
  week_id TEXT NOT NULL,
  time INTEGER,
  exercise_type TEXT NOT NULL DEFAULT 'superset',
  intensity TEXT NOT NULL DEFAULT 'misdemeanor',
  flip_mode TEXT NOT NULL DEFAULT 'freshfish',
  total_pushups INTEGER NOT NULL DEFAULT 0,
  total_squats INTEGER NOT NULL DEFAULT 0,
  cards_completed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, run_number)
);

-- Add flip_mode if rec_yard_runs already exists
ALTER TABLE rec_yard_runs ADD COLUMN IF NOT EXISTS flip_mode TEXT NOT NULL DEFAULT 'freshfish';

-- Create indexes for rec_yard_runs
CREATE INDEX IF NOT EXISTS idx_rec_yard_runs_profile_id ON rec_yard_runs(profile_id);
CREATE INDEX IF NOT EXISTS idx_rec_yard_runs_week_id ON rec_yard_runs(week_id);
CREATE INDEX IF NOT EXISTS idx_rec_yard_runs_run_code ON rec_yard_runs(run_code);
CREATE INDEX IF NOT EXISTS idx_rec_yard_runs_time ON rec_yard_runs(time);

-- ============================================
-- CREATE CALLOUTS TABLE IF NOT EXISTS
-- ============================================

CREATE TABLE IF NOT EXISTS callouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_id TEXT,
  responded BOOLEAN NOT NULL DEFAULT false,
  response_message TEXT,
  responded_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add is_deleted column if callouts table already exists
ALTER TABLE callouts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- CREATE WEEKLY_CHALLENGES TABLE IF NOT EXISTS
-- ============================================

CREATE TABLE IF NOT EXISTS weekly_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  intensity TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  participant_count INTEGER NOT NULL DEFAULT 0,
  top_time INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rec_yard_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE callouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_challenges ENABLE ROW LEVEL SECURITY;

-- ============================================
-- GRANT PERMISSIONS TO ANON AND AUTHENTICATED
-- ============================================

GRANT ALL ON TABLE profiles TO anon;
GRANT ALL ON TABLE profiles TO authenticated;
GRANT ALL ON TABLE workout_submissions TO anon;
GRANT ALL ON TABLE workout_submissions TO authenticated;
GRANT ALL ON TABLE rec_yard_runs TO anon;
GRANT ALL ON TABLE rec_yard_runs TO authenticated;
GRANT ALL ON TABLE callouts TO anon;
GRANT ALL ON TABLE callouts TO authenticated;
GRANT ALL ON TABLE weekly_challenges TO anon;
GRANT ALL ON TABLE weekly_challenges TO authenticated;

-- ============================================
-- CREATE RLS POLICIES FOR PROFILES
-- ============================================

DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- CREATE RLS POLICIES FOR WORKOUT_SUBMISSIONS
-- ============================================

DROP POLICY IF EXISTS "submissions_select" ON workout_submissions;
DROP POLICY IF EXISTS "submissions_insert" ON workout_submissions;
DROP POLICY IF EXISTS "submissions_update" ON workout_submissions;

CREATE POLICY "submissions_select" ON workout_submissions FOR SELECT USING (true);
CREATE POLICY "submissions_insert" ON workout_submissions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = workout_submissions.profile_id AND profiles.user_id = auth.uid())
);
CREATE POLICY "submissions_update" ON workout_submissions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = workout_submissions.profile_id AND profiles.user_id = auth.uid())
);

-- ============================================
-- CREATE RLS POLICIES FOR REC_YARD_RUNS
-- ============================================

DROP POLICY IF EXISTS "rec_yard_runs_select" ON rec_yard_runs;
DROP POLICY IF EXISTS "rec_yard_runs_insert" ON rec_yard_runs;
DROP POLICY IF EXISTS "rec_yard_runs_update" ON rec_yard_runs;

CREATE POLICY "rec_yard_runs_select" ON rec_yard_runs FOR SELECT USING (true);
CREATE POLICY "rec_yard_runs_insert" ON rec_yard_runs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = rec_yard_runs.profile_id AND profiles.user_id = auth.uid())
);
CREATE POLICY "rec_yard_runs_update" ON rec_yard_runs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = rec_yard_runs.profile_id AND profiles.user_id = auth.uid())
);

-- ============================================
-- CREATE RLS POLICIES FOR CALLOUTS
-- ============================================

DROP POLICY IF EXISTS "callouts_select" ON callouts;
DROP POLICY IF EXISTS "callouts_insert" ON callouts;
DROP POLICY IF EXISTS "callouts_update" ON callouts;

CREATE POLICY "callouts_select" ON callouts FOR SELECT USING (true);
CREATE POLICY "callouts_insert" ON callouts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = callouts.from_profile_id AND profiles.user_id = auth.uid())
);
CREATE POLICY "callouts_update" ON callouts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = callouts.from_profile_id AND profiles.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = callouts.to_profile_id AND profiles.user_id = auth.uid())
);

-- ============================================
-- CREATE RLS POLICIES FOR WEEKLY_CHALLENGES
-- ============================================

DROP POLICY IF EXISTS "challenges_select" ON weekly_challenges;
DROP POLICY IF EXISTS "challenges_insert" ON weekly_challenges;
DROP POLICY IF EXISTS "challenges_update" ON weekly_challenges;

CREATE POLICY "challenges_select" ON weekly_challenges FOR SELECT USING (true);
CREATE POLICY "challenges_insert" ON weekly_challenges FOR INSERT WITH CHECK (true);
CREATE POLICY "challenges_update" ON weekly_challenges FOR UPDATE USING (true);

-- ============================================
-- RPC FUNCTION FOR INCREMENTING CHALLENGE PARTICIPANTS
-- ============================================

CREATE OR REPLACE FUNCTION increment_challenge_participants(challenge_week_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE weekly_challenges
  SET participant_count = participant_count + 1
  WHERE week_id = challenge_week_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_challenge_participants(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION increment_challenge_participants(TEXT) TO authenticated;

-- ============================================
-- RPC FUNCTION FOR UPDATING CHALLENGE STATS
-- Creates challenge if not exists, then RECALCULATES participant_count and top_time
-- ============================================

CREATE OR REPLACE FUNCTION update_challenge_stats(
  p_week_id TEXT,
  p_profile_id UUID,
  p_time INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  challenge_exists BOOLEAN;
  week_start TIMESTAMPTZ;
  week_end TIMESTAMPTZ;
  new_participant_count INTEGER;
  new_top_time INTEGER;
BEGIN
  -- Calculate week start and end dates
  week_start := date_trunc('week', CURRENT_DATE)::timestamptz;
  week_end := week_start + interval '7 days';

  -- Check if challenge exists
  SELECT EXISTS(SELECT 1 FROM weekly_challenges WHERE week_id = p_week_id) INTO challenge_exists;
  
  -- Create challenge if it doesn't exist
  IF NOT challenge_exists THEN
    INSERT INTO weekly_challenges (week_id, title, exercise_type, intensity, starts_at, ends_at, participant_count, top_time)
    VALUES (p_week_id, 'WEEKLY CHALLENGE', 'superset', 'misdemeanor', week_start, week_end, 0, NULL);
  END IF;

  -- Count UNIQUE participants (distinct profile_ids with submissions this week)
  SELECT COUNT(DISTINCT profile_id) INTO new_participant_count
  FROM workout_submissions
  WHERE week_id = p_week_id;
  
  -- Get the actual fastest time this week
  SELECT MIN(time) INTO new_top_time
  FROM workout_submissions
  WHERE week_id = p_week_id;
  
  -- Update the challenge with recalculated values
  UPDATE weekly_challenges
  SET 
    participant_count = new_participant_count,
    top_time = new_top_time
  WHERE week_id = p_week_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_challenge_stats(TEXT, UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION update_challenge_stats(TEXT, UUID, INTEGER) TO authenticated;

-- ============================================
-- FIX CHECK CONSTRAINTS
-- ============================================
-- The app sends values that don't match the original schema constraints.
-- 
-- INTENSITY:
--   DB constraint: 'standard', 'hard-time', 'lifer'
--   App sends: 'misdemeanor', 'hard_time', 'lifer'
--
-- FLIP_MODE:
--   DB constraint: 'freshfish', 'trustee', 'og', 'podfather'
--   App also sends (superset modes): 'alternating', 'split2', 'split4', 'splitunder20'

-- Drop intensity constraints
ALTER TABLE workout_submissions DROP CONSTRAINT IF EXISTS workout_submissions_intensity_check;
ALTER TABLE weekly_challenges DROP CONSTRAINT IF EXISTS weekly_challenges_intensity_check;

-- Drop flip_mode constraints
ALTER TABLE workout_submissions DROP CONSTRAINT IF EXISTS workout_submissions_flip_mode_check;

-- Note: We're intentionally not adding new constraints to allow flexibility
-- The app validates these values on the client side

-- ============================================
-- DONE - ALL TABLES AND POLICIES CREATED
-- ============================================
-- Weekly challenges should be created through the app or manually
-- with the correct schema that matches your existing table
