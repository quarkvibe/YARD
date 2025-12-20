-- ============================================
-- YARD REC YARD SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  handle VARCHAR(20) UNIQUE NOT NULL,
  display_name VARCHAR(50),
  bio TEXT DEFAULT '',
  photo_url TEXT,
  instagram VARCHAR(30) DEFAULT '',
  total_workouts INTEGER DEFAULT 0,
  best_time INTEGER, -- in seconds
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for handle lookups
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON profiles(handle);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- ============================================
-- WORKOUT SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS workout_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  time INTEGER NOT NULL, -- in seconds
  exercise_type VARCHAR(20) NOT NULL, -- 'pushups', 'squats', 'superset'
  intensity VARCHAR(20) NOT NULL, -- 'standard', 'hard-time', 'lifer'
  total_pushups INTEGER NOT NULL,
  total_squats INTEGER NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_video_url TEXT,
  week_id VARCHAR(10) NOT NULL, -- e.g., '2025-W51'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_submissions_time ON workout_submissions(time ASC);
CREATE INDEX IF NOT EXISTS idx_submissions_week ON workout_submissions(week_id);
CREATE INDEX IF NOT EXISTS idx_submissions_profile ON workout_submissions(profile_id);

-- ============================================
-- CALLOUTS TABLE (Trash Talk)
-- ============================================
CREATE TABLE IF NOT EXISTS callouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  message_id VARCHAR(50), -- Reference to preset message
  responded BOOLEAN DEFAULT FALSE,
  response_message TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for callout queries
CREATE INDEX IF NOT EXISTS idx_callouts_from ON callouts(from_profile_id);
CREATE INDEX IF NOT EXISTS idx_callouts_to ON callouts(to_profile_id);

-- ============================================
-- BADGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_type VARCHAR(50) NOT NULL, -- e.g., 'first-blood', 'week-warrior', 'speed-demon'
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, badge_type)
);

CREATE INDEX IF NOT EXISTS idx_badges_profile ON badges(profile_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE callouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- PROFILES: Anyone can read, only owner can update
CREATE POLICY "Profiles are viewable by everyone" 
  ON profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = user_id);

-- WORKOUT SUBMISSIONS: Anyone can read, only owner can insert
CREATE POLICY "Submissions are viewable by everyone" 
  ON workout_submissions FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own submissions" 
  ON workout_submissions FOR INSERT 
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- CALLOUTS: Sender and receiver can read, only sender can create
CREATE POLICY "Callouts are viewable by participants" 
  ON callouts FOR SELECT 
  USING (
    from_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR 
    to_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can send callouts" 
  ON callouts FOR INSERT 
  WITH CHECK (
    from_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Receiver can respond to callouts" 
  ON callouts FOR UPDATE 
  USING (
    to_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- BADGES: Anyone can read, system can insert (via service role)
CREATE POLICY "Badges are viewable by everyone" 
  ON badges FOR SELECT 
  USING (true);

CREATE POLICY "Users can earn badges" 
  ON badges FOR INSERT 
  WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- ============================================
-- STORAGE BUCKET FOR PHOTOS/VIDEOS
-- ============================================

-- Run these in SQL editor or via Supabase dashboard:
-- 1. Create bucket: profile-photos (public)
-- 2. Create bucket: verification-videos (private)

-- Storage policies (run after creating buckets)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('verification-videos', 'verification-videos', false);

-- ============================================
-- ANTI-CHEAT FUNCTIONS
-- ============================================

-- Function to validate workout time (minimum 8 minutes for 52 cards)
CREATE OR REPLACE FUNCTION validate_workout_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Minimum 8 minutes (480 seconds) for a full deck
  IF NEW.time < 480 THEN
    RAISE EXCEPTION 'Workout time too fast - possible cheating detected';
  END IF;
  
  -- Maximum sanity check (4 hours seems reasonable max)
  IF NEW.time > 14400 THEN
    RAISE EXCEPTION 'Workout time exceeds maximum allowed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_workout_time
  BEFORE INSERT ON workout_submissions
  FOR EACH ROW
  EXECUTE FUNCTION validate_workout_time();

-- ============================================
-- HELPER VIEWS
-- ============================================

-- Leaderboard view with profile info
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT 
  ws.id,
  ws.time,
  ws.exercise_type,
  ws.intensity,
  ws.is_verified,
  ws.week_id,
  ws.created_at,
  p.id as profile_id,
  p.handle,
  p.display_name,
  p.photo_url,
  p.is_verified as profile_verified,
  ROW_NUMBER() OVER (ORDER BY ws.time ASC) as rank
FROM workout_submissions ws
JOIN profiles p ON ws.profile_id = p.id;

-- Weekly challenge leaderboard
CREATE OR REPLACE VIEW weekly_leaderboard AS
SELECT 
  ws.id,
  ws.time,
  ws.exercise_type,
  ws.intensity,
  ws.is_verified,
  ws.week_id,
  ws.created_at,
  p.id as profile_id,
  p.handle,
  p.display_name,
  p.photo_url,
  p.is_verified as profile_verified,
  ROW_NUMBER() OVER (PARTITION BY ws.week_id ORDER BY ws.time ASC) as rank
FROM workout_submissions ws
JOIN profiles p ON ws.profile_id = p.id;

-- ============================================
-- DONE!
-- ============================================
-- After running this schema:
-- 1. Go to Storage and create 'profile-photos' bucket (public)
-- 2. Go to Authentication and enable Apple Sign In
-- 3. Your Rec Yard is ready!

