import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

const STORAGE_KEYS = {
  REC_YARD_PROFILE: "@yard/recyard_profile",
  REC_YARD_SUBMISSIONS: "@yard/recyard_submissions",
  REC_YARD_LIKED_WORKOUTS: "@yard/recyard_likes",
  REC_YARD_COMMENTS: "@yard/recyard_comments",
  REC_YARD_CALLOUTS: "@yard/recyard_callouts",
  REC_YARD_TAUNTS: "@yard/recyard_taunts",
} as const;

// ============================================
// TYPES
// ============================================

export interface RecYardProfile {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  photoUri: string | null;
  instagram: string;
  facebook: string;
  twitter: string;
  joinDate: string;
  totalWorkouts: number;
  bestTime: number | null;
  currentStreak: number;
  longestStreak: number;
  badges: Badge[];
  isVerified: boolean;
  verificationStatus: "none" | "pending" | "verified" | "rejected";
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedDate: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface LeaderboardEntry {
  rank: number;
  profileId: string;
  handle: string;
  displayName: string;
  photoUri: string | null;
  time: number;
  isVerified: boolean;
  submittedAt: string;
  exerciseType: string;
  intensity: string;
}

export interface WorkoutSubmission {
  id: string;
  profileId: string;
  time: number;
  exerciseType: string;
  intensity: string;
  totalPushups: number;
  totalSquats: number;
  submittedAt: string;
  isVerified: boolean;
  verificationVideoUri: string | null;
  weekId: string;
  likes: number;
  comments: number;
}

export interface Comment {
  id: string;
  submissionId: string;
  profileId: string;
  handle: string;
  photoUri: string | null;
  text: string;
  createdAt: string;
  likes: number;
}

export interface WeeklyChallenge {
  id: string;
  weekNumber: number;
  year: number;
  exerciseType: string;
  intensity: string;
  startDate: string;
  endDate: string;
  participantCount: number;
  topTime: number | null;
}

// ============================================
// TRASH TALK TYPES
// ============================================

export type TauntCategory = "respect" | "challenge" | "taunt" | "flex" | "burn";

export interface TrashTalkMessage {
  id: string;
  text: string;
  category: TauntCategory;
  icon: string;
  heat: 1 | 2 | 3; // 1=mild, 2=spicy, 3=fire
}

export interface Callout {
  id: string;
  fromProfileId: string;
  fromHandle: string;
  fromPhotoUri: string | null;
  toProfileId: string;
  toHandle: string;
  toPhotoUri: string | null;
  message: string;
  messageId: string | null; // Reference to TrashTalkMessage if preset
  createdAt: string;
  responded: boolean;
  responseMessage: string | null;
  respondedAt: string | null;
}

export interface Taunt {
  id: string;
  submissionId: string;
  fromProfileId: string;
  fromHandle: string;
  fromPhotoUri: string | null;
  messageId: string;
  message: string;
  createdAt: string;
}

// PRESET TRASH TALK MESSAGES
export const TRASH_TALK_PRESETS: TrashTalkMessage[] = [
  // RESPECT (mild)
  {
    id: "respect-1",
    text: "SOLID WORK. NOW BEAT THAT.",
    category: "respect",
    icon: "thumbs-up",
    heat: 1,
  },
  {
    id: "respect-2",
    text: "OKAY I SEE YOU.",
    category: "respect",
    icon: "eye",
    heat: 1,
  },
  {
    id: "respect-3",
    text: "NOT BAD. FOR A WARMUP.",
    category: "respect",
    icon: "coffee",
    heat: 1,
  },

  // CHALLENGE (spicy)
  {
    id: "challenge-1",
    text: "THAT ALL YOU GOT?",
    category: "challenge",
    icon: "target",
    heat: 2,
  },
  {
    id: "challenge-2",
    text: "STEP UP OR STEP ASIDE.",
    category: "challenge",
    icon: "arrow-up",
    heat: 2,
  },
  {
    id: "challenge-3",
    text: "MY GRANDMA MOVES FASTER.",
    category: "challenge",
    icon: "clock",
    heat: 2,
  },
  {
    id: "challenge-4",
    text: "I'LL BE WAITING AT THE TOP.",
    category: "challenge",
    icon: "award",
    heat: 2,
  },
  {
    id: "challenge-5",
    text: "REMATCH. NOW.",
    category: "challenge",
    icon: "repeat",
    heat: 2,
  },

  // TAUNT (spicy)
  {
    id: "taunt-1",
    text: "NICE CARDIO. THIS AIN'T CARDIO.",
    category: "taunt",
    icon: "activity",
    heat: 2,
  },
  {
    id: "taunt-2",
    text: "CALL THAT A DECK?",
    category: "taunt",
    icon: "help-circle",
    heat: 2,
  },
  {
    id: "taunt-3",
    text: "SAVING YOUR ENERGY FOR NEXT TIME?",
    category: "taunt",
    icon: "battery-charging",
    heat: 2,
  },
  {
    id: "taunt-4",
    text: "DID YOU EVEN BREAK A SWEAT?",
    category: "taunt",
    icon: "droplet",
    heat: 2,
  },

  // FLEX (fire)
  {
    id: "flex-1",
    text: "DIFFERENT BREED.",
    category: "flex",
    icon: "zap",
    heat: 3,
  },
  {
    id: "flex-2",
    text: "BUILT DIFFERENT.",
    category: "flex",
    icon: "shield",
    heat: 3,
  },
  {
    id: "flex-3",
    text: "RENT FREE IN YOUR HEAD.",
    category: "flex",
    icon: "home",
    heat: 3,
  },
  {
    id: "flex-4",
    text: "YOU'RE LOOKING AT THE KING.",
    category: "flex",
    icon: "star",
    heat: 3,
  },

  // BURN (fire)
  {
    id: "burn-1",
    text: "THAT'S CUTE.",
    category: "burn",
    icon: "smile",
    heat: 3,
  },
  {
    id: "burn-2",
    text: "BACK TO THE BUNK.",
    category: "burn",
    icon: "log-out",
    heat: 3,
  },
  {
    id: "burn-3",
    text: "NOT EVEN CLOSE.",
    category: "burn",
    icon: "x-circle",
    heat: 3,
  },
  {
    id: "burn-4",
    text: "SOFT.",
    category: "burn",
    icon: "cloud",
    heat: 3,
  },
  {
    id: "burn-5",
    text: "YOU DON'T WANT THIS SMOKE.",
    category: "burn",
    icon: "wind",
    heat: 3,
  },
];

// Quick reactions for feed
export const QUICK_REACTIONS = [
  { id: "fire", emoji: "🔥", label: "FIRE" },
  { id: "respect", emoji: "💪", label: "RESPECT" },
  { id: "skull", emoji: "💀", label: "DEAD" },
  { id: "eyes", emoji: "👀", label: "WATCHING" },
  { id: "clown", emoji: "🤡", label: "CLOWN" },
  { id: "cap", emoji: "🧢", label: "CAP" },
  { id: "goat", emoji: "🐐", label: "GOAT" },
  { id: "laugh", emoji: "😤", label: "WEAK" },
];

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_PROFILE: RecYardProfile = {
  id: "",
  handle: "",
  displayName: "",
  bio: "",
  photoUri: null,
  instagram: "",
  facebook: "",
  twitter: "",
  joinDate: "",
  totalWorkouts: 0,
  bestTime: null,
  currentStreak: 0,
  longestStreak: 0,
  badges: [],
  isVerified: false,
  verificationStatus: "none",
};

// ============================================
// PROFILE MANAGEMENT
// ============================================

export async function getRecYardProfile(): Promise<RecYardProfile | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.REC_YARD_PROFILE);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error("[RecYard] Failed to get profile:", error);
    return null;
  }
}

