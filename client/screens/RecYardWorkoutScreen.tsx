import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeOut,
  withSequence,
  withTiming,
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
  formatDuration,
  getSupersetModeById,
  getDeckStyleById,
  DeckStyle,
  DECK_STYLES,
} from "@/lib/storage";
import { supabase, getCurrentWeekId } from "@/lib/supabase";

type WorkoutState = "countdown" | "active" | "complete";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function RecYardWorkoutScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "RecYardWorkout">>();

  const {
    profileId,
    handle,
    runNumber,
    runCode,
    runId,
    exerciseType,
    intensity,
    flipMode,
  } = route.params;

  const [workoutState, setWorkoutState] = useState<WorkoutState>("countdown");
  const [countdown, setCountdown] = useState(3);
  const [deck, setDeck] = useState<CardValue[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(-1);
  const [timer, setTimer] = useState(0);
  const [totalPushups, setTotalPushups] = useState(0);
  const [totalSquats, setTotalSquats] = useState(0);
  const [activeCards, setActiveCards] = useState<CardValue[]>([]);
  const [alternatingExercise, setAlternatingExercise] = useState<
    "pushups" | "squats"
  >("squats");
  const [deckStyle] = useState<DeckStyle>(DECK_STYLES[0]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const buttonScale = useSharedValue(1);
  const countdownScale = useSharedValue(1);

  const cardsCompleted = currentCardIndex + 1;

  useEffect(() => {
    const ruleSet = getRuleSetById(intensity);
    const newDeck = generateDeck(
      ruleSet,
      exerciseType as "pushups" | "squats" | "superset",
    );
    setDeck(newDeck);
  }, [intensity, exerciseType]);

  useEffect(() => {
    if (workoutState === "countdown" && countdown > 0) {
      countdownScale.value = withSequence(
        withTiming(1.3, { duration: 200 }),
        withTiming(1, { duration: 200 }),
      );
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (workoutState === "countdown" && countdown === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setWorkoutState("active");
    }
  }, [countdown, workoutState, countdownScale]);

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
    startTimeRef.current = Date.now() - timer * 1000;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimer(elapsed);
    }, 100);
  }, [timer]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const completeWorkout = useCallback(async () => {
    stopTimer();
    setWorkoutState("complete");

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const weekId = getCurrentWeekId();
    const completedAt = new Date().toISOString();

    try {
      // Update the rec_yard_runs record
      const { error: runUpdateError } = await supabase
        .from("rec_yard_runs")
        .update({
          time: timer,
          total_pushups: totalPushups,
          total_squats: totalSquats,
          cards_completed: currentCardIndex + 1,
          status: "completed",
          completed_at: completedAt,
        })
        .eq("id", runId);

      if (runUpdateError) {
        console.error("[RecYardWorkout] Failed to update run:", runUpdateError);
      }

      // Submit to leaderboard (workout_submissions table)
      const { error: submissionError } = await supabase
        .from("workout_submissions")
        .insert({
          profile_id: profileId,
          time: timer,
          exercise_type: exerciseType,
          intensity: intensity,
          flip_mode: flipMode,
          total_pushups: totalPushups,
          total_squats: totalSquats,
          is_verified: false,
          week_id: weekId,
        });

      if (submissionError) {
        console.error(
          "[RecYardWorkout] Failed to submit to leaderboard:",
          submissionError,
        );
      } else {
        console.log(
          "[RecYardWorkout] Successfully submitted to leaderboard with run:",
          runCode,
        );
      }

      // Update profile stats (total_workouts, best_time)
      const { data: profileData, error: profileFetchError } = await supabase
        .from("profiles")
        .select("total_workouts, best_time, user_id")
        .eq("id", profileId)
        .single();

      if (profileFetchError) {
        console.error(
          "[RecYardWorkout] Failed to fetch profile:",
          profileFetchError,
        );
      } else if (profileData) {
        const newTotalWorkouts = (profileData.total_workouts || 0) + 1;
        const currentBestTime = profileData.best_time;
        const newBestTime =
          currentBestTime === null || timer < currentBestTime
            ? timer
            : currentBestTime;

        // Update profile using user_id to satisfy RLS policy
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({
            total_workouts: newTotalWorkouts,
            best_time: newBestTime,
            updated_at: completedAt,
          })
          .eq("id", profileId)
          .eq("user_id", profileData.user_id);

        if (profileUpdateError) {
          console.error(
            "[RecYardWorkout] Failed to update profile stats:",
            profileUpdateError,
          );
        } else {
          console.log(
            "[RecYardWorkout] Profile stats updated - Total:",
            newTotalWorkouts,
            "Best:",
            newBestTime,
          );
        }
      }

      // Update weekly challenge participant count (increment if first submission this week)
      const { data: existingSubmissions } = await supabase
        .from("workout_submissions")
        .select("id")
        .eq("profile_id", profileId)
        .eq("week_id", weekId);

      // If this is the first submission for this user this week, increment participant count
      if (existingSubmissions && existingSubmissions.length === 1) {
        try {
          await supabase.rpc("increment_challenge_participants", {
            challenge_week_id: weekId,
          });
        } catch {
          // RPC might not exist, that's okay - we can skip this
          console.log(
            "[RecYardWorkout] Could not update challenge participant count",
          );
        }
      }
    } catch (err) {
      console.error("[RecYardWorkout] Failed to complete workout:", err);
    }
  }, [
    timer,
    totalPushups,
    totalSquats,
    currentCardIndex,
    runId,
    profileId,
    exerciseType,
    intensity,
    flipMode,
    runCode,
    stopTimer,
  ]);

  const flipCard = useCallback(() => {
    if (workoutState !== "active") return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentCardIndex === -1) {
      startTimer();
    }

    let nextIndex = currentCardIndex + 1;
    if (nextIndex >= deck.length) {
      completeWorkout();
      return;
    }

    // Determine how many cards to flip based on flip mode
    let cardsToFlip: CardValue[] = [];
    let currentExercise = alternatingExercise;
    let newPushups = 0;
    let newSquats = 0;
    let lastIndex = nextIndex;

    const isSuperset = exerciseType === "superset";

    // SUPERSET MODES (for superset exercise type)
    if (isSuperset && flipMode === "alternating") {
      // TAG TEAM: One card at a time, alternating exercises
      const card = deck[nextIndex];
      cardsToFlip = [{ ...card, exercise: currentExercise }];
      if (currentExercise === "pushups") {
        newPushups = card.value;
      } else {
        newSquats = card.value;
      }
      currentExercise = currentExercise === "squats" ? "pushups" : "squats";
      lastIndex = nextIndex;
    } else if (isSuperset && flipMode === "split2") {
      // DOUBLE DOWN: Draw 2 cards, first for pushups, second for squats
      for (let i = 0; i < 2 && nextIndex + i < deck.length; i++) {
        const card = deck[nextIndex + i];
        const exercise = i === 0 ? "pushups" : "squats";
        cardsToFlip.push({ ...card, exercise });
        if (exercise === "pushups") {
          newPushups += card.value;
        } else {
          newSquats += card.value;
        }
        lastIndex = nextIndex + i;
      }
    } else if (isSuperset && flipMode === "split4") {
      // SQUAD LEAD: Draw 4 cards, 2 for pushups, 2 for squats
      for (let i = 0; i < 4 && nextIndex + i < deck.length; i++) {
        const card = deck[nextIndex + i];
        const exercise = i < 2 ? "pushups" : "squats";
        cardsToFlip.push({ ...card, exercise });
        if (exercise === "pushups") {
          newPushups += card.value;
        } else {
          newSquats += card.value;
        }
        lastIndex = nextIndex + i;
      }
    } else if (isSuperset && flipMode === "splitunder20") {
      // OVERKILL: Keep drawing while under 20 total reps, alternating exercises
      let totalReps = 0;
      let idx = nextIndex;
      while (totalReps < 20 && idx < deck.length) {
        const card = deck[idx];
        cardsToFlip.push({ ...card, exercise: currentExercise });
        totalReps += card.value;
        if (currentExercise === "pushups") {
          newPushups += card.value;
        } else {
          newSquats += card.value;
        }
        currentExercise = currentExercise === "squats" ? "pushups" : "squats";
        lastIndex = idx;
        idx++;
      }
    }
    // REGULAR FLIP MODES (for pushups or squats only exercise types)
    else if (flipMode === "freshfish") {
      // Fresh Fish: One card at a time
      const card = deck[nextIndex];
      const exercise =
        exerciseType === "pushups"
          ? "pushups"
          : exerciseType === "squats"
            ? "squats"
            : currentExercise;
      cardsToFlip = [{ ...card, exercise }];
      if (exercise === "pushups") {
        newPushups = card.value;
      } else {
        newSquats = card.value;
      }
      if (isSuperset) {
        currentExercise = currentExercise === "squats" ? "pushups" : "squats";
      }
      lastIndex = nextIndex;
    } else if (flipMode === "trustee") {
      // Trustee: 2 cards at a time
      for (let i = 0; i < 2 && nextIndex + i < deck.length; i++) {
        const card = deck[nextIndex + i];
        const exercise =
          exerciseType === "pushups"
            ? "pushups"
            : exerciseType === "squats"
              ? "squats"
              : currentExercise;
        cardsToFlip.push({ ...card, exercise });
        if (exercise === "pushups") {
          newPushups += card.value;
        } else {
          newSquats += card.value;
        }
        if (isSuperset) {
          currentExercise = currentExercise === "squats" ? "pushups" : "squats";
        }
        lastIndex = nextIndex + i;
      }
    } else if (flipMode === "og") {
      // OG: Flip again if under 20 reps
      let totalReps = 0;
      let idx = nextIndex;
      while (totalReps < 20 && idx < deck.length) {
        const card = deck[idx];
        const exercise =
          exerciseType === "pushups"
            ? "pushups"
            : exerciseType === "squats"
              ? "squats"
              : currentExercise;
        cardsToFlip.push({ ...card, exercise });
        totalReps += card.value;
        if (exercise === "pushups") {
          newPushups += card.value;
        } else {
          newSquats += card.value;
        }
        if (isSuperset) {
          currentExercise = currentExercise === "squats" ? "pushups" : "squats";
        }
        lastIndex = idx;
        idx++;
      }
    } else if (flipMode === "podfather") {
      // Pod Father: Flip while under 30 reps
      let totalReps = 0;
      let idx = nextIndex;
      while (totalReps < 30 && idx < deck.length) {
        const card = deck[idx];
        const exercise =
          exerciseType === "pushups"
            ? "pushups"
            : exerciseType === "squats"
              ? "squats"
              : currentExercise;
        cardsToFlip.push({ ...card, exercise });
        totalReps += card.value;
        if (exercise === "pushups") {
          newPushups += card.value;
        } else {
          newSquats += card.value;
        }
        if (isSuperset) {
          currentExercise = currentExercise === "squats" ? "pushups" : "squats";
        }
        lastIndex = idx;
        idx++;
      }
    } else {
      // Default to alternating (for superset) or single card behavior
      const card = deck[nextIndex];
      const exercise =
        exerciseType === "pushups"
          ? "pushups"
          : exerciseType === "squats"
            ? "squats"
            : currentExercise;
      cardsToFlip = [{ ...card, exercise }];
      if (exercise === "pushups") {
        newPushups = card.value;
      } else {
        newSquats = card.value;
      }
      if (isSuperset) {
        currentExercise = currentExercise === "squats" ? "pushups" : "squats";
      }
      lastIndex = nextIndex;
    }

    setActiveCards(cardsToFlip);
    setCurrentCardIndex(lastIndex);

    if (newPushups > 0) {
      setTotalPushups((prev) => prev + newPushups);
    }
    if (newSquats > 0) {
      setTotalSquats((prev) => prev + newSquats);
    }

    setAlternatingExercise(currentExercise);

    // Check if workout is complete after flipping
    if (lastIndex >= deck.length - 1) {
      completeWorkout();
    }
  }, [
    workoutState,
    currentCardIndex,
    deck,
    alternatingExercise,
    flipMode,
    exerciseType,
    startTimer,
    completeWorkout,
  ]);

  const handleQuit = useCallback(() => {
    if (Platform.OS === "web") {
      if (
        confirm(
          "Quit this official run? Your progress will be lost and this run will be marked as DNF.",
        )
      ) {
        navigation.goBack();
      }
    } else {
      Alert.alert(
        "QUIT RUN",
        "This is an official Rec Yard run. Quitting will mark this as DNF (Did Not Finish).",
        [
          { text: "CONTINUE", style: "cancel" },
          {
            text: "QUIT",
            style: "destructive",
            onPress: async () => {
              try {
                await supabase
                  .from("rec_yard_runs")
                  .update({ status: "dnf" })
                  .eq("id", runId);
              } catch (err) {
                console.error("[RecYardWorkout] Failed to mark DNF:", err);
              }
              navigation.goBack();
            },
          },
        ],
      );
    }
  }, [navigation, runId]);

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.95);
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1);
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const countdownAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countdownScale.value }],
  }));

  const openDiscord = () => {
    Linking.openURL("https://discord.gg/yard-workout");
  };

  const renderCountdown = () => (
    <Animated.View entering={FadeIn} style={styles.countdownContainer}>
      <View style={styles.runCodeBanner}>
        <ThemedText style={styles.runCodeLabel}>OFFICIAL RUN</ThemedText>
        <ThemedText style={styles.runCodeValue}>{runCode}</ThemedText>
      </View>

      <ThemedText style={styles.countdownLabel}>GET READY</ThemedText>
      <Animated.Text style={[styles.countdownNumber, countdownAnimatedStyle]}>
        {countdown}
      </Animated.Text>

      <View style={styles.rulesReminder}>
        <ThemedText style={styles.rulesText}>
          {exerciseType.toUpperCase()} /{" "}
          {intensity.replace(/_/g, " ").toUpperCase()}
        </ThemedText>
        <ThemedText style={styles.rulesSubtext}>
          {/* Superset modes */}
          {flipMode === "alternating"
            ? "TAG TEAM - Alternate each card"
            : flipMode === "split2"
              ? "DOUBLE DOWN - 2 cards split"
              : flipMode === "split4"
                ? "SQUAD LEAD - 4 cards split"
                : flipMode === "splitunder20"
                  ? "OVERKILL - Draw while <20"
                  : /* Regular flip modes */
                    flipMode === "freshfish"
                    ? "FRESH FISH - 1 card at a time"
                    : flipMode === "trustee"
                      ? "TRUSTEE - 2 cards at a time"
                      : flipMode === "og"
                        ? "OG - Flip until 20+ reps"
                        : flipMode === "podfather"
                          ? "POD FATHER - Flip until 30+ reps"
                          : "1 card at a time"}
        </ThemedText>
        <ThemedText style={styles.rulesSubtext}>No pausing allowed</ThemedText>
      </View>
    </Animated.View>
  );

  const renderActiveState = () => (
    <Animated.View entering={FadeIn} style={styles.activeContent}>
      <View style={styles.topRow}>
        <Pressable onPress={handleQuit} style={styles.quitButton}>
          <Feather name="x" size={20} color={Colors.dark.textSecondary} />
          <ThemedText style={styles.quitText}>QUIT</ThemedText>
        </Pressable>

        <View style={styles.runCodeSmall}>
          <ThemedText style={styles.runCodeSmallText}>{runCode}</ThemedText>
        </View>

        <View style={styles.timerContainer}>
          <ThemedText style={styles.timerText}>
            {formatDuration(timer)}
          </ThemedText>
        </View>
      </View>

      {activeCards.length > 0 ? (
        <View style={styles.cardContainer}>
          <View style={styles.exerciseBadge}>
            <ThemedText style={styles.exerciseText}>
              {activeCards.length === 1
                ? `${activeCards[0].value} ${activeCards[0].exercise?.toUpperCase() || exerciseType.toUpperCase()}`
                : `${activeCards.reduce((sum, c) => sum + c.value, 0)} TOTAL REPS`}
            </ThemedText>
          </View>
          {activeCards.length === 1 ? (
            <PlayingCard
              card={activeCards[0]}
              isFlipped={true}
              size="large"
              deckStyleId={deckStyle.id}
            />
          ) : (
            <View style={styles.multiCardContainer}>
              {activeCards.slice(0, 4).map((card, idx) => (
                <View key={idx} style={styles.miniCardWrapper}>
                  <PlayingCard
                    card={card}
                    isFlipped={true}
                    size="small"
                    deckStyleId={deckStyle.id}
                  />
                  <ThemedText style={styles.miniCardReps}>
                    {card.value}{" "}
                    {card.exercise?.toUpperCase().slice(0, 4) || ""}
                  </ThemedText>
                </View>
              ))}
              {activeCards.length > 4 && (
                <ThemedText style={styles.moreCardsText}>
                  +{activeCards.length - 4} more
                </ThemedText>
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.cardContainer}>
          <DeckStack
            cardsRemaining={52}
            totalCards={52}
            deckStyleId={deckStyle.id}
          />
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

      <View style={styles.buttonSpacer} />
      <AnimatedPressable
        onPress={flipCard}
        onPressIn={handleButtonPressIn}
        onPressOut={handleButtonPressOut}
        style={[styles.flipButton, animatedButtonStyle]}
      >
        <ThemedText style={styles.flipButtonText}>FLIP</ThemedText>
      </AnimatedPressable>
    </Animated.View>
  );

  const renderCompleteState = () => (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={styles.completeContainer}
    >
      <View style={styles.runCodeBanner}>
        <ThemedText style={styles.runCodeLabel}>
          OFFICIAL RUN COMPLETE
        </ThemedText>
        <ThemedText style={styles.runCodeValue}>{runCode}</ThemedText>
      </View>

      <ThemedText style={styles.completeTime}>
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

      <View style={styles.discordSection}>
        <ThemedText style={styles.discordTitle}>POST YOUR PROOF</ThemedText>
        <ThemedText style={styles.discordSubtext}>
          Record your run and post it to the YARD Discord with your run code to
          verify your time
        </ThemedText>
        <Pressable style={styles.discordButton} onPress={openDiscord}>
          <Feather
            name="message-circle"
            size={20}
            color={Colors.dark.backgroundRoot}
          />
          <ThemedText style={styles.discordButtonText}>OPEN DISCORD</ThemedText>
        </Pressable>
      </View>

      <Pressable style={styles.doneButton} onPress={() => navigation.goBack()}>
        <ThemedText style={styles.doneButtonText}>BACK TO REC YARD</ThemedText>
      </Pressable>
    </Animated.View>
  );

  return (
    <ConcreteBackground intensity="medium" showCracks={true} accentGlow={true}>
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        {workoutState === "countdown" && renderCountdown()}
        {workoutState === "active" && renderActiveState()}
        {workoutState === "complete" && renderCompleteState()}
      </View>
    </ConcreteBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  countdownContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  runCodeBanner: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  runCodeLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.backgroundRoot,
    opacity: 0.8,
  },
  runCodeValue: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 2,
    color: Colors.dark.backgroundRoot,
    marginTop: Spacing.xs,
  },
  countdownLabel: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 3,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.md,
  },
  countdownNumber: {
    fontSize: 120,
    fontWeight: "900",
    color: Colors.dark.chalk,
    fontVariant: ["tabular-nums"],
  },
  rulesReminder: {
    alignItems: "center",
    marginTop: Spacing["3xl"],
  },
  rulesText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 3,
    color: Colors.dark.accent,
    marginBottom: Spacing.sm,
  },
  rulesSubtext: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xs,
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
  quitButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  quitText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
  },
  runCodeSmall: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  runCodeSmallText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    color: Colors.dark.backgroundRoot,
  },
  timerContainer: {
    alignItems: "flex-end",
  },
  timerText: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
    fontVariant: ["tabular-nums"],
  },
  cardContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
    minHeight: 280,
  },
  exerciseBadge: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.lg,
  },
  exerciseText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.backgroundRoot,
  },
  tapToStartText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.xl,
  },
  multiCardContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.md,
    maxWidth: 300,
  },
  miniCardWrapper: {
    alignItems: "center",
  },
  miniCardReps: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.xs,
  },
  moreCardsText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.accent,
    marginTop: Spacing.sm,
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
    flex: 1,
  },
  flipButton: {
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
  completeContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  completeTime: {
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: 3,
    color: Colors.dark.chalk,
    marginBottom: Spacing.xl,
  },
  finalStatsRow: {
    flexDirection: "row",
    gap: Spacing["3xl"],
    marginBottom: Spacing["3xl"],
  },
  finalStatCard: {
    alignItems: "center",
  },
  finalStatValue: {
    fontSize: 36,
    fontWeight: "800",
  },
  finalStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.xs,
  },
  discordSection: {
    backgroundColor: Colors.dark.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  discordTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.chalk,
    marginBottom: Spacing.sm,
  },
  discordSubtext: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  discordButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
  },
  discordButtonText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.backgroundRoot,
  },
  doneButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
  },
});
