import React, { useState, useCallback } from "react";
import { ScrollView, View, StyleSheet, Switch, Pressable } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ConcreteBackground } from "@/components/ConcreteBackground";
import { Button } from "@/components/Button";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import {
  getSettings,
  saveSettings,
  AppSettings,
  DEFAULT_RULE_SETS,
  RuleSet,
  FLIP_MODES,
  FlipMode,
  EXERCISE_TYPES,
  ExerciseTypeOption,
} from "@/lib/storage";

export default function SettingsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showRuleDetails, setShowRuleDetails] = useState<string | null>(null);

  const handleStartWorkout = () => {
    navigation.navigate("WorkoutTab");
  };

  const loadData = useCallback(async () => {
    const loadedSettings = await getSettings();
    setSettings(loadedSettings);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
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

  const renderExerciseTypeCard = (exerciseType: ExerciseTypeOption) => {
    const isSelected = settings?.selectedExerciseType === exerciseType.id;

    return (
      <Pressable
        key={exerciseType.id}
        onPress={() =>
          handleSettingChange("selectedExerciseType", exerciseType.id)
        }
        style={[
          styles.exerciseTypeCard,
          isSelected && styles.exerciseTypeCardSelected,
        ]}
      >
        <ThemedText
          style={[
            styles.exerciseTypeName,
            isSelected && styles.exerciseTypeNameSelected,
          ]}
        >
          {exerciseType.name}
        </ThemedText>
      </Pressable>
    );
  };

  const renderFlipModeCard = (flipMode: FlipMode) => {
    const isSelected = settings?.selectedFlipModeId === flipMode.id;

    return (
      <Pressable
        key={flipMode.id}
        onPress={() => handleSettingChange("selectedFlipModeId", flipMode.id)}
        style={[styles.flipModeCard, isSelected && styles.flipModeCardSelected]}
      >
        <View style={styles.flipModeContent}>
          <ThemedText style={styles.flipModeName}>{flipMode.name}</ThemedText>
          <ThemedText style={styles.flipModeDescription}>
            {flipMode.description}
          </ThemedText>
        </View>
        {isSelected ? (
          <Feather name="check" size={18} color={Colors.dark.accent} />
        ) : null}
      </Pressable>
    );
  };

  const renderRuleSetCard = (ruleSet: RuleSet) => {
    const isSelected = settings?.selectedRuleSetId === ruleSet.id;
    const isExpanded = showRuleDetails === ruleSet.id;

    return (
      <Pressable
        key={ruleSet.id}
        onPress={() => handleSettingChange("selectedRuleSetId", ruleSet.id)}
        style={[styles.ruleSetCard, isSelected && styles.ruleSetCardSelected]}
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
          </View>
        ) : null}
      </Pressable>
    );
  };

  if (!settings) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText style={styles.loadingText}>LOADING...</ThemedText>
      </View>
    );
  }

  return (
    <ConcreteBackground intensity="light" showCracks={true}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.xl,
        }}
      >
        <ThemedText style={styles.sectionHeader}>REGIMEN</ThemedText>

        <ThemedText style={styles.sectionTitle}>EXERCISE</ThemedText>
        <View style={styles.exerciseTypesContainer}>
          {EXERCISE_TYPES.map(renderExerciseTypeCard)}
        </View>

        <ThemedText style={styles.sectionTitle}>INTENSITY</ThemedText>
        {DEFAULT_RULE_SETS.map(renderRuleSetCard)}

        <ThemedText style={styles.sectionTitle}>FLIP MODE</ThemedText>
        <View style={styles.flipModesContainer}>
          {FLIP_MODES.map(renderFlipModeCard)}
        </View>

        <ThemedText style={styles.sectionHeader}>APP SETTINGS</ThemedText>

        <View style={styles.preferencesCard}>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Feather name="smartphone" size={18} color={Colors.dark.chalk} />
              <ThemedText style={styles.preferenceLabel}>
                HAPTIC FEEDBACK
              </ThemedText>
            </View>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={(value) =>
                handleSettingChange("hapticsEnabled", value)
              }
              trackColor={{
                false: Colors.dark.cardBorder,
                true: Colors.dark.accent,
              }}
              thumbColor={Colors.dark.chalk}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Feather name="volume-2" size={18} color={Colors.dark.chalk} />
              <ThemedText style={styles.preferenceLabel}>
                SOUND EFFECTS
              </ThemedText>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(value) =>
                handleSettingChange("soundEnabled", value)
              }
              trackColor={{
                false: Colors.dark.cardBorder,
                true: Colors.dark.accent,
              }}
              thumbColor={Colors.dark.chalk}
            />
          </View>

          <View style={styles.divider} />

          <Pressable style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Feather name="help-circle" size={18} color={Colors.dark.chalk} />
              <ThemedText style={styles.preferenceLabel}>HELP</ThemedText>
            </View>
            <Feather
              name="chevron-right"
              size={18}
              color={Colors.dark.textSecondary}
            />
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Feather name="info" size={18} color={Colors.dark.chalk} />
              <ThemedText style={styles.preferenceLabel}>ABOUT YARD</ThemedText>
            </View>
            <Feather
              name="chevron-right"
              size={18}
              color={Colors.dark.textSecondary}
            />
          </Pressable>
        </View>

        <ThemedText style={styles.versionText}>VERSION 1.0.0</ThemedText>

        <View style={styles.startWorkoutContainer}>
          <Button onPress={handleStartWorkout}>START WORKOUT</Button>
        </View>
      </ScrollView>
    </ConcreteBackground>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundRoot,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 3,
    color: Colors.dark.chalk,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
    marginTop: Spacing.lg,
  },
  exerciseTypesContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  exerciseTypeCard: {
    flex: 1,
    backgroundColor: Colors.dark.cardBackground,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    alignItems: "center",
  },
  exerciseTypeCardSelected: {
    borderColor: Colors.dark.accent,
    borderWidth: 2,
    backgroundColor: Colors.dark.cardBackground,
  },
  exerciseTypeName: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
  },
  exerciseTypeNameSelected: {
    color: Colors.dark.accent,
  },
  flipModesContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  flipModeCard: {
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  flipModeCardSelected: {
    borderColor: Colors.dark.accent,
    borderWidth: 2,
  },
  flipModeContent: {
    flex: 1,
  },
  flipModeName: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
    marginBottom: Spacing.xs,
  },
  flipModeDescription: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
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
    marginTop: Spacing.lg,
  },
  startWorkoutContainer: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
});
