import "@/global.css";
import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#202A35",
    background: "#F3F5F6",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#E7EDF3",
    textSecondary: "#56616B",
    surface: "#FFFFFF",
    sunken: "#EDF1F4",
    line: "#D9DEE2",
    muted: "#68747D",
    primary: "#315D8A",
    onPrimary: "#FFFFFF",
    primarySoft: "#E7EDF3",
    navy: "#244766",
    balanceEnd: "#315D8A",
    mint: "#3F8068",
    teal: "#4D8179",
    tealSoft: "#E8F2EC",
    warning: "#98652F",
    warningSoft: "#FFF0D8",
    danger: "#AD4D4A",
    dangerSoft: "#FBE9E5",
    accent: "#C8D8E7",
    orange: "#315D8A",
    onAccent: "#202A35",
  },
  dark: {
    text: "#202A35",
    background: "#F3F5F6",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#E7EDF3",
    textSecondary: "#56616B",
    surface: "#FFFFFF",
    sunken: "#EDF1F4",
    line: "#D9DEE2",
    muted: "#68747D",
    primary: "#315D8A",
    onPrimary: "#FFFFFF",
    primarySoft: "#E7EDF3",
    navy: "#244766",
    balanceEnd: "#315D8A",
    mint: "#3F8068",
    teal: "#4D8179",
    tealSoft: "#E8F2EC",
    warning: "#98652F",
    warningSoft: "#FFF0D8",
    danger: "#AD4D4A",
    dangerSoft: "#FBE9E5",
    accent: "#C8D8E7",
    orange: "#315D8A",
    onAccent: "#202A35",
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
