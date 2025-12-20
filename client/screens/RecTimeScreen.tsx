import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

interface LeaderboardEntry {
  rank: number;
  handle: string;
  time: number;
}

const FAKE_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, handle: "IRONWILL", time: 1245 },
  { rank: 2, handle: "YARDDOG", time: 1302 },
  { rank: 3, handle: "STEELCAGE", time: 1378 },
  { rank: 4, handle: "LOCKDOWN", time: 1412 },
  { rank: 5, handle: "CHAINGANG", time: 1456 },
  { rank: 6, handle: "HARDTIME", time: 1502 },
  { rank: 7, handle: "CELLBLOCK", time: 1534 },
  { rank: 8, handle: "GRIT", time: 1578 },
  { rank: 9, handle: "DISCIPLINE", time: 1612 },
  { rank: 10, handle: "GRINDSTONE", time: 1645 },
];

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export default function RecTimeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const [isLocked, setIsLocked] = useState(true);

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => (
    <Animated.View entering={FadeIn.delay(index * 50)} style={styles.leaderboardItem}>
      <View style={styles.rankContainer}>
        <ThemedText style={[
          styles.rank,
          item.rank <= 3 ? { color: Colors.dark.accent } : null,
        ]}>
          {item.rank}
        </ThemedText>
      </View>
      <ThemedText style={styles.handle}>{item.handle}</ThemedText>
      <ThemedText style={styles.time}>{formatDuration(item.time)}</ThemedText>
    </Animated.View>
  );

  const renderLockedState = () => (
    <View style={styles.lockedContainer}>
      <View style={styles.lockedIcon}>
        <Feather name="lock" size={48} color={theme.textSecondary} />
      </View>
      <ThemedText style={styles.lockedTitle}>REC TIME</ThemedText>
      <ThemedText style={styles.lockedDescription}>
        ACCESS TO RANKINGS + WEEKLY DECK
      </ThemedText>
      <ThemedText style={styles.lockedPrice}>$1.99/MO</ThemedText>
      <ThemedText style={styles.lockedCancel}>CANCEL ANYTIME</ThemedText>

      <Pressable
        style={styles.unlockButton}
        onPress={() => setIsLocked(false)}
      >
        <ThemedText style={styles.unlockButtonText}>UNLOCK ACCESS</ThemedText>
      </Pressable>
    </View>
  );

  const renderUnlockedState = () => (
    <View style={styles.unlockedContainer}>
      <View style={styles.weeklyChallenge}>
        <ThemedText style={styles.challengeLabel}>WEEKLY CHALLENGE</ThemedText>
        <ThemedText style={styles.challengeRuleset}>STANDARD DECK</ThemedText>
        <ThemedText style={styles.challengeEnds}>ENDS IN 3 DAYS</ThemedText>

        <Pressable style={styles.clockInButton}>
          <ThemedText style={styles.clockInButtonText}>CLOCK IN</ThemedText>
        </Pressable>
      </View>

      <View style={styles.leaderboardSection}>
        <ThemedText style={styles.leaderboardTitle}>LEADERBOARD</ThemedText>
        <FlatList
          data={FAKE_LEADERBOARD}
          keyExtractor={(item) => item.rank.toString()}
          renderItem={renderLeaderboardItem}
          scrollEnabled={false}
        />
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[
        styles.content,
        {
          paddingTop: Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}>
        {isLocked ? renderLockedState() : renderUnlockedState()}
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
    paddingHorizontal: Spacing.xl,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  lockedIcon: {
    marginBottom: Spacing["2xl"],
  },
  lockedTitle: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 4,
    color: Colors.dark.chalk,
    marginBottom: Spacing.md,
  },
  lockedDescription: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing["2xl"],
    textAlign: "center",
  },
  lockedPrice: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.accent,
    marginBottom: Spacing.sm,
  },
  lockedCancel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing["3xl"],
  },
  unlockButton: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["3xl"],
    borderRadius: BorderRadius.sm,
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.backgroundRoot,
  },
  unlockedContainer: {
    flex: 1,
  },
  weeklyChallenge: {
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.xl,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    marginBottom: Spacing["2xl"],
    alignItems: "center",
  },
  challengeLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.accent,
    marginBottom: Spacing.sm,
  },
  challengeRuleset: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.chalk,
    marginBottom: Spacing.sm,
  },
  challengeEnds: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xl,
  },
  clockInButton: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing["2xl"],
    borderRadius: BorderRadius.sm,
  },
  clockInButtonText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.backgroundRoot,
  },
  leaderboardSection: {
    flex: 1,
  },
  leaderboardTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
  },
  leaderboardItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  rankContainer: {
    width: 32,
  },
  rank: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },
  handle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.chalk,
  },
  time: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
  },
});
