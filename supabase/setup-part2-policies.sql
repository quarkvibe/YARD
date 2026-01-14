-- PART 2: ENABLE RLS AND CREATE POLICIES
-- Run this after Part 1 succeeds

-- GRANT permissions to anon and authenticated roles
GRANT ALL ON TABLE profiles TO anon;
GRANT ALL ON TABLE profiles TO authenticated;
GRANT ALL ON TABLE workout_submissions TO anon;
GRANT ALL ON TABLE workout_submissions TO authenticated;
GRANT ALL ON TABLE callouts TO anon;
GRANT ALL ON TABLE callouts TO authenticated;
GRANT ALL ON TABLE weekly_challenges TO anon;
GRANT ALL ON TABLE weekly_challenges TO authenticated;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE callouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_challenges ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- WORKOUT SUBMISSIONS POLICIES
CREATE POLICY "submissions_select" ON workout_submissions FOR SELECT USING (true);
CREATE POLICY "submissions_insert" ON workout_submissions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = workout_submissions.profile_id AND profiles.user_id = auth.uid())
);

-- CALLOUTS POLICIES
CREATE POLICY "callouts_select" ON callouts FOR SELECT USING (true);
CREATE POLICY "callouts_insert" ON callouts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = callouts.from_profile_id AND profiles.user_id = auth.uid())
);
CREATE POLICY "callouts_update" ON callouts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = callouts.to_profile_id AND profiles.user_id = auth.uid())
);

-- WEEKLY CHALLENGES POLICIES
CREATE POLICY "challenges_select" ON weekly_challenges FOR SELECT USING (true);
