import "@/global.css";
import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#192434",
    background: "#F7F9FC",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#E7F1FD",
    textSecondary: "#707E91",
    surface: "#FFFFFF",
    sunken: "#F1F5F9",
    line: "#E2E8F0",
    muted: "#707E91",
    primary: "#3084DC",
    onPrimary: "#FFFFFF",
    primarySoft: "#E7F1FD",
    navy: "#192434",
    balanceEnd: "#FFFFFF",
    mint: "#3084DC",
    teal: "#3084DC",
    tealSoft: "#E7F1FD",
    warning: "#D97706",
    warningSoft: "#FEF3C7",
    danger: "#E11D48",
    dangerSoft: "#FFE4E6",
  },
  dark: {
    text: "#EFF4FA",
    background: "#0C131D",
    backgroundElement: "#131D2B",
    backgroundSelected: "#1B2D43",
    textSecondary: "#97A6B8",
    surface: "#131D2B",
    sunken: "#192637",
    line: "#253346",
    muted: "#97A6B8",
    primary: "#74B8FF",
    onPrimary: "#FFFFFF",
    primarySoft: "#1B2D43",
    navy: "#192434",
    balanceEnd: "#131D2B",
    mint: "#74B8FF",
    teal: "#3084DC",
    tealSoft: "#1B2D43",
    warning: "#F9BE58",
    warningSoft: "#3A2F1A",
    danger: "#FA7785",
    dangerSoft: "#3E1F27",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
