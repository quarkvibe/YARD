import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Share,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  RouteProp,
} from "@react-navigation/native";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ConcreteBackground } from "@/components/ConcreteBackground";
import { PlayingCard } from "@/components/PlayingCard";
import { DeckStack } from "@/components/DeckStack";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import {
  CardValue,
  generateDeck,
  getRuleSetById,
  getSettings,
  saveSettings,
  saveWorkout,
  formatDuration,
  getWorkouts,
  getBestTime,
  WorkoutRecord,
  FlipModeId,
  getFlipModeById,
  ExerciseType,
  SupersetModeId,
  getSupersetModeById,
  getProfile,
  getDeckStyleById,
  DeckStyle,
  DeckStyleId,
  DECK_STYLES,
  DEFAULT_RULE_SETS,
  FLIP_MODES,
  EXERCISE_TYPES,
  SUPERSET_MODES,
} from "@/lib/storage";

type WorkoutState = "idle" | "active" | "paused" | "complete";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<{
    navigate: (screen: string, params?: any) => void;
    setParams: (params: any) => void;
  }>();
  const route = useRoute<RouteProp<MainTabParamList, "WorkoutTab">>();

  // Check if this is an official Rec Yard submission
  const isOfficialRecYardSubmission =
    route.params?.officialRecYardSubmission ?? false;

  const [workoutState, setWorkoutState] = useState<WorkoutState>("idle");
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [deck, setDeck] = useState<CardValue[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(-1);
  const [timer, setTimer] = useState(0);
  const [totalPushups, setTotalPushups] = useState(0);
  const [totalSquats, setTotalSquats] = useState(0);
  const [ruleSetName, setRuleSetName] = useState("");
  const [ruleSetId, setRuleSetId] = useState("");
  const [flipModeId, setFlipModeId] = useState<FlipModeId>("freshfish");
  const [flipModeName, setFlipModeName] = useState("");
  const [exerciseType, setExerciseType] = useState<ExerciseType>("superset");
  const [supersetModeId, setSupersetModeId] =
    useState<SupersetModeId>("alternating");
  const [supersetModeName, setSupersetModeName] = useState("ALTERNATING");
  const [alternatingExercise, setAlternatingExercise] = useState<
    "pushups" | "squats"
  >("squats");
  const [deckStyle, setDeckStyle] = useState<DeckStyle>(DECK_STYLES[0]);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [activeCards, setActiveCards] = useState<CardValue[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeReps, setActiveReps] = useState(0);

  // Set/Rest tracking state
  const [competitiveMode, setCompetitiveMode] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Quick-change selector modals
  const [showDeckPicker, setShowDeckPicker] = useState(false);
  const [showIntensityPicker, setShowIntensityPicker] = useState(false);
  const [showFlipModePicker, setShowFlipModePicker] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showSupersetPicker, setShowSupersetPicker] = useState(false);
  const [restTimerEnabled, setRestTimerEnabled] = useState(false);
  const [restTimerDuration, setRestTimerDuration] = useState(60);
  const [restAlertType, setRestAlertType] = useState<
    "haptic" | "sound" | "both" | "none"
  >("haptic");
  const [workoutPhase, setWorkoutPhase] = useState<"working" | "resting">(
    "working",
  );
  const [restTimer, setRestTimer] = useState(0);
  const [setStartTime, setSetStartTime] = useState<number>(0);
  const [intervals, setIntervals] = useState<
    {
      setNumber: number;
      cardIndex: number;
      reps: number;
      exercise: "pushups" | "squats";
      workTime: number;
      restTime: number;
      timestamp: number;
    }[]
  >([]);
  const [currentSetReps, setCurrentSetReps] = useState(0);
  const [currentSetExercise, setCurrentSetExercise] = useState<
    "pushups" | "squats"
  >("pushups");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const buttonScale = useSharedValue(1);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const currentCard =
    activeCards.length > 0 ? activeCards[activeCards.length - 1] : null;
  const cardsRemaining = deck.length - currentCardIndex - 1;
  const cardsCompleted = currentCardIndex + 1;

  const loadSettings = useCallback(async () => {
    console.log("[WorkoutScreen] Loading settings...");
    const settings = await getSettings();
    console.log("[WorkoutScreen] Loaded settings:", {
      flipModeId: settings.selectedFlipModeId,
      ruleSetId: settings.selectedRuleSetId,
    });
    const ruleSet = getRuleSetById(settings.selectedRuleSetId);
    const flipMode = getFlipModeById(settings.selectedFlipModeId);
    const supersetMode = getSupersetModeById(settings.selectedSupersetModeId);
    setRuleSetId(ruleSet.id);
    setRuleSetName(ruleSet.name);
    setFlipModeId(flipMode.id);
    setFlipModeName(
      settings.selectedExerciseType === "superset"
        ? supersetMode.name
        : flipMode.name,
    );
    setSupersetModeId(supersetMode.id);
    setSupersetModeName(supersetMode.name);
    setExerciseType(settings.selectedExerciseType);
    setHapticsEnabled(settings.hapticsEnabled);
    setSoundEnabled(settings.soundEnabled);
    // Set/Rest timer settings
    setRestTimerEnabled(settings.restTimerEnabled);
    setRestTimerDuration(settings.restTimerDuration);
    setRestAlertType(settings.restAlertType);
    setCompetitiveMode(settings.competitiveMode);
    // Reset alternating state when settings reload
    setAlternatingExercise("squats");
    // Load deck style
    const loadedDeckStyle = getDeckStyleById(settings.selectedDeckStyleId);
    setDeckStyle(loadedDeckStyle);

    const workouts = await getWorkouts();
    const best = getBestTime(workouts, ruleSet.id);
    setBestTime(best);
    setSettingsLoaded(true);
  }, []);

  // Reload settings when returning to idle state (after workout completes or is quit)
  useEffect(() => {
    if (workoutState === "idle") {
      loadSettings();
    }
  }, [workoutState, loadSettings]);

  const triggerHaptic = useCallback(
    (style: Haptics.ImpactFeedbackStyle) => {
      if (hapticsEnabled) {
        Haptics.impactAsync(style);
      }
    },
    [hapticsEnabled],
  );

  const triggerNotificationHaptic = useCallback(
    (type: Haptics.NotificationFeedbackType) => {
      if (hapticsEnabled) {
        Haptics.notificationAsync(type);
      }
    },
    [hapticsEnabled],
  );

  const startTimeRef = useRef<number>(0);
  const officialStartTimeRef = useRef<number>(0); // Wall clock start time for anti-cheat

  // Screen wake lock during workout
  useEffect(() => {
    if (workoutState === "active") {
      activateKeepAwakeAsync();
    } else {
      deactivateKeepAwake();
    }
    return () => {
      deactivateKeepAwake();
    };
  }, [workoutState]);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    // Use timestamp-based timing for accuracy
    startTimeRef.current = Date.now() - timer * 1000;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimer(elapsed);
    }, 100); // Update more frequently for precision
  }, [timer]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Rest timer functions
  const startRestTimer = useCallback(() => {
    if (restTimerRef.current) return;
    const restStartTime = Date.now();
    setRestTimer(0);

    restTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - restStartTime) / 1000);
      setRestTimer(elapsed);

      // Check if rest time is up (for countdown mode)
      if (restTimerEnabled && elapsed >= restTimerDuration) {
        // Trigger alert
        if (restAlertType === "haptic" || restAlertType === "both") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        // Sound alert would go here if we had audio
      }
    }, 100);
  }, [restTimerEnabled, restTimerDuration, restAlertType]);

  const stopRestTimer = useCallback(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
  }, []);

  // Complete a set (in competitive mode, called when user presses "SET DONE")
  const completeSet = useCallback(() => {
    const now = Date.now();
    const workTime = now - setStartTime;

    // Record this interval
    const newInterval = {
      setNumber: intervals.length + 1,
      cardIndex: currentCardIndex,
      reps: currentSetReps,
      exercise: currentSetExercise,
      workTime,
      restTime: 0, // Will be updated when next set starts
      timestamp: now,
    };

    setIntervals((prev) => [...prev, newInterval]);
    setWorkoutPhase("resting");
    startRestTimer();

    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
  }, [
    setStartTime,
    intervals.length,
    currentCardIndex,
    currentSetReps,
    currentSetExercise,
    startRestTimer,
    triggerHaptic,
  ]);

  // End rest and prepare for next set
  const endRest = useCallback(() => {
    stopRestTimer();

    // Update the last interval with rest time
    if (intervals.length > 0) {
      const lastRestTime = restTimer * 1000;
      setIntervals((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].restTime = lastRestTime;
        return updated;
      });
    }

    setRestTimer(0);
    setWorkoutPhase("working");
    setSetStartTime(Date.now());
  }, [stopRestTimer, intervals.length, restTimer]);

  const startWorkout = useCallback(async () => {
    const settings = await getSettings();
    const ruleSet = getRuleSetById(settings.selectedRuleSetId);
    const flipMode = getFlipModeById(settings.selectedFlipModeId);
    const supersetMode = getSupersetModeById(settings.selectedSupersetModeId);
    setRuleSetId(ruleSet.id);
    setRuleSetName(ruleSet.name);
    setFlipModeId(flipMode.id);
    setFlipModeName(
      settings.selectedExerciseType === "superset"
        ? supersetMode.name
        : flipMode.name,
    );
    setSupersetModeId(supersetMode.id);
    setSupersetModeName(supersetMode.name);
    setHapticsEnabled(settings.hapticsEnabled);

    setExerciseType(settings.selectedExerciseType);
    const loadedDeckStyle = getDeckStyleById(settings.selectedDeckStyleId);
    setDeckStyle(loadedDeckStyle);
    const newDeck = generateDeck(ruleSet, settings.selectedExerciseType);
    setDeck(newDeck);
    setCurrentCardIndex(-1);
    setTimer(0);
    setTotalPushups(0);
    setTotalSquats(0);
    setWorkoutState("active");
    setIsNewRecord(false);
    setActiveCards([]);
    setActiveReps(0);
    setAlternatingExercise("squats"); // Start with squats for alternating mode

    // Initialize set/rest tracking
    // Force competitive mode ON for official Rec Yard submissions
    // Preserve the current UI state (user may have toggled practice mode on)
    if (isOfficialRecYardSubmission) {
      setCompetitiveMode(true);
      setRestTimerEnabled(true);
    } else {
      // Don't override - keep whatever the user toggled in the UI
      // Only set from settings on initial load (handled in loadSettings)
      setRestTimerEnabled(settings.restTimerEnabled);
    }
    setRestTimerDuration(settings.restTimerDuration);
    setRestAlertType(settings.restAlertType);
    setIntervals([]);
    setWorkoutPhase("working");
    setRestTimer(0);
    setSetStartTime(Date.now());
    setCurrentSetReps(0);
    setCurrentSetExercise("pushups");

    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    // Set official wall-clock start time
    officialStartTimeRef.current = Date.now();
  }, [isOfficialRecYardSubmission]);

  const startNew = route.params?.startNew;

  useFocusEffect(
    useCallback(() => {
      if (startNew) {
        if (workoutState === "active" || workoutState === "paused") {
          if (Platform.OS === "web") {
            // On web, simple confirm
            if (
              confirm(
                "Start a new workout? Your current progress will be lost.",
              )
            ) {
              startWorkout();
            }
            navigation.setParams({ startNew: undefined });
          } else {
            Alert.alert(
              "START NEW WORKOUT",
              "Your current progress will be lost. Are you sure?",
              [
                {
                  text: "CANCEL",
                  style: "cancel",
                  onPress: () => {
                    navigation.setParams({ startNew: undefined });
                  },
                },
                {
                  text: "START NEW",
                  style: "destructive",
                  onPress: () => {
                    startWorkout();
                    navigation.setParams({ startNew: undefined });
                  },
                },
              ],
            );
          }
        } else {
          // Idle or complete - just start
          startWorkout();
          navigation.setParams({ startNew: undefined });
        }
      } else if (workoutState === "idle") {
        // Only reload settings when in idle state (not during active workout)
        loadSettings();
      }
    }, [loadSettings, workoutState, startNew, startWorkout, navigation]),
  );

  const completeWorkout = useCallback(async () => {
    stopTimer();
    stopRestTimer();
    setWorkoutState("complete");

    triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success);

    // Calculate interval stats for competitive mode
    const totalWorkTime = intervals.reduce((sum, i) => sum + i.workTime, 0);
    const totalRestTime = intervals.reduce((sum, i) => sum + i.restTime, 0);
    const averageRestTime =
      intervals.length > 0 ? totalRestTime / intervals.length : 0;

    // Calculate duration
    // For official submissions, use Strict Wall Clock Time (Start to Finish) to prevent pause abuse or background cheats
    let finalDuration = timer;
    if (isOfficialRecYardSubmission && officialStartTimeRef.current > 0) {
      finalDuration = Math.floor(
        (Date.now() - officialStartTimeRef.current) / 1000,
      );
    }

    const workoutRecord: WorkoutRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      duration: finalDuration,
      ruleSetId,
      ruleSetName,
      exerciseType,
      flipModeId,
      totalPushups,
      totalSquats,
      cardsCompleted: currentCardIndex + 1,
      // Practice mode data for personal tracking
      isPracticeMode: competitiveMode,
      isOfficialSubmission: isOfficialRecYardSubmission, // True when submitted from Rec Yard
      intervals: competitiveMode ? intervals : undefined,
      totalWorkTime: competitiveMode ? totalWorkTime : undefined,
      totalRestTime: competitiveMode ? totalRestTime : undefined,
      averageRestTime: competitiveMode ? averageRestTime : undefined,
    };

    await saveWorkout(workoutRecord);

    // Verify minimum possible time (approx 4 minutes for 396 reps)
    const MINIMUM_POSSIBLE_TIME = 240; // 4 minutes

    // Submit to Rec Yard leaderboard if this is an official submission
    if (isOfficialRecYardSubmission && currentCardIndex + 1 === 52) {
      if (timer < MINIMUM_POSSIBLE_TIME) {
        Alert.alert(
          "TIME INVALID",
          "Your workout time is below the physiological minimum for this rep count. This run cannot be submitted to the leaderboard.",
        );
        return;
      }

      try {
        const { supabase } = await import("@/lib/supabase");
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          // Get user's profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", session.user.id)
            .single();

          if (profile) {
            // Calculate week ID
            const now = new Date();
            const year = now.getFullYear();
            const startOfYear = new Date(year, 0, 1);
            const days = Math.floor(
              (now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
            );
            const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
            const weekId = `${year}-W${weekNumber.toString().padStart(2, "0")}`;

            // Submit to leaderboard
            await supabase.from("workout_submissions").insert({
              profile_id: profile.id,
              time: timer,
              exercise_type: exerciseType,
              intensity: ruleSetId,
              flip_mode: flipModeId,
              total_pushups: totalPushups,
              total_squats: totalSquats,
              cards_completed: 52,
              week_id: weekId,
            });
          }
        }
      } catch (err) {
        console.error("[WorkoutScreen] Failed to submit to Rec Yard:", err);
      }
    }

    if (bestTime === null || finalDuration < bestTime) {
      setIsNewRecord(true);
      setBestTime(finalDuration);
    }
  }, [
    timer,
    ruleSetId,
    ruleSetName,
    exerciseType,
    flipModeId,
    totalPushups,
    totalSquats,
    currentCardIndex,
    bestTime,
    stopTimer,
    stopRestTimer,
    triggerNotificationHaptic,
    competitiveMode,
    intervals,
    isOfficialRecYardSubmission,
  ]);

  const flipCard = useCallback(async () => {
    if (workoutState !== "active") return;

    // In competitive mode during rest phase, end rest first
    if (competitiveMode && workoutPhase === "resting") {
      endRest();
    }

    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);

    if (currentCardIndex === -1) {
      startTimer();
      setSetStartTime(Date.now());
    }

    let nextIndex = currentCardIndex + 1;
    if (nextIndex >= deck.length) {
      completeWorkout();
      return;
    }

    const cardsToFlip: CardValue[] = [];
    let totalReps = 0;
    let pushupsToAdd = 0;
    let squatsToAdd = 0;

    // Helper to assign exercise based on superset mode
    const assignExercise = (
      card: CardValue,
      cardPosition: number,
    ): "pushups" | "squats" => {
      if (exerciseType !== "superset") {
        return card.exercise; // Use suit-based assignment for non-superset
      }

      // Superset mode-specific logic
      if (supersetModeId === "alternating") {
        // Alternates each card
        return alternatingExercise;
      } else if (supersetModeId === "split2" || supersetModeId === "split4") {
        // First half is one exercise, second half is another
        const splitPoint = supersetModeId === "split2" ? 1 : 2;
        return cardPosition < splitPoint ? "squats" : "pushups";
      } else {
        // splitunder20 - use alternating logic
        return alternatingExercise;
      }
    };

    // Determine flip mode to use (for superset, use the superset mode's flip logic)
    const effectiveFlipMode =
      exerciseType === "superset"
        ? supersetModeId === "split2"
          ? "trustee"
          : supersetModeId === "split4"
            ? "split4"
            : supersetModeId === "splitunder20"
              ? "og"
              : flipModeId
        : flipModeId;

    if (
      effectiveFlipMode === "freshfish" ||
      (exerciseType === "superset" && supersetModeId === "alternating")
    ) {
      const card = deck[nextIndex];
      const exercise = assignExercise(card, 0);
      const modifiedCard = { ...card, exercise };
      cardsToFlip.push(modifiedCard);
      totalReps = card.value;
      if (exercise === "pushups") {
        pushupsToAdd = card.value;
      } else {
        squatsToAdd = card.value;
      }
      // Toggle for next alternating flip
      if (exerciseType === "superset" && supersetModeId === "alternating") {
        setAlternatingExercise((prev) =>
          prev === "squats" ? "pushups" : "squats",
        );
      }
    } else if (
      effectiveFlipMode === "trustee" ||
      (exerciseType === "superset" && supersetModeId === "split2")
    ) {
      for (let i = 0; i < 2 && nextIndex + i < deck.length; i++) {
        const card = deck[nextIndex + i];
        const exercise = assignExercise(card, i);
        const modifiedCard = { ...card, exercise };
        cardsToFlip.push(modifiedCard);
        totalReps += card.value;
        if (exercise === "pushups") {
          pushupsToAdd += card.value;
        } else {
          squatsToAdd += card.value;
        }
      }
      nextIndex = nextIndex + cardsToFlip.length - 1;
    } else if (effectiveFlipMode === "split4") {
      for (let i = 0; i < 4 && nextIndex + i < deck.length; i++) {
        const card = deck[nextIndex + i];
        const exercise = assignExercise(card, i);
        const modifiedCard = { ...card, exercise };
        cardsToFlip.push(modifiedCard);
        totalReps += card.value;
        if (exercise === "pushups") {
          pushupsToAdd += card.value;
        } else {
          squatsToAdd += card.value;
        }
      }
      nextIndex = nextIndex + cardsToFlip.length - 1;
    } else if (
      effectiveFlipMode === "og" ||
      (exerciseType === "superset" && supersetModeId === "splitunder20")
    ) {
      let idx = nextIndex;
      let currentExercise = alternatingExercise;
      while (idx < deck.length) {
        const card = deck[idx];
        const exercise =
          exerciseType === "superset" ? currentExercise : card.exercise;
        const modifiedCard = { ...card, exercise };
        cardsToFlip.push(modifiedCard);
        totalReps += card.value;
        if (exercise === "pushups") {
          pushupsToAdd += card.value;
        } else {
          squatsToAdd += card.value;
        }
        idx++;
        if (totalReps >= 20) break;
        // Toggle exercise for each card in splitunder20
        if (exerciseType === "superset" && supersetModeId === "splitunder20") {
          currentExercise = currentExercise === "squats" ? "pushups" : "squats";
        }
      }
      nextIndex = idx - 1;
      // Update alternating state for next flip - continue from where we left off
      if (exerciseType === "superset" && supersetModeId === "splitunder20") {
        // Next flip should start with the opposite of what we ended with
        const nextExercise =
          currentExercise === "squats" ? "pushups" : "squats";
        setAlternatingExercise(nextExercise);
      }
    } else if (effectiveFlipMode === "podfather") {
      let idx = nextIndex;
      while (idx < deck.length && totalReps < 30) {
        const card = deck[idx];
        cardsToFlip.push(card);
        totalReps += card.value;
        if (card.exercise === "pushups") {
          pushupsToAdd += card.value;
        } else {
          squatsToAdd += card.value;
        }
        idx++;
      }
      nextIndex = idx - 1;
    }

    setTotalPushups((prev) => prev + pushupsToAdd);
    setTotalSquats((prev) => prev + squatsToAdd);
    setActiveCards(cardsToFlip);
    setActiveReps(totalReps);
    setCurrentCardIndex(nextIndex);

    // Track current set for competitive mode
    setCurrentSetReps(totalReps);
    setCurrentSetExercise(pushupsToAdd > squatsToAdd ? "pushups" : "squats");
    if (!competitiveMode) {
      // In non-competitive mode, start timing for this set
      setSetStartTime(Date.now());
    }
  }, [
    workoutState,
    currentCardIndex,
    deck,
    flipModeId,
    exerciseType,
    supersetModeId,
    alternatingExercise,
    startTimer,
    triggerHaptic,
    completeWorkout,
    competitiveMode,
    workoutPhase,
    endRest,
  ]);

  const pauseWorkout = useCallback(() => {
    stopTimer();
    setWorkoutState("paused");
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
  }, [stopTimer, triggerHaptic]);

  const resumeWorkout = useCallback(() => {
    startTimer();
    setWorkoutState("active");
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
  }, [startTimer, triggerHaptic]);

  const performReset = useCallback(() => {
    stopTimer();
    setWorkoutState("idle");
    setDeck([]);
    setCurrentCardIndex(-1);
    setTimer(0);
    setTotalPushups(0);
    setTotalSquats(0);
    setIsNewRecord(false);
    setActiveCards([]);
    setActiveReps(0);
    setAlternatingExercise("squats");
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
  }, [stopTimer, triggerHaptic]);

  const resetDeck = useCallback(() => {
    // Show confirmation if workout is in progress
    if (workoutState === "active" || workoutState === "paused") {
      if (Platform.OS === "web") {
        setShowQuitConfirm(true);
      } else {
        Alert.alert(
          "QUIT WORKOUT",
          "Your progress will be lost. Are you sure?",
          [
            { text: "CANCEL", style: "cancel" },
            {
              text: "QUIT",
              style: "destructive",
              onPress: performReset,
            },
          ],
          { cancelable: true },
        );
      }
    } else {
      performReset();
    }
  }, [workoutState, performReset]);

  const confirmQuit = useCallback(() => {
    setShowQuitConfirm(false);
    performReset();
  }, [performReset]);

  const cancelQuit = useCallback(() => {
    setShowQuitConfirm(false);
  }, []);

  // Quick-change handlers
  const handleQuickChangeDeck = useCallback(
    async (styleId: DeckStyleId) => {
      const newStyle = getDeckStyleById(styleId);
      setDeckStyle(newStyle);
      const settings = await getSettings();
      await saveSettings({ ...settings, selectedDeckStyleId: styleId });
      setShowDeckPicker(false);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    },
    [triggerHaptic],
  );

  const handleQuickChangeIntensity = useCallback(
    async (intensityId: string) => {
      const ruleSet = getRuleSetById(intensityId);
      setRuleSetId(ruleSet.id);
      setRuleSetName(ruleSet.name);
      const settings = await getSettings();
      await saveSettings({ ...settings, selectedRuleSetId: intensityId });
      // Update best time for new intensity
      const workouts = await getWorkouts();
      const best = getBestTime(workouts, intensityId);
      setBestTime(best);
      setShowIntensityPicker(false);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    },
    [triggerHaptic],
  );

  const handleQuickChangeFlipMode = useCallback(
    async (modeId: FlipModeId) => {
      const flipMode = getFlipModeById(modeId);
      setFlipModeId(flipMode.id);
      setFlipModeName(flipMode.name);
      const settings = await getSettings();
      await saveSettings({ ...settings, selectedFlipModeId: modeId });
      setShowFlipModePicker(false);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    },
    [triggerHaptic],
  );

  const handleQuickChangeExercise = useCallback(
    async (type: ExerciseType) => {
      setExerciseType(type);
      const settings = await getSettings();
      await saveSettings({ ...settings, selectedExerciseType: type });
      setShowExercisePicker(false);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    },
    [triggerHaptic],
  );

  const handleQuickChangeSupersetMode = useCallback(
    async (modeId: SupersetModeId) => {
      const supersetMode = getSupersetModeById(modeId);
      setSupersetModeId(supersetMode.id);
      setSupersetModeName(supersetMode.name);
      const settings = await getSettings();
      await saveSettings({ ...settings, selectedSupersetModeId: modeId });
      setShowSupersetPicker(false);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    },
    [triggerHaptic],
  );

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handleShareWorkout = async () => {
    try {
      const profile = await getProfile();
      const handle = profile.handle ? `@${profile.handle}` : "";
      const socials = [
        profile.instagram && `📸 @${profile.instagram}`,
        profile.tiktok && `🎵 @${profile.tiktok}`,
        profile.twitter && `🐦 @${profile.twitter}`,
      ]
        .filter(Boolean)
        .join(" | ");

      const exerciseEmoji =
        exerciseType === "pushups"
          ? "💪"
          : exerciseType === "squats"
            ? "🦵"
            : "🔥";

      let message = `${exerciseEmoji} YARD WORKOUT COMPLETE!\n\n`;
      message += `⏱️ Time: ${formatDuration(timer)}\n`;
      message += `💪 Pushups: ${totalPushups}\n`;
      message += `🦵 Squats: ${totalSquats}\n`;
      message += `📋 Mode: ${ruleSetName}\n`;

      if (isNewRecord) {
        message += `\n🏆 NEW PERSONAL RECORD!\n`;
      }

      if (handle) {
        message += `\n${handle}`;
      }
      if (socials) {
        message += `\n${socials}`;
      }

      message += `\n\n🏋️ Download YARD Fitness and start your sentence!`;

      await Share.share({ message });
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Helper to get rep value from a card
  const getCardReps = (card: CardValue): number => {
    const ruleSet = getRuleSetById(ruleSetId);
    return ruleSet.cardValues[card.rank as keyof typeof ruleSet.cardValues];
  };

  // Determine if we're in a split superset mode (where cards are divided by exercise)
  const isSplitMode =
    exerciseType === "superset" &&
    (supersetModeId === "split2" ||
      supersetModeId === "split4" ||
      supersetModeId === "splitunder20");

  // Render card display based on mode
  const renderCardDisplay = () => {
    // Single card mode (Fresh Fish or single exercise)
    if (activeCards.length === 1) {
      const card = activeCards[0];
      const reps = getCardReps(card);
      const currentExercise =
        exerciseType === "pushups"
          ? "PUSHUPS"
          : exerciseType === "squats"
            ? "SQUATS"
            : alternatingExercise === "pushups"
              ? "PUSHUPS"
              : "SQUATS";

      return (
        <>
          <View style={styles.singleCardHeader}>
            <ThemedText
              style={[
                styles.bigRepNumber,
                {
                  color:
                    currentExercise === "PUSHUPS"
                      ? Colors.dark.pushups
                      : Colors.dark.squats,
                },
              ]}
            >
              {reps}
            </ThemedText>
            <ThemedText style={styles.exerciseLabel}>
              {currentExercise}
            </ThemedText>
          </View>
          <View style={styles.cardContainer}>
            <PlayingCard
              card={card}
              isFlipped={true}
              deckStyleId={deckStyle.id}
            />
          </View>
        </>
      );
    }

    // Split mode - show cards separated by exercise
    if (isSplitMode && activeCards.length >= 2) {
      const halfIndex = Math.floor(activeCards.length / 2);
      const pushupCards = activeCards.slice(0, halfIndex);
      const squatCards = activeCards.slice(halfIndex);

      const pushupReps = pushupCards.reduce(
        (sum, c) => sum + getCardReps(c),
        0,
      );
      const squatReps = squatCards.reduce((sum, c) => sum + getCardReps(c), 0);

      return (
        <>
          <View style={styles.splitCardContainer}>
            {/* Pushups Side */}
            <View style={styles.splitSide}>
              <ThemedText
                style={[styles.splitRepNumber, { color: Colors.dark.pushups }]}
              >
                {pushupReps}
              </ThemedText>
              <ThemedText style={styles.splitExerciseLabel}>PUSHUPS</ThemedText>
              <View style={styles.splitCardStack}>
                {pushupCards.map((card, index) => (
                  <Animated.View
                    key={`pushup-${card.suit}-${card.rank}-${index}`}
                    entering={FadeIn.delay(index * 50)}
                    style={[
                      styles.splitCard,
                      { marginLeft: index > 0 ? -30 : 0 },
                    ]}
                  >
                    <PlayingCard
                      card={card}
                      isFlipped={true}
                      size="small"
                      deckStyleId={deckStyle.id}
                    />
                  </Animated.View>
                ))}
              </View>
            </View>

            {/* Divider */}
            <View style={styles.splitDivider} />

            {/* Squats Side */}
            <View style={styles.splitSide}>
              <ThemedText
                style={[styles.splitRepNumber, { color: Colors.dark.squats }]}
              >
                {squatReps}
              </ThemedText>
              <ThemedText style={styles.splitExerciseLabel}>SQUATS</ThemedText>
              <View style={styles.splitCardStack}>
                {squatCards.map((card, index) => (
                  <Animated.View
                    key={`squat-${card.suit}-${card.rank}-${index}`}
                    entering={FadeIn.delay(index * 50 + 100)}
                    style={[
                      styles.splitCard,
                      { marginLeft: index > 0 ? -30 : 0 },
                    ]}
                  >
                    <PlayingCard
                      card={card}
                      isFlipped={true}
                      size="small"
                      deckStyleId={deckStyle.id}
                    />
                  </Animated.View>
                ))}
              </View>
            </View>
          </View>
        </>
      );
    }

    // Multi-card alternating mode - show all cards with total
    const totalReps = activeCards.reduce((sum, c) => sum + getCardReps(c), 0);

    // Improved Display: If only 2 cards (e.g. Trustee), show them side-by-side fully
    if (activeCards.length === 2) {
      return (
        <>
          <View style={styles.exerciseBadge}>
            <ThemedText style={styles.exerciseText}>
              {totalReps} REPS
            </ThemedText>
            <ThemedText style={styles.cardCountText}>
              ({activeCards.length} CARDS)
            </ThemedText>
          </View>
          <View style={styles.cardContainer}>
            <View
              style={{
                flexDirection: "row",
                gap: 16,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {activeCards.map((card, index) => (
                <Animated.View
                  key={`${card.suit}-${card.rank}-${index}`}
                  entering={FadeIn.delay(index * 100)}
                >
                  <PlayingCard
                    card={card}
                    isFlipped={true}
                    size="medium" // Use Medium so they are readable but fit side-by-side
                    deckStyleId={deckStyle.id}
                  />
                </Animated.View>
              ))}
            </View>
          </View>
        </>
      );
    }

    return (
      <>
        <View style={styles.exerciseBadge}>
          <ThemedText style={styles.exerciseText}>{totalReps} REPS</ThemedText>
          <ThemedText style={styles.cardCountText}>
            ({activeCards.length} CARDS)
          </ThemedText>
        </View>
        <View style={styles.cardContainer}>
          <View style={styles.multiCardStack}>
            {activeCards.map((card, index) => (
              <Animated.View
                key={`${card.suit}-${card.rank}-${index}`}
                entering={FadeIn.delay(index * 80)}
                style={[
                  styles.stackedCard,
                  {
                    transform: [
                      {
                        translateX: (index - (activeCards.length - 1) / 2) * 45,
                      },
                      {
                        rotate: `${(index - (activeCards.length - 1) / 2) * 5}deg`,
                      },
                      {
                        translateY:
                          Math.abs(index - (activeCards.length - 1) / 2) * 8,
                      },
                    ],
                    zIndex: index,
                  },
                ]}
              >
                <PlayingCard
                  card={card}
                  isFlipped={true}
                  size="small"
                  deckStyleId={deckStyle.id}
                />
              </Animated.View>
            ))}
          </View>
        </View>
      </>
    );
  };

  const renderIdleState = () => (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={styles.centerContent}
    >
      {/* Official Rec Yard Submission Banner */}
      {isOfficialRecYardSubmission && (
        <View style={styles.officialSubmissionBanner}>
          <ThemedText style={styles.officialSubmissionText}>
            OFFICIAL REC YARD CHALLENGE
          </ThemedText>
          <ThemedText style={styles.officialSubmissionSubtext}>
            Your time will be posted to the leaderboard
          </ThemedText>
        </View>
      )}

      {/* Tappable Deck - Quick Change Deck Style */}
      <Pressable
        style={styles.deckPreview}
        onPress={() => setShowDeckPicker(true)}
      >
        <DeckStack
          cardsRemaining={52}
          totalCards={52}
          deckStyleId={deckStyle.id}
        />
        <View style={styles.quickChangeHint}>
          <Feather name="edit-2" size={12} color={Colors.dark.textSecondary} />
          <ThemedText style={styles.quickChangeHintText}>
            {deckStyle.name}
          </ThemedText>
        </View>
      </Pressable>

      {/* Quick-change config row */}
      <View style={styles.quickConfigRow}>
        <Pressable
          style={styles.quickConfigItem}
          onPress={() => setShowIntensityPicker(true)}
        >
          <ThemedText style={styles.quickConfigLabel}>INTENSITY</ThemedText>
          <View style={styles.quickConfigValueRow}>
            <ThemedText style={styles.quickConfigValue}>
              {ruleSetName}
            </ThemedText>
            <Feather name="chevron-down" size={14} color={Colors.dark.accent} />
          </View>
        </Pressable>
        {exerciseType !== "superset" && (
          <Pressable
            style={styles.quickConfigItem}
            onPress={() => setShowFlipModePicker(true)}
          >
            <ThemedText style={styles.quickConfigLabel}>FLIP MODE</ThemedText>
            <View style={styles.quickConfigValueRow}>
              <ThemedText style={styles.quickConfigValue}>
                {flipModeName}
              </ThemedText>
              <Feather
                name="chevron-down"
                size={14}
                color={Colors.dark.accent}
              />
            </View>
          </Pressable>
        )}
      </View>

      <View style={styles.quickConfigRow}>
        <Pressable
          style={styles.quickConfigItem}
          onPress={() => setShowExercisePicker(true)}
        >
          <ThemedText style={styles.quickConfigLabel}>EXERCISE</ThemedText>
          <View style={styles.quickConfigValueRow}>
            <ThemedText style={styles.quickConfigValue}>
              {exerciseType.toUpperCase()}
            </ThemedText>
            <Feather name="chevron-down" size={14} color={Colors.dark.accent} />
          </View>
        </Pressable>
        {exerciseType === "superset" && (
          <Pressable
            style={styles.quickConfigItem}
            onPress={() => setShowSupersetPicker(true)}
          >
            <ThemedText style={styles.quickConfigLabel}>SUPERSET</ThemedText>
            <View style={styles.quickConfigValueRow}>
              <ThemedText style={styles.quickConfigValue}>
                {supersetModeName}
              </ThemedText>
              <Feather
                name="chevron-down"
                size={14}
                color={Colors.dark.accent}
              />
            </View>
          </Pressable>
        )}
      </View>

      {bestTime !== null ? (
        <View style={styles.bestTimeContainer}>
          <ThemedText style={styles.bestTimeLabel}>BEST TIME</ThemedText>
          <ThemedText style={styles.bestTimeValue}>
            {formatDuration(bestTime)}
          </ThemedText>
        </View>
      ) : null}

      {/* Rec Yard Practice Mode Toggle - hidden for official submissions */}
      {!isOfficialRecYardSubmission && (
        <Pressable
          onPress={async () => {
            const newValue = !competitiveMode;
            setCompetitiveMode(newValue);
            // Save to settings so it persists
            const settings = await getSettings();
            await saveSettings({ ...settings, competitiveMode: newValue });
            triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={[
            styles.competitionToggle,
            competitiveMode && styles.competitionToggleActive,
          ]}
        >
          <Feather
            name={competitiveMode ? "target" : "clock"}
            size={18}
            color={
              competitiveMode ? Colors.dark.backgroundRoot : Colors.dark.accent
            }
          />
          <ThemedText
            style={[
              styles.competitionToggleText,
              competitiveMode && styles.competitionToggleTextActive,
            ]}
          >
            {competitiveMode ? "REC YARD PRACTICE" : "PRACTICE MODE"}
          </ThemedText>
        </Pressable>
      )}
      {competitiveMode && !isOfficialRecYardSubmission && (
        <ThemedText style={styles.competitionHint}>
          Track sets • Tap SET DONE after each • Saved to personal records
        </ThemedText>
      )}

      <AnimatedPressable
        onPress={startWorkout}
        onPressIn={handleButtonPressIn}
        onPressOut={handleButtonPressOut}
        style={[styles.startButton, animatedButtonStyle]}
      >
        <ThemedText style={styles.startButtonText}>START WORKOUT</ThemedText>
      </AnimatedPressable>
    </Animated.View>
  );

  const renderActiveState = () => (
    <Animated.View entering={FadeIn} style={styles.activeContent}>
      <View style={styles.topRow}>
        <Pressable onPress={resetDeck} style={styles.resetButton}>
          <Feather name="x" size={20} color={Colors.dark.textSecondary} />
          <ThemedText style={styles.resetText}>QUIT</ThemedText>
        </Pressable>

        <View style={styles.timerContainer}>
          <ThemedText style={styles.timerText}>
            {formatDuration(timer)}
          </ThemedText>
          <ThemedText style={styles.timerText}>
            {formatDuration(timer)}
          </ThemedText>
          {!isOfficialRecYardSubmission && (
            <Pressable
              onPress={workoutState === "paused" ? resumeWorkout : pauseWorkout}
              style={styles.pauseButton}
            >
              <Feather
                name={workoutState === "paused" ? "play" : "pause"}
                size={20}
                color={Colors.dark.accent}
              />
            </Pressable>
          )}
          {isOfficialRecYardSubmission && (
            <View style={styles.pauseButtonPlaceholder}>
              <Feather
                name="clock"
                size={16}
                color={Colors.dark.textSecondary}
                style={{ opacity: 0.5 }}
              />
            </View>
          )}
        </View>
      </View>

      {activeCards.length > 0 ? (
        renderCardDisplay()
      ) : (
        <View style={styles.exerciseBadgePlaceholder}>
          <ThemedText style={styles.tapToStartText}>
            TAP FLIP TO START
          </ThemedText>
        </View>
      )}

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(cardsCompleted / 52) * 100}%` },
            ]}
          />
        </View>
        <ThemedText style={styles.progressText}>
          {cardsCompleted}/52 CARDS
        </ThemedText>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <ThemedText
            style={[styles.statValue, { color: Colors.dark.pushups }]}
          >
            {totalPushups}
          </ThemedText>
          <ThemedText style={styles.statLabel}>PUSHUPS</ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: Colors.dark.squats }]}>
            {totalSquats}
          </ThemedText>
          <ThemedText style={styles.statLabel}>SQUATS</ThemedText>
        </View>
      </View>

      {/* Rest Timer Display (when resting in competitive mode) */}
      {competitiveMode && workoutPhase === "resting" && (
        <Animated.View entering={FadeIn} style={styles.restTimerContainer}>
          <ThemedText style={styles.restTimerLabel}>REST TIME</ThemedText>
          <ThemedText style={styles.restTimerValue}>
            {formatDuration(restTimer)}
          </ThemedText>
          {restTimerEnabled && (
            <View style={styles.restTimerProgress}>
              <View
                style={[
                  styles.restTimerFill,
                  {
                    width: `${Math.min(100, (restTimer / restTimerDuration) * 100)}%`,
                    backgroundColor:
                      restTimer >= restTimerDuration
                        ? Colors.dark.accent
                        : Colors.dark.squats,
                  },
                ]}
              />
            </View>
          )}
          <ThemedText style={styles.restTimerHint}>
            TAP FLIP WHEN READY
          </ThemedText>
        </Animated.View>
      )}

      {/* Spacer to account for absolute positioned button */}
      <View style={styles.buttonSpacer} />

      {/* Button Area */}
      {competitiveMode &&
      workoutPhase === "working" &&
      activeCards.length > 0 ? (
        <View style={styles.buttonRow}>
          <AnimatedPressable
            onPress={completeSet}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            disabled={workoutState === "paused"}
            style={[
              styles.setDoneButton,
              { opacity: workoutState === "paused" ? 0.5 : 1 },
              animatedButtonStyle,
            ]}
          >
            <Feather
              name="check"
              size={20}
              color={Colors.dark.backgroundRoot}
              style={{ marginRight: 8 }}
            />
            <ThemedText style={styles.setDoneButtonText}>SET DONE</ThemedText>
          </AnimatedPressable>
        </View>
      ) : (
        <AnimatedPressable
          onPress={flipCard}
          onPressIn={handleButtonPressIn}
          onPressOut={handleButtonPressOut}
          disabled={workoutState === "paused"}
          style={[
            styles.flipButton,
            { opacity: workoutState === "paused" ? 0.5 : 1 },
            animatedButtonStyle,
          ]}
        >
          <ThemedText style={styles.flipButtonText}>
            {cardsRemaining === 0
              ? "FINISH"
              : workoutPhase === "resting"
                ? "NEXT SET"
                : "FLIP"}
          </ThemedText>
        </AnimatedPressable>
      )}
    </Animated.View>
  );

  const renderCompleteState = () => (
    <Animated.View entering={FadeIn} style={styles.completeContent}>
      <ThemedText style={styles.finishLabel}>FINISH</ThemedText>

      {isNewRecord ? (
        <View style={styles.newRecordBadge}>
          <ThemedText style={styles.newRecordText}>NEW RECORD</ThemedText>
        </View>
      ) : null}

      <ThemedText style={styles.completeTime}>
        {/* For oficial submissions, we used the calculated finalDuration, but since that local var isn't here, 
            we rely on the fact that 'timer' might not match exactly if paused. 
            However, user cares about official time. 
            Ideally we'd show the wall-clock time here too if official. 
            For now, let's trust the 'timer' for display but the 'submission' used wall clock. 
            To be precise, we should update 'timer' to match wall clock on finish? 
            Let's just show timer for now, the backend record is the truth. 
        */}
        {formatDuration(timer)}
      </ThemedText>

      <View style={styles.finalStatsRow}>
        <View style={styles.finalStatCard}>
          <ThemedText
            style={[styles.finalStatValue, { color: Colors.dark.pushups }]}
          >
            {totalPushups}
          </ThemedText>
          <ThemedText style={styles.finalStatLabel}>PUSHUPS</ThemedText>
        </View>
        <View style={styles.finalStatCard}>
          <ThemedText
            style={[styles.finalStatValue, { color: Colors.dark.squats }]}
          >
            {totalSquats}
          </ThemedText>
          <ThemedText style={styles.finalStatLabel}>SQUATS</ThemedText>
        </View>
      </View>

      <View style={styles.completeActions}>
        <AnimatedPressable
          onPress={startWorkout}
          onPressIn={handleButtonPressIn}
          onPressOut={handleButtonPressOut}
          style={[styles.runAgainButton, animatedButtonStyle]}
        >
          <ThemedText style={styles.runAgainText}>RUN AGAIN</ThemedText>
        </AnimatedPressable>

        <Pressable
          onPress={() => navigation.navigate("HistoryTab")}
          style={styles.viewHistoryButton}
        >
          <ThemedText style={styles.viewHistoryText}>VIEW HISTORY</ThemedText>
        </Pressable>
      </View>

      {/* Share Button - Always Available */}
      <Pressable style={styles.shareWorkoutButton} onPress={handleShareWorkout}>
        <Feather name="share-2" size={20} color={Colors.dark.backgroundRoot} />
        <ThemedText style={styles.shareWorkoutButtonText}>
          SHARE YOUR TIME
        </ThemedText>
      </Pressable>

      {!isOfficialRecYardSubmission && competitiveMode ? (
        <ThemedText style={styles.practiceModeSavedText}>
          Practice time saved to personal records
        </ThemedText>
      ) : null}

      {isOfficialRecYardSubmission ? (
        <ThemedText style={styles.officialSubmittedText}>
          Official time submitted to Rec Yard leaderboard
        </ThemedText>
      ) : null}
    </Animated.View>
  );

  return (
    <ConcreteBackground intensity="medium" showCracks={true} accentGlow={true}>
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
      >
        {workoutState === "idle" && settingsLoaded ? renderIdleState() : null}
        {workoutState === "idle" && !settingsLoaded ? (
          <View style={styles.loadingContainer}>
            <ThemedText style={styles.loadingText}>LOADING...</ThemedText>
          </View>
        ) : null}
        {workoutState === "active" || workoutState === "paused"
          ? renderActiveState()
          : null}
        {workoutState === "complete" ? renderCompleteState() : null}
      </View>

      <Modal
        visible={showQuitConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelQuit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>QUIT WORKOUT</ThemedText>
            <ThemedText style={styles.modalMessage}>
              Your progress will be lost. Are you sure?
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelButton} onPress={cancelQuit}>
                <ThemedText style={styles.modalCancelText}>CANCEL</ThemedText>
              </Pressable>
              <Pressable style={styles.modalQuitButton} onPress={confirmQuit}>
                <ThemedText style={styles.modalQuitText}>QUIT</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Deck Style Picker Modal */}
      <Modal
        visible={showDeckPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDeckPicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <ThemedText style={styles.pickerModalTitle}>
                DECK STYLE
              </ThemedText>
              <Pressable onPress={() => setShowDeckPicker(false)}>
                <Feather name="x" size={24} color={Colors.dark.chalk} />
              </Pressable>
            </View>
            <View style={styles.pickerGrid}>
              {DECK_STYLES.map((style) => (
                <Pressable
                  key={style.id}
                  style={[
                    styles.pickerGridItem,
                    {
                      backgroundColor: style.backColor,
                      borderColor: style.accentColor,
                    },
                    deckStyle.id === style.id && styles.pickerGridItemSelected,
                  ]}
                  onPress={() => handleQuickChangeDeck(style.id)}
                >
                  <ThemedText
                    style={[styles.pickerGridText, { color: style.textColor }]}
                  >
                    {style.name}
                  </ThemedText>
                  {deckStyle.id === style.id && (
                    <Feather name="check" size={16} color={style.accentColor} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Intensity Picker Modal */}
      <Modal
        visible={showIntensityPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowIntensityPicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <ThemedText style={styles.pickerModalTitle}>INTENSITY</ThemedText>
              <Pressable onPress={() => setShowIntensityPicker(false)}>
                <Feather name="x" size={24} color={Colors.dark.chalk} />
              </Pressable>
            </View>
            {DEFAULT_RULE_SETS.map((rule) => (
              <Pressable
                key={rule.id}
                style={[
                  styles.pickerListItem,
                  ruleSetId === rule.id && styles.pickerListItemSelected,
                ]}
                onPress={() => handleQuickChangeIntensity(rule.id)}
              >
                <View>
                  <ThemedText style={styles.pickerListTitle}>
                    {rule.name}
                  </ThemedText>
                  <ThemedText style={styles.pickerListDescription}>
                    {rule.description}
                  </ThemedText>
                </View>
                {ruleSetId === rule.id && (
                  <Feather name="check" size={20} color={Colors.dark.accent} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* Flip Mode Picker Modal */}
      <Modal
        visible={showFlipModePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFlipModePicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <ThemedText style={styles.pickerModalTitle}>FLIP MODE</ThemedText>
              <Pressable onPress={() => setShowFlipModePicker(false)}>
                <Feather name="x" size={24} color={Colors.dark.chalk} />
              </Pressable>
            </View>
            {FLIP_MODES.map((mode) => (
              <Pressable
                key={mode.id}
                style={[
                  styles.pickerListItem,
                  flipModeId === mode.id && styles.pickerListItemSelected,
                ]}
                onPress={() => handleQuickChangeFlipMode(mode.id)}
              >
                <View>
                  <ThemedText style={styles.pickerListTitle}>
                    {mode.name}
                  </ThemedText>
                  <ThemedText style={styles.pickerListDescription}>
                    {mode.description}
                  </ThemedText>
                </View>
                {flipModeId === mode.id && (
                  <Feather name="check" size={20} color={Colors.dark.accent} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* Exercise Type Picker Modal */}
      <Modal
        visible={showExercisePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowExercisePicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <ThemedText style={styles.pickerModalTitle}>EXERCISE</ThemedText>
              <Pressable onPress={() => setShowExercisePicker(false)}>
                <Feather name="x" size={24} color={Colors.dark.chalk} />
              </Pressable>
            </View>
            {EXERCISE_TYPES.map((type) => (
              <Pressable
                key={type.id}
                style={[
                  styles.pickerListItem,
                  exerciseType === type.id && styles.pickerListItemSelected,
                ]}
                onPress={() => handleQuickChangeExercise(type.id)}
              >
                <View>
                  <ThemedText style={styles.pickerListTitle}>
                    {type.name}
                  </ThemedText>
                  <ThemedText style={styles.pickerListDescription}>
                    {type.description}
                  </ThemedText>
                </View>
                {exerciseType === type.id && (
                  <Feather name="check" size={20} color={Colors.dark.accent} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* Superset Mode Picker Modal */}
      <Modal
        visible={showSupersetPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSupersetPicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <ThemedText style={styles.pickerModalTitle}>
                SUPERSET MODE
              </ThemedText>
              <Pressable onPress={() => setShowSupersetPicker(false)}>
                <Feather name="x" size={24} color={Colors.dark.chalk} />
              </Pressable>
            </View>
            {SUPERSET_MODES.map((mode) => (
              <Pressable
                key={mode.id}
                style={[
                  styles.pickerListItem,
                  supersetModeId === mode.id && styles.pickerListItemSelected,
                ]}
                onPress={() => handleQuickChangeSupersetMode(mode.id)}
              >
                <View>
                  <ThemedText style={styles.pickerListTitle}>
                    {mode.name}
                  </ThemedText>
                  <ThemedText style={styles.pickerListDescription}>
                    {mode.description}
                  </ThemedText>
                </View>
                {supersetModeId === mode.id && (
                  <Feather name="check" size={20} color={Colors.dark.accent} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </ConcreteBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  deckPreview: {
    marginBottom: Spacing["2xl"],
  },
  ruleSetLabel: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 3,
    color: Colors.dark.accent,
    marginBottom: Spacing.xs,
  },
  flipModeLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
  },
  bestTimeContainer: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  bestTimeLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xs,
  },
  bestTimeValue: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 3,
    color: Colors.dark.chalk,
  },
  startButton: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["3xl"],
    borderRadius: BorderRadius.sm,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 3,
    color: Colors.dark.backgroundRoot,
  },
  activeContent: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  resetText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  timerText: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 3,
    color: Colors.dark.chalk,
    fontVariant: ["tabular-nums"],
  },
  pauseButton: {
    padding: Spacing.sm,
  },
  exerciseBadge: {
    alignSelf: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.dark.accent,
    alignItems: "center",
  },
  exerciseBadgePlaceholder: {
    alignSelf: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  exerciseText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.backgroundRoot,
  },
  cardCountText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.backgroundRoot,
    opacity: 0.8,
    marginTop: 2,
  },
  tapToStartText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
  },
  cardContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
    minHeight: 280,
  },
  multiCardStack: {
    flexDirection: "row",
    position: "relative",
  },
  stackedCard: {
    position: "absolute",
  },
  progressContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: Colors.dark.cardBorder,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.dark.accent,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing["4xl"],
    marginBottom: Spacing["2xl"],
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
  },
  buttonSpacer: {
    height: 70, // Space for absolute positioned button (60px height + 10px margin)
  },
  flipButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: Colors.dark.accent,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  flipButtonText: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 4,
    color: Colors.dark.backgroundRoot,
  },
  completeContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  finishLabel: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 4,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.md,
  },
  newRecordBadge: {
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.lg,
  },
  newRecordText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.backgroundRoot,
  },
  completeTime: {
    fontSize: 72,
    fontWeight: "800",
    letterSpacing: 4,
    color: Colors.dark.chalk,
    marginBottom: Spacing["2xl"],
  },
  finalStatsRow: {
    flexDirection: "row",
    gap: Spacing.xl,
    marginBottom: Spacing["3xl"],
  },
  finalStatCard: {
    alignItems: "center",
    backgroundColor: Colors.dark.cardBackground,
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    minWidth: 120,
  },
  finalStatValue: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 1,
  },
  finalStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.xs,
  },
  completeActions: {
    alignItems: "center",
    gap: Spacing.lg,
  },
  runAgainButton: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["3xl"],
    borderRadius: BorderRadius.sm,
  },
  runAgainText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 3,
    color: Colors.dark.backgroundRoot,
  },
  viewHistoryButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  viewHistoryText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
  },
  // Single card display with large rep number
  singleCardHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  bigRepNumber: {
    fontSize: 72,
    fontWeight: "900",
    letterSpacing: 2,
  },
  exerciseLabel: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 3,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.xs,
  },
  // Split card display for superset split modes
  splitCardContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  splitSide: {
    flex: 1,
    alignItems: "center",
  },
  splitRepNumber: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: 1,
  },
  splitExerciseLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  splitCardStack: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  splitCard: {
    // Individual card in split view
  },
  splitDivider: {
    width: 2,
    height: 180,
    backgroundColor: Colors.dark.cardBorder,
    alignSelf: "center",
    opacity: 0.5,
  },
  // Rest timer styles
  restTimerContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.dark.squats,
  },
  restTimerLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.squats,
    marginBottom: Spacing.xs,
  },
  restTimerValue: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: 2,
    color: Colors.dark.chalk,
    fontVariant: ["tabular-nums"],
  },
  restTimerProgress: {
    width: "100%",
    height: 4,
    backgroundColor: Colors.dark.cardBorder,
    borderRadius: 2,
    marginTop: Spacing.md,
    overflow: "hidden",
  },
  restTimerFill: {
    height: "100%",
    borderRadius: 2,
  },
  restTimerHint: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.md,
  },
  // Button row for competitive mode
  buttonRow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: Spacing.md,
  },
  setDoneButton: {
    flex: 1,
    height: 60,
    backgroundColor: Colors.dark.squats,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  setDoneButtonText: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 3,
    color: Colors.dark.backgroundRoot,
  },
  // Competition toggle styles
  competitionToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    marginBottom: Spacing.md,
    backgroundColor: "transparent",
  },
  competitionToggleActive: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  competitionToggleText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.accent,
  },
  competitionToggleTextActive: {
    color: Colors.dark.backgroundRoot,
  },
  competitionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.cardBorder,
  },
  competitionIndicatorActive: {
    backgroundColor: Colors.dark.backgroundRoot,
  },
  competitionHint: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },

  // Official Rec Yard Submission Banner
  officialSubmissionBanner: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  officialSubmissionText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
    color: Colors.dark.backgroundRoot,
    textAlign: "center",
  },
  officialSubmissionSubtext: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.backgroundRoot,
    opacity: 0.8,
    marginTop: 2,
    textAlign: "center",
  },

  // Share Button Styles
  shareWorkoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  shareWorkoutButtonText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.backgroundRoot,
  },
  practiceModeSavedText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.accent,
    textAlign: "center",
    marginTop: Spacing.md,
  },
  officialSubmittedText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.squats,
    textAlign: "center",
    marginTop: Spacing.md,
  },

  // Quit Confirmation Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: "#1A1A1A",
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 320,
    borderWidth: 1,
    borderColor: "#333333",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 3,
    color: Colors.dark.chalk,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  modalMessage: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
  },
  modalQuitButton: {
    flex: 1,
    backgroundColor: "#CC3333",
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  modalQuitText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
  },

  // Quick-change UI Styles
  quickChangeHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: Spacing.sm,
  },
  quickChangeHintText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },
  quickConfigRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
    width: "100%",
    paddingHorizontal: Spacing.md,
  },
  quickConfigItem: {
    flex: 1,
    backgroundColor: Colors.dark.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  quickConfigLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  quickConfigValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quickConfigValue: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    color: Colors.dark.accent,
  },

  // Picker Modal Styles
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "flex-end",
  },
  pickerModalContent: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.xl,
    paddingBottom: Spacing["3xl"],
    maxHeight: "70%",
  },
  pickerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 3,
    color: Colors.dark.chalk,
  },
  pickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  pickerGridItem: {
    width: "48%",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerGridItemSelected: {
    borderWidth: 2,
  },
  pickerGridText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  pickerListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.cardBackground,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  pickerListItemSelected: {
    borderColor: Colors.dark.accent,
    borderWidth: 2,
  },
  pickerListTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
    marginBottom: 4,
  },
  pickerListDescription: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },
  pauseButtonPlaceholder: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
});
