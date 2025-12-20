import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ConcreteBackgroundProps {
  children?: React.ReactNode;
  intensity?: "light" | "medium" | "heavy";
  showCracks?: boolean;
  accentGlow?: boolean;
}

interface TallyGroup {
  id: string;
  x: number;
  y: number;
  count: number; // 1-5 marks
  rotation: string;
  opacity: number;
  scale: number;
}

interface StainBlob {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
  opacity: number;
  rotation: string;
}

interface GrainDot {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
}

// Generate tally mark groups scattered across the background
function generateTallyGroups(seed: number = 42): TallyGroup[] {
  const tallies: TallyGroup[] = [];
  const numGroups = 12;

  for (let i = 0; i < numGroups; i++) {
    const x = ((seed * (i + 1) * 17) % 85) * (SCREEN_WIDTH / 100);
    const y = ((seed * (i + 1) * 23) % 85) * (SCREEN_HEIGHT / 100);

    tallies.push({
      id: `tally-${i}`,
      x,
      y,
      count: 1 + ((seed * i) % 5), // 1-5 marks
      rotation: `${((seed * i * 7) % 20) - 10}deg`, // slight rotation for hand-drawn look
      opacity: 0.15 + ((seed * i) % 10) * 0.02,
      scale: 0.6 + ((seed * i) % 5) * 0.1,
    });
  }

  return tallies;
}

// Generate weathering stains
function generateStains(seed: number = 73): StainBlob[] {
  const stains: StainBlob[] = [];
  const numStains = 15;

  for (let i = 0; i < numStains; i++) {
    const x = ((seed * (i + 1) * 31) % 90) * (SCREEN_WIDTH / 100);
    const y = ((seed * (i + 1) * 47) % 90) * (SCREEN_HEIGHT / 100);
    const baseSize = 100 + ((seed * i) % 180);

    stains.push({
      id: `stain-${i}`,
      x,
      y,
      width: baseSize * (0.8 + ((seed * i) % 50) / 100),
      height: baseSize * (0.6 + ((seed * i) % 40) / 100),
      borderRadius: baseSize / 2,
      opacity: 0.2 + ((seed * i) % 10) * 0.02,
      rotation: `${(seed * i * 29) % 360}deg`,
    });
  }

  return stains;
}

// Generate fine grain texture dots
function generateGrainDots(seed: number = 19): GrainDot[] {
  const dots: GrainDot[] = [];
  const numDots = 400;

  for (let i = 0; i < numDots; i++) {
    dots.push({
      id: `grain-${i}`,
      x: ((seed * (i + 1) * 13) % 100) * (SCREEN_WIDTH / 100),
      y: ((seed * (i + 1) * 17) % 100) * (SCREEN_HEIGHT / 100),
      size: 2 + ((seed * i) % 5),
      opacity: 0.25 + ((seed * i) % 30) * 0.02,
    });
  }

  return dots;
}

// Individual tally mark component
function TallyMark({ count, scale }: { count: number; scale: number }) {
  const markWidth = 2 * scale;
  const markHeight = 18 * scale;
  const spacing = 6 * scale;
  
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
        <View
          key={i}
          style={{
            width: markWidth,
            height: markHeight,
            backgroundColor: "#4a4a4a",
            marginRight: spacing,
          }}
        />
      ))}
      {count === 5 ? (
        <View
          style={{
            position: "absolute",
            width: markWidth,
            height: markHeight * 1.3,
            backgroundColor: "#4a4a4a",
            transform: [{ rotate: "-30deg" }],
            left: spacing * 0.5,
          }}
        />
      ) : null}
    </View>
  );
}