export async function saveRecYardProfile(
  profile: RecYardProfile,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.REC_YARD_PROFILE,
      JSON.stringify(profile),
    );
  } catch (error) {
    console.error("[RecYard] Failed to save profile:", error);
  }
}

export async function createRecYardProfile(
  handle: string,
  displayName: string,
): Promise<RecYardProfile> {
  const profile: RecYardProfile = {
    ...DEFAULT_PROFILE,
    id: generateProfileId(),
    handle: handle.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
    displayName,
    joinDate: new Date().toISOString(),
  };

  await saveRecYardProfile(profile);
  return profile;
}

export async function updateProfilePhoto(uri: string): Promise<void> {
  const profile = await getRecYardProfile();
  if (profile) {
    profile.photoUri = uri;
    await saveRecYardProfile(profile);
  }
}

export async function updateProfileField(
  field: keyof RecYardProfile,
  value: any,
): Promise<void> {
  const profile = await getRecYardProfile();
  if (profile) {
    (profile as any)[field] = value;
    await saveRecYardProfile(profile);
  }
}

// ============================================
// PHOTO PICKER
// ============================================

export async function pickProfilePhoto(): Promise<string | null> {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      console.log("[RecYard] Photo library permission denied");
      return null;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }

    return null;
  } catch (error) {
    console.error("[RecYard] Failed to pick photo:", error);
    return null;
  }
}

