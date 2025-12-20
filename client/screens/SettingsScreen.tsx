import React, { useState, useCallback } from "react";
import { ScrollView, View, StyleSheet, Switch, Pressable } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import {
  getSettings,
  saveSettings,
  AppSettings,
  DEFAULT_RULE_SETS,
  RuleSet,
} from "@/lib/storage";

export default function SettingsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showRuleDetails, setShowRuleDetails] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const loadedSettings = await getSettings();
    setSettings(loadedSettings);
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

  const renderRuleSetCard = (ruleSet: RuleSet) => {
    const isSelected = settings?.selectedRuleSetId === ruleSet.id;
    const isExpanded = showRuleDetails === ruleSet.id;

    return (
      <Pressable
        key={ruleSet.id}
        onPress={() => handleSettingChange("selectedRuleSetId", ruleSet.id)}
        style={[
          styles.ruleSetCard,
          isSelected && styles.ruleSetCardSelected,
        ]}
      >
        <View style={styles.ruleSetHeader}>
          <View style={styles.ruleSetInfo}>
            <ThemedText style={styles.ruleSetName}>{ruleSet.name}</ThemedText>
            <ThemedText style={styles.ruleSetDescription}>
              {ruleSet.description}
            </ThemedText>
          </View>
          {isSelected ? (
            <Feather name="check" size={20} color={Colors.dark.accent} />
          ) : null}
        </View>

        <Pressable
          onPress={() => setShowRuleDetails(isExpanded ? null : ruleSet.id)}
          style={styles.expandButton}
        >
          <ThemedText style={styles.expandText}>
            {isExpanded ? "HIDE DETAILS" : "SHOW DETAILS"}
          </ThemedText>
          <Feather
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={Colors.dark.textSecondary}
          />
        </Pressable>

        {isExpanded ? (
          <View style={styles.ruleDetails}>
            <View style={styles.cardValuesSection}>
              <ThemedText style={styles.detailLabel}>CARD VALUES</ThemedText>
              <View style={styles.cardValuesGrid}>
                {Object.entries(ruleSet.cardValues).map(([rank, value]) => (
                  <View key={rank} style={styles.cardValueItem}>
                    <ThemedText style={styles.cardRank}>{rank}</ThemedText>
                    <ThemedText style={styles.cardValue}>={value}</ThemedText>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.suitsSection}>
              <ThemedText style={styles.detailLabel}>SUIT EXERCISES</ThemedText>
              <View style={styles.suitGrid}>
                {Object.entries(ruleSet.suitExercises).map(([suit, exercise]) => (
                  <View key={suit} style={styles.suitItem}>
                    <ThemedText
                      style={[
                        styles.suitSymbol,
                        {
                          color:
                            suit === "hearts" || suit === "diamonds"
                              ? Colors.dark.pushups
                              : Colors.dark.chalk,
                        },
                      ]}
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
                      style={[
                        styles.suitExercise,
                        {
                          color:
                            exercise === "pushups"
                              ? Colors.dark.pushups
                              : Colors.dark.squats,
                        },
                      ]}
                    >
                      {exercise.toUpperCase()}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </Pressable>
    );
  };

  if (!settings) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.loadingText}>LOADING...</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.xl,
      }}
    >
      <ThemedText style={styles.sectionTitle}>RULESET</ThemedText>
      {DEFAULT_RULE_SETS.map(renderRuleSetCard)}

      <ThemedText style={styles.sectionTitle}>PREFERENCES</ThemedText>

      <View style={styles.preferencesCard}>
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceInfo}>
            <Feather name="smartphone" size={18} color={Colors.dark.chalk} />
            <ThemedText style={styles.preferenceLabel}>HAPTIC FEEDBACK</ThemedText>
          </View>
          <Switch
            value={settings.hapticsEnabled}
            onValueChange={(value) => handleSettingChange("hapticsEnabled", value)}
            trackColor={{ false: Colors.dark.cardBorder, true: Colors.dark.accent }}
            thumbColor={Colors.dark.chalk}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.preferenceItem}>
          <View style={styles.preferenceInfo}>
            <Feather name="volume-2" size={18} color={Colors.dark.chalk} />
            <ThemedText style={styles.preferenceLabel}>SOUND EFFECTS</ThemedText>
          </View>
          <Switch
            value={settings.soundEnabled}
            onValueChange={(value) => handleSettingChange("soundEnabled", value)}
            trackColor={{ false: Colors.dark.cardBorder, true: Colors.dark.accent }}
            thumbColor={Colors.dark.chalk}
          />
        </View>
      </View>

      <View style={styles.aboutCard}>
        <ThemedText style={styles.aboutTitle}>ABOUT YARD</ThemedText>
        <ThemedText style={styles.aboutText}>
          Inspired by prison and military PT culture. Using a standard 52-card deck, you
          perform pushups or squats based on the card you flip. Complete the entire deck as
          fast as possible.
        </ThemedText>
        <ThemedText style={styles.versionText}>VERSION 1.0.0</ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
    marginTop: Spacing.lg,
  },
  ruleSetCard: {
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    marginBottom: Spacing.md,
  },
  ruleSetCardSelected: {
    borderColor: Colors.dark.accent,
    borderWidth: 2,
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
  ruleSetName: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
    marginBottom: Spacing.xs,
  },
  ruleSetDescription: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  expandText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },
  ruleDetails: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
  },
  cardValuesSection: {
    marginBottom: Spacing.lg,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
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
    minWidth: 50,
  },
  cardRank: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.dark.chalk,
  },
  cardValue: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginLeft: 2,
  },
  suitsSection: {},
  suitGrid: {
    flexDirection: "row",
    gap: Spacing.xl,
  },
  suitItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  suitSymbol: {
    fontSize: 24,
  },
  suitExercise: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },
  preferencesCard: {
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
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
  preferenceLabel: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.chalk,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.cardBorder,
    marginVertical: Spacing.sm,
  },
  aboutCard: {
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    marginBottom: Spacing.xl,
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
    marginBottom: Spacing.md,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
  },
  versionText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
});
