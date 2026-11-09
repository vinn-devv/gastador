import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { GlassSurface } from "@/components/glass-surface";

type Props = {
  children: ReactNode;
  radius?: number;
  padding?: number;
  style?: StyleProp<ViewStyle>;
};

export function GlassCard({
  children,
  radius = 24,
  padding = 16,
  style,
}: Props) {
  return (
    <GlassSurface radius={radius} blur={20} style={[styles.card, style]}>
      <View style={{ padding }}>{children}</View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
});
