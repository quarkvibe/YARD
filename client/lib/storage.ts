import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  WORKOUTS: "@yard/workouts",
  SETTINGS: "@yard/settings",
  PROFILE: "@yard/profile",
  YARD_RULES_ACCEPTED: "@yard/rules_accepted",
} as const;

export interface CardValue {
  rank: string;
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  value: number;
  exercise: "pushups" | "squats";
}

export interface WorkoutRecord {
  id: string;
  date: string;
  duration: number;
  ruleSetId: string;
  ruleSetName: string;
  exerciseType: ExerciseType;
  flipModeId: FlipModeId;
  totalPushups: number;
  totalSquats: number;
  cardsCompleted: number;
  // Practice mode data (for personal tracking with verified intervals)
  isPracticeMode?: boolean; // 🎯 Rec Yard Practice - saved locally with special icon
  isOfficialSubmission?: boolean; // Posted to Rec Yard community leaderboard
  intervals?: SetInterval[];
  totalWorkTime?: number; // Total time doing reps
  totalRestTime?: number; // Total rest time
  averageRestTime?: number; // Average rest between sets
}

export interface RuleSet {
  id: string;
  name: string;
  description: string;
  cardValues: {
    A: number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
    "6": number;
    "7": number;
    "8": number;
    "9": number;
    "10": number;
    J: number;
    Q: number;
    K: number;
  };
  suitExercises: {
    hearts: "pushups" | "squats";
    diamonds: "pushups" | "squats";
    clubs: "pushups" | "squats";
    spades: "pushups" | "squats";
  };
}

export type FlipModeId = "freshfish" | "trustee" | "og" | "podfather";

export interface FlipMode {
  id: FlipModeId;
  name: string;
  description: string;
}

export type ExerciseType = "pushups" | "squats" | "superset";

export interface ExerciseTypeOption {
  id: ExerciseType;
  name: string;
  description: string;
}

export const EXERCISE_TYPES: ExerciseTypeOption[] = [
  {
    id: "pushups",
    name: "PUSHUPS",
    description: "All cards = pushups",
  },
  {
    id: "squats",
    name: "SQUATS",
    description: "All cards = squats",
  },
  {
    id: "superset",
    name: "SUPERSET",
    description: "Mixed pushups + squats",
  },
];

export const FLIP_MODES: FlipMode[] = [
  {
    id: "freshfish",
    name: "FRESH FISH",
    description: "One card at a time",
  },
  {
    id: "trustee",
    name: "TRUSTEE",
    description: "2 cards at a time",
  },
  {
    id: "og",
    name: "OG",
    description: "Flip again if under 20",
  },
  {
    id: "podfather",
    name: "POD FATHER",
    description: "Flip while under 30",
  },
];

// Superset-specific modes (only shown when SUPERSET exercise type is selected)
export type SupersetModeId =
  | "alternating"
  | "split2"
  | "split4"
  | "splitunder20";

export interface SupersetMode {
  id: SupersetModeId;
  name: string;
  description: string;
}

export const SUPERSET_MODES: SupersetMode[] = [
  {
    id: "alternating",
    name: "ALTERNATING",
    description: "Squats then pushups, back and forth",
  },
  {
    id: "split2",
    name: "SPLIT 2",
    description: "Draw 2 cards, split exercises",
  },
  {
    id: "split4",
    name: "SPLIT 4",
    description: "Draw 4 cards, split exercises",
  },
  {
    id: "splitunder20",
    name: "SPLIT UNDER 20",
    description: "Keep drawing if under 20 reps",
  },
];

export type RestAlertType = "haptic" | "sound" | "both" | "none";

export type DeckStyleId = 
  | "yard"
  | "military"
  | "prison"
  | "vintage"
  | "geometric"
  | "dayofdead"
  | "samurai"
  | "anime"
  | "cosplay"
  | "hunters";

export interface DeckStyle {
  id: DeckStyleId;
  name: string;
  description: string;
  previewImage: string;
  backColor: string;
  accentColor: string;
  textColor: string;
}

