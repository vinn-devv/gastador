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
    text: "#EFF6FC",
    background: "#050B14",
    backgroundElement: "#0B1624",
    backgroundSelected: "#14283D",
    textSecondary: "#9AAFC2",
    surface: "#0B1624",
    sunken: "#101E2E",
    line: "#203247",
    muted: "#9AAFC2",
    primary: "#83C5F4",
    onPrimary: "#061628",
    primarySoft: "#142D45",
    navy: "#061628",
    balanceEnd: "#0B2440",
    mint: "#83C5F4",
    teal: "#5FADE6",
    tealSoft: "#142D45",
    warning: "#F2BE78",
    warningSoft: "#392D20",
    danger: "#F58C9A",
    dangerSoft: "#3A202A",
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
