import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as SplashScreen from "expo-splash-screen";

// Re-create the latest website halftone artwork with native views so it
// renders consistently on Android without a web-only SVG background.
const DOTS = Array.from({ length: 18 * 32 }, (_, index) => {
  const column = index % 18;
  const row = Math.floor(index / 18);
  const rightGlow = Math.max(0, 1 - Math.hypot((column - 15) / 8, (row - 18) / 13));
  const lowerGlow = Math.max(0, 1 - Math.hypot((column - 5) / 7, (row - 27) / 7));
  const opacity = Math.max(rightGlow * 0.82, lowerGlow * 0.7) * 0.72;

  return {
    key: index,
    left: `${(column / 17) * 100}%` as `${number}%`,
    top: `${(row / 31) * 100}%` as `${number}%`,
    opacity,
  };
});

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.72)).current;
  const ringOpacity = useRef(new Animated.Value(0.15)).current;
  const scanY = useRef(new Animated.Value(-110)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkY = useRef(new Animated.Value(12)).current;
  const coinsY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    SplashScreen.hideAsync();

    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 48,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(500),
        Animated.parallel([
          Animated.timing(wordmarkOpacity, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.spring(wordmarkY, {
            toValue: 0,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(850),
        Animated.timing(coinsY, {
          toValue: 0,
          duration: 850,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(scanY, {
        toValue: 110,
        duration: 1500,
        delay: 350,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    const ringLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.18,
            duration: 1700,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 1700,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 0.72,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.2,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    ringLoop.start();

    const exit = Animated.sequence([
      Animated.delay(5550),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 650,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    exit.start(({ finished }) => {
      if (finished) setVisible(false);
    });

    return () => {
      ringLoop.stop();
      exit.stop();
    };
  }, [
    coinsY,
    logoOpacity,
    logoScale,
    opacity,
    ringOpacity,
    ringScale,
    scanY,
    wordmarkOpacity,
    wordmarkY,
  ]);

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, { opacity }]}>
      <View style={styles.baseGlow} />
      <View style={styles.dotsLayer}>
        {DOTS.map((dot) => (
          <View
            key={dot.key}
            style={[
              styles.dot,
              { left: dot.left, top: dot.top, opacity: dot.opacity },
            ]}
          />
        ))}
      </View>

      <View style={styles.content}>
        <View style={styles.logoStage}>
          <Animated.View
            style={[
              styles.pulseRing,
              { opacity: ringOpacity, transform: [{ scale: ringScale }] },
            ]}
          />
          <View style={styles.innerRing} />
          <Animated.View
            style={[
              styles.logoWrap,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require("@/assets/images/gastador-logo.png")}
              style={styles.logo}
              contentFit="contain"
            />
            <Animated.View
              style={[
                styles.scanLine,
                { transform: [{ translateY: scanY }] },
              ]}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.coin,
              styles.coinLeft,
              { transform: [{ translateY: coinsY }] },
            ]}
          >
            ₱
          </Animated.View>
          <Animated.View
            style={[
              styles.coin,
              styles.coinRight,
              { transform: [{ translateY: coinsY }] },
            ]}
          >
            ₱
          </Animated.View>
        </View>

        <Animated.View
          style={{
            opacity: wordmarkOpacity,
            transform: [{ translateY: wordmarkY }],
            alignItems: "center",
          }}
        >
          <Text style={styles.wordmark}>Gastador</Text>
          <Text style={styles.tagline}>Snap it. Track it. Stretch it.</Text>
        </Animated.View>
      </View>

      <Text style={styles.footer}>YOUR MONEY, IN VIEW.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    elevation: 1000,
    overflow: "hidden",
    backgroundColor: "#061A30",
    alignItems: "center",
    justifyContent: "center",
  },
  baseGlow: {
    position: "absolute",
    width: 520,
    height: 620,
    right: -190,
    bottom: -100,
    borderRadius: 310,
    backgroundColor: "#0B3B63",
    opacity: 0.55,
  },
  dotsLayer: {
    ...StyleSheet.absoluteFill,
  },
  dot: {
    position: "absolute",
    width: 2.4,
    height: 2.4,
    borderRadius: 2,
    backgroundColor: "#9BC9EE",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -16,
  },
  logoStage: {
    width: 270,
    height: 270,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  pulseRing: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1,
    borderColor: "#9BC9EE",
  },
  innerRing: {
    position: "absolute",
    width: 205,
    height: 205,
    borderRadius: 103,
    borderWidth: 1,
    borderColor: "rgba(155, 201, 238, 0.22)",
  },
  logoWrap: {
    width: 190,
    height: 190,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: 190,
    height: 190,
  },
  scanLine: {
    position: "absolute",
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: "rgba(190, 226, 255, 0.8)",
    shadowColor: "#8ECDF5",
    shadowOpacity: 0.9,
    shadowRadius: 9,
    elevation: 4,
  },
  coin: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(174, 215, 246, 0.45)",
    backgroundColor: "rgba(12, 55, 88, 0.92)",
    color: "#D9EEFF",
    textAlign: "center",
    textAlignVertical: "center",
    lineHeight: 32,
    fontSize: 17,
    fontWeight: "600",
  },
  coinLeft: {
    left: 8,
    top: 55,
  },
  coinRight: {
    right: 5,
    bottom: 48,
  },
  wordmark: {
    color: "#E8F5FF",
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: 0.2,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  tagline: {
    color: "rgba(214, 232, 246, 0.78)",
    fontSize: 13,
    letterSpacing: 0.8,
    marginTop: 5,
    fontFamily: "IBMPlexSans_400Regular",
  },
  footer: {
    position: "absolute",
    bottom: 54,
    color: "rgba(214, 232, 246, 0.42)",
    fontSize: 9,
    letterSpacing: 2.5,
    fontFamily: "IBMPlexSans_500Medium",
  },
});
