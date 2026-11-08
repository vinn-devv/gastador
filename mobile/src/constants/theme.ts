import "@/global.css";
import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#192434",
    background: "#F7F9FC",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#E7F1FD",
    textSecondary: "#708091",
    surface: "#FFFFFF",
    sunken: "#F1F5F9",
    line: "#E2E8F0",
    muted: "#708091",
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
    text: "#F5F8FF",
    background: "#050B14",
    backgroundElement: "#0B1726",
    backgroundSelected: "#112B4C",
    textSecondary: "#93A4B8",
    surface: "#0B1726",
    sunken: "#102238",
    line: "#22374F",
    muted: "#93A4B8",
    primary: "#398BFF",
    onPrimary: "#FFFFFF",
    primarySoft: "#112B4C",
    navy: "#07182E",
    balanceEnd: "#0B1726",
    mint: "#398BFF",
    teal: "#63A7FF",
    tealSoft: "#112B4C",
    warning: "#63A7FF",
    warningSoft: "#112B4C",
    danger: "#F16D79",
    dangerSoft: "#3B1B27",
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
