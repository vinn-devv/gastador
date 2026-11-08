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
  const dotY = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordY = useRef(new Animated.Value(13)).current;
  const wordScale = useRef(new Animated.Value(0.94)).current;
  const wordGlow = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(7)).current;
  const taglineGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      // A solid blue point launches from the very bottom edge to the logo.
      Animated.spring(dotY, {
        toValue: -(height * 0.5 + 70),
        stiffness: 105,
        damping: 15,
        mass: 0.72,
        velocity: -1.1,
        overshootClamping: false,
        restDisplacementThreshold: 0.5,
        restSpeedThreshold: 0.5,
        useNativeDriver: true,
      }),

      // The mark forms over the point; the point itself never fades or blurs.
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          stiffness: 170,
          damping: 11,
          mass: 0.82,
          velocity: 0.18,
          overshootClamping: false,
          useNativeDriver: true,
        }),
      ]),

      Animated.delay(180),

      Animated.parallel([
        Animated.timing(wordOpacity, {
          toValue: 1,
          duration: 720,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(wordY, {
          toValue: 0,
          stiffness: 100,
          damping: 15,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.spring(wordScale, {
          toValue: 1,
          stiffness: 120,
          damping: 14,
          mass: 0.85,
          useNativeDriver: true,
        }),
      ]),

      Animated.delay(100),

      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 560,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(taglineY, {
          toValue: 0,
          duration: 560,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // Glow switches on only after both text entrance animations are done.
      Animated.parallel([
        Animated.timing(wordGlow, {
          toValue: 1,
          duration: 620,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(taglineGlow, {
          toValue: 1,
          duration: 620,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),

      Animated.delay(1150),
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
    height,
    logoOpacity,
    logoScale,
    wordOpacity,
    wordY,
    wordScale,
    wordGlow,
    taglineOpacity,
    taglineY,
    taglineGlow,
    overlayOpacity,
  ]);

  if (!visible) return null;

  const wordGlowRadius = wordGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });
  const taglineGlowRadius = taglineGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 5],
  });

  return (
    <Animated.View
      pointerEvents="auto"
      style={[styles.overlay, { opacity: overlayOpacity }]}
    >
      <Animated.View
        style={[
          styles.dot,
          { transform: [{ translateY: dotY }] },
        ]}
      >
        <View style={styles.dotHighlight} />
      </Animated.View>

      <View style={styles.content}>
        <View style={styles.stage}>
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
          <View style={styles.wordmarkStack}>
            <Text style={[styles.wordmark, styles.wordmarkDepth3]}>
              <Text style={styles.wordmarkMainDepth}>Gastador</Text>
              <Text style={styles.wordmarkAppDepth}> App</Text>
            </Text>
            <Text style={[styles.wordmark, styles.wordmarkDepth2]}>
              <Text style={styles.wordmarkMainDepth}>Gastador</Text>
              <Text style={styles.wordmarkAppDepth}> App</Text>
            </Text>
            <Animated.Text
              style={[
                styles.wordmark,
                {
                  textShadowRadius: wordGlowRadius,
                },
              ]}
            >
              <Text style={styles.wordmarkMain}>Gastador</Text>
              <Text style={styles.wordmarkApp}> App</Text>
            </Animated.Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.taglineWrap,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineY }],
            },
          ]}
        >
          <Text style={[styles.tagline, styles.taglineDepth]}>
            SNAP IT  ·  TRACK IT  ·  STRETCH IT
          </Text>
          <Animated.Text
            style={[
              styles.tagline,
              {
                textShadowRadius: taglineGlowRadius,
              },
            ]}
          >
            SNAP IT  ·  TRACK IT  ·  STRETCH IT
          </Animated.Text>
        </Animated.View>
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
  dot: {
    position: "absolute",
    zIndex: 2,
    bottom: -7,
    alignSelf: "center",
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#72BAFF",
    borderWidth: 1,
    borderColor: "#C6E7FF",
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  dotHighlight: {
    width: 2,
    height: 2,
    marginTop: 1,
    marginLeft: 1,
    borderRadius: 1,
    backgroundColor: "#FFFFFF",
  },
  stage: {
    width: 184,
    height: 184,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -3,
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
    marginTop: -2,
  },
  wordmarkStack: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  wordmark: {
    fontFamily: "serif",
    fontWeight: "900",
    fontSize: 39,
    lineHeight: 48,
    letterSpacing: -1.35,
    includeFontPadding: false,
    textShadowColor: COLORS.blue,
  },
  wordmarkDepth3: {
    position: "absolute",
    top: 3,
    color: "#102B70",
  },
  wordmarkDepth2: {
    position: "absolute",
    top: 1.5,
    color: "#24518E",
  },
  wordmarkMainDepth: {
    color: "#24518E",
  },
  wordmarkAppDepth: {
    color: "#9A6800",
  },
  wordmarkMain: {
    color: COLORS.blue,
  },
  wordmarkApp: {
    color: COLORS.yellow,
  },
  taglineWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  tagline: {
    color: COLORS.tagline,
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.25,
    textShadowColor: COLORS.blue,
    includeFontPadding: false,
  },
  taglineDepth: {
    position: "absolute",
    top: 1.5,
    color: "#365078",
  },
});
