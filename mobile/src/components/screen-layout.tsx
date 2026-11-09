import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SHEET_GAP } from "@/constants/layout";

type ScreenLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function ScreenLayout({ title, subtitle, children }: ScreenLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerText}>
          <ScreenTitle>{title}</ScreenTitle>
          <ScreenSubtitle>{subtitle}</ScreenSubtitle>
        </View>
      </View>
      <View style={styles.sheet}>{children}</View>
    </View>
  );
}

function ScreenTitle({ children }: { children: string }) {
  return <TextBase kind="title">{children}</TextBase>;
}

function ScreenSubtitle({ children }: { children: string }) {
  return <TextBase kind="subtitle">{children}</TextBase>;
}

function TextBase({ children, kind }: { children: string; kind: "title" | "subtitle" }) {
  return <Text style={kind === "title" ? styles.title : styles.subtitle}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#2563EB", overflow: "hidden" },
  header: { paddingHorizontal: 24, paddingBottom: 18 },
  headerText: { gap: 4 },
  title: { color: "#FFFFFF", fontFamily: "IBMPlexSans_700Bold", fontSize: 25, lineHeight: 32 },
  subtitle: { color: "rgba(255,255,255,0.82)", fontFamily: "IBMPlexSans_400Regular", fontSize: 13, lineHeight: 19 },
  sheet: {
    flex: 1,
    minHeight: 0,
    marginHorizontal: SHEET_GAP,
    marginBottom: SHEET_GAP,
    paddingTop: 16,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: "hidden",
  },
});
