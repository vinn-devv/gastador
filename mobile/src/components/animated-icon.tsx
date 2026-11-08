import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";

const COLORS = {
  navy: "#071B49",
  gold: "#E8C66A",
  white: "#F7F5EF",
  muted: "#C7D1E4",
};

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const [dotVisible, setDotVisible] = useState(true);
  const { height } = useWindowDimensions();

  const dotY = useRef(new Animated.Value(0)).current;
  const dotScale = useRef(new Animated.Value(0.82)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordY = useRef(new Animated.Value(18)).current;
  const wordScale = useRef(new Animated.Value(0.96)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(8)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const launch = Animated.parallel([
      Animated.spring(dotY, {
        toValue: -(height * 0.5 - 65),
        stiffness: 115,
        damping: 14,
        mass: 0.72,
        velocity: -1.15,
        overshootClamping: false,
        useNativeDriver: true,
      }),
      Animated.spring(dotScale, {
        toValue: 1.08,
        stiffness: 135,
        damping: 12,
        mass: 0.72,
        useNativeDriver: true,
      }),
    ]);

    launch.start(({ finished }) => {
      if (!finished) return;
      setDotVisible(false);

      const reveal = Animated.sequence([
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(logoScale, {
            toValue: 1,
            stiffness: 150,
            damping: 16,
            mass: 0.9,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(wordOpacity, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(wordY, {
            toValue: 0,
            stiffness: 100,
            damping: 17,
            mass: 0.9,
            useNativeDriver: true,
          }),
          Animated.spring(wordScale, {
            toValue: 1,
            stiffness: 115,
            damping: 16,
            mass: 0.9,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(taglineOpacity, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(taglineY, {
            toValue: 0,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(1050),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]);

      reveal.start(({ finished: completed }) => {
        if (completed) setVisible(false);
      });
    });

    return () => launch.stop();
  }, [
    height,
    dotY,
    dotScale,
    logoOpacity,
    logoScale,
    wordOpacity,
    wordY,
    wordScale,
    taglineOpacity,
    taglineY,
    overlayOpacity,
  ]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="auto"
      style={[styles.overlay, { opacity: overlayOpacity }]}
    >
      {dotVisible && (
        <Animated.View
          style={[
            styles.dotTravel,
            { transform: [{ translateY: dotY }, { scale: dotScale }] },
          ]}
        >
          <View style={styles.dot} />
        </Animated.View>
      )}

      <View style={styles.content}>
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
            source={require("@/assets/images/gastador-intro-mark.svg")}
            style={styles.logo}
            contentFit="contain"
            transition={0}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.wordmarkWrap,
            {
              opacity: wordOpacity,
              transform: [{ translateY: wordY }, { scale: wordScale }],
            },
          ]}
        >
          <Text style={styles.wordmark}>Gastador</Text>
          <Text style={styles.appLabel}>APP</Text>
        </Animated.View>

        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineY }],
            },
          ]}
        >
          SNAP IT  ·  TRACK IT  ·  STRETCH IT
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  content: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    zIndex: 1,
  },
  dotTravel: {
    position: "absolute",
    zIndex: 3,
    bottom: -18,
    alignSelf: "center",
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.gold,
  },
  logoWrap: {
    width: 116,
    height: 116,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 116,
    height: 116,
  },
  wordmarkWrap: {
    marginTop: 17,
    alignItems: "center",
  },
  wordmark: {
    color: COLORS.white,
    fontFamily: "serif",
    fontSize: 43,
    fontWeight: "600",
    letterSpacing: 0.2,
    lineHeight: 52,
    includeFontPadding: false,
    textAlign: "center",
  },
  appLabel: {
    color: COLORS.gold,
    fontFamily: "sans-serif-medium",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 5,
    marginTop: 7,
    marginLeft: 5,
    includeFontPadding: false,
  },
  tagline: {
    color: COLORS.muted,
    fontFamily: "sans-serif",
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 1.7,
    includeFontPadding: false,
    textAlign: "center",
    marginTop: 26,
  },
});
