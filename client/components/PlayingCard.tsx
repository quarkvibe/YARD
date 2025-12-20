import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing, Colors } from "@/constants/theme";
import type { CardValue } from "@/lib/storage";

interface PlayingCardProps {
  card: CardValue | null;
  isFlipped: boolean;
  onFlip?: () => void;
  disabled?: boolean;
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
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PlayingCard({ card, isFlipped, onFlip, disabled }: PlayingCardProps) {
  const flipProgress = useSharedValue(isFlipped ? 1 : 0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    flipProgress.value = withSpring(isFlipped ? 1 : 0, springConfig);
  }, [isFlipped]);

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [180, 360]);
    return {
      transform: [
        { perspective: 1000 },
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
        { perspective: 1000 },
        { rotateY: `${rotateY}deg` },
        { scale: scale.value },
      ],
      backfaceVisibility: "hidden" as const,
      opacity: flipProgress.value < 0.5 ? 1 : 0,
    };
  });

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    }
  };

  const getSuitColor = (suit: string) => {
    if (suit === "hearts" || suit === "diamonds") {
      return Colors.dark.pushups;
    }
    return "#1A1A1A";
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
        <View style={styles.backPattern}>
          <View style={styles.backInner}>
            <ThemedText style={styles.backText}>YARD</ThemedText>
          </View>
        </View>
      </Animated.View>

      <AnimatedPressable
        style={[styles.card, styles.cardFront, frontAnimatedStyle]}
        onPress={onFlip}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || !isFlipped}
      >
        {card ? (
          <>
            <View style={styles.cornerTop}>
              <ThemedText style={[styles.cornerRank, { color: getSuitColor(card.suit) }]}>
                {card.rank}
              </ThemedText>
              <ThemedText style={[styles.cornerSuit, { color: getSuitColor(card.suit) }]}>
                {SUIT_SYMBOLS[card.suit]}
              </ThemedText>
            </View>

            <ThemedText style={[styles.centerSuit, { color: getSuitColor(card.suit) }]}>
              {SUIT_SYMBOLS[card.suit]}
            </ThemedText>

            <View style={styles.cornerBottom}>
              <ThemedText style={[styles.cornerSuit, { color: getSuitColor(card.suit) }]}>
                {SUIT_SYMBOLS[card.suit]}
              </ThemedText>
              <ThemedText style={[styles.cornerRank, { color: getSuitColor(card.suit) }]}>
                {card.rank}
              </ThemedText>
            </View>
          </>
        ) : null}
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 180,
    height: 260,
    position: "relative",
  },
  card: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.sm,
  },
  cardBack: {
    backgroundColor: Colors.dark.cardBackground,
    borderWidth: 2,
    borderColor: Colors.dark.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  cardFront: {
    backgroundColor: Colors.dark.chalk,
    padding: Spacing.md,
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
  },
  backText: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 8,
    color: Colors.dark.accent,
  },
  cornerTop: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    alignItems: "center",
  },
  cornerBottom: {
    position: "absolute",
    bottom: Spacing.md,
    right: Spacing.md,
    alignItems: "center",
    transform: [{ rotate: "180deg" }],
  },
  cornerRank: {
    fontSize: 24,
    fontWeight: "800",
  },
  cornerSuit: {
    fontSize: 20,
  },
  centerSuit: {
    fontSize: 80,
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -40 }, { translateY: -50 }],
  },
});
