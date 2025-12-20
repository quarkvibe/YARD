import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import {
  getSettings,
  getWorkouts,
  getBestTime,
  getRuleSetById,
  formatDuration,
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
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  const [ruleSetName, setRuleSetName] = useState("STANDARD");
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [totalWorkouts, setTotalWorkouts] = useState(0);

  const buttonScale = useSharedValue(1);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const settings = await getSettings();
    const ruleSet = getRuleSetById(settings.selectedRuleSetId);
    setRuleSetName(ruleSet.name);

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
    <ThemedView style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing["3xl"] }]}>
        <Animated.View entering={FadeIn.delay(100)} style={styles.brandSection}>
          <ThemedText style={styles.brandTitle}>YARD</ThemedText>
          <ThemedText style={styles.tagline}>FLIP. MOVE. FINISH.</ThemedText>
        </Animated.View>

        {bestTime !== null ? (
          <Animated.View entering={FadeIn.delay(200)} style={styles.bestTimeSection}>
            <ThemedText style={styles.bestTimeLabel}>BEST TIME</ThemedText>
            <ThemedText style={styles.bestTimeValue}>{formatDuration(bestTime)}</ThemedText>
            <ThemedText style={styles.ruleSetLabel}>{ruleSetName}</ThemedText>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeIn.delay(300)} style={styles.actionSection}>
          <AnimatedPressable
            onPress={() => navigation.navigate("WorkoutTab")}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[styles.startButton, animatedButtonStyle]}
          >
            <ThemedText style={styles.startButtonText}>START WORKOUT</ThemedText>
          </AnimatedPressable>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(400)} style={styles.linksSection}>
          <Pressable
            style={styles.linkButton}
            onPress={() => navigation.navigate("SettingsTab")}
          >
            <Feather name="sliders" size={18} color={theme.textSecondary} />
            <ThemedText style={styles.linkText}>RULESET</ThemedText>
          </Pressable>

          <Pressable
            style={styles.linkButton}
            onPress={() => navigation.navigate("HistoryTab")}
          >
            <Feather name="clock" size={18} color={theme.textSecondary} />
            <ThemedText style={styles.linkText}>HISTORY</ThemedText>
          </Pressable>

          <Pressable
            style={styles.linkButton}
            onPress={() => navigation.navigate("RecYardTab")}
          >
            <Feather name="award" size={18} color={theme.textSecondary} />
            <ThemedText style={styles.linkText}>REC YARD</ThemedText>
          </Pressable>

          <Pressable
            style={styles.linkButton}
            onPress={() => navigation.navigate("SettingsTab")}
          >
            <Feather name="settings" size={18} color={theme.textSecondary} />
            <ThemedText style={styles.linkText}>SETTINGS</ThemedText>
          </Pressable>
        </Animated.View>

        {totalWorkouts > 0 ? (
          <Animated.View entering={FadeIn.delay(500)} style={styles.tallySection}>
            <TallyMarks count={totalWorkouts} />
          </Animated.View>
        ) : null}
      </View>
    </ThemedView>
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
    fontSize: 72,
    fontWeight: "900",
    letterSpacing: 12,
    color: Colors.dark.chalk,
  },
  tagline: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 4,
    color: Colors.dark.accent,
    marginTop: Spacing.md,
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
  linksSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.xl,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  linkText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
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
});
