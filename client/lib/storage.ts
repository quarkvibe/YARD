import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  WORKOUTS: "@deck_workout/workouts",
  SETTINGS: "@deck_workout/settings",
  PROFILE: "@deck_workout/profile",
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

export interface AppSettings {
  selectedRuleSetId: string;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

export interface UserProfile {
  displayName: string;
  avatarIndex: number;
}

export const DEFAULT_RULE_SETS: RuleSet[] = [
  {
    id: "standard",
    name: "Standard",
    description: "Classic prison workout. Face cards = 10, Ace = 11.",
    cardValues: {
      A: 11,
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
      hearts: "pushups",
      diamonds: "pushups",
      clubs: "squats",
      spades: "squats",
    },
  },
  {
    id: "endurance",
    name: "Endurance",
    description: "Higher reps for maximum burn. Face cards = 15, Ace = 20.",
    cardValues: {
      A: 20,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "10": 10,
      J: 15,
      Q: 15,
      K: 15,
    },
    suitExercises: {
      hearts: "pushups",
      diamonds: "pushups",
      clubs: "squats",
      spades: "squats",
    },
  },
  {
    id: "sprint",
    name: "Sprint",
    description: "Quick workout. Face cards = 5, Ace = 1.",
    cardValues: {
      A: 1,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "10": 10,
      J: 5,
      Q: 5,
      K: 5,
    },
    suitExercises: {
      hearts: "pushups",
      diamonds: "squats",
      clubs: "pushups",
      spades: "squats",
    },
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  selectedRuleSetId: "standard",
  soundEnabled: true,
  hapticsEnabled: true,
};

export const DEFAULT_PROFILE: UserProfile = {
  displayName: "Athlete",
  avatarIndex: 0,
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
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
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

export function generateDeck(ruleSet: RuleSet): CardValue[] {
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;
  const suits = ["hearts", "diamonds", "clubs", "spades"] as const;

  const deck: CardValue[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        rank,
        suit,
        value: ruleSet.cardValues[rank],
        exercise: ruleSet.suitExercises[suit],
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

export function getBestTime(workouts: WorkoutRecord[], ruleSetId: string): number | null {
  const matchingWorkouts = workouts.filter(
    (w) => w.ruleSetId === ruleSetId && w.cardsCompleted === 52
  );
  if (matchingWorkouts.length === 0) return null;
  return Math.min(...matchingWorkouts.map((w) => w.duration));
}
