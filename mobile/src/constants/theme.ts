import "@/global.css";
import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#203247",
    background: "#E7EDF2",
    backgroundElement: "#F4F8FB",
    backgroundSelected: "#DCEBFA",
    textSecondary: "#60788D",
    surface: "#F6F9FC",
    sunken: "#DCE6EE",
    line: "#D4E0E9",
    muted: "#62798D",
    primary: "#1E6098",
    onPrimary: "#FFFFFF",
    primarySoft: "#D6E8F7",
    navy: "#153B5D",
    balanceEnd: "#1E6098",
    mint: "#278A78",
    teal: "#278A78",
    tealSoft: "#DDF1EC",
    warning: "#D97706",
    warningSoft: "#FEF3C7",
    danger: "#E11D48",
    dangerSoft: "#FFE4E6",
  },
  dark: {
    text: "#EAF2F8",
    background: "#101A24",
    backgroundElement: "#162431",
    backgroundSelected: "#20394F",
    textSecondary: "#A7BDCF",
    surface: "#1B2936",
    sunken: "#233443",
    line: "#2A4052",
    muted: "#A7BDCF",
    primary: "#4B91C9",
    onPrimary: "#FFFFFF",
    primarySoft: "#24445F",
    navy: "#102B43",
    balanceEnd: "#1D5B91",
    mint: "#54B89C",
    teal: "#54B89C",
    tealSoft: "#203E4A",
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
