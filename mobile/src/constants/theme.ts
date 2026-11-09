import "@/global.css";
import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#172033",
    background: "#F7F9FC",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#EAF2FF",
    textSecondary: "#53647A",
    surface: "#FFFFFF",
    sunken: "#EEF2F7",
    line: "#E2E8F0",
    muted: "#66758A",
    primary: "#3478F6",
    onPrimary: "#FFFFFF",
    primarySoft: "#E8F0FF",
    navy: "#173B70",
    balanceEnd: "#245BC5",
    mint: "#20A88F",
    teal: "#159E9A",
    tealSoft: "#E1F6F2",
    warning: "#C87916",
    warningSoft: "#FFF3DF",
    danger: "#D94B59",
    dangerSoft: "#FDEBED",
  },
  dark: {
    text: "#EFF4FB",
    background: "#101827",
    backgroundElement: "#182338",
    backgroundSelected: "#233553",
    textSecondary: "#AAB8CB",
    surface: "#182338",
    sunken: "#111C2D",
    line: "#2A3A52",
    muted: "#AAB8CB",
    primary: "#78A7FF",
    onPrimary: "#10203A",
    primarySoft: "#263B60",
    navy: "#10203A",
    balanceEnd: "#244D91",
    mint: "#51C7AF",
    teal: "#4CBDB5",
    tealSoft: "#1D3B3B",
    warning: "#F0B45C",
    warningSoft: "#45351E",
    danger: "#F28C96",
    dangerSoft: "#48252D",
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
