import React, { useState, useRef } from "react";
import {
  View,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface YardRulesModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function YardRulesModal({
  visible,
  onAccept,
  onDecline,
}: YardRulesModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 50;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    if (isCloseToBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleAccept = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAccept();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDecline}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.headerEmoji}>⚖️</ThemedText>
          <ThemedText style={styles.headerTitle}>YARD RULES</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            READ BEFORE ENTERING
          </ThemedText>
        </View>

        {/* Scrollable Rules Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
        >
          {/* Section 1: The Code */}
          <View style={styles.ruleSection}>
            <ThemedText style={styles.ruleSectionTitle}>📜 THE CODE</ThemedText>
            <ThemedText style={styles.ruleText}>
              By entering the YARD, you agree to uphold the following principles
              that govern our community. These aren&apos;t just
              rules—they&apos;re the foundation of everything we stand for.
            </ThemedText>
          </View>

          {/* Section 2: Respect the Grind */}
          <View style={styles.ruleSection}>
            <ThemedText style={styles.ruleSectionTitle}>
              💪 RESPECT THE GRIND
            </ThemedText>
            <View style={styles.ruleItem}>
              <ThemedText style={styles.ruleNumber}>1.</ThemedText>
              <ThemedText style={styles.ruleText}>
                Every member of this community is putting in work. Whether
                someone is doing their first workout or their thousandth,
                respect their effort.
              </ThemedText>
            </View>
            <View style={styles.ruleItem}>
              <ThemedText style={styles.ruleNumber}>2.</ThemedText>
              <ThemedText style={styles.ruleText}>
                We don&apos;t tear each other down. Trash talk is welcome, but
                it stays competitive and motivational—never personal or
                disrespectful.
              </ThemedText>
            </View>
            <View style={styles.ruleItem}>
              <ThemedText style={styles.ruleNumber}>3.</ThemedText>
              <ThemedText style={styles.ruleText}>
                Celebrate others&apos; victories. When someone hits a PR or tops
                the leaderboard, give them their props.
              </ThemedText>
            </View>
          </View>

          {/* Section 3: Keep It Real */}
          <View style={styles.ruleSection}>
            <ThemedText style={styles.ruleSectionTitle}>
              🎯 KEEP IT REAL
            </ThemedText>
            <View style={styles.ruleItem}>
              <ThemedText style={styles.ruleNumber}>4.</ThemedText>
              <ThemedText style={styles.ruleText}>
                <ThemedText style={styles.ruleBold}>NO CHEATING.</ThemedText>{" "}
                Your times must be legitimate. Every rep, every set, done with
                proper form.
              </ThemedText>
            </View>
            <View style={styles.ruleItem}>
              <ThemedText style={styles.ruleNumber}>5.</ThemedText>
              <ThemedText style={styles.ruleText}>
                Suspicious times may be flagged for video verification. Top
                leaderboard positions require proof.
              </ThemedText>
            </View>
            <View style={styles.ruleItem}>
              <ThemedText style={styles.ruleNumber}>6.</ThemedText>
              <ThemedText style={styles.ruleText}>
                Falsifying workout data, using bots, or exploiting bugs will
                result in immediate and permanent ban.
              </ThemedText>
            </View>
            <View style={styles.ruleItem}>
              <ThemedText style={styles.ruleNumber}>7.</ThemedText>
              <ThemedText style={styles.ruleText}>
                One account per person. Multiple accounts to manipulate
                leaderboards = banned.
              </ThemedText>
            </View>
          </View>

          {/* Section 4: Community Standards */}
          <View style={styles.ruleSection}>
            <ThemedText style={styles.ruleSectionTitle}>
              🤝 COMMUNITY STANDARDS
            </ThemedText>
            <View style={styles.ruleItem}>
              <ThemedText style={styles.ruleNumber}>8.</ThemedText>
              <ThemedText style={styles.ruleText}>
                No harassment, hate speech, discrimination, or bullying of any
                kind. Zero tolerance.
              </ThemedText>
            </View>
            <View style={styles.ruleItem}>
              <ThemedText style={styles.ruleNumber}>9.</ThemedText>
              <ThemedText style={styles.ruleText}>
                Keep profile content appropriate. No explicit, offensive, or
                illegal content in photos, handles, or bios.
              </ThemedText>
            </View>
            <View style={styles.ruleItem}>
              <ThemedText style={styles.ruleNumber}>10.</ThemedText>
              <ThemedText style={styles.ruleText}>
                No spam, advertising, or solicitation. This is a fitness
                community, not a marketplace.
              </ThemedText>
            </View>
            <View style={styles.ruleItem}>
              <ThemedText style={styles.ruleNumber}>11.</ThemedText>
              <ThemedText style={styles.ruleText}>
                Report violations. If you see something that breaks these rules,
                report it. We rely on the community to keep the YARD clean.
              </ThemedText>
            </View>
          </View>

          {/* Section 5: The Stakes */}
          <View style={styles.ruleSection}>
            <ThemedText style={styles.ruleSectionTitle}>
              ⚠️ THE STAKES
            </ThemedText>
            <ThemedText style={styles.ruleText}>
              Breaking these rules has consequences:
            </ThemedText>
            <View style={styles.consequenceItem}>
              <ThemedText style={styles.consequenceLevel}>
                MINOR VIOLATIONS:
              </ThemedText>
              <ThemedText style={styles.consequenceText}>
                Warning, followed by temporary suspension
              </ThemedText>
            </View>
            <View style={styles.consequenceItem}>
              <ThemedText style={styles.consequenceLevel}>
                MAJOR VIOLATIONS:
              </ThemedText>
              <ThemedText style={styles.consequenceText}>
                Immediate suspension pending review
              </ThemedText>
            </View>
            <View style={styles.consequenceItem}>
              <ThemedText style={styles.consequenceLevel}>
                CHEATING / HARASSMENT:
              </ThemedText>
              <ThemedText style={styles.consequenceText}>
                Permanent ban, no appeals
              </ThemedText>
            </View>
          </View>

          {/* Section 6: Your Agreement */}
          <View style={styles.ruleSection}>
            <ThemedText style={styles.ruleSectionTitle}>
              ✍️ YOUR AGREEMENT
            </ThemedText>
            <ThemedText style={styles.ruleText}>
              By tapping &quot;I AGREE&quot; below, you confirm that:
            </ThemedText>
            <View style={styles.agreementItem}>
              <Feather name="check" size={16} color={Colors.dark.accent} />
              <ThemedText style={styles.agreementText}>
                You have read and understood these rules
              </ThemedText>
            </View>
            <View style={styles.agreementItem}>
              <Feather name="check" size={16} color={Colors.dark.accent} />
              <ThemedText style={styles.agreementText}>
                You agree to abide by them at all times
              </ThemedText>
            </View>
            <View style={styles.agreementItem}>
              <Feather name="check" size={16} color={Colors.dark.accent} />
              <ThemedText style={styles.agreementText}>
                You accept that violations may result in removal
              </ThemedText>
            </View>
            <View style={styles.agreementItem}>
              <Feather name="check" size={16} color={Colors.dark.accent} />
              <ThemedText style={styles.agreementText}>
                You&apos;re ready to put in the work
              </ThemedText>
            </View>
          </View>

          {/* Scroll Indicator */}
          {!hasScrolledToBottom && (
            <View style={styles.scrollIndicator}>
              <Feather
                name="chevrons-down"
                size={24}
                color={Colors.dark.accent}
              />
              <ThemedText style={styles.scrollIndicatorText}>
                SCROLL TO READ ALL RULES
              </ThemedText>
            </View>
          )}

          {/* Final Statement */}
          <View style={styles.finalStatement}>
            <ThemedText style={styles.finalText}>
              Welcome to the YARD. Now let&apos;s get to work. 💪
            </ThemedText>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable style={styles.declineButton} onPress={onDecline}>
            <ThemedText style={styles.declineButtonText}>DECLINE</ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.agreeButton,
              !hasScrolledToBottom && styles.agreeButtonDisabled,
            ]}
            onPress={handleAccept}
            disabled={!hasScrolledToBottom}
          >
            <ThemedText
              style={[
                styles.agreeButtonText,
                !hasScrolledToBottom && styles.agreeButtonTextDisabled,
              ]}
            >
              {hasScrolledToBottom ? "I AGREE" : "READ ALL RULES"}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  header: {
    alignItems: "center",
    paddingTop: Spacing["2xl"],
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 4,
    color: Colors.dark.chalk,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.accent,
    marginTop: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing["3xl"],
  },
  ruleSection: {
    marginBottom: Spacing.xl,
  },
  ruleSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.chalk,
    marginBottom: Spacing.md,
  },
  ruleItem: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  ruleNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.dark.accent,
    width: 24,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 22,
    color: Colors.dark.textSecondary,
  },
  ruleBold: {
    fontWeight: "800",
    color: Colors.dark.chalk,
  },
  consequenceItem: {
    marginTop: Spacing.sm,
    marginLeft: Spacing.md,
  },
  consequenceLevel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    color: Colors.dark.pushups,
    marginBottom: 2,
  },
  consequenceText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.dark.textSecondary,
  },
  agreementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  agreementText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.dark.chalk,
  },
  scrollIndicator: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  scrollIndicatorText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.accent,
    marginTop: Spacing.xs,
  },
  finalStatement: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
  },
  finalText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
    color: Colors.dark.chalk,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.cardBackground,
  },
  declineButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    alignItems: "center",
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
  },
  agreeButton: {
    flex: 2,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.accent,
    alignItems: "center",
  },
  agreeButtonDisabled: {
    backgroundColor: Colors.dark.cardBorder,
  },
  agreeButtonText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.backgroundRoot,
  },
  agreeButtonTextDisabled: {
    color: Colors.dark.textSecondary,
  },
});
