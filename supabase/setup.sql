-- ============================================
-- YARD REC YARD - COMPLETE SUPABASE SETUP
-- ============================================
-- Run this in your Supabase SQL Editor to set up all tables and policies
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste & Run

-- ============================================
-- STEP 1: ENABLE ANONYMOUS AUTH
-- ============================================
-- Go to Authentication → Providers → Anonymous Sign-ins → Enable
-- This must be done in the dashboard UI, not SQL

-- ============================================
-- STEP 2: CREATE TABLES
-- ============================================

-- Profiles table
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workout submissions table
CREATE TABLE IF NOT EXISTS workout_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  time INTEGER NOT NULL,
  exercise_type TEXT NOT NULL,
  intensity TEXT NOT NULL,
  total_pushups INTEGER NOT NULL DEFAULT 0,
  total_squats INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_video_url TEXT,
  week_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Callouts table (trash talk / beef)
CREATE TABLE IF NOT EXISTS callouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_id TEXT,
  responded BOOLEAN NOT NULL DEFAULT false,
  response_message TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'award',
  rarity TEXT NOT NULL DEFAULT 'common',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, badge_id)
);

-- Weekly challenges table
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
-- STEP 3: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON profiles(handle);
CREATE INDEX IF NOT EXISTS idx_workout_submissions_profile_id ON workout_submissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_workout_submissions_week_id ON workout_submissions(week_id);
CREATE INDEX IF NOT EXISTS idx_workout_submissions_time ON workout_submissions(time);
CREATE INDEX IF NOT EXISTS idx_callouts_from_profile ON callouts(from_profile_id);
CREATE INDEX IF NOT EXISTS idx_callouts_to_profile ON callouts(to_profile_id);
CREATE INDEX IF NOT EXISTS idx_badges_profile_id ON badges(profile_id);

-- ============================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE callouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_challenges ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: CREATE RLS POLICIES
-- ============================================

-- Drop existing policies (safe to run even if they don't exist)
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can read workout submissions" ON workout_submissions;
DROP POLICY IF EXISTS "Users can insert own submissions" ON workout_submissions;
DROP POLICY IF EXISTS "Anyone can read callouts" ON callouts;
DROP POLICY IF EXISTS "Users can insert callouts" ON callouts;
DROP POLICY IF EXISTS "Users can update own received callouts" ON callouts;
DROP POLICY IF EXISTS "Anyone can read badges" ON badges;
DROP POLICY IF EXISTS "System can insert badges" ON badges;
DROP POLICY IF EXISTS "Anyone can read challenges" ON weekly_challenges;

-- PROFILES POLICIES
CREATE POLICY "Anyone can read profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- WORKOUT SUBMISSIONS POLICIES
CREATE POLICY "Anyone can read workout submissions" ON workout_submissions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own submissions" ON workout_submissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = workout_submissions.profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

-- CALLOUTS POLICIES
CREATE POLICY "Anyone can read callouts" ON callouts
  FOR SELECT USING (true);

CREATE POLICY "Users can insert callouts" ON callouts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = callouts.from_profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own received callouts" ON callouts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = callouts.to_profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

-- BADGES POLICIES
CREATE POLICY "Anyone can read badges" ON badges
  FOR SELECT USING (true);

CREATE POLICY "System can insert badges" ON badges
  FOR INSERT WITH CHECK (true);

-- WEEKLY CHALLENGES POLICIES
CREATE POLICY "Anyone can read challenges" ON weekly_challenges
  FOR SELECT USING (true);

-- ============================================
-- STEP 6: CREATE STORAGE BUCKET FOR PHOTOS
-- ============================================
-- Run this separately or in dashboard:
-- Go to Storage → Create bucket → Name: "profile-photos" → Public: true

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile photos
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;

CREATE POLICY "Anyone can view photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-photos' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profile-photos' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete own photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-photos' 
    AND auth.role() = 'authenticated'
  );

-- ============================================
-- STEP 7: CREATE INITIAL WEEKLY CHALLENGE
-- ============================================

INSERT INTO weekly_challenges (week_id, title, exercise_type, intensity, starts_at, ends_at)
SELECT 
  TO_CHAR(NOW(), 'IYYY-"W"IW') as week_id,
  'WEEKLY GRIND' as title,
  'SUPERSET' as exercise_type,
  'MISDEMEANOR' as intensity,
  DATE_TRUNC('week', NOW()) as starts_at,
  DATE_TRUNC('week', NOW()) + INTERVAL '7 days' as ends_at
WHERE NOT EXISTS (
  SELECT 1 FROM weekly_challenges WHERE week_id = TO_CHAR(NOW(), 'IYYY-"W"IW')
);

-- ============================================
-- DONE! 
-- ============================================
-- Make sure to also enable Anonymous Sign-ins in:
-- Authentication → Providers → Anonymous Sign-ins → Enable
