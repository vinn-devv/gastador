import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import { Image } from "expo-image";

export function HalftoneBackground() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      drift.stopAnimation();
      drift.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 26000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 26000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [drift, reduceMotion]);

  const translateX = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-2, 2],
  });
  const translateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, -1],
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.imageLayer,
          {
            transform: [
              { translateX },
              { translateY },
              { scale: 1.035 },
            ],
          },
        ]}
      >
        <Image
          source={require("@/assets/images/gastador-halftone.svg")}
          contentFit="cover"
          transition={0}
          style={styles.image}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageLayer: {
    position: "absolute",
    top: -8,
    right: -8,
    bottom: -8,
    left: -8,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
