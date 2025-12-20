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

interface CrackLine {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: string;
  opacity: number;
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

// Generate procedural crack lines
function generateCracks(seed: number = 42): CrackLine[] {
  const cracks: CrackLine[] = [];
  const numCracks = 25;

  for (let i = 0; i < numCracks; i++) {
    const baseX = ((seed * (i + 1) * 17) % 100) * (SCREEN_WIDTH / 100);
    const baseY = ((seed * (i + 1) * 23) % 100) * (SCREEN_HEIGHT / 100);

    // Main crack - more visible
    cracks.push({
      id: `crack-main-${i}`,
      x: baseX,
      y: baseY,
      width: 60 + ((seed * i) % 120),
      height: 1 + ((seed * i) % 10) * 0.2,
      rotation: `${((seed * i * 37) % 180) - 90}deg`,
      opacity: 0.35 + ((seed * i) % 20) * 0.01,
    });

    // Branch cracks
    if (i % 2 === 0) {
      cracks.push({
        id: `crack-branch-${i}`,
        x: baseX + 15,
        y: baseY + 8,
        width: 30 + ((seed * i) % 50),
        height: 0.6 + ((seed * i) % 6) * 0.15,
        rotation: `${(seed * i * 53) % 90}deg`,
        opacity: 0.25 + ((seed * i) % 15) * 0.01,
      });
    }
  }

  return cracks;
}

// Generate weathering stains
function generateStains(seed: number = 73): StainBlob[] {
  const stains: StainBlob[] = [];
  const numStains = 12;

  for (let i = 0; i < numStains; i++) {
    const x = ((seed * (i + 1) * 31) % 90) * (SCREEN_WIDTH / 100);
    const y = ((seed * (i + 1) * 47) % 90) * (SCREEN_HEIGHT / 100);
    const baseSize = 80 + ((seed * i) % 150);

    stains.push({
      id: `stain-${i}`,
      x,
      y,
      width: baseSize * (0.8 + ((seed * i) % 50) / 100),
      height: baseSize * (0.6 + ((seed * i) % 40) / 100),
      borderRadius: baseSize / 2,
      opacity: 0.08 + ((seed * i) % 8) * 0.015,
      rotation: `${(seed * i * 29) % 360}deg`,
    });
  }

  return stains;
}

// Generate fine grain texture dots
function generateGrainDots(seed: number = 19): GrainDot[] {
  const dots: GrainDot[] = [];
  const numDots = 300;

  for (let i = 0; i < numDots; i++) {
    dots.push({
      id: `grain-${i}`,
      x: ((seed * (i + 1) * 13) % 100) * (SCREEN_WIDTH / 100),
      y: ((seed * (i + 1) * 17) % 100) * (SCREEN_HEIGHT / 100),
      size: 1 + ((seed * i) % 4),
      opacity: 0.1 + ((seed * i) % 25) * 0.015,
    });
  }

  return dots;
}

export function ConcreteBackground({
  children,
  intensity = "medium",
  showCracks = true,
  accentGlow = true,
}: ConcreteBackgroundProps) {
  // Memoize generated elements
  const cracks = useMemo(
    () => (showCracks ? generateCracks() : []),
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
                backgroundColor: dot.size > 2 ? "#1a1a1a" : "#222222",
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

      {/* Cracks layer */}
      {showCracks && (
        <View style={styles.cracksLayer} pointerEvents="none">
          {cracks.map((crack) => (
            <View key={crack.id}>
              {/* Shadow/depth of crack */}
              <View
                style={[
                  styles.crackLine,
                  {
                    left: crack.x,
                    top: crack.y + 1,
                    width: crack.width,
                    height: crack.height + 1,
                    opacity: crack.opacity * 0.3 * intensityMultiplier,
                    backgroundColor: "#000000",
                    transform: [{ rotate: crack.rotation }],
                  },
                ]}
              />
              {/* Main crack line */}
              <View
                style={[
                  styles.crackLine,
                  {
                    left: crack.x,
                    top: crack.y,
                    width: crack.width,
                    height: crack.height,
                    opacity: crack.opacity * intensityMultiplier,
                    transform: [{ rotate: crack.rotation }],
                  },
                ]}
              />
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
  cracksLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  grainDot: {
    position: "absolute",
  },
  stainBlob: {
    position: "absolute",
    backgroundColor: "#121212",
  },
  crackLine: {
    position: "absolute",
    backgroundColor: "#252525",
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
