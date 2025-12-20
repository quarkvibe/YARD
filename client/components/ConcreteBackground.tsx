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

interface TallyRow {
  id: string;
  x: number;
  y: number;
  groups: number[]; // Array of counts (mostly 5s, maybe a partial at end)
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

// Generate tally mark rows - realistic counting with multiple 5s and maybe a partial at end
function generateTallyRows(seed: number = 42): TallyRow[] {
  const rows: TallyRow[] = [];

  // Create a few rows of tallies scattered around the screen
  const rowConfigs = [
    { x: 5, y: 8, numFives: 4, remainder: 2 }, // 22 marks
    { x: 70, y: 25, numFives: 3, remainder: 0 }, // 15 marks
    { x: 10, y: 55, numFives: 2, remainder: 3 }, // 13 marks
    { x: 65, y: 75, numFives: 5, remainder: 1 }, // 26 marks
    { x: 8, y: 88, numFives: 3, remainder: 4 }, // 19 marks
  ];

  rowConfigs.forEach((config, i) => {
    const groups: number[] = [];
    // Add complete sets of 5
    for (let j = 0; j < config.numFives; j++) {
      groups.push(5);
    }
    // Add remainder if any
    if (config.remainder > 0) {
      groups.push(config.remainder);
    }

    rows.push({
      id: `tally-row-${i}`,
      x: config.x * (SCREEN_WIDTH / 100),
      y: config.y * (SCREEN_HEIGHT / 100),
      groups,
      rotation: `${((seed * i * 7) % 10) - 5}deg`,
      opacity: 0.4 + ((seed * i) % 8) * 0.04,
      scale: 0.9 + ((seed * i) % 3) * 0.1,
    });
  });

  return rows;
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

// Individual tally group (1-5 marks)
function TallyGroup({ count, scale }: { count: number; scale: number }) {
  const safeScale = Math.max(scale, 0.9);
  const markWidth = 3 * safeScale;
  const markHeight = 20 * safeScale;
  const spacing = 5 * safeScale;
  const markColor = "#7a7a7a";

  const groupWidth = Math.min(count, 4) * (markWidth + spacing);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        width: groupWidth + spacing,
      }}
    >
      {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
        <View
          key={i}
          style={{
            width: markWidth,
            height: markHeight,
            backgroundColor: markColor,
            marginRight: spacing,
            borderRadius: 1,
          }}
        />
      ))}
      {count === 5 ? (
        <View
          style={{
            position: "absolute",
            width: markWidth,
            height: markHeight * 1.3,
            backgroundColor: markColor,
            transform: [{ rotate: "-30deg" }],
            left: spacing,
            top: -markHeight * 0.15,
            borderRadius: 1,
          }}
        />
      ) : null}
    </View>
  );
}

// Row of tally groups (multiple sets of 5 in a line)
function TallyRowComponent({
  groups,
  scale,
}: {
  groups: number[];
  scale: number;
}) {
  const groupSpacing = 12 * scale;

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {groups.map((count, i) => (
        <View key={i} style={{ marginRight: groupSpacing }}>
          <TallyGroup count={count} scale={scale} />
        </View>
      ))}
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
  const tallyRows = useMemo(
    () => (showCracks ? generateTallyRows() : []),
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
          {tallyRows.map((row) => (
            <View
              key={row.id}
              style={[
                styles.tallyGroup,
                {
                  left: row.x,
                  top: row.y,
                  opacity: row.opacity * intensityMultiplier,
                  transform: [{ rotate: row.rotation }],
                },
              ]}
            >
              <TallyRowComponent groups={row.groups} scale={row.scale} />
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
