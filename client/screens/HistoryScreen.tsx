import React, { useState, useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable, Share } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ConcreteBackground } from "@/components/ConcreteBackground";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import {
  getWorkouts,
  getBestTime,
  formatDuration,
  WorkoutRecord,
  DEFAULT_RULE_SETS,
  getProfile,
} from "@/lib/storage";

export default function HistoryScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [bestTimes, setBestTimes] = useState<Record<string, number | null>>({});

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    const loadedWorkouts = await getWorkouts();
    setWorkouts(loadedWorkouts);

    const times: Record<string, number | null> = {};
    for (const ruleSet of DEFAULT_RULE_SETS) {
      times[ruleSet.id] = getBestTime(loadedWorkouts, ruleSet.id);
    }
    setBestTimes(times);
  };

  const handleShareWorkout = async (workout: WorkoutRecord) => {
    try {
      const profile = await getProfile();
      const handle = profile.handle ? `@${profile.handle}` : "";
      const socials = [
        profile.instagram && `IG: @${profile.instagram}`,
        profile.tiktok && `TT: @${profile.tiktok}`,
        profile.twitter && `X: @${profile.twitter}`,
      ]
        .filter(Boolean)
        .join(" | ");

      let message = `YARD WORKOUT COMPLETE\n\n`;
      message += `${formatDate(workout.date)}\n`;
      message += `Time: ${formatDuration(workout.duration)}\n`;
      message += `Pushups: ${workout.totalPushups}\n`;
      message += `Squats: ${workout.totalSquats}\n`;
      message += `Mode: ${workout.ruleSetName}\n`;

      if (workout.isPracticeMode) {
        message += `[VERIFIED]\n`;
      }

      if (handle) {
        message += `\n${handle}`;
      }
      if (socials) {
        message += `\n${socials}`;
      }

      message += `\n\nDownload YARD and start your sentence.`;

      await Share.share({ message });
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date
      .toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      .toUpperCase();
  };

  const renderWorkoutItem = ({
    item,
    index,
  }: {
    item: WorkoutRecord;
    index: number;
  }) => (
    <Animated.View
      entering={FadeIn.delay(index * 50)}
      style={styles.workoutItem}
    >
      <View style={styles.workoutHeader}>
        <View style={styles.workoutDateRow}>
          <ThemedText style={styles.workoutDate}>
            {formatDate(item.date)}
          </ThemedText>
          {/* Practice Mode Icon */}
          {item.isPracticeMode ? (
            <View style={styles.practiceModeBadge}>
              <Feather name="target" size={12} color={Colors.dark.accent} />
            </View>
          ) : null}
          {/* Official Submission Icon */}
          {item.isOfficialSubmission && (
            <View style={styles.officialBadge}>
              <Feather
                name="check-circle"
                size={12}
                color={Colors.dark.accent}
              />
            </View>
          )}
        </View>
        <ThemedText style={styles.workoutTime}>
          {formatDuration(item.duration)}
        </ThemedText>
      </View>
      <View style={styles.workoutDetails}>
        <ThemedText style={styles.workoutRuleSet}>
          {item.ruleSetName}
        </ThemedText>
        <View style={styles.workoutStats}>
          <ThemedText style={styles.statText}>
            {item.totalPushups} PUSHUPS
          </ThemedText>
          <ThemedText style={styles.statText}>
            {item.totalSquats} SQUATS
          </ThemedText>
        </View>
      </View>
      {/* Practice Mode Details */}
      {item.isPracticeMode && item.totalWorkTime && item.totalRestTime && (
        <View style={styles.practiceDetails}>
          <ThemedText style={styles.practiceDetailText}>
            WORK: {formatDuration(Math.floor(item.totalWorkTime / 1000))}
          </ThemedText>
          <ThemedText style={styles.practiceDetailText}>
            REST: {formatDuration(Math.floor(item.totalRestTime / 1000))}
          </ThemedText>
        </View>
      )}

      {/* Share Button */}
      <Pressable
        style={styles.shareItemButton}
        onPress={() => handleShareWorkout(item)}
      >
        <Feather name="share-2" size={14} color={Colors.dark.accent} />
        <ThemedText style={styles.shareItemButtonText}>SHARE</ThemedText>
      </Pressable>
    </Animated.View>
  );

  const renderBestTimes = () => (
    <View style={styles.bestTimesSection}>
      <ThemedText style={styles.sectionTitle}>PERSONAL BESTS</ThemedText>
      <View style={styles.bestTimesGrid}>
        {DEFAULT_RULE_SETS.map((ruleSet) => (
          <View key={ruleSet.id} style={styles.bestTimeCard}>
            <ThemedText style={styles.bestTimeRuleSet}>
              {ruleSet.name}
            </ThemedText>
            <ThemedText style={styles.bestTimeValue}>
              {bestTimes[ruleSet.id]
                ? formatDuration(bestTimes[ruleSet.id]!)
                : "--:--"}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="clock" size={48} color={theme.textSecondary} />
      <ThemedText style={styles.emptyTitle}>NO RECORDS YET</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        COMPLETE A WORKOUT TO SEE YOUR HISTORY
      </ThemedText>
    </View>
  );

  return (
    <ConcreteBackground intensity="light" showCracks={true}>
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        renderItem={renderWorkoutItem}
        ListHeaderComponent={renderBestTimes}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      />
    </ConcreteBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
  },
  bestTimesSection: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
  },
  bestTimesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  bestTimeCard: {
    backgroundColor: Colors.dark.cardBackground,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    minWidth: "45%",
    flex: 1,
  },
  bestTimeRuleSet: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xs,
  },
  bestTimeValue: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
  },
  workoutItem: {
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    marginBottom: Spacing.md,
  },
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  workoutDate: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },
  workoutTime: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
  },
  workoutDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  workoutRuleSet: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.accent,
  },
  workoutStats: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statText: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  // Practice mode styles
  workoutDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  practiceModeBadge: {
    marginLeft: Spacing.xs,
  },
  officialBadge: {
    marginLeft: Spacing.xs,
  },
  practiceDetails: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
  },
  practiceDetailText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },
  shareItemButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  shareItemButtonText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.accent,
  },
});
