import React, { useState, useCallback } from "react";
import { ScrollView, View, StyleSheet, RefreshControl } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import {
  getWorkouts,
  WorkoutRecord,
  formatDuration,
  DEFAULT_RULE_SETS,
  getBestTime,
} from "@/lib/storage";

export default function StatsScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadWorkouts = useCallback(async () => {
    const data = await getWorkouts();
    setWorkouts(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [loadWorkouts])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkouts();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const totalWorkouts = workouts.length;
  const completedWorkouts = workouts.filter((w) => w.cardsCompleted === 52);
  const totalPushups = workouts.reduce((sum, w) => sum + w.totalPushups, 0);
  const totalSquats = workouts.reduce((sum, w) => sum + w.totalSquats, 0);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="activity" size={64} color={theme.textSecondary} />
      <ThemedText type="h3" style={styles.emptyTitle}>
        No workouts yet
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
        Complete your first deck workout to see your stats here!
      </ThemedText>
    </View>
  );

  const renderPersonalRecords = () => (
    <Card style={styles.prCard} elevation={1}>
      <View style={styles.prHeader}>
        <Feather name="award" size={24} color={Colors.dark.success} />
        <ThemedText type="h4">Personal Records</ThemedText>
      </View>

      <View style={styles.prGrid}>
        {DEFAULT_RULE_SETS.map((ruleSet) => {
          const best = getBestTime(workouts, ruleSet.id);
          return (
            <View key={ruleSet.id} style={styles.prItem}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {ruleSet.name}
              </ThemedText>
              <ThemedText type="h3" style={styles.prTime}>
                {best !== null ? formatDuration(best) : "--:--"}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </Card>
  );

  const renderOverallStats = () => (
    <Card style={styles.statsCard} elevation={1}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        All-Time Stats
      </ThemedText>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <ThemedText type="h2" style={{ color: theme.accent }}>
            {completedWorkouts.length}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Workouts
          </ThemedText>
        </View>
        <View style={styles.statBox}>
          <ThemedText type="h2" style={{ color: Colors.dark.pushups }}>
            {totalPushups.toLocaleString()}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Pushups
          </ThemedText>
        </View>
        <View style={styles.statBox}>
          <ThemedText type="h2" style={{ color: Colors.dark.squats }}>
            {totalSquats.toLocaleString()}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Squats
          </ThemedText>
        </View>
      </View>
    </Card>
  );

  const renderWorkoutHistory = () => (
    <View style={styles.historySection}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        Recent Workouts
      </ThemedText>

      {workouts.slice(0, 10).map((workout) => (
        <Card key={workout.id} style={styles.workoutItem} elevation={1}>
          <View style={styles.workoutHeader}>
            <View>
              <ThemedText type="body" style={styles.workoutDate}>
                {formatDate(workout.date)}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {workout.ruleSetName} Rules
              </ThemedText>
            </View>
            <View style={styles.workoutTime}>
              <Feather name="clock" size={16} color={theme.accent} />
              <ThemedText type="h4" style={{ color: theme.accent }}>
                {formatDuration(workout.duration)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.workoutStats}>
            <View style={styles.workoutStatItem}>
              <ThemedText type="body" style={{ color: Colors.dark.pushups }}>
                {workout.totalPushups}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                pushups
              </ThemedText>
            </View>
            <View style={styles.workoutStatItem}>
              <ThemedText type="body" style={{ color: Colors.dark.squats }}>
                {workout.totalSquats}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                squats
              </ThemedText>
            </View>
            <View style={styles.workoutStatItem}>
              <ThemedText type="body">{workout.cardsCompleted}/52</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                cards
              </ThemedText>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
      }
    >
      {workouts.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {renderPersonalRecords()}
          {renderOverallStats()}
          {renderWorkoutHistory()}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    textAlign: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  prCard: {
    marginBottom: Spacing.lg,
  },
  prHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  prGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  prItem: {
    alignItems: "center",
  },
  prTime: {
    marginTop: Spacing.xs,
  },
  statsCard: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statBox: {
    alignItems: "center",
  },
  historySection: {
    marginTop: Spacing.sm,
  },
  workoutItem: {
    marginBottom: Spacing.md,
  },
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  workoutDate: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  workoutTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  workoutStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  workoutStatItem: {
    alignItems: "center",
  },
});
