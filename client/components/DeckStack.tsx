import React from "react";
import { View, StyleSheet, ImageBackground } from "react-native";
import Animated from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Colors } from "@/constants/theme";
import { getDeckStyleById, DeckStyleId } from "@/lib/storage";

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
};

interface DeckStackProps {
  totalCards: number;
  cardsRemaining: number;
  deckStyleId?: DeckStyleId;
  size?: "small" | "medium";
}

const STACK_LAYERS = 5;

export function DeckStack({
  totalCards,
  cardsRemaining,
  deckStyleId = "yard",
  size = "medium",
}: DeckStackProps) {
  const deckStyle = getDeckStyleById(deckStyleId);
  const progress = totalCards > 0 ? cardsRemaining / totalCards : 1;
  const visibleLayers = Math.max(1, Math.ceil(progress * STACK_LAYERS));

  const dimensions = size === "small" 
    ? { width: 50, height: 70, offset: 1.5 }
    : { width: 80, height: 112, offset: 2 };

  return (
    <View style={[styles.container, { width: dimensions.width + 12, height: dimensions.height + 12 }]}>
      {Array.from({ length: visibleLayers }).map((_, index) => {
        const layerIndex = visibleLayers - 1 - index;
        const offset = layerIndex * dimensions.offset;
        const opacity = 1 - (layerIndex * 0.15);
        
        return (
          <Animated.View
            key={index}
            style={[
              styles.card,
              {
                width: dimensions.width,
                height: dimensions.height,
                backgroundColor: deckStyle.backColor,
                borderColor: deckStyle.accentColor,
                bottom: offset,
                right: offset,
                opacity,
                zIndex: STACK_LAYERS - layerIndex,
                overflow: "hidden",
              },
            ]}
          >
            {layerIndex === 0 ? (
              <ImageBackground
                source={DECK_IMAGES[deckStyleId] || DECK_IMAGES.yard}
                style={styles.cardImage}
                imageStyle={styles.cardImageStyle}
                resizeMode="cover"
              >
                <View style={styles.cardImageOverlay}>
                  <ThemedText
                    style={[
                      styles.deckText,
                      { 
                        color: deckStyle.textColor,
                        fontSize: size === "small" ? 8 : 12,
                        letterSpacing: size === "small" ? 1 : 2,
                        textShadowColor: "rgba(0,0,0,0.8)",
                        textShadowOffset: { width: 1, height: 1 },
                        textShadowRadius: 2,
                      },
                    ]}
                  >
                    {deckStyle.name}
                  </ThemedText>
                </View>
              </ImageBackground>
            ) : null}
          </Animated.View>
        );
      })}
      
      {cardsRemaining > 0 && (
        <View style={[styles.countBadge, { backgroundColor: deckStyle.accentColor }]}>
          <ThemedText style={[styles.countText, { fontSize: size === "small" ? 10 : 12 }]}>
            {cardsRemaining}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  card: {
    position: "absolute",
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  cardContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  cardImageStyle: {
    borderRadius: BorderRadius.sm - 1,
  },
  cardImageOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    width: "100%",
  },
  innerBorder: {
    width: "100%",
    height: "100%",
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  deckText: {
    fontWeight: "900",
    textAlign: "center",
  },
  countBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    zIndex: 100,
  },
  countText: {
    fontWeight: "800",
    color: "#0b0b0b",
  },
});