export async function takeProfilePhoto(): Promise<string | null> {
  try {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      console.log("[RecYard] Camera permission denied");
      return null;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }

    return null;
  } catch (error) {
    console.error("[RecYard] Failed to take photo:", error);
    return null;
  }
}

// ============================================
// WORKOUT SUBMISSIONS
// ============================================

export async function submitWorkoutToRecYard(
  time: number,
  exerciseType: string,
  intensity: string,
  totalPushups: number,
  totalSquats: number,
  verificationVideoUri: string | null = null,
): Promise<WorkoutSubmission | null> {
  try {
    const profile = await getRecYardProfile();
    if (!profile || !profile.id) {
      console.error("[RecYard] No profile found");
      return null;
    }

    const weekId = getCurrentWeekId();

    const submission: WorkoutSubmission = {
      id: generateSubmissionId(),
      profileId: profile.id,
      time,
      exerciseType,
      intensity,
      totalPushups,
      totalSquats,
      submittedAt: new Date().toISOString(),
      isVerified: verificationVideoUri !== null,
      verificationVideoUri,
      weekId,
      likes: 0,
      comments: 0,
    };

    // Save to local submissions
    const submissions = await getSubmissions();
    submissions.unshift(submission);
    await AsyncStorage.setItem(
      STORAGE_KEYS.REC_YARD_SUBMISSIONS,
      JSON.stringify(submissions),
    );

    // Update profile stats
    profile.totalWorkouts += 1;
    if (profile.bestTime === null || time < profile.bestTime) {
      profile.bestTime = time;
    }
    await saveRecYardProfile(profile);

    return submission;
  } catch (error) {
    console.error("[RecYard] Failed to submit workout:", error);
    return null;
  }
}

export async function getSubmissions(): Promise<WorkoutSubmission[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.REC_YARD_SUBMISSIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("[RecYard] Failed to get submissions:", error);
    return [];
  }
}

export async function getMySubmissions(): Promise<WorkoutSubmission[]> {
  const profile = await getRecYardProfile();
  if (!profile) return [];

  const submissions = await getSubmissions();
  return submissions.filter((s) => s.profileId === profile.id);
}

// ============================================
// LEADERBOARD (Mock Data for MVP)
// ============================================

