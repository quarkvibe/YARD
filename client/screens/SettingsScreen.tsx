import React, { useState, useCallback } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  Switch,
  Pressable,
  Linking,
} from "react-native";
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
  SUPERSET_MODES,
  SupersetMode,
  DECK_STYLES,
  DeckStyle,
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
          numberOfLines={1}
          adjustsFontSizeToFit
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

  const renderSupersetModeCard = (supersetMode: SupersetMode) => {
    const isSelected = settings?.selectedSupersetModeId === supersetMode.id;

    return (
      <Pressable
        key={supersetMode.id}
        onPress={() =>
          handleSettingChange("selectedSupersetModeId", supersetMode.id)
        }
        style={[styles.flipModeCard, isSelected && styles.flipModeCardSelected]}
      >
        <View style={styles.flipModeContent}>
          <ThemedText style={styles.flipModeName}>
            {supersetMode.name}
          </ThemedText>
          <ThemedText style={styles.flipModeDescription}>
            {supersetMode.description}
          </ThemedText>
        </View>
        {isSelected ? (
          <Feather name="check" size={18} color={Colors.dark.accent} />
        ) : null}
      </Pressable>
    );
  };

  const renderDeckStyleCard = (deckStyle: DeckStyle) => {
    const isSelected = settings?.selectedDeckStyleId === deckStyle.id;

    return (
      <Pressable
        key={deckStyle.id}
        onPress={() => handleSettingChange("selectedDeckStyleId", deckStyle.id)}
        style={[
          styles.deckStyleCard,
          {
            backgroundColor: deckStyle.backColor,
            borderColor: deckStyle.accentColor,
          },
          isSelected && styles.deckStyleCardSelected,
        ]}
      >
        <View
          style={[
            styles.deckStyleInner,
            { borderColor: deckStyle.accentColor },
          ]}
        >
          <ThemedText
            style={[styles.deckStyleName, { color: deckStyle.textColor }]}
          >
            {deckStyle.name}
          </ThemedText>
          <ThemedText
            style={[
              styles.deckStyleDescription,
              { color: deckStyle.textColor, opacity: 0.7 },
            ]}
            numberOfLines={1}
          >
            {deckStyle.description}
          </ThemedText>
        </View>
        {isSelected && (
          <View
            style={[
              styles.deckStyleCheck,
              { backgroundColor: deckStyle.accentColor },
            ]}
          >
            <Feather name="check" size={12} color="#0b0b0b" />
          </View>
        )}
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

        {settings.selectedExerciseType === "superset" ? (
          <>
            <ThemedText style={styles.sectionTitle}>SUPERSET MODE</ThemedText>
            <View style={styles.flipModesContainer}>
              {SUPERSET_MODES.map(renderSupersetModeCard)}
            </View>
          </>
        ) : (
          <>
            <ThemedText style={styles.sectionTitle}>FLIP MODE</ThemedText>
            <View style={styles.flipModesContainer}>
              {FLIP_MODES.map(renderFlipModeCard)}
            </View>
          </>
        )}

        <ThemedText style={styles.sectionTitle}>DECK STYLE</ThemedText>
        <View style={styles.deckStylesContainer}>
          {DECK_STYLES.map(renderDeckStyleCard)}
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

        {/* Rest Timer Settings */}
        <ThemedText style={styles.sectionHeader}>REST TIMER</ThemedText>

        <View style={styles.preferencesCard}>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Feather name="clock" size={18} color={Colors.dark.chalk} />
              <ThemedText style={styles.preferenceLabel}>REST TIMER</ThemedText>
            </View>
            <Switch
              value={settings.restTimerEnabled}
              onValueChange={(value) =>
                handleSettingChange("restTimerEnabled", value)
              }
              trackColor={{
                false: Colors.dark.cardBorder,
                true: Colors.dark.accent,
              }}
              thumbColor={Colors.dark.chalk}
            />
          </View>

          {settings.restTimerEnabled && (
            <>
              <View style={styles.divider} />

              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <ThemedText style={styles.preferenceLabel}>
                    REST DURATION
                  </ThemedText>
                </View>
                <View style={styles.durationOptions}>
                  {[30, 45, 60, 90, 120].map((seconds) => (
                    <Pressable
                      key={seconds}
                      onPress={() =>
                        handleSettingChange("restTimerDuration", seconds)
                      }
                      style={[
                        styles.durationOption,
                        settings.restTimerDuration === seconds &&
                          styles.durationOptionSelected,
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.durationOptionText,
                          settings.restTimerDuration === seconds &&
                            styles.durationOptionTextSelected,
                        ]}
                      >
                        {seconds}s
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <ThemedText style={styles.preferenceLabel}>
                    ALERT TYPE
                  </ThemedText>
                </View>
                <View style={styles.alertOptions}>
                  {[
                    { id: "haptic", icon: "smartphone", label: "HAPTIC" },
                    { id: "sound", icon: "volume-2", label: "SOUND" },
                    { id: "both", icon: "bell", label: "BOTH" },
                  ].map((option) => (
                    <Pressable
                      key={option.id}
                      onPress={() =>
                        handleSettingChange("restAlertType", option.id)
                      }
                      style={[
                        styles.alertOption,
                        settings.restAlertType === option.id &&
                          styles.alertOptionSelected,
                      ]}
                    >
                      <Feather
                        name={option.icon as any}
                        size={14}
                        color={
                          settings.restAlertType === option.id
                            ? Colors.dark.backgroundRoot
                            : Colors.dark.chalk
                        }
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>

        <ThemedText style={styles.versionText}>VERSION 1.0.0</ThemedText>

        <View style={styles.legalLinks}>
          <Pressable
            onPress={() => Linking.openURL("https://flipmovefinish.now/terms")}
          >
            <ThemedText style={styles.legalLinkText}>Terms</ThemedText>
          </Pressable>
          <ThemedText style={styles.legalSeparator}>•</ThemedText>
          <Pressable
            onPress={() =>
              Linking.openURL("https://flipmovefinish.now/privacy")
            }
          >
            <ThemedText style={styles.legalLinkText}>Privacy</ThemedText>
          </Pressable>
        </View>

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
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
  },
  exerciseTypeCardSelected: {
    borderColor: Colors.dark.accent,
    borderWidth: 2,
    backgroundColor: Colors.dark.cardBackground,
  },
  exerciseTypeName: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
    textAlign: "center",
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
  // Rest timer styles
  durationOptions: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  durationOption: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    backgroundColor: Colors.dark.cardBorder,
  },
  durationOptionSelected: {
    backgroundColor: Colors.dark.accent,
  },
  durationOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.dark.textSecondary,
  },
  durationOptionTextSelected: {
    color: Colors.dark.backgroundRoot,
  },
  alertOptions: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  alertOption: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    backgroundColor: Colors.dark.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  alertOptionSelected: {
    backgroundColor: Colors.dark.accent,
  },
  preferenceHint: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  deckStylesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  deckStyleCard: {
    width: "48%",
    aspectRatio: 1.4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.sm,
    position: "relative",
  },
  deckStyleCardSelected: {
    borderWidth: 2,
  },
  deckStyleInner: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  deckStyleName: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 2,
  },
  deckStyleDescription: {
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  deckStyleCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  legalLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  legalLinkText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
    textDecorationLine: "underline",
  },
  legalSeparator: {
    fontSize: 10,
    color: Colors.dark.textSecondary,
  },
});
