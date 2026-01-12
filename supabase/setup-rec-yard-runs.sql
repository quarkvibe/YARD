-- REC YARD RUNS TABLE
-- Tracks sequential competitive workout numbers per profile
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS rec_yard_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  run_number INTEGER NOT NULL,
  run_code TEXT NOT NULL UNIQUE,
  week_id TEXT NOT NULL,
  time INTEGER,
  exercise_type TEXT NOT NULL DEFAULT 'superset',
  intensity TEXT NOT NULL DEFAULT 'misdemeanor',
  total_pushups INTEGER NOT NULL DEFAULT 0,
  total_squats INTEGER NOT NULL DEFAULT 0,
  cards_completed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, run_number)
);

CREATE INDEX IF NOT EXISTS idx_rec_yard_runs_profile_id ON rec_yard_runs(profile_id);
CREATE INDEX IF NOT EXISTS idx_rec_yard_runs_week_id ON rec_yard_runs(week_id);
CREATE INDEX IF NOT EXISTS idx_rec_yard_runs_run_code ON rec_yard_runs(run_code);
CREATE INDEX IF NOT EXISTS idx_rec_yard_runs_time ON rec_yard_runs(time);

ALTER TABLE rec_yard_runs ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE rec_yard_runs TO anon;
GRANT ALL ON TABLE rec_yard_runs TO authenticated;

CREATE POLICY "rec_yard_runs_select" ON rec_yard_runs FOR SELECT USING (true);
CREATE POLICY "rec_yard_runs_insert" ON rec_yard_runs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = rec_yard_runs.profile_id AND profiles.user_id = auth.uid())
);
CREATE POLICY "rec_yard_runs_update" ON rec_yard_runs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = rec_yard_runs.profile_id AND profiles.user_id = auth.uid())
);

-- Add run_count to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rec_yard_run_count INTEGER NOT NULL DEFAULT 0;