export function getMockLeaderboard(): LeaderboardEntry[] {
  return [
    {
      rank: 1,
      profileId: "iron1",
      handle: "IRONWILL",
      displayName: "Iron Will",
      photoUri: null,
      time: 1245,
      isVerified: true,
      submittedAt: new Date().toISOString(),
      exerciseType: "superset",
      intensity: "standard",
    },
    {
      rank: 2,
      profileId: "yard2",
      handle: "YARDDOG",
      displayName: "Yard Dog",
      photoUri: null,
      time: 1302,
      isVerified: true,
      submittedAt: new Date().toISOString(),
      exerciseType: "superset",
      intensity: "standard",
    },
    {
      rank: 3,
      profileId: "steel3",
      handle: "STEELCAGE",
      displayName: "Steel Cage",
      photoUri: null,
      time: 1378,
      isVerified: true,
      submittedAt: new Date().toISOString(),
      exerciseType: "superset",
      intensity: "standard",
    },
    {
      rank: 4,
      profileId: "lock4",
      handle: "LOCKDOWN",
      displayName: "Lock Down",
      photoUri: null,
      time: 1412,
      isVerified: false,
      submittedAt: new Date().toISOString(),
      exerciseType: "superset",
      intensity: "standard",
    },
    {
      rank: 5,
      profileId: "chain5",
      handle: "CHAINGANG",
      displayName: "Chain Gang",
      photoUri: null,
      time: 1456,
      isVerified: true,
      submittedAt: new Date().toISOString(),
      exerciseType: "superset",
      intensity: "standard",
    },
    {
      rank: 6,
      profileId: "hard6",
      handle: "HARDTIME",
      displayName: "Hard Time",
      photoUri: null,
      time: 1502,
      isVerified: false,
      submittedAt: new Date().toISOString(),
      exerciseType: "superset",
      intensity: "standard",
    },
    {
      rank: 7,
      profileId: "cell7",
      handle: "CELLBLOCK",
      displayName: "Cell Block",
      photoUri: null,
      time: 1534,
      isVerified: true,
      submittedAt: new Date().toISOString(),
      exerciseType: "superset",
      intensity: "standard",
    },
    {
      rank: 8,
      profileId: "grit8",
      handle: "GRIT",
      displayName: "Grit",
      photoUri: null,
      time: 1578,
      isVerified: true,
      submittedAt: new Date().toISOString(),
      exerciseType: "superset",
      intensity: "standard",
    },
    {
      rank: 9,
      profileId: "disc9",
      handle: "DISCIPLINE",
      displayName: "Discipline",
      photoUri: null,
      time: 1612,
      isVerified: false,
      submittedAt: new Date().toISOString(),
      exerciseType: "superset",
      intensity: "standard",
    },
    {
      rank: 10,
      profileId: "grind10",
      handle: "GRINDSTONE",
      displayName: "Grind Stone",
      photoUri: null,
      time: 1645,
      isVerified: true,
      submittedAt: new Date().toISOString(),
      exerciseType: "superset",
      intensity: "standard",
    },
  ];
}

// ============================================
// SOCIAL FEATURES
// ============================================

export async function likeWorkout(submissionId: string): Promise<boolean> {
  try {
    const likedWorkouts = await getLikedWorkouts();
    if (likedWorkouts.includes(submissionId)) {
      // Already liked, unlike it
      const updated = likedWorkouts.filter((id) => id !== submissionId);
      await AsyncStorage.setItem(
        STORAGE_KEYS.REC_YARD_LIKED_WORKOUTS,
        JSON.stringify(updated),
      );
      return false;
    } else {
      // Like it
      likedWorkouts.push(submissionId);
      await AsyncStorage.setItem(
        STORAGE_KEYS.REC_YARD_LIKED_WORKOUTS,
        JSON.stringify(likedWorkouts),
      );
      return true;
    }
  } catch (error) {
    console.error("[RecYard] Failed to like workout:", error);
    return false;
  }
}

export async function getLikedWorkouts(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(
      STORAGE_KEYS.REC_YARD_LIKED_WORKOUTS,
    );
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function isWorkoutLiked(submissionId: string): Promise<boolean> {
  const liked = await getLikedWorkouts();
  return liked.includes(submissionId);
}

export async function addComment(
  submissionId: string,
  text: string,
): Promise<Comment | null> {
  try {
    const profile = await getRecYardProfile();
    if (!profile) return null;

    const comment: Comment = {
      id: generateCommentId(),
      submissionId,
      profileId: profile.id,
      handle: profile.handle,
      photoUri: profile.photoUri,
      text,
      createdAt: new Date().toISOString(),
      likes: 0,
    };

    const comments = await getComments(submissionId);
    comments.push(comment);

    const allComments = await getAllComments();
    allComments[submissionId] = comments;

    await AsyncStorage.setItem(
      STORAGE_KEYS.REC_YARD_COMMENTS,
      JSON.stringify(allComments),
    );

    return comment;
  } catch (error) {
    console.error("[RecYard] Failed to add comment:", error);
    return null;
  }
}

export async function getComments(submissionId: string): Promise<Comment[]> {
  const allComments = await getAllComments();
  return allComments[submissionId] || [];
}

async function getAllComments(): Promise<Record<string, Comment[]>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.REC_YARD_COMMENTS);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

