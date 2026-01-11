import { useState, useCallback, useEffect } from "react";
import {
  supabase,
  ensureAuthenticated,
  DbProfile,
  getCurrentWeekId,
} from "@/lib/supabase";
import { checkRecYardAccess } from "@/lib/purchases";
import {
  TRASH_TALK_PRESETS,
  TrashTalkMessage,
  TauntCategory,
} from "@/lib/recyard";

// ============================================
// TYPES
// ============================================

export interface LeaderboardEntry {
  id: string;
  rank: number;
  profileId: string;
  handle: string;
  displayName: string;
  photoUrl: string | null;
  time: number;
  isVerified: boolean;
  submittedAt: string;
  exerciseType: string;
  intensity: string;
}

export interface Badge {
  id: string;
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  earnedAt: string;
}

export interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  youtube?: string;
  discord?: string;
  threads?: string;
}

export interface RecYardProfile {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  photoUrl: string | null;
  socialLinks: SocialLinks;
  totalWorkouts: number;
  bestTime: number | null;
  currentStreak: number;
  longestStreak: number;
  isVerified: boolean;
  badges: Badge[];
}

export interface WeeklyChallenge {
  id: string;
  weekId: string;
  title: string;
  exerciseType: string;
  intensity: string;
  startsAt: string;
  endsAt: string;
  participantCount: number;
  topTime: number | null;
}

export interface Callout {
  id: string;
  fromProfileId: string;
  fromHandle: string;
  fromPhotoUrl: string | null;
  toProfileId: string;
  toHandle: string;
  toPhotoUrl: string | null;
  message: string;
  responded: boolean;
  responseMessage: string | null;
  createdAt: string;
}

// ============================================
// HOOK
// ============================================

