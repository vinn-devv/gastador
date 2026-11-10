import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

const glassOk = isLiquidGlassAvailable();

type Props = {
  radius?: number;
  fill?: number;
  blur?: number;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function GlassSurface({
  radius = 24,
  fill,
  blur = 14,
  interactive = false,
  style,
  children,
}: Props) {
  const overlay = fill ?? (glassOk ? 0.08 : 0.17);

  const details = (
    <>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: `rgba(255,255,255,${overlay})` },
        ]}
      />
      <View pointerEvents="none" style={styles.insetTop} />
      <View pointerEvents="none" style={styles.insetBottom} />
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(255,255,255,0)",
          "rgba(255,255,255,0.8)",
          "rgba(255,255,255,0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.edgeTop}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(255,255,255,0.8)",
          "rgba(255,255,255,0)",
          "rgba(255,255,255,0.3)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.edgeLeft}
      />
    </>
  );

  const base: StyleProp<ViewStyle> = [
    {
      borderRadius: radius,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.3)",
      overflow: "hidden",
    },
    style,
  ];

  if (glassOk) {
    return (
      <GlassView
        glassEffectStyle="clear"
        tintColor="rgba(255,255,255,0.06)"
        isInteractive={interactive}
        style={base}
      >
        {details}
        {children}
      </GlassView>
    );
  }

  return (
    <View style={base}>
      <BlurView intensity={blur} tint="light" style={StyleSheet.absoluteFill} />
      {details}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  insetTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  insetBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  edgeTop: { position: "absolute", top: 0, left: 0, right: 0, height: 1 },
  edgeLeft: { position: "absolute", top: 0, left: 0, bottom: 0, width: 1 },
});
