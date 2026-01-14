-- FIX PERMISSIONS AND ADD MISSING COLUMNS
-- Run this in Supabase SQL Editor to fix permission errors and add missing columns

-- ============================================
-- FIX TABLE PERMISSIONS
-- ============================================

-- Grant permissions to anon and authenticated roles for all tables
GRANT ALL ON TABLE profiles TO anon;
GRANT ALL ON TABLE profiles TO authenticated;
GRANT ALL ON TABLE workout_submissions TO anon;
GRANT ALL ON TABLE workout_submissions TO authenticated;
GRANT ALL ON TABLE callouts TO anon;
GRANT ALL ON TABLE callouts TO authenticated;
GRANT ALL ON TABLE weekly_challenges TO anon;
GRANT ALL ON TABLE weekly_challenges TO authenticated;

-- ============================================
-- ADD MISSING COLUMNS
-- ============================================

-- Add rec_yard_run_count to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rec_yard_run_count INTEGER NOT NULL DEFAULT 0;

-- Add flip_mode to workout_submissions if not exists
ALTER TABLE workout_submissions ADD COLUMN IF NOT EXISTS flip_mode TEXT NOT NULL DEFAULT 'freshfish';

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

-- Add flip_mode column to rec_yard_runs if it already exists without it
ALTER TABLE rec_yard_runs ADD COLUMN IF NOT EXISTS flip_mode TEXT NOT NULL DEFAULT 'freshfish';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rec_yard_runs_profile_id ON rec_yard_runs(profile_id);
CREATE INDEX IF NOT EXISTS idx_rec_yard_runs_week_id ON rec_yard_runs(week_id);
CREATE INDEX IF NOT EXISTS idx_rec_yard_runs_run_code ON rec_yard_runs(run_code);
CREATE INDEX IF NOT EXISTS idx_rec_yard_runs_time ON rec_yard_runs(time);

-- Enable RLS
ALTER TABLE rec_yard_runs ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON TABLE rec_yard_runs TO anon;
GRANT ALL ON TABLE rec_yard_runs TO authenticated;

-- Create policies for rec_yard_runs (drop first if they exist)
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
-- VERIFY POLICIES EXIST FOR OTHER TABLES
-- ============================================

-- Drop and recreate policies to ensure they exist
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = user_id);

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
-- UPDATE POLICY FOR WEEKLY CHALLENGES (for top_time updates)
-- ============================================

DROP POLICY IF EXISTS "challenges_update" ON weekly_challenges;
CREATE POLICY "challenges_update" ON weekly_challenges FOR UPDATE USING (true);
