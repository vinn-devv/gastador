import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";

export function AmbientBackdrop() {
  const theme = useTheme();
  const drift = useRef(new Animated.Value(0)).current;
  const dark = theme.background === "#050B14";

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 11000, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 11000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);

  const x = drift.interpolate({ inputRange: [0, 1], outputRange: [-12, 12] });
  const y = drift.interpolate({ inputRange: [0, 1], outputRange: [8, -8] });

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.root]}>
      <Animated.View
        style={[
          styles.orb,
          styles.orbOne,
          { backgroundColor: theme.primary, opacity: dark ? 0.09 : 0.07, transform: [{ translateX: x }, { translateY: y }] },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orbTwo,
          { backgroundColor: theme.primary, opacity: dark ? 0.07 : 0.055, transform: [{ translateX: Animated.multiply(x, -1) }, { translateY: Animated.multiply(y, -1) }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: "hidden" },
  orb: { position: "absolute", width: 360, height: 360, borderRadius: 180 },
  orbOne: { top: -205, left: -145 },
  orbTwo: { bottom: -230, right: -155 },
});
