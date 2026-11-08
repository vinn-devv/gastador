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
  background: "#050B14",
  blue: "#72BAFF",
  yellow: "#FFC400",
  tagline: "#A9BFDF",
};

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const { height } = useWindowDimensions();

  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const dotY = useRef(new Animated.Value(height * 0.43)).current;
  const dotOpacity = useRef(new Animated.Value(1)).current;
  const dotScale = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.42)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordY = useRef(new Animated.Value(13)).current;
  const wordScale = useRef(new Animated.Value(0.94)).current;
  const wordBlur = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(7)).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      // The point begins close to the bottom edge and springs into the center.
      Animated.spring(dotY, {
        toValue: 0,
        stiffness: 78,
        damping: 13,
        mass: 1.05,
        velocity: -0.55,
        overshootClamping: false,
        restDisplacementThreshold: 0.5,
        restSpeedThreshold: 0.5,
        useNativeDriver: true,
      }),

      // The dot softly blooms away while the coin mark springs into place.
      Animated.parallel([
        Animated.timing(dotOpacity, {
          toValue: 0,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(dotScale, {
          toValue: 2.9,
          duration: 560,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          stiffness: 145,
          damping: 10.5,
          mass: 0.9,
          velocity: 0.12,
          overshootClamping: false,
          useNativeDriver: true,
        }),
      ]),

      Animated.delay(300),

      // A gentle upward pop, while the soft glow resolves into crisp lettering.
      Animated.parallel([
        Animated.timing(wordOpacity, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(wordY, {
          toValue: 0,
          stiffness: 95,
          damping: 16,
          mass: 1,
          useNativeDriver: true,
        }),
        Animated.spring(wordScale, {
          toValue: 1,
          stiffness: 110,
          damping: 15,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(wordBlur, {
          toValue: 1,
          duration: 1050,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),

      Animated.delay(180),

      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 680,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(taglineY, {
          toValue: 0,
          duration: 680,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      Animated.delay(1450),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 420,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    sequence.start(({ finished }) => {
      if (finished) setVisible(false);
    });

    return () => sequence.stop();
  }, [
    dotY,
    dotOpacity,
    dotScale,
    logoOpacity,
    logoScale,
    wordOpacity,
    wordY,
    wordScale,
    wordBlur,
    taglineOpacity,
    taglineY,
    overlayOpacity,
  ]);

  if (!visible) return null;

  const wordGlowRadius = wordBlur.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 2.5],
  });
  const wordGlowOpacity = wordBlur.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 0.32],
  });

  return (
    <Animated.View
      pointerEvents="auto"
      style={[styles.overlay, { opacity: overlayOpacity }]}
    >
      <View style={styles.content}>
        <View style={styles.stage}>
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dotOpacity,
                transform: [{ translateY: dotY }, { scale: dotScale }],
              },
            ]}
          />
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
        </View>

        <Animated.View
          style={[
            styles.brandCopy,
            {
              opacity: wordOpacity,
              transform: [{ translateY: wordY }, { scale: wordScale }],
            },
          ]}
        >
          <Animated.Text
            style={[
              styles.wordmark,
              {
                textShadowRadius: wordGlowRadius,
                textShadowOpacity: wordGlowOpacity,
              },
            ]}
          >
            <Text style={styles.wordmarkMain}>Gastador</Text>
            <Text style={styles.wordmarkApp}> App</Text>
          </Animated.Text>
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
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    width: "100%",
    maxWidth: 440,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  stage: {
    width: 184,
    height: 184,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  dot: {
    position: "absolute",
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: COLORS.blue,
    shadowColor: COLORS.blue,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 5,
  },
  logoWrap: {
    width: 144,
    height: 144,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 144,
    height: 144,
  },
  brandCopy: {
    alignItems: "center",
  },
  wordmark: {
    fontFamily: "sans-serif-rounded",
    fontWeight: "800",
    fontSize: 35,
    lineHeight: 44,
    letterSpacing: -1.1,
    textShadowColor: COLORS.blue,
    includeFontPadding: false,
  },
  wordmarkMain: {
    color: COLORS.blue,
  },
  wordmarkApp: {
    color: COLORS.yellow,
  },
  tagline: {
    marginTop: 9,
    color: COLORS.tagline,
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.25,
  },
});
