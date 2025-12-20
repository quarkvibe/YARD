import React, { useState, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
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
  FlipModeId,
  getFlipModeById,
  ExerciseType,
  getExerciseTypeById,
} from "@/lib/storage";

type WorkoutState = "idle" | "active" | "paused" | "complete";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<any>();

  const [workoutState, setWorkoutState] = useState<WorkoutState>("idle");
  const [deck, setDeck] = useState<CardValue[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(-1);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [timer, setTimer] = useState(0);
  const [totalPushups, setTotalPushups] = useState(0);
  const [totalSquats, setTotalSquats] = useState(0);
  const [ruleSetName, setRuleSetName] = useState("STANDARD");
  const [ruleSetId, setRuleSetId] = useState("standard");
  const [flipModeId, setFlipModeId] = useState<FlipModeId>("freshfish");
  const [flipModeName, setFlipModeName] = useState("FRESH FISH");
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(false);
  const [activeCards, setActiveCards] = useState<CardValue[]>([]);
  const [activeReps, setActiveReps] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const buttonScale = useSharedValue(1);

  const currentCard = activeCards.length > 0 ? activeCards[activeCards.length - 1] : null;
  const cardsRemaining = deck.length - currentCardIndex - 1;
  const cardsCompleted = currentCardIndex + 1;

  const loadSettings = useCallback(async () => {
    const settings = await getSettings();
    const ruleSet = getRuleSetById(settings.selectedRuleSetId);
    const flipMode = getFlipModeById(settings.selectedFlipModeId);
    setRuleSetId(ruleSet.id);
    setRuleSetName(ruleSet.name);
    setFlipModeId(flipMode.id);
    setFlipModeName(flipMode.name);
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
    const flipMode = getFlipModeById(settings.selectedFlipModeId);
    setRuleSetId(ruleSet.id);
    setRuleSetName(ruleSet.name);
    setFlipModeId(flipMode.id);
    setFlipModeName(flipMode.name);
    setHapticsEnabled(settings.hapticsEnabled);

    const newDeck = generateDeck(ruleSet, settings.selectedExerciseType);
    setDeck(newDeck);
    setCurrentCardIndex(-1);
    setIsCardFlipped(false);
    setTimer(0);
    setTotalPushups(0);
    setTotalSquats(0);
    setWorkoutState("active");
    setIsNewRecord(false);
    setActiveCards([]);
    setActiveReps(0);

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

    let nextIndex = currentCardIndex + 1;
    if (nextIndex >= deck.length) {
      completeWorkout();
      return;
    }

    const cardsToFlip: CardValue[] = [];
    let totalReps = 0;
    let pushupsToAdd = 0;
    let squatsToAdd = 0;

    if (flipModeId === "freshfish") {
      const card = deck[nextIndex];
      cardsToFlip.push(card);
      totalReps = card.value;
      if (card.exercise === "pushups") {
        pushupsToAdd = card.value;
      } else {
        squatsToAdd = card.value;
      }
    } else if (flipModeId === "trustee") {
      for (let i = 0; i < 2 && nextIndex + i < deck.length; i++) {
        const card = deck[nextIndex + i];
        cardsToFlip.push(card);
        totalReps += card.value;
        if (card.exercise === "pushups") {
          pushupsToAdd += card.value;
        } else {
          squatsToAdd += card.value;
        }
      }
      nextIndex = nextIndex + cardsToFlip.length - 1;
    } else if (flipModeId === "og") {
      let idx = nextIndex;
      while (idx < deck.length) {
        const card = deck[idx];
        cardsToFlip.push(card);
        totalReps += card.value;
        if (card.exercise === "pushups") {
          pushupsToAdd += card.value;
        } else {
          squatsToAdd += card.value;
        }
        idx++;
        if (totalReps >= 20) break;
      }
      nextIndex = idx - 1;
    } else if (flipModeId === "podfather") {
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
    setIsCardFlipped(true);

    setTimeout(() => {
      setIsCardFlipped(false);
    }, 300);
  }, [workoutState, currentCardIndex, deck, flipModeId, startTimer, triggerHaptic]);

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
    setActiveCards([]);
    setActiveReps(0);
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

      <ThemedText style={styles.ruleSetLabel}>{ruleSetName}</ThemedText>
      <ThemedText style={styles.flipModeLabel}>{flipModeName}</ThemedText>

      {bestTime !== null ? (
        <View style={styles.bestTimeContainer}>
          <ThemedText style={styles.bestTimeLabel}>BEST TIME</ThemedText>
          <ThemedText style={styles.bestTimeValue}>{formatDuration(bestTime)}</ThemedText>
        </View>
      ) : null}

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
          <ThemedText style={styles.timerText}>{formatDuration(timer)}</ThemedText>
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
        </View>
      </View>

      {activeCards.length > 0 ? (
        <View style={styles.exerciseBadge}>
          <ThemedText style={styles.exerciseText}>
            {activeReps} REPS
          </ThemedText>
          {activeCards.length > 1 ? (
            <ThemedText style={styles.cardCountText}>
              ({activeCards.length} CARDS)
            </ThemedText>
          ) : null}
        </View>
      ) : (
        <View style={styles.exerciseBadgePlaceholder}>
          <ThemedText style={styles.tapToStartText}>TAP FLIP TO START</ThemedText>
        </View>
      )}

      <View style={styles.cardContainer}>
        {activeCards.length > 1 ? (
          <View style={styles.multiCardStack}>
            {activeCards.map((card, index) => (
              <View
                key={`${card.suit}-${card.rank}-${index}`}
                style={[
                  styles.stackedCard,
                  { marginLeft: index * 30, zIndex: index },
                ]}
              >
                <PlayingCard card={card} isFlipped={true} />
              </View>
            ))}
          </View>
        ) : (
          <PlayingCard card={currentCard} isFlipped={currentCardIndex >= 0} />
        )}
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(cardsCompleted / 52) * 100}%` },
            ]}
          />
        </View>
        <ThemedText style={styles.progressText}>{cardsCompleted}/52 CARDS</ThemedText>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: Colors.dark.pushups }]}>
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
          {cardsRemaining === 0 ? "FINISH" : "FLIP"}
        </ThemedText>
      </AnimatedPressable>
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

      <ThemedText style={styles.completeTime}>{formatDuration(timer)}</ThemedText>

      <View style={styles.finalStatsRow}>
        <View style={styles.finalStatCard}>
          <ThemedText style={[styles.finalStatValue, { color: Colors.dark.pushups }]}>
            {totalPushups}
          </ThemedText>
          <ThemedText style={styles.finalStatLabel}>PUSHUPS</ThemedText>
        </View>
        <View style={styles.finalStatCard}>
          <ThemedText style={[styles.finalStatValue, { color: Colors.dark.squats }]}>
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
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.dark.backgroundRoot,
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
});