export function useRecYard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<RecYardProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [weeklyChallenge, setWeeklyChallenge] =
    useState<WeeklyChallenge | null>(null);
  const [sentCallouts, setSentCallouts] = useState<Callout[]>([]);
  const [receivedCallouts, setReceivedCallouts] = useState<Callout[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // INITIALIZATION
  // ============================================

  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check subscription
      const status = await checkRecYardAccess();
      setIsSubscribed(status.isSubscribed);

      // Ensure we have an authenticated session
      const authUserId = await ensureAuthenticated();
      setUserId(authUserId);

      if (!authUserId) {
        setError("Failed to authenticate");
        setIsLoading(false);
        return;
      }

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", authUserId)
        .single();

      if (profileData) {
        // Load badges for this profile
        const { data: badgesData } = await supabase
          .from("badges")
          .select("*")
          .eq("profile_id", profileData.id)
          .order("created_at", { ascending: false });

        const badges: Badge[] = (badgesData || []).map((b) => ({
          id: b.id,
          badgeId: b.badge_id,
          name: b.name,
          description: b.description || "",
          icon: b.icon || "award",
          rarity: b.rarity as Badge["rarity"],
          earnedAt: b.created_at,
        }));

        setProfile(mapDbProfileToProfile(profileData, badges));
      }

      // Load leaderboard
      await loadLeaderboard();

      // Load weekly challenge
      await loadWeeklyChallenge();

      // Load callouts if we have a profile
      if (profileData) {
        await loadCallouts(profileData.id);
      }
    } catch (err) {
      console.error("[useRecYard] Initialize error:", err);
      setError("Failed to load Rec Yard");
    }

    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // ============================================
  // PROFILE OPERATIONS
  // ============================================

  const createProfile = useCallback(
    async (handle: string, displayName: string): Promise<boolean> => {
      if (!userId) {
        console.error("[useRecYard] No userId available for profile creation");
        return false;
      }

      const cleanHandle = handle.toUpperCase().replace(/[^A-Z0-9_]/g, "");
      console.log("[useRecYard] Creating profile for userId:", userId, "handle:", cleanHandle);

      try {
        // First check if a profile already exists for this user (use maybeSingle to avoid error)
        const { data: existingProfile, error: existingError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (existingError) {
          console.error("[useRecYard] Error checking existing profile:", existingError);
        }

        if (existingProfile) {
          // Profile already exists for this user - just load it
          console.log("[useRecYard] Profile already exists for user, loading it:", existingProfile);
          setProfile(mapDbProfileToProfile(existingProfile));
          return true;
        }

        // Check if the handle is already taken by someone else (use maybeSingle)
        const { data: handleCheck, error: handleError } = await supabase
          .from("profiles")
          .select("id")
          .eq("handle", cleanHandle)
          .maybeSingle();

        if (handleError) {
          console.error("[useRecYard] Error checking handle:", handleError);
        }

        if (handleCheck) {
          console.error("[useRecYard] Handle already taken by another user:", cleanHandle);
          return false;
        }

        // Create new profile
        console.log("[useRecYard] Inserting new profile...");
        const { data, error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: userId,
            handle: cleanHandle,
            display_name: displayName || handle,
          })
          .select()
          .single();

        if (insertError) {
          console.error("[useRecYard] Create profile error:", insertError);
          return false;
        }

        console.log("[useRecYard] Profile created successfully:", data);
        setProfile(mapDbProfileToProfile(data));
        return true;
      } catch (err) {
        console.error("[useRecYard] Create profile exception:", err);
        return false;
      }
    },
    [userId],
  );

  const updateProfile = useCallback(
    async (updates: Partial<RecYardProfile>): Promise<boolean> => {
      if (!profile) return false;

      try {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.handle !== undefined)
          dbUpdates.handle = updates.handle
            .toUpperCase()
            .replace(/[^A-Z0-9_]/g, "");
        if (updates.displayName !== undefined)
          dbUpdates.display_name = updates.displayName;
        if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
        if (updates.photoUrl !== undefined)
          dbUpdates.photo_url = updates.photoUrl;

        // Handle social links - flatten to database columns
        if (updates.socialLinks !== undefined) {
          if (updates.socialLinks.instagram !== undefined)
            dbUpdates.instagram = updates.socialLinks.instagram || "";
          if (updates.socialLinks.tiktok !== undefined)
            dbUpdates.tiktok = updates.socialLinks.tiktok || "";
          if (updates.socialLinks.twitter !== undefined)
            dbUpdates.twitter = updates.socialLinks.twitter || "";
          if (updates.socialLinks.youtube !== undefined)
            dbUpdates.youtube = updates.socialLinks.youtube || "";
          if (updates.socialLinks.discord !== undefined)
            dbUpdates.discord = updates.socialLinks.discord || "";
          if (updates.socialLinks.threads !== undefined)
            dbUpdates.threads = updates.socialLinks.threads || "";
        }

        const { error: updateError } = await supabase
          .from("profiles")
          .update(dbUpdates)
          .eq("id", profile.id);

        if (updateError) {
          console.error("[useRecYard] Update profile error:", updateError);
          return false;
        }

        // Update local state with merged social links
        const updatedProfile = { ...profile, ...updates };
        if (updates.socialLinks) {
          updatedProfile.socialLinks = {
            ...profile.socialLinks,
            ...updates.socialLinks,
          };
        }
        setProfile(updatedProfile);
        return true;
      } catch (err) {
        console.error("[useRecYard] Update profile error:", err);
        return false;
      }
    },
    [profile],
  );

  // ============================================
  // LEADERBOARD
  // ============================================

  const loadLeaderboard = useCallback(async (weekId?: string) => {
    try {
      let query = supabase
        .from("workout_submissions")
        .select(
          `
          id,
          time,
          exercise_type,
          intensity,
          is_verified,
          created_at,
          profile:profiles!profile_id (
            id,
            handle,
            display_name,
            photo_url,
            is_verified
          )
        `,
        )
        .eq("is_deleted", false)
        .eq("is_flagged", false)
        .order("time", { ascending: true })
        .limit(50);

      if (weekId) {
        query = query.eq("week_id", weekId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error("[useRecYard] Load leaderboard error:", fetchError);
        return;
      }

      const entries: LeaderboardEntry[] = (data || []).map((item, index) => ({
        id: item.id,
        rank: index + 1,
        profileId: (item.profile as any)?.id || "",
        handle: (item.profile as any)?.handle || "UNKNOWN",
        displayName:
          (item.profile as any)?.display_name ||
          (item.profile as any)?.handle ||
          "Unknown",
        photoUrl: (item.profile as any)?.photo_url || null,
        time: item.time,
        isVerified: item.is_verified,
        submittedAt: item.created_at,
        exerciseType: item.exercise_type,
        intensity: item.intensity,
      }));

      setLeaderboard(entries);
    } catch (err) {
      console.error("[useRecYard] Load leaderboard error:", err);
    }
  }, []);

  // ============================================
  // WEEKLY CHALLENGE
  // ============================================

  const loadWeeklyChallenge = useCallback(async () => {
    const weekId = getCurrentWeekId();

    try {
      const { data } = await supabase
        .from("weekly_challenges")
        .select("*")
        .eq("week_id", weekId)
        .single();

      if (data) {
        setWeeklyChallenge({
          id: data.id,
          weekId: data.week_id,
          title: data.title,
          exerciseType: data.exercise_type,
          intensity: data.intensity,
          startsAt: data.starts_at,
          endsAt: data.ends_at,
          participantCount: data.participant_count,
          topTime: data.top_time,
        });
      } else {
        // Create default challenge if none exists
        setWeeklyChallenge({
          id: "",
          weekId,
          title: "WEEKLY CHALLENGE",
          exerciseType: "superset",
          intensity: "standard",
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          participantCount: 0,
          topTime: null,
        });
      }
    } catch (err) {
      console.error("[useRecYard] Load challenge error:", err);
    }
  }, []);

  const getDaysUntilChallengeEnd = useCallback(() => {
    if (!weeklyChallenge) return 0;
    const endDate = new Date(weeklyChallenge.endsAt);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [weeklyChallenge]);

  // ============================================
  // CALLOUTS (TRASH TALK)
  // ============================================

  const loadCallouts = useCallback(
    async (profileId: string) => {
      try {
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
            .eq("is_deleted", false)
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
            .eq("is_deleted", false)
            .order("created_at", { ascending: false }),
        ]);

        const mapSentCallout = (item: any): Callout => ({
          id: item.id,
          fromProfileId: item.from_profile_id,
          fromHandle: profile?.handle || "",
          fromPhotoUrl: profile?.photoUrl || null,
          toProfileId: item.to_profile_id,
          toHandle: item.to_profile?.handle || "UNKNOWN",
          toPhotoUrl: item.to_profile?.photo_url || null,
          message: item.message,
          responded: item.responded,
          responseMessage: item.response_message,
          createdAt: item.created_at,
        });

        const mapReceivedCallout = (item: any): Callout => ({
          id: item.id,
          fromProfileId: item.from_profile_id,
          fromHandle: item.from_profile?.handle || "UNKNOWN",
          fromPhotoUrl: item.from_profile?.photo_url || null,
          toProfileId: item.to_profile_id,
          toHandle: profile?.handle || "",
          toPhotoUrl: profile?.photoUrl || null,
          message: item.message,
          responded: item.responded,
          responseMessage: item.response_message,
          createdAt: item.created_at,
        });

        setSentCallouts((sentResult.data || []).map(mapSentCallout));
        setReceivedCallouts(
          (receivedResult.data || []).map(mapReceivedCallout),
        );
      } catch (err) {
        console.error("[useRecYard] Load callouts error:", err);
      }
    },
    [profile],
  );

  const sendCallout = useCallback(
    async (
      toProfileId: string,
      toHandle: string,
      message: string,
      messageId?: string,
    ): Promise<boolean> => {
      if (!profile) return false;

      try {
        const { data, error: insertError } = await supabase
          .from("callouts")
          .insert({
            from_profile_id: profile.id,
            to_profile_id: toProfileId,
            message,
            message_id: messageId || null,
          })
          .select()
          .single();

        if (insertError) {
          console.error("[useRecYard] Send callout error:", insertError);
          return false;
        }

        const newCallout: Callout = {
          id: data.id,
          fromProfileId: profile.id,
          fromHandle: profile.handle,
          fromPhotoUrl: profile.photoUrl,
          toProfileId,
          toHandle,
          toPhotoUrl: null,
          message,
          responded: false,
          responseMessage: null,
          createdAt: data.created_at,
        };

        setSentCallouts((prev) => [newCallout, ...prev]);
        return true;
      } catch (err) {
        console.error("[useRecYard] Send callout error:", err);
        return false;
      }
    },
    [profile],
  );

  const respondToCallout = useCallback(
    async (calloutId: string, responseMessage: string): Promise<boolean> => {
      try {
        const { error: updateError } = await supabase
          .from("callouts")
          .update({
            responded: true,
            response_message: responseMessage,
            responded_at: new Date().toISOString(),
          })
          .eq("id", calloutId);

        if (updateError) {
          console.error("[useRecYard] Respond to callout error:", updateError);
          return false;
        }

        setReceivedCallouts((prev) =>
          prev.map((c) =>
            c.id === calloutId ? { ...c, responded: true, responseMessage } : c,
          ),
        );

        return true;
      } catch (err) {
        console.error("[useRecYard] Respond to callout error:", err);
        return false;
      }
    },
    [],
  );

  // ============================================
  // TRASH TALK PRESETS
  // ============================================

  const getTrashTalkByCategory = useCallback(
    (category: TauntCategory): TrashTalkMessage[] => {
      return TRASH_TALK_PRESETS.filter((m) => m.category === category);
    },
    [],
  );

  // ============================================
  // REFRESH
  // ============================================

  const refresh = useCallback(async () => {
    await loadLeaderboard();
    await loadWeeklyChallenge();
    if (profile) {
      await loadCallouts(profile.id);
    }
  }, [loadLeaderboard, loadWeeklyChallenge, loadCallouts, profile]);

  // ============================================
  // HELPERS
  // ============================================

  function mapDbProfileToProfile(
    dbProfile: DbProfile,
    badges: Badge[] = [],
  ): RecYardProfile {
    return {
      id: dbProfile.id,
      handle: dbProfile.handle,
      displayName: dbProfile.display_name || dbProfile.handle,
      bio: dbProfile.bio || "",
      photoUrl: dbProfile.photo_url,
      socialLinks: {
        instagram: dbProfile.instagram || undefined,
        tiktok: dbProfile.tiktok || undefined,
        twitter: dbProfile.twitter || undefined,
        youtube: dbProfile.youtube || undefined,
        discord: dbProfile.discord || undefined,
        threads: dbProfile.threads || undefined,
      },
      totalWorkouts: dbProfile.total_workouts,
      bestTime: dbProfile.best_time,
      currentStreak: dbProfile.current_streak,
      longestStreak: dbProfile.longest_streak,
      isVerified: dbProfile.is_verified,
      badges,
    };
  }

  return {
    // State
    isLoading,
    isSubscribed,
    setIsSubscribed,
    profile,
    leaderboard,
    weeklyChallenge,
    sentCallouts,
    receivedCallouts,
    error,

    // Actions
    initialize,
    refresh,
    createProfile,
    updateProfile,
    sendCallout,
    respondToCallout,
    getTrashTalkByCategory,
    getDaysUntilChallengeEnd,
  };
}

// ============================================
// UTILITY
// ============================================

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}
