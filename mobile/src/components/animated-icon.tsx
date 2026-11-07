import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const started = useRef(false);

  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.82)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 55,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const startIntro = () => {
    if (started.current) return;
    started.current = true;

    SplashScreen.hideAsync();

    Animated.sequence([
      Animated.delay(900),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  };

  if (!visible) return null;

  return (
    <Animated.View onLayout={startIntro} style={[styles.overlay, { opacity }]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Image
          source={require("@/assets/images/gastador-logo.png")}
          style={styles.logo}
          contentFit="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: "#0F2A6B",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 230,
    height: 230,
  },
});
