-- PART 1: CREATE TABLES
-- Run this first in Supabase SQL Editor

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
  flip_mode TEXT NOT NULL DEFAULT 'freshfish',
  total_pushups INTEGER NOT NULL DEFAULT 0,
  total_squats INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_video_url TEXT,
  week_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add flip_mode column if table already exists
ALTER TABLE workout_submissions ADD COLUMN IF NOT EXISTS flip_mode TEXT NOT NULL DEFAULT 'freshfish';

-- Callouts table
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
