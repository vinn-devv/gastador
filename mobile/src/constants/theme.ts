import "@/global.css";
import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#0F172A",
    background: "#F3F5F6",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#EAF3FF",
    textSecondary: "#475569",
    surface: "#FFFFFF",
    sunken: "#EDF1F4",
    line: "#D9DEE2",
    muted: "#64748B",
    primary: "#2563EB",
    onPrimary: "#FFFFFF",
    primarySoft: "#EAF3FF",
    navy: "#1E40AF",
    balanceEnd: "#2563EB",
    mint: "#3F8068",
    teal: "#4D8179",
    tealSoft: "#E8F2EC",
    warning: "#98652F",
    warningSoft: "#FFF4D6",
    danger: "#AD4D4A",
    dangerSoft: "#FBE9E5",
    accent: "#8EC5FF",
    orange: "#2563EB",
    onAccent: "#202A35",
  },
  dark: {
    text: "#202A35",
    background: "#F3F5F6",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#EAF3FF",
    textSecondary: "#56616B",
    surface: "#FFFFFF",
    sunken: "#EDF1F4",
    line: "#D9DEE2",
    muted: "#68747D",
    primary: "#2563EB",
    onPrimary: "#FFFFFF",
    primarySoft: "#EAF3FF",
    navy: "#1E40AF",
    balanceEnd: "#2563EB",
    mint: "#3F8068",
    teal: "#4D8179",
    tealSoft: "#E8F2EC",
    warning: "#98652F",
    warningSoft: "#FFF4D6",
    danger: "#AD4D4A",
    dangerSoft: "#FBE9E5",
    accent: "#8EC5FF",
    orange: "#2563EB",
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
