import React, { useState, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { PlayingCard } from "@/components/PlayingCard";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import {
  CardValue,
  generateDeck,
  getRuleSetById,
  getSettings,
  saveWorkout,
  formatDuration,
  getWorkouts,
  getBestTime,
  WorkoutRecord,
} from "@/lib/storage";

type WorkoutState = "idle" | "active" | "paused" | "complete";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();

  const [workoutState, setWorkoutState] = useState<WorkoutState>("idle");
  const [deck, setDeck] = useState<CardValue[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(-1);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [timer, setTimer] = useState(0);
  const [totalPushups, setTotalPushups] = useState(0);
  const [totalSquats, setTotalSquats] = useState(0);
  const [ruleSetName, setRuleSetName] = useState("Standard");
  const [ruleSetId, setRuleSetId] = useState("standard");
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const buttonScale = useSharedValue(1);

  const currentCard = currentCardIndex >= 0 && currentCardIndex < deck.length ? deck[currentCardIndex] : null;
  const cardsRemaining = deck.length - currentCardIndex - 1;
  const cardsCompleted = currentCardIndex + 1;

  const loadSettings = useCallback(async () => {
    const settings = await getSettings();
    const ruleSet = getRuleSetById(settings.selectedRuleSetId);
    setRuleSetId(ruleSet.id);
    setRuleSetName(ruleSet.name);
    setHapticsEnabled(settings.hapticsEnabled);

    const workouts = await getWorkouts();
    const best = getBestTime(workouts, ruleSet.id);
    setBestTime(best);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const triggerHaptic = useCallback((style: Haptics.ImpactFeedbackStyle) => {
    if (hapticsEnabled) {
      Haptics.impactAsync(style);
    }
  }, [hapticsEnabled]);

  const triggerNotificationHaptic = useCallback((type: Haptics.NotificationFeedbackType) => {
    if (hapticsEnabled) {
      Haptics.notificationAsync(type);
    }
  }, [hapticsEnabled]);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startWorkout = useCallback(async () => {
    const settings = await getSettings();
    const ruleSet = getRuleSetById(settings.selectedRuleSetId);
    setRuleSetId(ruleSet.id);
    setRuleSetName(ruleSet.name);
    setHapticsEnabled(settings.hapticsEnabled);

    const newDeck = generateDeck(ruleSet);
    setDeck(newDeck);
    setCurrentCardIndex(-1);
    setIsCardFlipped(false);
    setTimer(0);
    setTotalPushups(0);
    setTotalSquats(0);
    setWorkoutState("active");
    setIsNewRecord(false);

    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  const flipCard = useCallback(async () => {
    if (workoutState !== "active") return;

    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);

    if (currentCardIndex === -1) {
      startTimer();
    }

    const nextIndex = currentCardIndex + 1;

    if (nextIndex >= deck.length) {
      completeWorkout();
      return;
    }

    const nextCard = deck[nextIndex];
    if (nextCard.exercise === "pushups") {
      setTotalPushups((prev) => prev + nextCard.value);
    } else {
      setTotalSquats((prev) => prev + nextCard.value);
    }

    setCurrentCardIndex(nextIndex);
    setIsCardFlipped(true);

    setTimeout(() => {
      setIsCardFlipped(false);
    }, 300);
  }, [workoutState, currentCardIndex, deck, startTimer, triggerHaptic]);

  const completeWorkout = useCallback(async () => {
    stopTimer();
    setWorkoutState("complete");

    triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success);

    const workoutRecord: WorkoutRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      duration: timer,
      ruleSetId,
      ruleSetName,
      totalPushups,
      totalSquats,
      cardsCompleted: 52,
    };

    await saveWorkout(workoutRecord);

    if (bestTime === null || timer < bestTime) {
      setIsNewRecord(true);
      setBestTime(timer);
    }
  }, [timer, ruleSetId, ruleSetName, totalPushups, totalSquats, bestTime, stopTimer, triggerNotificationHaptic]);

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

  const resetDeck = useCallback(() => {
    stopTimer();
    setWorkoutState("idle");
    setDeck([]);
    setCurrentCardIndex(-1);
    setIsCardFlipped(false);
    setTimer(0);
    setTotalPushups(0);
    setTotalSquats(0);
    setIsNewRecord(false);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
  }, [stopTimer, triggerHaptic]);

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const renderIdleState = () => (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.centerContent}>
      <View style={styles.deckPreview}>
        <PlayingCard card={null} isFlipped={false} />
      </View>

      <ThemedText type="h3" style={styles.ruleSetLabel}>
        {ruleSetName} Rules
      </ThemedText>

      {bestTime !== null ? (
        <View style={styles.bestTimeContainer}>
          <Feather name="award" size={20} color={Colors.dark.success} />
          <ThemedText type="body" style={styles.bestTimeText}>
            Best: {formatDuration(bestTime)}
          </ThemedText>
        </View>
      ) : null}

      <Button onPress={startWorkout} style={styles.startButton}>
        Start Workout
      </Button>
    </Animated.View>
  );

  const renderActiveState = () => (
    <Animated.View entering={FadeIn} style={styles.activeContent}>
      <View style={styles.topRow}>
        <Pressable onPress={resetDeck} style={styles.resetButton}>
          <Feather name="rotate-cw" size={20} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Reset
          </ThemedText>
        </Pressable>

        <View style={styles.timerContainer}>
          <ThemedText type="timer" style={[styles.timerText, { fontFamily: "monospace" }]}>
            {formatDuration(timer)}
          </ThemedText>
          <Pressable
            onPress={workoutState === "paused" ? resumeWorkout : pauseWorkout}
            style={styles.pauseButton}
          >
            <Feather
              name={workoutState === "paused" ? "play" : "pause"}
              size={24}
              color={theme.accent}
            />
          </Pressable>
        </View>
      </View>

      {currentCard ? (
        <View
          style={[
            styles.exerciseBadge,
            {
              backgroundColor:
                currentCard.exercise === "pushups" ? Colors.dark.pushups : Colors.dark.squats,
            },
          ]}
        >
          <ThemedText type="body" style={styles.exerciseText}>
            {currentCard.value} {currentCard.exercise === "pushups" ? "PUSHUPS" : "SQUATS"}
          </ThemedText>
        </View>
      ) : (
        <View style={styles.exerciseBadgePlaceholder}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Tap Flip to start
          </ThemedText>
        </View>
      )}

      <View style={styles.cardContainer}>
        <PlayingCard card={currentCard} isFlipped={currentCardIndex >= 0} />
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.accent,
                width: `${(cardsCompleted / 52) * 100}%`,
              },
            ]}
          />
        </View>
        <ThemedText type="small" style={styles.progressText}>
          {cardsCompleted}/52 cards
        </ThemedText>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <ThemedText type="h3" style={{ color: Colors.dark.pushups }}>
            {totalPushups}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Pushups
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText type="h3" style={{ color: Colors.dark.squats }}>
            {totalSquats}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Squats
          </ThemedText>
        </View>
      </View>

      <AnimatedPressable
        onPress={flipCard}
        onPressIn={handleButtonPressIn}
        onPressOut={handleButtonPressOut}
        disabled={workoutState === "paused"}
        style={[
          styles.flipButton,
          { backgroundColor: theme.accent, opacity: workoutState === "paused" ? 0.5 : 1 },
          animatedButtonStyle,
        ]}
      >
        <ThemedText type="h4" style={styles.flipButtonText}>
          {cardsRemaining === 0 ? "Finish" : "Flip Card"}
        </ThemedText>
      </AnimatedPressable>
    </Animated.View>
  );

  const renderCompleteState = () => (
    <Animated.View entering={FadeIn} style={styles.completeContent}>
      {isNewRecord ? (
        <View style={styles.newRecordBadge}>
          <Feather name="award" size={32} color="#FFD700" />
          <ThemedText type="h3" style={styles.newRecordText}>
            New Personal Record!
          </ThemedText>
        </View>
      ) : null}

      <ThemedText type="h1" style={styles.completeTime}>
        {formatDuration(timer)}
      </ThemedText>

      <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing["2xl"] }}>
        Workout Complete
      </ThemedText>

      <View style={styles.finalStatsRow}>
        <View style={[styles.finalStatCard, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="h2" style={{ color: Colors.dark.pushups }}>
            {totalPushups}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Pushups
          </ThemedText>
        </View>
        <View style={[styles.finalStatCard, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="h2" style={{ color: Colors.dark.squats }}>
            {totalSquats}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Squats
          </ThemedText>
        </View>
      </View>

      <Button onPress={resetDeck} style={styles.doneButton}>
        Done
      </Button>
    </Animated.View>
  );

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
    >
      {workoutState === "idle" ? renderIdleState() : null}
      {workoutState === "active" || workoutState === "paused" ? renderActiveState() : null}
      {workoutState === "complete" ? renderCompleteState() : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  deckPreview: {
    marginBottom: Spacing["3xl"],
  },
  ruleSetLabel: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  bestTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing["2xl"],
  },
  bestTimeText: {
    color: Colors.dark.success,
  },
  startButton: {
    width: 200,
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
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  timerText: {
    letterSpacing: 2,
  },
  pauseButton: {
    padding: Spacing.sm,
  },
  exerciseBadge: {
    alignSelf: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  exerciseBadgePlaceholder: {
    alignSelf: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  exerciseText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  cardContainer: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  progressContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  progressBar: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    opacity: 0.7,
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
  flipButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  flipButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  completeContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  newRecordBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  newRecordText: {
    color: "#FFD700",
  },
  completeTime: {
    fontSize: 64,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  finalStatsRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing["3xl"],
  },
  finalStatCard: {
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    minWidth: 120,
  },
  doneButton: {
    width: 200,
  },
});
