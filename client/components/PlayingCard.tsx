import React from "react";
import { View, StyleSheet, ImageBackground } from "react-native";
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

// Import deck back images
const DECK_IMAGES: Record<string, any> = {
  yard: require("../../attached_assets/generated_images/yard_app_icon_tally_marks.png"),
  military: require("../../attached_assets/generated_images/military_tactical_deck_cards.png"),
  prison: require("../../attached_assets/generated_images/prison_yard_deck_cards.png"),
  vintage: require("../../attached_assets/generated_images/classic_vintage_casino_cards.png"),
  geometric: require("../../attached_assets/generated_images/modern_geometric_deck_cards.png"),
  dayofdead: require("../../attached_assets/generated_images/day_of_dead_skull_cards.png"),
  samurai: require("../../attached_assets/generated_images/japanese_samurai_deck_cards.png"),
  anime: require("../../attached_assets/generated_images/anime_schoolgirl_deck_cards.png"),
  cosplay: require("../../attached_assets/generated_images/cosplay_deck_back_design.png"),
  hunters: require("../../attached_assets/generated_images/anime_hunters_demon_fighting_deck.png"),
};

// Face card images for high-value cards (10, J, Q, K, A) per deck style
const FACE_CARD_IMAGES: Record<string, Record<string, any>> = {
  yard: {
    "10": require("../../attached_assets/generated_images/yard_deck_10_card.png"),
    "J": require("../../attached_assets/generated_images/yard_deck_jack_card.png"),
    "Q": require("../../attached_assets/generated_images/yard_deck_queen_card.png"),
    "K": require("../../attached_assets/generated_images/yard_deck_king_card.png"),
    "A": require("../../attached_assets/generated_images/yard_deck_ace_card.png"),
  },
  military: {
    "10": require("../../attached_assets/generated_images/tactical_deck_10_card.png"),
    "J": require("../../attached_assets/generated_images/tactical_deck_jack_card.png"),
    "Q": require("../../attached_assets/generated_images/tactical_deck_queen_card.png"),
    "K": require("../../attached_assets/generated_images/tactical_deck_king_card.png"),
    "A": require("../../attached_assets/generated_images/tactical_deck_ace_card.png"),
  },
  prison: {
    "10": require("../../attached_assets/generated_images/lockup_deck_10_card.png"),
    "J": require("../../attached_assets/generated_images/lockup_deck_jack_card.png"),
    "Q": require("../../attached_assets/generated_images/lockup_deck_queen_card.png"),
    "K": require("../../attached_assets/generated_images/lockup_deck_king_card.png"),
    "A": require("../../attached_assets/generated_images/lockup_deck_ace_card.png"),
  },
  vintage: {
    "10": require("../../attached_assets/generated_images/casino_deck_10_card.png"),
    "J": require("../../attached_assets/generated_images/casino_deck_jack_card.png"),
    "Q": require("../../attached_assets/generated_images/casino_deck_queen_card.png"),
    "K": require("../../attached_assets/generated_images/casino_deck_king_card.png"),
    "A": require("../../attached_assets/generated_images/casino_deck_ace_card.png"),
  },
  geometric: {
    "10": require("../../attached_assets/generated_images/neon_deck_10_card.png"),
    "J": require("../../attached_assets/generated_images/neon_deck_jack_card.png"),
    "Q": require("../../attached_assets/generated_images/neon_deck_queen_card.png"),
    "K": require("../../attached_assets/generated_images/neon_deck_king_card.png"),
    "A": require("../../attached_assets/generated_images/neon_deck_ace_card.png"),
  },
  dayofdead: {
    "10": require("../../attached_assets/generated_images/calavera_deck_10_card.png"),
    "J": require("../../attached_assets/generated_images/calavera_deck_jack_card.png"),
    "Q": require("../../attached_assets/generated_images/calavera_deck_queen_card.png"),
    "K": require("../../attached_assets/generated_images/calavera_deck_king_card.png"),
    "A": require("../../attached_assets/generated_images/calavera_deck_ace_card.png"),
  },
  samurai: {
    "10": require("../../attached_assets/generated_images/ronin_deck_10_card.png"),
    "J": require("../../attached_assets/generated_images/ronin_deck_jack_card.png"),
    "Q": require("../../attached_assets/generated_images/ronin_deck_queen_card.png"),
    "K": require("../../attached_assets/generated_images/ronin_deck_king_card.png"),
    "A": require("../../attached_assets/generated_images/ronin_deck_ace_card.png"),
  },
  anime: {
    "10": require("../../attached_assets/generated_images/kawaii_deck_10_card.png"),
    "J": require("../../attached_assets/generated_images/kawaii_deck_jack_card.png"),
    "Q": require("../../attached_assets/generated_images/kawaii_deck_queen_card.png"),
    "K": require("../../attached_assets/generated_images/kawaii_deck_king_card.png"),
    "A": require("../../attached_assets/generated_images/kawaii_deck_ace_card.png"),
  },
  cosplay: {
    "10": require("../../attached_assets/generated_images/cosplay_deck_10_card.png"),
    "J": require("../../attached_assets/generated_images/cosplay_deck_jack_card.png"),
    "Q": require("../../attached_assets/generated_images/cosplay_deck_queen_card.png"),
    "K": require("../../attached_assets/generated_images/cosplay_deck_king_card.png"),
    "A": require("../../attached_assets/generated_images/cosplay_deck_ace_card.png"),
  },
  hunters: {
    "10": require("../../attached_assets/generated_images/hunters_deck_ten_face_card.png"),
    "J": require("../../attached_assets/generated_images/hunters_deck_jack_face_card.png"),
    "Q": require("../../attached_assets/generated_images/hunters_deck_queen_face_card.png"),
    "K": require("../../attached_assets/generated_images/hunters_deck_king_face_card.png"),
    "A": require("../../attached_assets/generated_images/hunters_deck_ace_face_card.png"),
  },
};

