import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = "https://swjxfgglhlkhwtwtxhas.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3anhmZ2dsaGxraHd0d3R4aGFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0NjIwMzgsImV4cCI6MjA2MzAzODAzOH0.CH-bJDqRZStPFbphpiC8-miPivWO_hxZQr6bV2daaSI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ============================================
// DATABASE TYPES
// ============================================

export interface DbProfile {
  id: string;
  user_id: string;
  handle: string;
  display_name: string;
  bio: string;
  photo_url: string | null;
  instagram: string;
  total_workouts: number;
  best_time: number | null;
  current_streak: number;
  longest_streak: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbWorkoutSubmission {
  id: string;
  profile_id: string;
  time: number;
  exercise_type: string;
  intensity: string;
  total_pushups: number;
  total_squats: number;
  is_verified: boolean;
  verification_video_url: string | null;
  week_id: string;
  created_at: string;
}

export interface DbCallout {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
  message: string;
  message_id: string | null;
  responded: boolean;
  response_message: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface DbBadge {
  id: string;
  profile_id: string;
  badge_type: string;
  earned_at: string;
}

// ============================================
// AUTH HELPERS
// ============================================

export async function signInWithApple(): Promise<{ error: Error | null }> {
  // Apple Sign In will be implemented with expo-apple-authentication
  // For now, return a placeholder
  return { error: new Error("Apple Sign In not yet implemented") };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

// ============================================
// PROFILE OPERATIONS
// ============================================

export async function getProfile(userId: string): Promise<DbProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("[Supabase] Failed to get profile:", error);
    return null;
  }

  return data;
}

export async function getProfileByHandle(
  handle: string,
): Promise<DbProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle.toUpperCase())
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function createProfile(
  userId: string,
  handle: string,
  displayName: string,
): Promise<DbProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      handle: handle.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
      display_name: displayName,
      bio: "",
      instagram: "",
      total_workouts: 0,
      best_time: null,
      current_streak: 0,
      longest_streak: 0,
      is_verified: false,
    })
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Failed to create profile:", error);
    return null;
  }

  return data;
}

export async function updateProfile(
  profileId: string,
  updates: Partial<DbProfile>,
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", profileId);

  if (error) {
    console.error("[Supabase] Failed to update profile:", error);
    return false;
  }

  return true;
}

export async function updateProfilePhoto(
  profileId: string,
  photoUri: string,
): Promise<string | null> {
  // Upload to Supabase Storage
  const fileName = `${profileId}_${Date.now()}.jpg`;
  const response = await fetch(photoUri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(fileName, blob, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    console.error("[Supabase] Failed to upload photo:", uploadError);
    return null;
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("profile-photos").getPublicUrl(fileName);

  // Update profile
  await updateProfile(profileId, { photo_url: publicUrl });

  return publicUrl;
}

// ============================================
// LEADERBOARD OPERATIONS
// ============================================

export async function getLeaderboard(
  weekId?: string,
  limit: number = 50,
): Promise<
  Array<DbWorkoutSubmission & { profile: Pick<DbProfile, "handle" | "photo_url" | "is_verified"> }>
> {
  let query = supabase
    .from("workout_submissions")
    .select(
      `
      *,
      profile:profiles!profile_id (handle, photo_url, is_verified)
    `,
    )
    .order("time", { ascending: true })
    .limit(limit);

  if (weekId) {
    query = query.eq("week_id", weekId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Supabase] Failed to get leaderboard:", error);
    return [];
  }

  return data || [];
}

export async function submitWorkout(
  profileId: string,
  time: number,
  exerciseType: string,
  intensity: string,
  totalPushups: number,
  totalSquats: number,
  weekId: string,
  verificationVideoUrl?: string,
): Promise<DbWorkoutSubmission | null> {
  // Anti-cheat: Basic validation
  const MIN_POSSIBLE_TIME = 480; // 8 minutes minimum for 52 cards
  if (time < MIN_POSSIBLE_TIME) {
    console.error("[Supabase] Workout time too fast, possible cheat");
    return null;
  }

  const { data, error } = await supabase
    .from("workout_submissions")
    .insert({
      profile_id: profileId,
      time,
      exercise_type: exerciseType,
      intensity,
      total_pushups: totalPushups,
      total_squats: totalSquats,
      week_id: weekId,
      is_verified: !!verificationVideoUrl,
      verification_video_url: verificationVideoUrl || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Failed to submit workout:", error);
    return null;
  }

  // Update profile stats
  const profile = await getProfile(
    (await supabase.auth.getUser()).data.user?.id || "",
  );
  if (profile) {
    const newBestTime =
      profile.best_time === null || time < profile.best_time
        ? time
        : profile.best_time;

    await updateProfile(profileId, {
      total_workouts: profile.total_workouts + 1,
      best_time: newBestTime,
    });
  }

  return data;
}

// ============================================
// CALLOUT OPERATIONS
// ============================================

export async function sendCallout(
  fromProfileId: string,
  toProfileId: string,
  message: string,
  messageId?: string,
): Promise<DbCallout | null> {
  const { data, error } = await supabase
    .from("callouts")
    .insert({
      from_profile_id: fromProfileId,
      to_profile_id: toProfileId,
      message,
      message_id: messageId || null,
      responded: false,
    })
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Failed to send callout:", error);
    return null;
  }

  return data;
}

export async function getMyCallouts(profileId: string): Promise<{
  sent: Array<DbCallout & { to_profile: Pick<DbProfile, "handle" | "photo_url"> }>;
  received: Array<DbCallout & { from_profile: Pick<DbProfile, "handle" | "photo_url"> }>;
}> {
  const [sentResult, receivedResult] = await Promise.all([
    supabase
      .from("callouts")
      .select(
        `
        *,
        to_profile:profiles!to_profile_id (handle, photo_url)
      `,
      )
      .eq("from_profile_id", profileId)
      .order("created_at", { ascending: false }),

    supabase
      .from("callouts")
      .select(
        `
        *,
        from_profile:profiles!from_profile_id (handle, photo_url)
      `,
      )
      .eq("to_profile_id", profileId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    sent: sentResult.data || [],
    received: receivedResult.data || [],
  };
}

export async function respondToCallout(
  calloutId: string,
  responseMessage: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("callouts")
    .update({
      responded: true,
      response_message: responseMessage,
      responded_at: new Date().toISOString(),
    })
    .eq("id", calloutId);

  if (error) {
    console.error("[Supabase] Failed to respond to callout:", error);
    return false;
  }

  return true;
}

// ============================================
// BADGE OPERATIONS
// ============================================

export async function awardBadge(
  profileId: string,
  badgeType: string,
): Promise<boolean> {
  // Check if already has badge
  const { data: existing } = await supabase
    .from("badges")
    .select("id")
    .eq("profile_id", profileId)
    .eq("badge_type", badgeType)
    .single();

  if (existing) {
    return false; // Already has badge
  }

  const { error } = await supabase.from("badges").insert({
    profile_id: profileId,
    badge_type: badgeType,
  });

  if (error) {
    console.error("[Supabase] Failed to award badge:", error);
    return false;
  }

  return true;
}

export async function getProfileBadges(profileId: string): Promise<DbBadge[]> {
  const { data, error } = await supabase
    .from("badges")
    .select("*")
    .eq("profile_id", profileId)
    .order("earned_at", { ascending: false });

  if (error) {
    console.error("[Supabase] Failed to get badges:", error);
    return [];
  }

  return data || [];
}

// ============================================
// UTILITY
// ============================================

export function getCurrentWeekId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
  );
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, "0")}`;
}

