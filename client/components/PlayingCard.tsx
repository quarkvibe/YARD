import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing, Colors } from "@/constants/theme";
import type { CardValue, DeckStyleId, DeckStyle } from "@/lib/storage";
import { getDeckStyleById } from "@/lib/storage";

type CardSize = "small" | "medium" | "large";

interface PlayingCardProps {
  card: CardValue | null;
  isFlipped: boolean;
  onFlip?: () => void;
  disabled?: boolean;
  size?: CardSize;
  deckStyleId?: DeckStyleId;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.8,
  stiffness: 100,
};

const SUIT_SYMBOLS = {
  hearts: "\u2665",
  diamonds: "\u2666",
  clubs: "\u2663",
  spades: "\u2660",
} as const;

const SUIT_COLORS = {
  hearts: "#E74C3C", // Red for hearts
  diamonds: "#E74C3C", // Red for diamonds
  clubs: "#2C3E50", // Dark charcoal for clubs
  spades: "#2C3E50", // Dark charcoal for spades
} as const;

// Card dimensions based on size
const CARD_DIMENSIONS = {
  small: { width: 120, height: 170 },
  medium: { width: 180, height: 260 },
  large: { width: 220, height: 320 },
} as const;

// Typography scales based on size
const TYPOGRAPHY_SCALES = {
  small: {
    cornerRank: 16,
    cornerSuit: 14,
    centerSuit: 50,
    backText: 18,
    backLetterSpacing: 4,
  },
  medium: {
    cornerRank: 24,
    cornerSuit: 20,
    centerSuit: 80,
    backText: 28,
    backLetterSpacing: 8,
  },
  large: {
    cornerRank: 32,
    cornerSuit: 26,
    centerSuit: 100,
    backText: 36,
    backLetterSpacing: 10,
  },
} as const;

