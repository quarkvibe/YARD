-- ============================================
-- YARD REC YARD SCHEMA v2.0
-- Enterprise-Grade Community Database
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy search on handles

-- ============================================
-- 1. PROFILES TABLE
-- Core user identity for Rec Yard
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Identity
  handle VARCHAR(20) UNIQUE NOT NULL,
  display_name VARCHAR(50),
  bio TEXT DEFAULT '' CHECK (char_length(bio) <= 500),
  photo_url TEXT,
  
  -- Social links
  instagram VARCHAR(30) DEFAULT '',
  twitter VARCHAR(30) DEFAULT '',
  tiktok VARCHAR(30) DEFAULT '',
  
  -- Stats (denormalized for fast reads)
  total_workouts INTEGER DEFAULT 0 CHECK (total_workouts >= 0),
  best_time INTEGER CHECK (best_time IS NULL OR best_time >= 0), -- seconds
  current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
  total_pushups INTEGER DEFAULT 0 CHECK (total_pushups >= 0),
  total_squats INTEGER DEFAULT 0 CHECK (total_squats >= 0),
  
  -- Verification & Status
  is_verified BOOLEAN DEFAULT FALSE,
  verification_status VARCHAR(20) DEFAULT 'none' CHECK (verification_status IN ('none', 'pending', 'verified', 'rejected')),
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  
  -- Subscription (cached from RevenueCat for fast checks)
  has_rec_yard_access BOOLEAN DEFAULT FALSE,
  subscription_expires_at TIMESTAMPTZ,
  
  -- Privacy settings
  is_public BOOLEAN DEFAULT TRUE,
  allow_callouts BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON profiles(handle);
