import "@/global.css";
import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#292522",
    background: "#FFF8F2",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#FFF0D1",
    textSecondary: "#76675F",
    surface: "#FFFFFF",
    sunken: "#F5EAE2",
    line: "#F0E2D8",
    muted: "#9A8A80",
    primary: "#D96E4C",
    onPrimary: "#FFFFFF",
    primarySoft: "#FCE9DF",
    navy: "#59382D",
    balanceEnd: "#D96E4C",
    mint: "#56866A",
    teal: "#4D8179",
    tealSoft: "#E8F2EC",
    warning: "#9A682D",
    warningSoft: "#FFF0D8",
    danger: "#B64F45",
    dangerSoft: "#FBE9E5",
    accent: "#F5D77A",
    orange: "#D96E4C",
    onAccent: "#49372B",
  },
  dark: {
    text: "#292522",
    background: "#FFF8F2",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#FFF0D1",
    textSecondary: "#76675F",
    surface: "#FFFFFF",
    sunken: "#F5EAE2",
    line: "#F0E2D8",
    muted: "#9A8A80",
    primary: "#D96E4C",
    onPrimary: "#FFFFFF",
    primarySoft: "#FCE9DF",
    navy: "#59382D",
    balanceEnd: "#D96E4C",
    mint: "#56866A",
    teal: "#4D8179",
    tealSoft: "#E8F2EC",
    warning: "#9A682D",
    warningSoft: "#FFF0D8",
    danger: "#B64F45",
    dangerSoft: "#FBE9E5",
    accent: "#F5D77A",
    orange: "#D96E4C",
    onAccent: "#49372B",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: { sans: "system-ui", serif: "ui-serif", rounded: "ui-rounded", mono: "ui-monospace" },
  default: { sans: "normal", serif: "serif", rounded: "normal", mono: "monospace" },
  web: { sans: "var(--font-display)", serif: "var(--font-serif)", rounded: "var(--font-rounded)", mono: "var(--font-mono)" },
});

export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
