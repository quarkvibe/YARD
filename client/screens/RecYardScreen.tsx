import React, { useState, useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable, ScrollView } from "react-native";
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
  verified: boolean;
}

interface RecYardProfile {
  handle: string;
  photoUri: string | null;
  instagram: string;
  facebook: string;
  bestTime: number | null;
  totalWorkouts: number;
}

const FAKE_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, handle: "IRONWILL", time: 1245, verified: true },
  { rank: 2, handle: "YARDDOG", time: 1302, verified: true },
  { rank: 3, handle: "STEELCAGE", time: 1378, verified: true },
  { rank: 4, handle: "LOCKDOWN", time: 1412, verified: false },
  { rank: 5, handle: "CHAINGANG", time: 1456, verified: true },
  { rank: 6, handle: "HARDTIME", time: 1502, verified: false },
  { rank: 7, handle: "CELLBLOCK", time: 1534, verified: true },
  { rank: 8, handle: "GRIT", time: 1578, verified: true },
  { rank: 9, handle: "DISCIPLINE", time: 1612, verified: false },
  { rank: 10, handle: "GRINDSTONE", time: 1645, verified: true },
];

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export default function RecYardScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const [isLocked, setIsLocked] = useState(true);
  const [activeTab, setActiveTab] = useState<"leaderboard" | "profile">("leaderboard");
  const [profile, setProfile] = useState<RecYardProfile>({
    handle: "",
    photoUri: null,
    instagram: "",
    facebook: "",
    bestTime: null,
    totalWorkouts: 0,
  });

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
      <View style={styles.handleContainer}>
        <ThemedText style={styles.handle}>{item.handle}</ThemedText>
        {item.verified ? (
          <View style={styles.verifiedBadge}>
            <Feather name="check-circle" size={12} color={Colors.dark.accent} />
          </View>
        ) : null}
      </View>
      <ThemedText style={styles.time}>{formatDuration(item.time)}</ThemedText>
    </Animated.View>
  );

  const renderLockedState = () => (
    <View style={styles.lockedContainer}>
      <View style={styles.lockedIcon}>
        <Feather name="lock" size={48} color={theme.textSecondary} />
      </View>
      <ThemedText style={styles.lockedTitle}>REC YARD</ThemedText>
      <ThemedText style={styles.lockedSubtitle}>COMPETITIVE MODE</ThemedText>
      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <Feather name="check" size={16} color={Colors.dark.accent} />
          <ThemedText style={styles.featureText}>GLOBAL LEADERBOARD</ThemedText>
        </View>
        <View style={styles.featureItem}>
          <Feather name="check" size={16} color={Colors.dark.accent} />
          <ThemedText style={styles.featureText}>VERIFIED TIMES</ThemedText>
        </View>
        <View style={styles.featureItem}>
          <Feather name="check" size={16} color={Colors.dark.accent} />
          <ThemedText style={styles.featureText}>PUBLIC PROFILE</ThemedText>
        </View>
        <View style={styles.featureItem}>
          <Feather name="check" size={16} color={Colors.dark.accent} />
          <ThemedText style={styles.featureText}>WEEKLY CHALLENGES</ThemedText>
        </View>
      </View>
      <ThemedText style={styles.lockedPrice}>$2.99/MO</ThemedText>
      <ThemedText style={styles.lockedCancel}>CANCEL ANYTIME</ThemedText>

      <Pressable
        style={styles.unlockButton}
        onPress={() => setIsLocked(false)}
      >
        <ThemedText style={styles.unlockButtonText}>ENTER THE YARD</ThemedText>
      </Pressable>
    </View>
  );

  const renderProfileTab = () => (
    <ScrollView style={styles.profileContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        <Pressable style={styles.avatarContainer}>
          {profile.photoUri ? (
            <View style={styles.avatarPlaceholder}>
              <Feather name="user" size={48} color={Colors.dark.textSecondary} />
            </View>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Feather name="camera" size={32} color={Colors.dark.textSecondary} />
              <ThemedText style={styles.avatarText}>ADD PHOTO</ThemedText>
            </View>
          )}
        </Pressable>

        <View style={styles.handleInput}>
          <ThemedText style={styles.inputLabel}>HANDLE</ThemedText>
          <View style={styles.inputBox}>
            <ThemedText style={styles.inputPrefix}>@</ThemedText>
            <ThemedText style={styles.inputPlaceholder}>
              {profile.handle || "YOUR_HANDLE"}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue}>
            {profile.bestTime ? formatDuration(profile.bestTime) : "--:--"}
          </ThemedText>
          <ThemedText style={styles.statLabel}>BEST TIME</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue}>{profile.totalWorkouts}</ThemedText>
          <ThemedText style={styles.statLabel}>WORKOUTS</ThemedText>
        </View>
      </View>

      <ThemedText style={styles.sectionTitle}>SOCIAL LINKS</ThemedText>
      
      <View style={styles.socialCard}>
        <View style={styles.socialItem}>
          <View style={styles.socialIcon}>
            <Feather name="instagram" size={20} color={Colors.dark.chalk} />
          </View>
          <View style={styles.socialInput}>
            <ThemedText style={styles.socialPrefix}>@</ThemedText>
            <ThemedText style={styles.socialPlaceholder}>
              {profile.instagram || "instagram_handle"}
            </ThemedText>
          </View>
          <Pressable style={styles.editButton}>
            <Feather name="edit-2" size={16} color={Colors.dark.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.socialItem}>
          <View style={styles.socialIcon}>
            <Feather name="facebook" size={20} color={Colors.dark.chalk} />
          </View>
          <View style={styles.socialInput}>
            <ThemedText style={styles.socialPlaceholder}>
              {profile.facebook || "facebook.com/profile"}
            </ThemedText>
          </View>
          <Pressable style={styles.editButton}>
            <Feather name="edit-2" size={16} color={Colors.dark.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ThemedText style={styles.sectionTitle}>VERIFICATION</ThemedText>

      <View style={styles.verificationCard}>
        <View style={styles.verificationHeader}>
          <Feather name="shield" size={24} color={Colors.dark.accent} />
          <ThemedText style={styles.verificationTitle}>PROOF SYSTEM</ThemedText>
        </View>
        <ThemedText style={styles.verificationText}>
          Times submitted to the leaderboard require camera verification to prevent fraud. 
          Your front camera will record a brief clip during verified workouts.
        </ThemedText>
        <View style={styles.verificationStatus}>
          <Feather name="check-circle" size={16} color={Colors.dark.textSecondary} />
          <ThemedText style={styles.verificationStatusText}>NOT ENROLLED</ThemedText>
        </View>
      </View>
    </ScrollView>
  );

  const renderLeaderboardTab = () => (
    <View style={styles.leaderboardContainer}>
      <View style={styles.weeklyChallenge}>
        <ThemedText style={styles.challengeLabel}>WEEKLY CHALLENGE</ThemedText>
        <ThemedText style={styles.challengeRuleset}>STANDARD DECK</ThemedText>
        <ThemedText style={styles.challengeEnds}>ENDS IN 3 DAYS</ThemedText>

        <Pressable style={styles.clockInButton}>
          <Feather name="video" size={16} color={Colors.dark.backgroundRoot} style={{ marginRight: 8 }} />
          <ThemedText style={styles.clockInButtonText}>CLOCK IN</ThemedText>
        </Pressable>
      </View>

      <View style={styles.leaderboardSection}>
        <View style={styles.leaderboardHeader}>
          <ThemedText style={styles.leaderboardTitle}>LEADERBOARD</ThemedText>
          <View style={styles.verifiedLegend}>
            <Feather name="check-circle" size={12} color={Colors.dark.accent} />
            <ThemedText style={styles.verifiedLegendText}>VERIFIED</ThemedText>
          </View>
        </View>
        <FlatList
          data={FAKE_LEADERBOARD}
          keyExtractor={(item) => item.rank.toString()}
          renderItem={renderLeaderboardItem}
          scrollEnabled={false}
        />
      </View>
    </View>
  );

  const renderUnlockedState = () => (
    <View style={styles.unlockedContainer}>
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === "leaderboard" && styles.tabActive]}
          onPress={() => setActiveTab("leaderboard")}
        >
          <Feather 
            name="award" 
            size={18} 
            color={activeTab === "leaderboard" ? Colors.dark.accent : Colors.dark.textSecondary} 
          />
          <ThemedText style={[
            styles.tabText, 
            activeTab === "leaderboard" && styles.tabTextActive
          ]}>
            BOARD
          </ThemedText>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === "profile" && styles.tabActive]}
          onPress={() => setActiveTab("profile")}
        >
          <Feather 
            name="user" 
            size={18} 
            color={activeTab === "profile" ? Colors.dark.accent : Colors.dark.textSecondary} 
          />
          <ThemedText style={[
            styles.tabText, 
            activeTab === "profile" && styles.tabTextActive
          ]}>
            PROFILE
          </ThemedText>
        </Pressable>
      </View>

      {activeTab === "leaderboard" ? renderLeaderboardTab() : renderProfileTab()}
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
    marginBottom: Spacing.xs,
  },
  lockedSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.accent,
    marginBottom: Spacing["2xl"],
  },
  featureList: {
    marginBottom: Spacing["2xl"],
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  featureText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
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
  tabBar: {
    flexDirection: "row",
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.cardBackground,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  tabActive: {
    borderColor: Colors.dark.accent,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
  },
  tabTextActive: {
    color: Colors.dark.accent,
  },
  leaderboardContainer: {
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
    flexDirection: "row",
    alignItems: "center",
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
  leaderboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  leaderboardTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
  },
  verifiedLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  verifiedLegendText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
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
  handleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  handle: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.chalk,
  },
  verifiedBadge: {},
  time: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
  },
  profileContainer: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  avatarContainer: {
    marginBottom: Spacing.xl,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.cardBackground,
    borderWidth: 2,
    borderColor: Colors.dark.cardBorder,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.sm,
  },
  handleInput: {
    width: "100%",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  inputPrefix: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.accent,
    marginRight: Spacing.xs,
  },
  inputPlaceholder: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.chalk,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.md,
  },
  socialCard: {
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    marginBottom: Spacing["2xl"],
  },
  socialItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  socialIcon: {
    width: 32,
    alignItems: "center",
  },
  socialInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  socialPrefix: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.accent,
    marginRight: 2,
  },
  socialPlaceholder: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.dark.textSecondary,
  },
  editButton: {
    padding: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.cardBorder,
    marginVertical: Spacing.md,
  },
  verificationCard: {
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.xl,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    marginBottom: Spacing["2xl"],
  },
  verificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
  },
  verificationText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
  },
  verificationStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  verificationStatusText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },
});
