import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

const COLORS = {
  background: "#050B14",
  blue: "#72BAFF",
  yellow: "#FFC400",
  tagline: "#A9BFDF",
};

const DOT_TRAVEL_MS = 680;
const LOGO_REVEAL_MS = 460;
const WORDMARK_REVEAL_MS = 440;
const TAGLINE_REVEAL_MS = 380;
const HOLD_MS = 850;
const EXIT_MS = 280;

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const dotY = useRef(new Animated.Value(118)).current;
  const dotOpacity = useRef(new Animated.Value(1)).current;
  const dotScale = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.12)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkY = useRef(new Animated.Value(9)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(5)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      // A single blue point rises into the visual center.
      Animated.timing(dotY, {
        toValue: 0,
        duration: DOT_TRAVEL_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // The point expands away as the coin mark resolves into place.
      Animated.parallel([
        Animated.timing(dotOpacity, {
          toValue: 0,
          duration: LOGO_REVEAL_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(dotScale, {
          toValue: 2.6,
          duration: LOGO_REVEAL_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: LOGO_REVEAL_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          stiffness: 170,
          damping: 20,
          mass: 0.85,
          useNativeDriver: true,
        }),
      ]),
      // Let the completed mark breathe before revealing the name.
      Animated.delay(130),
      Animated.parallel([
        Animated.timing(wordmarkOpacity, {
          toValue: 1,
          duration: WORDMARK_REVEAL_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(wordmarkY, {
          toValue: 0,
          duration: WORDMARK_REVEAL_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(110),
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: TAGLINE_REVEAL_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(taglineY, {
          toValue: 0,
          duration: TAGLINE_REVEAL_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(HOLD_MS),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: EXIT_MS,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) setVisible(false);
    });

    return () => animation.stop();
  }, [
    dotY,
    dotOpacity,
    dotScale,
    logoOpacity,
    logoScale,
    wordmarkOpacity,
    wordmarkY,
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
              opacity: wordmarkOpacity,
              transform: [{ translateY: wordmarkY }],
            },
          ]}
        >
          <Text style={styles.wordmark}>
            <Text style={styles.wordmarkMain}>Gastador</Text>
            <Text style={styles.wordmarkApp}> App</Text>
          </Text>
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
    marginBottom: 3,
  },
  dot: {
    position: "absolute",
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: COLORS.blue,
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
    fontFamily: "IBMPlexSans_700Bold",
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -1.45,
  },
  wordmarkMain: {
    color: COLORS.blue,
  },
  wordmarkApp: {
    color: COLORS.yellow,
  },
  tagline: {
    marginTop: 7,
    color: COLORS.tagline,
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.15,
  },
});