export const DECK_STYLES: DeckStyle[] = [
  {
    id: "yard",
    name: "YARD",
    description: "Original prison yard design",
    previewImage: "yard_deck_back_design.png",
    backColor: "#1A1A1A",
    accentColor: "#FF6B35",
    textColor: "#FF6B35",
  },
  {
    id: "military",
    name: "TACTICAL",
    description: "Military operator style",
    previewImage: "tactical_deck_back_design.png",
    backColor: "#2D3B2D",
    accentColor: "#8B7355",
    textColor: "#C4B998",
  },
  {
    id: "prison",
    name: "LOCKUP",
    description: "Gritty concrete aesthetic",
    previewImage: "lockup_deck_back_design.png",
    backColor: "#252525",
    accentColor: "#FF6B35",
    textColor: "#888888",
  },
  {
    id: "vintage",
    name: "CASINO",
    description: "Classic vintage elegance",
    previewImage: "casino_deck_back_design.png",
    backColor: "#4A1515",
    accentColor: "#D4AF37",
    textColor: "#D4AF37",
  },
  {
    id: "geometric",
    name: "NEON",
    description: "Modern minimalist",
    previewImage: "neon_deck_back_design.png",
    backColor: "#0A0A0A",
    accentColor: "#00D4FF",
    textColor: "#00D4FF",
  },
  {
    id: "dayofdead",
    name: "CALAVERA",
    description: "Day of the Dead skulls",
    previewImage: "calavera_deck_back_design.png",
    backColor: "#1A0A1A",
    accentColor: "#FF69B4",
    textColor: "#FFB347",
  },
  {
    id: "samurai",
    name: "RONIN",
    description: "Japanese warrior style",
    previewImage: "ronin_deck_back_design.png",
    backColor: "#1A1A2E",
    accentColor: "#C41E3A",
    textColor: "#D4AF37",
  },
  {
    id: "anime",
    name: "KAWAII",
    description: "Anime schoolgirl deck",
    previewImage: "kawaii_deck_back_design.png",
    backColor: "#2A2A4A",
    accentColor: "#FF69B4",
    textColor: "#FFB6C1",
  },
  {
    id: "cosplay",
    name: "COSPLAY",
    description: "Anime cosplay girls",
    previewImage: "cosplay_deck_back_design.png",
    backColor: "#1A0A1A",
    accentColor: "#FF1493",
    textColor: "#FF69B4",
  },
  {
    id: "hunters",
    name: "HUNTERS",
    description: "Anime demon slayers",
    previewImage: "hunters_deck_back_design.png",
    backColor: "#0A0A12",
    accentColor: "#FF1493",
    textColor: "#00D4FF",
  },
];

export function getDeckStyleById(id: DeckStyleId): DeckStyle {
  return DECK_STYLES.find((ds) => ds.id === id) || DECK_STYLES[0];
}

export interface AppSettings {
  selectedRuleSetId: string;
  selectedFlipModeId: FlipModeId;
  selectedExerciseType: ExerciseType;
  selectedSupersetModeId: SupersetModeId;
  selectedDeckStyleId: DeckStyleId;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  // Rest timer settings
  restTimerEnabled: boolean;
  restTimerDuration: number; // seconds (30, 45, 60, 90, 120)
  restAlertType: RestAlertType;
  // Competitive mode - mandatory set/rest tracking for Rec Yard
  competitiveMode: boolean;
}

// Set interval data for anti-cheat verification
export interface SetInterval {
  setNumber: number;
  cardIndex: number;
  reps: number;
  exercise: "pushups" | "squats";
  workTime: number; // milliseconds to complete the set
  restTime: number; // milliseconds of rest after this set
  timestamp: number; // when this set was completed
}

export interface UserProfile {
  displayName: string;
  handle: string;
  bio: string;
  instagram: string;
  tiktok: string;
  twitter: string;
  youtube: string;
  discord: string;
  threads: string;
}

export const DEFAULT_RULE_SETS: RuleSet[] = [
  {
    id: "misdemeanor",
    name: "MISDEMEANOR",
    description: "A=15, Face=10 • 396 reps",
    cardValues: {
      A: 15,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "10": 10,
      J: 10,
      Q: 10,
      K: 10,
    },
    suitExercises: {
      hearts: "squats",
      diamonds: "squats",
      clubs: "pushups",
      spades: "pushups",
    },
  },
  {
    id: "hard-time",
    name: "HARD TIME",
    description: "1.5x • 594 reps",
    cardValues: {
      A: 22,
      "2": 3,
      "3": 5,
      "4": 6,
      "5": 8,
      "6": 9,
      "7": 11,
      "8": 12,
      "9": 14,
      "10": 15,
      J: 15,
      Q: 15,
      K: 15,
    },
    suitExercises: {
      hearts: "squats",
      diamonds: "squats",
      clubs: "pushups",
      spades: "pushups",
    },
  },
  {
    id: "lifer",
    name: "LIFER",
    description: "2x • 792 reps",
    cardValues: {
      A: 30,
      "2": 4,
      "3": 6,
      "4": 8,
      "5": 10,
      "6": 12,
      "7": 14,
      "8": 16,
      "9": 18,
      "10": 20,
      J: 20,
      Q: 20,
      K: 20,
    },
    suitExercises: {
      hearts: "squats",
      diamonds: "squats",
      clubs: "pushups",
      spades: "pushups",
    },
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  selectedRuleSetId: "misdemeanor",
  selectedFlipModeId: "freshfish",
  selectedExerciseType: "superset",
  selectedSupersetModeId: "alternating",
  selectedDeckStyleId: "yard",
  soundEnabled: false,
  hapticsEnabled: false,
  // Rest timer defaults
  restTimerEnabled: false,
  restTimerDuration: 60, // 1 minute default
  restAlertType: "haptic",
  // Competitive mode off by default
  competitiveMode: false,
};

export const REST_TIMER_OPTIONS = [30, 45, 60, 90, 120] as const;

export function getExerciseTypeById(id: ExerciseType): ExerciseTypeOption {
  return EXERCISE_TYPES.find((et) => et.id === id) || EXERCISE_TYPES[2];
}

export function getFlipModeById(id: FlipModeId): FlipMode {
  return FLIP_MODES.find((fm) => fm.id === id) || FLIP_MODES[0];
}

export function getSupersetModeById(id: SupersetModeId): SupersetMode {
  return SUPERSET_MODES.find((sm) => sm.id === id) || SUPERSET_MODES[0];
}

export const DEFAULT_PROFILE: UserProfile = {
  displayName: "",
  handle: "",
  bio: "",
  instagram: "",
  tiktok: "",
  twitter: "",
  youtube: "",
  discord: "",
  threads: "",
};

export async function getWorkouts(): Promise<WorkoutRecord[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading workouts:", error);
    return [];
  }
}

