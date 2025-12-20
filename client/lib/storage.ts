import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  WORKOUTS: "@yard/workouts",
  SETTINGS: "@yard/settings",
  PROFILE: "@yard/profile",
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

export interface AppSettings {
  selectedRuleSetId: string;
  selectedFlipModeId: FlipModeId;
  selectedExerciseType: ExerciseType;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

export interface UserProfile {
  displayName: string;
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
  soundEnabled: false,
  hapticsEnabled: false,
};

export function getExerciseTypeById(id: ExerciseType): ExerciseTypeOption {
  return EXERCISE_TYPES.find((et) => et.id === id) || EXERCISE_TYPES[2];
}

export function getFlipModeById(id: FlipModeId): FlipMode {
  return FLIP_MODES.find((fm) => fm.id === id) || FLIP_MODES[0];
}

export const DEFAULT_PROFILE: UserProfile = {
  displayName: "",
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