// ============================================
// WEEKLY CHALLENGES
// ============================================

export function getCurrentWeeklyChallenge(): WeeklyChallenge {
  const now = new Date();
  const weekNumber = getWeekNumber(now);
  const year = now.getFullYear();

  // Get start of week (Monday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  // Get end of week (Sunday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    id: `week-${year}-${weekNumber}`,
    weekNumber,
    year,
    exerciseType: "superset",
    intensity: "standard",
    startDate: startOfWeek.toISOString(),
    endDate: endOfWeek.toISOString(),
    participantCount: 247,
    topTime: 1245,
  };
}

export function getDaysUntilChallengeEnd(): number {
  const challenge = getCurrentWeeklyChallenge();
  const endDate = new Date(challenge.endDate);
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ============================================
// BADGES
// ============================================

export function getAvailableBadges(): Badge[] {
  return [
    {
      id: "first-blood",
      name: "FIRST BLOOD",
      description: "Complete your first Rec Yard workout",
      icon: "zap",
      earnedDate: "",
      rarity: "common",
    },
    {
      id: "week-warrior",
      name: "WEEK WARRIOR",
      description: "Complete 7 workouts in a row",
      icon: "calendar",
      earnedDate: "",
      rarity: "rare",
    },
    {
      id: "iron-will",
      name: "IRON WILL",
      description: "Complete 30 workouts",
      icon: "award",
      earnedDate: "",
      rarity: "rare",
    },
    {
      id: "speed-demon",
      name: "SPEED DEMON",
      description: "Finish a deck in under 25 minutes",
      icon: "clock",
      earnedDate: "",
      rarity: "epic",
    },
    {
      id: "top-10",
      name: "TOP 10",
      description: "Reach top 10 on weekly leaderboard",
      icon: "trending-up",
      earnedDate: "",
      rarity: "epic",
    },
    {
      id: "yard-legend",
      name: "YARD LEGEND",
      description: "Complete 100 workouts",
      icon: "star",
      earnedDate: "",
      rarity: "legendary",
    },
    {
      id: "verified",
      name: "VERIFIED",
      description: "Get video verified",
      icon: "check-circle",
      earnedDate: "",
      rarity: "rare",
    },
  ];
}

export async function checkAndAwardBadges(): Promise<Badge[]> {
  const profile = await getRecYardProfile();
  if (!profile) return [];

  const available = getAvailableBadges();
  const newBadges: Badge[] = [];

  // First workout badge
  if (
    profile.totalWorkouts >= 1 &&
    !profile.badges.find((b) => b.id === "first-blood")
  ) {
    const badge = { ...available.find((b) => b.id === "first-blood")! };
    badge.earnedDate = new Date().toISOString();
    newBadges.push(badge);
  }

  // 30 workouts badge
  if (
    profile.totalWorkouts >= 30 &&
    !profile.badges.find((b) => b.id === "iron-will")
  ) {
    const badge = { ...available.find((b) => b.id === "iron-will")! };
    badge.earnedDate = new Date().toISOString();
    newBadges.push(badge);
  }

  // 100 workouts badge
  if (
    profile.totalWorkouts >= 100 &&
    !profile.badges.find((b) => b.id === "yard-legend")
  ) {
    const badge = { ...available.find((b) => b.id === "yard-legend")! };
    badge.earnedDate = new Date().toISOString();
    newBadges.push(badge);
  }

  // Speed demon badge (under 25 minutes = 1500 seconds)
  if (
    profile.bestTime !== null &&
    profile.bestTime < 1500 &&
    !profile.badges.find((b) => b.id === "speed-demon")
  ) {
    const badge = { ...available.find((b) => b.id === "speed-demon")! };
    badge.earnedDate = new Date().toISOString();
    newBadges.push(badge);
  }

  // Save new badges
  if (newBadges.length > 0) {
    profile.badges = [...profile.badges, ...newBadges];
    await saveRecYardProfile(profile);
  }

  return newBadges;
}

// ============================================
// TRASH TALK FUNCTIONS
// ============================================

export async function sendCallout(
  toProfileId: string,
  toHandle: string,
  toPhotoUri: string | null,
  message: string,
  messageId: string | null = null,
): Promise<Callout | null> {
  try {
    const profile = await getRecYardProfile();
    if (!profile) return null;

    const callout: Callout = {
      id: generateCalloutId(),
      fromProfileId: profile.id,
      fromHandle: profile.handle,
      fromPhotoUri: profile.photoUri,
      toProfileId,
      toHandle,
      toPhotoUri,
      message,
      messageId,
      createdAt: new Date().toISOString(),
      responded: false,
      responseMessage: null,
      respondedAt: null,
    };

    const callouts = await getCallouts();
    callouts.unshift(callout);
    await AsyncStorage.setItem(
      STORAGE_KEYS.REC_YARD_CALLOUTS,
      JSON.stringify(callouts),
    );

    return callout;
  } catch (error) {
    console.error("[RecYard] Failed to send callout:", error);
    return null;
  }
}

export async function respondToCallout(
  calloutId: string,
  responseMessage: string,
): Promise<boolean> {
  try {
    const callouts = await getCallouts();
    const callout = callouts.find((c) => c.id === calloutId);
    if (!callout) return false;

    callout.responded = true;
    callout.responseMessage = responseMessage;
    callout.respondedAt = new Date().toISOString();

    await AsyncStorage.setItem(
      STORAGE_KEYS.REC_YARD_CALLOUTS,
      JSON.stringify(callouts),
    );
    return true;
  } catch (error) {
    console.error("[RecYard] Failed to respond to callout:", error);
    return false;
  }
}

export async function getCallouts(): Promise<Callout[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.REC_YARD_CALLOUTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function getMyCallouts(): Promise<{
  sent: Callout[];
  received: Callout[];
}> {
  const profile = await getRecYardProfile();
  if (!profile) return { sent: [], received: [] };

  const callouts = await getCallouts();
  return {
    sent: callouts.filter((c) => c.fromProfileId === profile.id),
    received: callouts.filter((c) => c.toProfileId === profile.id),
  };
}

export async function sendTaunt(
  submissionId: string,
  messageId: string,
): Promise<Taunt | null> {
  try {
    const profile = await getRecYardProfile();
    if (!profile) return null;

    const presetMessage = TRASH_TALK_PRESETS.find((m) => m.id === messageId);
    if (!presetMessage) return null;

    const taunt: Taunt = {
      id: generateTauntId(),
      submissionId,
      fromProfileId: profile.id,
      fromHandle: profile.handle,
      fromPhotoUri: profile.photoUri,
      messageId,
      message: presetMessage.text,
      createdAt: new Date().toISOString(),
    };

    const taunts = await getTaunts();
    taunts.unshift(taunt);
    await AsyncStorage.setItem(
      STORAGE_KEYS.REC_YARD_TAUNTS,
      JSON.stringify(taunts),
    );

    return taunt;
  } catch (error) {
    console.error("[RecYard] Failed to send taunt:", error);
    return null;
  }
}

export async function getTaunts(): Promise<Taunt[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.REC_YARD_TAUNTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function getTauntsForSubmission(
  submissionId: string,
): Promise<Taunt[]> {
  const taunts = await getTaunts();
  return taunts.filter((t) => t.submissionId === submissionId);
}

export function getTrashTalkByCategory(
  category: TauntCategory,
): TrashTalkMessage[] {
  return TRASH_TALK_PRESETS.filter((m) => m.category === category);
}

export function getRandomTrashTalk(category?: TauntCategory): TrashTalkMessage {
  const messages = category
    ? TRASH_TALK_PRESETS.filter((m) => m.category === category)
    : TRASH_TALK_PRESETS;
  return messages[Math.floor(Math.random() * messages.length)];
}

// ============================================
// UTILITIES
// ============================================

function generateProfileId(): string {
  return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateSubmissionId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateCommentId(): string {
  return `cmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateCalloutId(): string {
  return `callout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateTauntId(): string {
  return `taunt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentWeekId(): string {
  const now = new Date();
  const weekNumber = getWeekNumber(now);
  return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, "0")}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

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