CREATE INDEX IF NOT EXISTS idx_profiles_handle_trgm ON profiles USING gin(handle gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_best_time ON profiles(best_time ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned) WHERE is_banned = false;

-- ============================================
-- 2. WEEKLY CHALLENGES TABLE (before submissions for FK)
-- Rotating weekly competitions
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Challenge config
  week_id VARCHAR(10) UNIQUE NOT NULL, -- e.g., '2025-W51'
  title VARCHAR(100) NOT NULL,
  description TEXT,
  exercise_type VARCHAR(20) NOT NULL CHECK (exercise_type IN ('pushups', 'squats', 'superset')),
  intensity VARCHAR(20) NOT NULL CHECK (intensity IN ('standard', 'hard-time', 'lifer')),
  
  -- Timing
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  
  -- Stats (updated via triggers)
  participant_count INTEGER DEFAULT 0,
  submission_count INTEGER DEFAULT 0,
  top_time INTEGER,
  
  -- Prizes/rewards
  badge_reward VARCHAR(50), -- Badge type to award to winner
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenges_week ON weekly_challenges(week_id);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON weekly_challenges(is_active, ends_at) WHERE is_active = true;

-- ============================================
-- 3. WORKOUT SUBMISSIONS TABLE
-- Individual workout records for leaderboard
-- ============================================
CREATE TABLE IF NOT EXISTS workout_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Workout data
  time INTEGER NOT NULL CHECK (time >= 0),
  exercise_type VARCHAR(20) NOT NULL CHECK (exercise_type IN ('pushups', 'squats', 'superset')),
  intensity VARCHAR(20) NOT NULL CHECK (intensity IN ('standard', 'hard-time', 'lifer')),
  flip_mode VARCHAR(20) NOT NULL DEFAULT 'freshfish' CHECK (flip_mode IN ('freshfish', 'trustee', 'og', 'podfather')),
  total_pushups INTEGER NOT NULL CHECK (total_pushups >= 0),
  total_squats INTEGER NOT NULL CHECK (total_squats >= 0),
  cards_completed INTEGER NOT NULL DEFAULT 52 CHECK (cards_completed > 0 AND cards_completed <= 52),
  
  -- Challenge tracking
  week_id VARCHAR(10) NOT NULL, -- e.g., '2025-W51'
  challenge_id UUID REFERENCES weekly_challenges(id) ON DELETE SET NULL,
  
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verification_video_url TEXT,
  verification_status VARCHAR(20) DEFAULT 'none' CHECK (verification_status IN ('none', 'pending', 'approved', 'rejected')),
  verified_at TIMESTAMPTZ,
  verified_by UUID, -- Admin who verified
  
  -- Anti-cheat
  device_id VARCHAR(100), -- For detecting multi-account
  client_version VARCHAR(20), -- App version
  suspicious_flags JSONB DEFAULT '[]'::jsonb, -- Array of flags if detected
  is_flagged BOOLEAN DEFAULT FALSE,
  
  -- Engagement stats (denormalized)
  like_count INTEGER DEFAULT 0 CHECK (like_count >= 0),
  comment_count INTEGER DEFAULT 0 CHECK (comment_count >= 0),
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submissions_profile ON workout_submissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_submissions_time ON workout_submissions(time ASC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_submissions_week ON workout_submissions(week_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON workout_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_challenge ON workout_submissions(challenge_id) WHERE challenge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_submissions_leaderboard ON workout_submissions(time ASC, created_at DESC) WHERE is_deleted = false AND is_flagged = false;

-- ============================================
-- 4. CALLOUTS TABLE (Trash Talk)
-- User-to-user challenges
-- ============================================
CREATE TABLE IF NOT EXISTS callouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Participants
  from_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Message
  message TEXT NOT NULL CHECK (char_length(message) <= 200),
  message_id VARCHAR(50), -- Reference to preset message
  heat_level INTEGER DEFAULT 1 CHECK (heat_level BETWEEN 1 AND 3),
  
  -- Response
  responded BOOLEAN DEFAULT FALSE,
  response_message TEXT CHECK (char_length(response_message) <= 200),
  responded_at TIMESTAMPTZ,
  
  -- Moderation
  is_reported BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_callouts_from ON callouts(from_profile_id);
CREATE INDEX IF NOT EXISTS idx_callouts_to ON callouts(to_profile_id);
CREATE INDEX IF NOT EXISTS idx_callouts_pending ON callouts(to_profile_id, responded) WHERE responded = false;

-- ============================================
-- 5. BADGES TABLE
-- Achievements and rewards
-- ============================================
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_type VARCHAR(50) NOT NULL,
  
  -- Context
  earned_for TEXT, -- Description of why earned
  related_submission_id UUID REFERENCES workout_submissions(id),
  related_challenge_id UUID REFERENCES weekly_challenges(id),
  
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(profile_id, badge_type)
);

CREATE INDEX IF NOT EXISTS idx_badges_profile ON badges(profile_id);
CREATE INDEX IF NOT EXISTS idx_badges_type ON badges(badge_type);

-- ============================================
-- 6. LIKES TABLE
-- Social engagement on submissions
-- ============================================
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  submission_id UUID REFERENCES workout_submissions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(profile_id, submission_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_submission ON likes(submission_id);
CREATE INDEX IF NOT EXISTS idx_likes_profile ON likes(profile_id);

-- ============================================
-- 7. COMMENTS TABLE
-- Comments on workout submissions
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  submission_id UUID REFERENCES workout_submissions(id) ON DELETE CASCADE NOT NULL,
  
  text TEXT NOT NULL CHECK (char_length(text) <= 500),
  
  -- Moderation
  is_reported BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_submission ON comments(submission_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_comments_profile ON comments(profile_id);

-- ============================================
-- 8. FOLLOWS TABLE
-- Social connections (for future feed features)
-- ============================================
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- ============================================
-- 9. BLOCKS TABLE
-- User blocking
-- ============================================
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);

-- ============================================
-- 10. REPORTS TABLE
-- Content moderation reports
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- What's being reported
  reported_type VARCHAR(20) NOT NULL CHECK (reported_type IN ('profile', 'submission', 'callout', 'comment')),
  reported_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reported_submission_id UUID REFERENCES workout_submissions(id) ON DELETE CASCADE,
  reported_callout_id UUID REFERENCES callouts(id) ON DELETE CASCADE,
  reported_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  -- Report details
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('spam', 'harassment', 'cheating', 'inappropriate', 'other')),
  details TEXT,
  
  -- Resolution
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status) WHERE status = 'pending';

-- ============================================
-- 11. NOTIFICATIONS TABLE
-- For push notifications
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  type VARCHAR(30) NOT NULL CHECK (type IN (
    'callout_received', 'callout_response', 
    'like', 'comment', 'follow',
    'badge_earned', 'challenge_start', 'challenge_end',
    'leaderboard_overtaken', 'weekly_recap'
  )),
  
  title VARCHAR(100) NOT NULL,
  body TEXT NOT NULL,
  
  -- Related entities
  related_profile_id UUID REFERENCES profiles(id),
  related_submission_id UUID REFERENCES workout_submissions(id),
  related_callout_id UUID REFERENCES callouts(id),
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Push notification
  push_sent BOOLEAN DEFAULT FALSE,
  push_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_profile ON notifications(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(profile_id, is_read) WHERE is_read = false;

-- ============================================
-- 12. AUDIT LOG TABLE
-- Track important actions for anti-cheat
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(30),
  entity_id UUID,
  
  -- Details
  old_values JSONB,
  new_values JSONB,
  metadata JSONB, -- IP, device, etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_profile ON audit_log(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- Partition by month for performance (optional, for scale)
-- CREATE INDEX IF NOT EXISTS idx_audit_created_month ON audit_log(date_trunc('month', created_at));

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE callouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Public profiles viewable by all" ON profiles 
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = user_id);

-- WORKOUT SUBMISSIONS
CREATE POLICY "Submissions viewable by all" ON workout_submissions 
  FOR SELECT USING (is_deleted = false);

CREATE POLICY "Users can insert own submissions" ON workout_submissions 
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- WEEKLY CHALLENGES
CREATE POLICY "Challenges viewable by all" ON weekly_challenges 
  FOR SELECT USING (true);

-- CALLOUTS
CREATE POLICY "Callouts viewable by participants" ON callouts 
  FOR SELECT USING (
    NOT is_hidden AND (
      from_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      OR to_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can send callouts" ON callouts 
  FOR INSERT WITH CHECK (
    from_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Receiver can respond" ON callouts 
  FOR UPDATE USING (
    to_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- BADGES
CREATE POLICY "Badges viewable by all" ON badges 
  FOR SELECT USING (true);

CREATE POLICY "System can insert badges" ON badges 
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- LIKES
CREATE POLICY "Likes viewable by all" ON likes 
  FOR SELECT USING (true);

CREATE POLICY "Users can like" ON likes 
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can unlike" ON likes 
  FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- COMMENTS
CREATE POLICY "Comments viewable by all" ON comments 
  FOR SELECT USING (is_deleted = false AND is_hidden = false);

CREATE POLICY "Users can comment" ON comments 
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can edit own comments" ON comments 
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- FOLLOWS
CREATE POLICY "Follows viewable by all" ON follows 
  FOR SELECT USING (true);

CREATE POLICY "Users can follow" ON follows 
  FOR INSERT WITH CHECK (
    follower_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can unfollow" ON follows 
  FOR DELETE USING (
    follower_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- BLOCKS
CREATE POLICY "Users see own blocks" ON blocks 
  FOR SELECT USING (
    blocker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can block" ON blocks 
  FOR INSERT WITH CHECK (
    blocker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can unblock" ON blocks 
  FOR DELETE USING (
    blocker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- REPORTS
CREATE POLICY "Users can submit reports" ON reports 
  FOR INSERT WITH CHECK (
    reporter_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- NOTIFICATIONS
CREATE POLICY "Users see own notifications" ON notifications 
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can mark read" ON notifications 
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Anti-cheat: Validate workout time
CREATE OR REPLACE FUNCTION validate_workout_submission()
RETURNS TRIGGER AS $$
DECLARE
  min_time INTEGER;
  max_time INTEGER := 14400; -- 4 hours max
BEGIN
  -- Calculate minimum based on intensity and cards
  -- Standard: ~5 sec/card minimum = 260 sec for 52 cards
  -- But we'll be generous and say 8 minutes (480 sec)
  min_time := 480;
  
  IF NEW.intensity = 'hard-time' THEN
    min_time := 600; -- 10 minutes for hard time
  ELSIF NEW.intensity = 'lifer' THEN
    min_time := 720; -- 12 minutes for lifer
  END IF;
  
  -- Adjust for incomplete decks
  min_time := (min_time * NEW.cards_completed) / 52;
  
  IF NEW.time < min_time THEN
    NEW.is_flagged := TRUE;
    NEW.suspicious_flags := NEW.suspicious_flags || '["time_too_fast"]'::jsonb;
  END IF;
  
  IF NEW.time > max_time THEN
    NEW.is_flagged := TRUE;
    NEW.suspicious_flags := NEW.suspicious_flags || '["time_too_long"]'::jsonb;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_workout_submission
  BEFORE INSERT ON workout_submissions
  FOR EACH ROW EXECUTE FUNCTION validate_workout_submission();

-- Update like count on submissions
CREATE OR REPLACE FUNCTION update_submission_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE workout_submissions SET like_count = like_count + 1 WHERE id = NEW.submission_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE workout_submissions SET like_count = like_count - 1 WHERE id = OLD.submission_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_like_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_submission_like_count();

-- Update comment count on submissions
CREATE OR REPLACE FUNCTION update_submission_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE workout_submissions SET comment_count = comment_count + 1 WHERE id = NEW.submission_id;
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE) THEN
    UPDATE workout_submissions SET comment_count = comment_count - 1 WHERE id = COALESCE(NEW.submission_id, OLD.submission_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comment_count
  AFTER INSERT OR DELETE OR UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_submission_comment_count();

-- Update profile stats on workout submission
CREATE OR REPLACE FUNCTION update_profile_stats_on_submission()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET
    total_workouts = total_workouts + 1,
    total_pushups = total_pushups + NEW.total_pushups,
    total_squats = total_squats + NEW.total_squats,
    best_time = CASE 
      WHEN best_time IS NULL OR NEW.time < best_time THEN NEW.time 
      ELSE best_time 
    END,
    updated_at = NOW()
  WHERE id = NEW.profile_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_on_submission
  AFTER INSERT ON workout_submissions
  FOR EACH ROW EXECUTE FUNCTION update_profile_stats_on_submission();

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Global leaderboard (all time)
CREATE OR REPLACE VIEW leaderboard_all_time AS
SELECT 
  ws.id,
  ws.time,
  ws.exercise_type,
  ws.intensity,
  ws.is_verified,
  ws.created_at,
  p.id as profile_id,
  p.handle,
  p.display_name,
  p.photo_url,
  p.is_verified as profile_verified,
  ROW_NUMBER() OVER (ORDER BY ws.time ASC) as rank
FROM workout_submissions ws
JOIN profiles p ON ws.profile_id = p.id
WHERE ws.is_deleted = false 
  AND ws.is_flagged = false
  AND p.is_banned = false;

-- Weekly leaderboard
CREATE OR REPLACE VIEW leaderboard_weekly AS
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
JOIN profiles p ON ws.profile_id = p.id
WHERE ws.is_deleted = false 
  AND ws.is_flagged = false
  AND p.is_banned = false;

-- ============================================
-- SEED DATA: Badge Types
-- ============================================

-- Create a reference table for badge definitions
CREATE TABLE IF NOT EXISTS badge_definitions (
  type VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL,
  rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary'))
);

INSERT INTO badge_definitions (type, name, description, icon, rarity) VALUES
  ('first-blood', 'FIRST BLOOD', 'Complete your first Rec Yard workout', 'zap', 'common'),
  ('week-warrior', 'WEEK WARRIOR', 'Complete 7 workouts in a row', 'calendar', 'rare'),
  ('iron-will', 'IRON WILL', 'Complete 30 workouts', 'award', 'rare'),
  ('century-club', 'CENTURY CLUB', 'Complete 100 workouts', 'star', 'epic'),
  ('speed-demon', 'SPEED DEMON', 'Finish a deck in under 25 minutes', 'clock', 'epic'),
  ('top-10', 'TOP 10', 'Reach top 10 on weekly leaderboard', 'trending-up', 'epic'),
  ('podium', 'PODIUM', 'Finish top 3 in a weekly challenge', 'award', 'epic'),
  ('champion', 'CHAMPION', 'Win a weekly challenge', 'crown', 'legendary'),
  ('yard-legend', 'YARD LEGEND', 'Complete 365 workouts', 'sun', 'legendary'),
  ('verified', 'VERIFIED', 'Get video verified', 'check-circle', 'rare'),
  ('trash-talker', 'TRASH TALKER', 'Send 50 callouts', 'message-circle', 'common'),
  ('crowd-favorite', 'CROWD FAVORITE', 'Receive 100 likes', 'heart', 'rare'),
  ('hard-timer', 'HARD TIMER', 'Complete 10 HARD TIME workouts', 'activity', 'rare'),
  ('lifer', 'LIFER', 'Complete 10 LIFER workouts', 'shield', 'epic')
ON CONFLICT (type) DO NOTHING;

-- ============================================
-- DONE! 
-- ============================================
-- After running:
-- 1. Create Storage bucket: 'profile-photos' (public)
-- 2. Create Storage bucket: 'verification-videos' (private)
-- 3. Enable Apple Sign In in Auth providers
-- 
-- Tables created: 12
-- Views created: 2
-- Functions: 5
-- Triggers: 6
-- RLS Policies: 20+
-- ============================================
