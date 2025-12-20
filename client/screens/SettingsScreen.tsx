import React, { useState, useCallback } from "react";
import { ScrollView, View, StyleSheet, Switch, TextInput, Pressable } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import {
  getSettings,
  saveSettings,
  getProfile,
  saveProfile,
  AppSettings,
  UserProfile,
  DEFAULT_RULE_SETS,
  RuleSet,
} from "@/lib/storage";

export default function SettingsScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showRuleDetails, setShowRuleDetails] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [loadedSettings, loadedProfile] = await Promise.all([getSettings(), getProfile()]);
    setSettings(loadedSettings);
    setProfile(loadedProfile);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSettingChange = async (key: keyof AppSettings, value: any) => {
    if (!settings) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveSettings(newSettings);

    if (newSettings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleProfileChange = async (key: keyof UserProfile, value: any) => {
    if (!profile) return;

    const newProfile = { ...profile, [key]: value };
    setProfile(newProfile);
    await saveProfile(newProfile);
  };

  const selectedRuleSet = settings
    ? DEFAULT_RULE_SETS.find((rs) => rs.id === settings.selectedRuleSetId) || DEFAULT_RULE_SETS[0]
    : DEFAULT_RULE_SETS[0];

  const renderRuleSetCard = (ruleSet: RuleSet) => {
    const isSelected = settings?.selectedRuleSetId === ruleSet.id;
    const isExpanded = showRuleDetails === ruleSet.id;

    return (
      <Pressable
        key={ruleSet.id}
        onPress={() => handleSettingChange("selectedRuleSetId", ruleSet.id)}
      >
        <Card
          style={[
            styles.ruleSetCard,
            isSelected && { borderWidth: 2, borderColor: theme.accent },
          ]}
          elevation={isSelected ? 2 : 1}
        >
          <View style={styles.ruleSetHeader}>
            <View style={styles.ruleSetInfo}>
              <ThemedText type="h4">{ruleSet.name}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {ruleSet.description}
              </ThemedText>
            </View>
            {isSelected ? (
              <Feather name="check-circle" size={24} color={theme.accent} />
            ) : null}
          </View>

          <Pressable
            onPress={() => setShowRuleDetails(isExpanded ? null : ruleSet.id)}
            style={styles.expandButton}
          >
            <ThemedText type="small" style={{ color: theme.accent }}>
              {isExpanded ? "Hide Details" : "Show Details"}
            </ThemedText>
            <Feather
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.accent}
            />
          </Pressable>

          {isExpanded ? (
            <View style={styles.ruleDetails}>
              <ThemedText type="small" style={[styles.ruleDetailTitle, { color: theme.textSecondary }]}>
                Card Values:
              </ThemedText>
              <View style={styles.cardValuesGrid}>
                {Object.entries(ruleSet.cardValues).map(([rank, value]) => (
                  <View key={rank} style={styles.cardValueItem}>
                    <ThemedText type="body" style={styles.cardRank}>
                      {rank}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      = {value}
                    </ThemedText>
                  </View>
                ))}
              </View>

              <ThemedText
                type="small"
                style={[styles.ruleDetailTitle, { color: theme.textSecondary, marginTop: Spacing.md }]}
              >
                Suit Exercises:
              </ThemedText>
              <View style={styles.suitGrid}>
                {Object.entries(ruleSet.suitExercises).map(([suit, exercise]) => (
                  <View key={suit} style={styles.suitItem}>
                    <ThemedText
                      type="body"
                      style={{
                        color:
                          suit === "hearts" || suit === "diamonds"
                            ? Colors.dark.pushups
                            : theme.text,
                      }}
                    >
                      {suit === "hearts"
                        ? "\u2665"
                        : suit === "diamonds"
                          ? "\u2666"
                          : suit === "clubs"
                            ? "\u2663"
                            : "\u2660"}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{
                        color:
                          exercise === "pushups" ? Colors.dark.pushups : Colors.dark.squats,
                      }}
                    >
                      {exercise}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </Card>
      </Pressable>
    );
  };

  if (!settings || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText>Loading...</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <Card style={styles.profileCard} elevation={1}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
            <Feather name="user" size={40} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.nameInputContainer}>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
            Display Name
          </ThemedText>
          <TextInput
            style={[
              styles.nameInput,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.backgroundTertiary,
              },
            ]}
            value={profile.displayName}
            onChangeText={(text) => handleProfileChange("displayName", text)}
            placeholder="Enter your name"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
      </Card>

      <ThemedText type="h4" style={styles.sectionTitle}>
        Rule Sets
      </ThemedText>

      {DEFAULT_RULE_SETS.map(renderRuleSetCard)}

      <ThemedText type="h4" style={styles.sectionTitle}>
        Preferences
      </ThemedText>

      <Card style={styles.preferencesCard} elevation={1}>
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceInfo}>
            <Feather name="smartphone" size={20} color={theme.text} />
            <ThemedText type="body">Haptic Feedback</ThemedText>
          </View>
          <Switch
            value={settings.hapticsEnabled}
            onValueChange={(value) => handleSettingChange("hapticsEnabled", value)}
            trackColor={{ false: theme.backgroundTertiary, true: theme.accent }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.preferenceItem}>
          <View style={styles.preferenceInfo}>
            <Feather name="volume-2" size={20} color={theme.text} />
            <ThemedText type="body">Sound Effects</ThemedText>
          </View>
          <Switch
            value={settings.soundEnabled}
            onValueChange={(value) => handleSettingChange("soundEnabled", value)}
            trackColor={{ false: theme.backgroundTertiary, true: theme.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      <Card style={styles.aboutCard} elevation={1}>
        <ThemedText type="h4" style={styles.aboutTitle}>
          About
        </ThemedText>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          Deck Workout is inspired by the classic prison fitness routine. Using a standard 52-card
          deck, you perform pushups or squats based on the card you flip. Try to complete the entire
          deck as fast as possible!
        </ThemedText>
        <View style={styles.versionContainer}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Version 1.0.0
          </ThemedText>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileCard: {
    marginBottom: Spacing.xl,
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  nameInputContainer: {
    width: "100%",
  },
  nameInput: {
    height: 48,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    fontSize: 16,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  ruleSetCard: {
    marginBottom: Spacing.md,
  },
  ruleSetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  ruleSetInfo: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  ruleDetails: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  ruleDetailTitle: {
    marginBottom: Spacing.sm,
  },
  cardValuesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  cardValueItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    minWidth: 60,
  },
  cardRank: {
    fontWeight: "700",
  },
  suitGrid: {
    flexDirection: "row",
    gap: Spacing.xl,
    marginTop: Spacing.sm,
  },
  suitItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  preferencesCard: {
    marginBottom: Spacing.xl,
  },
  preferenceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  preferenceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: Spacing.sm,
  },
  aboutCard: {
    marginBottom: Spacing.xl,
  },
  aboutTitle: {
    marginBottom: Spacing.md,
  },
  versionContainer: {
    marginTop: Spacing.lg,
    alignItems: "center",
  },
});
