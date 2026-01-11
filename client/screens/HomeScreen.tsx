import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ConcreteBackground } from "@/components/ConcreteBackground";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import {
  getSettings,
  getWorkouts,
  getBestTime,
  getRuleSetById,
  formatDuration,
  getExerciseTypeById,
  getSupersetModeById,
} from "@/lib/storage";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TallyMarks({ count }: { count: number }) {
  const groups = Math.floor(count / 5);
  const remainder = count % 5;

  const renderTallyGroup = (key: number) => (
    <View key={key} style={styles.tallyGroup}>
      <View style={styles.tallyMark} />
      <View style={styles.tallyMark} />
      <View style={styles.tallyMark} />
      <View style={styles.tallyMark} />
      <View style={[styles.tallyMark, styles.tallyStrike]} />
    </View>
  );

  const renderPartialTally = (marks: number) => (
    <View style={styles.tallyGroup}>
      {Array.from({ length: marks }).map((_, i) => (
        <View key={i} style={styles.tallyMark} />
      ))}
    </View>
  );

  const displayGroups = Math.min(groups, 20);
  const hasOverflow = groups > 20;

  return (
    <View style={styles.tallyContainer}>
      {Array.from({ length: displayGroups }).map((_, i) => renderTallyGroup(i))}
      {!hasOverflow && remainder > 0 ? renderPartialTally(remainder) : null}
      {hasOverflow ? (
        <ThemedText style={styles.tallyOverflow}>+{count - 100}</ThemedText>
      ) : null}
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();

  const [ruleSetName, setRuleSetName] = useState("MISDEMEANOR");
  const [exerciseTypeName, setExerciseTypeName] = useState("SUPERSET");
  const [supersetModeName, setSupersetModeName] = useState("ALTERNATING");
  const [isSuperset, setIsSuperset] = useState(true);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [totalWorkouts, setTotalWorkouts] = useState(0);

  const buttonScale = useSharedValue(1);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    const settings = await getSettings();
    const ruleSet = getRuleSetById(settings.selectedRuleSetId);
    const exerciseType = getExerciseTypeById(settings.selectedExerciseType);
    const supersetMode = getSupersetModeById(settings.selectedSupersetModeId);
    setRuleSetName(ruleSet.name);
    setExerciseTypeName(exerciseType.name);
    setSupersetModeName(supersetMode.name);
    setIsSuperset(settings.selectedExerciseType === "superset");

    const workouts = await getWorkouts();
    setTotalWorkouts(workouts.length);
    const best = getBestTime(workouts, ruleSet.id);
    setBestTime(best);
  };

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.95, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <ConcreteBackground intensity="medium" showCracks={true} accentGlow={true}>
      <View
        style={[styles.content, { paddingTop: insets.top + Spacing["3xl"] }]}
      >
        <Animated.View entering={FadeIn.delay(100)} style={styles.brandSection}>
          <ThemedText style={styles.brandTitle}>YARD</ThemedText>
          <ThemedText style={styles.tagline}>FLIP. MOVE. FINISH.</ThemedText>
        </Animated.View>

        {bestTime !== null ? (
          <Animated.View
            entering={FadeIn.delay(200)}
            style={styles.bestTimeSection}
          >
            <ThemedText style={styles.bestTimeLabel}>BEST TIME</ThemedText>
            <ThemedText style={styles.bestTimeValue}>
              {formatDuration(bestTime)}
            </ThemedText>
            <ThemedText style={styles.ruleSetLabel}>{ruleSetName}</ThemedText>
          </Animated.View>
        ) : null}

        <Animated.View
          entering={FadeIn.delay(250)}
          style={styles.configSection}
        >
          <Pressable
            style={styles.configCard}
            onPress={() => navigation.navigate("WorkoutTab")}
          >
            <ThemedText style={styles.configLabel}>EXERCISE</ThemedText>
            <ThemedText style={styles.configValue}>
              {exerciseTypeName}
            </ThemedText>
          </Pressable>
          <Pressable
            style={styles.configCard}
            onPress={() => navigation.navigate("WorkoutTab")}
          >
            <ThemedText style={styles.configLabel}>INTENSITY</ThemedText>
            <ThemedText style={styles.configValue}>{ruleSetName}</ThemedText>
          </Pressable>
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(320)}
          style={styles.tapHintContainer}
        >
          <ThemedText style={styles.tapHintText}>
            TAP OPTIONS TO CUSTOMIZE
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(350)}
          style={styles.actionSection}
        >
          <AnimatedPressable
            onPress={() => navigation.navigate("WorkoutTab")}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[styles.startButton, animatedButtonStyle]}
          >
            <ThemedText style={styles.startButtonText}>
              START WORKOUT
            </ThemedText>
          </AnimatedPressable>
        </Animated.View>

        {totalWorkouts > 0 ? (
          <Animated.View
            entering={FadeIn.delay(400)}
            style={styles.tallySection}
          >
            <TallyMarks count={totalWorkouts} />
          </Animated.View>
        ) : null}
      </View>
    </ConcreteBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing["2xl"],
    justifyContent: "center",
  },
  brandSection: {
    alignItems: "center",
    marginBottom: Spacing["4xl"],
  },
  brandTitle: {
    fontSize: 80,
    fontWeight: "900",
    letterSpacing: 20,
    color: Colors.dark.chalk,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  tagline: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 6,
    color: Colors.dark.accent,
    marginTop: Spacing.lg,
  },
  bestTimeSection: {
    alignItems: "center",
    marginBottom: Spacing["4xl"],
    paddingVertical: Spacing.xl,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  bestTimeLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.sm,
  },
  bestTimeValue: {
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: 4,
    color: Colors.dark.chalk,
  },
  ruleSetLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.accent,
    marginTop: Spacing.sm,
  },
  configSection: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  configCard: {
    flex: 1,
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    alignItems: "center",
  },
  supersetModeSection: {
    marginBottom: Spacing["2xl"],
  },
  supersetModeCard: {
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    alignItems: "center",
  },
  configLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xs,
  },
  configValue: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.accent,
  },
  actionSection: {
    alignItems: "center",
    marginBottom: Spacing["4xl"],
  },
  startButton: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["4xl"],
    borderRadius: BorderRadius.sm,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 3,
    color: Colors.dark.backgroundRoot,
  },
  tallySection: {
    position: "absolute",
    bottom: Spacing["4xl"],
    left: Spacing["2xl"],
  },
  tallyContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    opacity: 0.3,
  },
  tallyGroup: {
    flexDirection: "row",
    gap: 3,
    position: "relative",
  },
  tallyMark: {
    width: 2,
    height: 24,
    backgroundColor: Colors.dark.textSecondary,
    transform: [{ rotate: "-10deg" }],
  },
  tallyStrike: {
    position: "absolute",
    width: 28,
    height: 2,
    top: 11,
    left: -3,
    transform: [{ rotate: "30deg" }],
  },
  tallyOverflow: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.textSecondary,
    alignSelf: "center",
  },
  tapHintContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  tapHintText: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    opacity: 0.6,
  },
});