export async function saveWorkout(workout: WorkoutRecord): Promise<void> {
  try {
    const workouts = await getWorkouts();
    workouts.unshift(workout);
    await AsyncStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
  } catch (error) {
    console.error("Error saving workout:", error);
  }
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) }
      : DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Error loading settings:", error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving settings:", error);
  }
}

export async function getProfile(): Promise<UserProfile> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
    return data ? { ...DEFAULT_PROFILE, ...JSON.parse(data) } : DEFAULT_PROFILE;
  } catch (error) {
    console.error("Error loading profile:", error);
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (error) {
    console.error("Error saving profile:", error);
  }
}

export async function hasAcceptedYardRules(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.YARD_RULES_ACCEPTED);
    return data === "true";
  } catch (error) {
    console.error("Error checking yard rules:", error);
    return false;
  }
}

export async function acceptYardRules(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.YARD_RULES_ACCEPTED, "true");
  } catch (error) {
    console.error("Error saving yard rules acceptance:", error);
  }
}

export function getRuleSetById(id: string): RuleSet {
  return DEFAULT_RULE_SETS.find((rs) => rs.id === id) || DEFAULT_RULE_SETS[0];
}

export function generateDeck(
  ruleSet: RuleSet,
  exerciseType: ExerciseType,
): CardValue[] {
  const ranks = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ] as const;
  const suits = ["hearts", "diamonds", "clubs", "spades"] as const;

  const deck: CardValue[] = [];

  const getSuitExercise = (
    suit: (typeof suits)[number],
  ): "pushups" | "squats" => {
    if (exerciseType === "pushups") return "pushups";
    if (exerciseType === "squats") return "squats";
    // Superset: hearts/diamonds = squats, clubs/spades = pushups
    return suit === "hearts" || suit === "diamonds" ? "squats" : "pushups";
  };

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        rank,
        suit,
        value: ruleSet.cardValues[rank],
        exercise: getSuitExercise(suit),
      });
    }
  }

  return shuffleDeck(deck);
}

export function shuffleDeck(deck: CardValue[]): CardValue[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function getBestTime(
  workouts: WorkoutRecord[],
  ruleSetId: string,
  exerciseType?: ExerciseType,
): number | null {
  const matchingWorkouts = workouts.filter((w) => {
    const matchesRuleSet = w.ruleSetId === ruleSetId;
    const matchesExercise = exerciseType
      ? w.exerciseType === exerciseType
      : true;
    const isComplete = w.cardsCompleted === 52;
    return matchesRuleSet && matchesExercise && isComplete;
  });
  if (matchingWorkouts.length === 0) return null;
  return Math.min(...matchingWorkouts.map((w) => w.duration));
}

export function getBestTimeOverall(workouts: WorkoutRecord[]): {
  time: number;
  ruleSetId: string;
  exerciseType: ExerciseType;
} | null {
  const completeWorkouts = workouts.filter((w) => w.cardsCompleted === 52);
  if (completeWorkouts.length === 0) return null;

  const best = completeWorkouts.reduce((prev, curr) =>
    curr.duration < prev.duration ? curr : prev,
  );

  return {
    time: best.duration,
    ruleSetId: best.ruleSetId,
    exerciseType: best.exerciseType || "superset",
  };
}
