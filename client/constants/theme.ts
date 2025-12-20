import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#FAFAFA",
    textSecondary: "#A0A0A0",
    buttonText: "#0b0b0b",
    tabIconDefault: "#6B6B6B",
    tabIconSelected: "#FF6B35",
    link: "#FF6B35",
    accent: "#FF6B35",
    success: "#4CAF50",
    pushups: "#E74C3C",
    squats: "#3498DB",
    backgroundRoot: "#0b0b0b",
    backgroundDefault: "#141414",
    backgroundSecondary: "#1E1E1E",
    backgroundTertiary: "#2A2A2A",
    cardBackground: "#1A1A1A",
    cardBorder: "#333333",
    concrete: "#3D3D3D",
    chalk: "#FAFAFA",
  },
  dark: {
    text: "#FAFAFA",
    textSecondary: "#A0A0A0",
    buttonText: "#0b0b0b",
    tabIconDefault: "#6B6B6B",
    tabIconSelected: "#FF6B35",
    link: "#FF6B35",
    accent: "#FF6B35",
    success: "#4CAF50",
    pushups: "#E74C3C",
    squats: "#3498DB",
    backgroundRoot: "#0b0b0b",
    backgroundDefault: "#141414",
    backgroundSecondary: "#1E1E1E",
    backgroundTertiary: "#2A2A2A",
    cardBackground: "#1A1A1A",
    cardBorder: "#333333",
    concrete: "#3D3D3D",
    chalk: "#FAFAFA",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 56,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
};

export const Typography = {
  hero: {
    fontSize: 72,
    fontWeight: "900" as const,
    letterSpacing: 8,
    textTransform: "uppercase" as const,
  },
  timer: {
    fontSize: 56,
    fontWeight: "800" as const,
    letterSpacing: 6,
  },
  h1: {
    fontSize: 32,
    fontWeight: "900" as const,
    letterSpacing: 6,
    textTransform: "uppercase" as const,
  },
  h2: {
    fontSize: 24,
    fontWeight: "800" as const,
    letterSpacing: 4,
    textTransform: "uppercase" as const,
  },
  h3: {
    fontSize: 20,
    fontWeight: "800" as const,
    letterSpacing: 3,
    textTransform: "uppercase" as const,
  },
  h4: {
    fontSize: 18,
    fontWeight: "700" as const,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "500" as const,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "500" as const,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: "600" as const,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "700" as const,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    condensed: "system-ui",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    condensed: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    condensed:
      "'Oswald', 'Barlow Condensed', 'Arial Narrow', system-ui, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