export function PlayingCard({
  card,
  isFlipped,
  onFlip,
  disabled,
  size = "medium",
  deckStyleId = "yard",
}: PlayingCardProps) {
  const flipProgress = useSharedValue(isFlipped ? 1 : 0);
  const scale = useSharedValue(1);
  const deckStyle = getDeckStyleById(deckStyleId);

  const dimensions = CARD_DIMENSIONS[size];
  const typography = TYPOGRAPHY_SCALES[size];

  React.useEffect(() => {
    flipProgress.value = withSpring(isFlipped ? 1 : 0, springConfig);
  }, [isFlipped, flipProgress]);

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [180, 360]);
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${rotateY}deg` },
        { scale: scale.value },
      ],
      backfaceVisibility: "hidden" as const,
      opacity: flipProgress.value > 0.5 ? 1 : 0,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [0, 180]);
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${rotateY}deg` },
        { scale: scale.value },
      ],
      backfaceVisibility: "hidden" as const,
      opacity: flipProgress.value < 0.5 ? 1 : 0,
    };
  });

  const getSuitColor = (suit: keyof typeof SUIT_COLORS) => {
    return SUIT_COLORS[suit];
  };

  const cardContainerStyle = {
    width: dimensions.width,
    height: dimensions.height,
  };

  const cornerPadding = size === "small" ? Spacing.sm : Spacing.md;

  return (
    <View style={[styles.container, cardContainerStyle]}>
      {/* Card Back */}
      <Animated.View
        style={[
          styles.card,
          styles.cardBack,
          cardContainerStyle,
          { backgroundColor: deckStyle.backColor, borderColor: deckStyle.accentColor },
          backAnimatedStyle,
        ]}
      >
        <View style={styles.backPattern}>
          <View style={[styles.backInner, { borderColor: deckStyle.accentColor }]}>
            <ThemedText
              style={[
                styles.backText,
                {
                  fontSize: typography.backText,
                  letterSpacing: typography.backLetterSpacing,
                  color: deckStyle.textColor,
                },
              ]}
            >
              {deckStyle.name}
            </ThemedText>
          </View>
        </View>

        {/* Decorative border lines */}
        <View style={[styles.backBorderTop, { backgroundColor: deckStyle.accentColor }]} />
        <View style={[styles.backBorderBottom, { backgroundColor: deckStyle.accentColor }]} />
        <View style={[styles.backBorderLeft, { backgroundColor: deckStyle.accentColor }]} />
        <View style={[styles.backBorderRight, { backgroundColor: deckStyle.accentColor }]} />
      </Animated.View>

      {/* Card Front */}
      <Animated.View
        style={[
          styles.card,
          styles.cardFront,
          cardContainerStyle,
          { padding: cornerPadding },
          frontAnimatedStyle,
        ]}
      >
        {card ? (
          <>
            {/* Top left corner */}
            <View
              style={[
                styles.cornerTop,
                { top: cornerPadding, left: cornerPadding },
              ]}
            >
              <ThemedText
                style={[
                  styles.cornerRank,
                  {
                    fontSize: typography.cornerRank,
                    color: getSuitColor(card.suit),
                  },
                ]}
              >
                {card.rank}
              </ThemedText>
              <ThemedText
                style={[
                  styles.cornerSuit,
                  {
                    fontSize: typography.cornerSuit,
                    color: getSuitColor(card.suit),
                  },
                ]}
              >
                {SUIT_SYMBOLS[card.suit]}
              </ThemedText>
            </View>

            {/* Center suit */}
            <View style={styles.centerContainer}>
              <ThemedText
                style={[
                  styles.centerSuit,
                  {
                    fontSize: typography.centerSuit,
                    color: getSuitColor(card.suit),
                  },
                ]}
              >
                {SUIT_SYMBOLS[card.suit]}
              </ThemedText>
            </View>

            {/* Bottom right corner (rotated) */}
            <View
              style={[
                styles.cornerBottom,
                { bottom: cornerPadding, right: cornerPadding },
              ]}
            >
              <ThemedText
                style={[
                  styles.cornerSuit,
                  {
                    fontSize: typography.cornerSuit,
                    color: getSuitColor(card.suit),
                  },
                ]}
              >
                {SUIT_SYMBOLS[card.suit]}
              </ThemedText>
              <ThemedText
                style={[
                  styles.cornerRank,
                  {
                    fontSize: typography.cornerRank,
                    color: getSuitColor(card.suit),
                  },
                ]}
              >
                {card.rank}
              </ThemedText>
            </View>

            {/* Rep value badge */}
            <View style={styles.repBadge}>
              <ThemedText style={styles.repValue}>{card.value}</ThemedText>
            </View>
          </>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  card: {
    position: "absolute",
    borderRadius: BorderRadius.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  cardBack: {
    backgroundColor: Colors.dark.cardBackground,
    borderWidth: 2,
    borderColor: Colors.dark.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  cardFront: {
    backgroundColor: "#FAFAFA",
  },
  backPattern: {
    width: "85%",
    height: "90%",
    alignItems: "center",
    justifyContent: "center",
  },
  backInner: {
    width: "100%",
    height: "100%",
    borderWidth: 2,
    borderColor: Colors.dark.cardBorder,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 107, 53, 0.05)",
  },
  backText: {
    fontWeight: "900",
    color: Colors.dark.accent,
  },
  backBorderTop: {
    position: "absolute",
    top: 8,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: Colors.dark.accent,
    opacity: 0.3,
  },
  backBorderBottom: {
    position: "absolute",
    bottom: 8,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: Colors.dark.accent,
    opacity: 0.3,
  },
  backBorderLeft: {
    position: "absolute",
    top: 12,
    left: 8,
    bottom: 12,
    width: 1,
    backgroundColor: Colors.dark.accent,
    opacity: 0.3,
  },
  backBorderRight: {
    position: "absolute",
    top: 12,
    right: 8,
    bottom: 12,
    width: 1,
    backgroundColor: Colors.dark.accent,
    opacity: 0.3,
  },
  cornerTop: {
    position: "absolute",
    alignItems: "center",
  },
  cornerBottom: {
    position: "absolute",
    alignItems: "center",
    transform: [{ rotate: "180deg" }],
  },
  cornerRank: {
    fontWeight: "800",
    lineHeight: undefined,
  },
  cornerSuit: {
    marginTop: -4,
  },
  centerContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  centerSuit: {
    textAlign: "center",
  },
  repBadge: {
    position: "absolute",
    bottom: 8,
    left: "50%",
    transform: [{ translateX: -20 }],
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    minWidth: 40,
    alignItems: "center",
  },
  repValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0b0b0b",
    letterSpacing: 1,
  },
});