export function ConcreteBackground({
  children,
  intensity = "medium",
  showCracks = true,
  accentGlow = true,
}: ConcreteBackgroundProps) {
  // Memoize generated elements
  const tallyGroups = useMemo(
    () => (showCracks ? generateTallyGroups() : []),
    [showCracks],
  );
  const stains = useMemo(() => generateStains(), []);
  const grainDots = useMemo(() => generateGrainDots(), []);

  // Intensity multiplier
  const intensityMultiplier =
    intensity === "heavy" ? 1.5 : intensity === "medium" ? 1 : 0.6;

  return (
    <View style={styles.container}>
      {/* Base dark layer */}
      <View
        style={[
          styles.baseLayer,
          { backgroundColor: Colors.dark.backgroundRoot },
        ]}
      />

      {/* Gradient overlay for depth */}
      <LinearGradient
        colors={[
          "rgba(15, 15, 15, 0.8)",
          "rgba(11, 11, 11, 0.2)",
          "rgba(8, 8, 8, 0.6)",
        ]}
        locations={[0, 0.5, 1]}
        style={styles.gradientLayer}
      />

      {/* Concrete grain texture dots */}
      <View style={styles.textureLayer} pointerEvents="none">
        {grainDots.map((dot) => (
          <View
            key={dot.id}
            style={[
              styles.grainDot,
              {
                left: dot.x,
                top: dot.y,
                width: dot.size,
                height: dot.size,
                borderRadius: dot.size / 2,
                opacity: dot.opacity * intensityMultiplier,
                backgroundColor: dot.size > 3 ? "#2a2a2a" : "#353535",
              },
            ]}
          />
        ))}
      </View>

      {/* Weathering stains layer */}
      <View style={styles.stainsLayer} pointerEvents="none">
        {stains.map((stain) => (
          <View
            key={stain.id}
            style={[
              styles.stainBlob,
              {
                left: stain.x,
                top: stain.y,
                width: stain.width,
                height: stain.height,
                borderRadius: stain.borderRadius,
                opacity: stain.opacity * intensityMultiplier,
                transform: [{ rotate: stain.rotation }],
              },
            ]}
          />
        ))}
      </View>

      {/* Tally marks layer */}
      {showCracks && (
        <View style={styles.tallyLayer} pointerEvents="none">
          {tallyGroups.map((tally) => (
            <View
              key={tally.id}
              style={[
                styles.tallyGroup,
                {
                  left: tally.x,
                  top: tally.y,
                  opacity: tally.opacity * intensityMultiplier,
                  transform: [{ rotate: tally.rotation }],
                },
              ]}
            >
              <TallyMark count={tally.count} scale={tally.scale} />
            </View>
          ))}
        </View>
      )}

      {/* Top vignette */}
      <LinearGradient
        colors={["rgba(0, 0, 0, 0.5)", "rgba(0, 0, 0, 0)"]}
        locations={[0, 1]}
        style={styles.vignetteTop}
        pointerEvents="none"
      />

      {/* Bottom vignette */}
      <LinearGradient
        colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.6)"]}
        locations={[0, 1]}
        style={styles.vignetteBottom}
        pointerEvents="none"
      />

      {/* Left edge shadow */}
      <LinearGradient
        colors={["rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.edgeLeft}
        pointerEvents="none"
      />

      {/* Right edge shadow */}
      <LinearGradient
        colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.3)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.edgeRight}
        pointerEvents="none"
      />

      {/* Accent glow overlay */}
      {accentGlow && (
        <LinearGradient
          colors={[
            "rgba(255, 107, 53, 0)",
            "rgba(255, 107, 53, 0.02)",
            "rgba(255, 107, 53, 0)",
          ]}
          locations={[0, 0.5, 1]}
          style={styles.accentGlow}
          pointerEvents="none"
        />
      )}

      {/* Content layer */}
      <View style={styles.contentLayer}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  baseLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  textureLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  stainsLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  tallyLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  tallyGroup: {
    position: "absolute",
  },
  grainDot: {
    position: "absolute",
  },
  stainBlob: {
    position: "absolute",
    backgroundColor: "#1e1e1e",
  },
  vignetteTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.25,
  },
  vignetteBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.35,
  },
  edgeLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 40,
  },
  edgeRight: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 40,
  },
  accentGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  contentLayer: {
    ...StyleSheet.absoluteFillObject,
  },
});
