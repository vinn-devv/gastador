import { Platform, StyleSheet, Text, type TextProps } from "react-native";

import { Fonts, type ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedTextProps = TextProps & {
  type?:
    | "default"
    | "title"
    | "small"
    | "smallBold"
    | "subtitle"
    | "link"
    | "linkPrimary"
    | "code";
  themeColor?: ThemeColor;
};

export function ThemedText({
  style,
  type = "default",
  themeColor,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        {
          color:
            type === "linkPrimary"
              ? theme.primary
              : theme[themeColor ?? "text"],
        },
        styles[type],
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: "IBMPlexSans_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },
  default: {
    fontFamily: "IBMPlexSans_400Regular",
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 48,
    lineHeight: 52,
  },
  subtitle: {
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 32,
    lineHeight: 44,
  },
  link: {
    fontFamily: "IBMPlexSans_500Medium",
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: "IBMPlexSans_500Medium",
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: "700" as const }) ?? "500",
    fontSize: 12,
  },
});
