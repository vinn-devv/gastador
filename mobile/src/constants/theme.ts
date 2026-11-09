import "@/global.css";
import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#202A35",
    background: "#F7F6F2",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#E9EEF5",
    textSecondary: "#596575",
    surface: "#FFFFFF",
    sunken: "#EEEDE8",
    line: "#E2E0D9",
    muted: "#7A817F",
    primary: "#315D8A",
    onPrimary: "#FFFFFF",
    primarySoft: "#E8EEF5",
    navy: "#233E59",
    balanceEnd: "#315D8A",
    mint: "#3F8D78",
    teal: "#397F79",
    tealSoft: "#E6F0EC",
    warning: "#A66B2C",
    warningSoft: "#F4EBDD",
    danger: "#B44F4B",
    dangerSoft: "#F5E8E5",
  },
  dark: {
    text: "#202A35",
    background: "#F7F6F2",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#E9EEF5",
    textSecondary: "#596575",
    surface: "#FFFFFF",
    sunken: "#EEEDE8",
    line: "#E2E0D9",
    muted: "#7A817F",
    primary: "#315D8A",
    onPrimary: "#FFFFFF",
    primarySoft: "#E8EEF5",
    navy: "#233E59",
    balanceEnd: "#315D8A",
    mint: "#3F8D78",
    teal: "#397F79",
    tealSoft: "#E6F0EC",
    warning: "#A66B2C",
    warningSoft: "#F4EBDD",
    danger: "#B44F4B",
    dangerSoft: "#F5E8E5",
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