// Check if a card rank has custom face artwork
const HIGH_VALUE_RANKS = ["10", "J", "Q", "K", "A"];
const hasFaceCardImage = (deckStyleId: string, rank: string): boolean => {
  return FACE_CARD_IMAGES[deckStyleId]?.[rank] !== undefined;
};

const getFaceCardImage = (deckStyleId: string, rank: string): any | null => {
  return FACE_CARD_IMAGES[deckStyleId]?.[rank] || null;
};

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
        <ImageBackground
          source={DECK_IMAGES[deckStyleId] || DECK_IMAGES.yard}
          style={styles.deckImage}
          imageStyle={styles.deckImageStyle}
          resizeMode="cover"
        >
          <View style={styles.deckImageOverlay}>
            <ThemedText
              style={[
                styles.backText,
                {
                  fontSize: typography.backText,
                  letterSpacing: typography.backLetterSpacing,
                  color: deckStyle.textColor,
                  textShadowColor: "rgba(0,0,0,0.8)",
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 3,
                },
              ]}
            >
              {deckStyle.name}
            </ThemedText>
          </View>
        </ImageBackground>

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
          { padding: hasFaceCardImage(deckStyleId, card?.rank || "") ? 0 : cornerPadding },
          frontAnimatedStyle,
        ]}
      >
        {card ? (
          hasFaceCardImage(deckStyleId, card.rank) ? (
            // Custom face card artwork for high-value cards
            <ImageBackground
              source={getFaceCardImage(deckStyleId, card.rank)}
              style={styles.faceCardImage}
              imageStyle={styles.faceCardImageStyle}
              resizeMode="cover"
            >
              {/* Overlay with rank, suit and rep value */}
              <View style={styles.faceCardOverlay}>
                {/* Top left corner */}
                <View style={[styles.faceCornerTop, { top: cornerPadding, left: cornerPadding }]}>
                  <ThemedText
                    style={[
                      styles.faceCornerRank,
                      { fontSize: typography.cornerRank - 4, color: "#FFF" },
                    ]}
                  >
                    {card.rank}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.faceCornerSuit,
                      { fontSize: typography.cornerSuit - 4, color: getSuitColor(card.suit) },
                    ]}
                  >
                    {SUIT_SYMBOLS[card.suit]}
                  </ThemedText>
                </View>

                {/* Bottom right corner (rotated) */}
                <View style={[styles.faceCornerBottom, { bottom: cornerPadding, right: cornerPadding }]}>
                  <ThemedText
                    style={[
                      styles.faceCornerSuit,
                      { fontSize: typography.cornerSuit - 4, color: getSuitColor(card.suit) },
                    ]}
                  >
                    {SUIT_SYMBOLS[card.suit]}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.faceCornerRank,
                      { fontSize: typography.cornerRank - 4, color: "#FFF" },
                    ]}
                  >
                    {card.rank}
                  </ThemedText>
                </View>

                {/* Rep value badge */}
                <View style={styles.faceRepBadge}>
                  <ThemedText style={styles.faceRepValue}>{card.value}</ThemedText>
                </View>
              </View>
            </ImageBackground>
          ) : (
            // Standard card layout for number cards
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
          )
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
  deckImage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  deckImageStyle: {
    borderRadius: BorderRadius.md - 2,
    opacity: 0.85,
  },
  deckImageOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    width: "100%",
    paddingHorizontal: Spacing.md,
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
  faceCardImage: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  faceCardImageStyle: {
    borderRadius: BorderRadius.md,
  },
  faceCardOverlay: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  faceCornerTop: {
    position: "absolute",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  faceCornerBottom: {
    position: "absolute",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    transform: [{ rotate: "180deg" }],
  },
  faceCornerRank: {
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,1)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  faceCornerSuit: {
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,1)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  faceRepBadge: {
    position: "absolute",
    bottom: 8,
    left: "50%",
    transform: [{ translateX: -24 }],
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    minWidth: 48,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.accent,
  },
  faceRepValue: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.dark.accent,
    letterSpacing: 1,
  },
});
