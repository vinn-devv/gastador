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
  blue: "#8BCBFF",
  brightBlue: "#38A5FF",
  gold: "#FFC928",
  tagline: "#B7DFFF",
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
  const wordScale = useRef(new Animated.Value(0.94)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
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
            duration: 160,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(logoScale, {
            toValue: 1,
            stiffness: 175,
            damping: 11,
            mass: 0.8,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(wordOpacity, {
            toValue: 1,
            duration: 480,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(wordY, {
            toValue: 0,
            stiffness: 105,
            damping: 14,
            mass: 0.85,
            useNativeDriver: true,
          }),
          Animated.spring(wordScale, {
            toValue: 1,
            stiffness: 125,
            damping: 13,
            mass: 0.8,
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
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
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
    glowOpacity,
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
          <View style={styles.dot}>
            <View style={styles.dotHighlight} />
          </View>
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
          <View style={styles.wordmarkStack}>
            <View style={styles.wordmarkDepth}>
              <Text style={styles.wordmarkLine}>
                <Text style={styles.gastadorDepth}>Gastador</Text>
                <Text style={styles.appDepth}> App</Text>
              </Text>
            </View>
            <Animated.View
              style={[styles.wordmarkGlowLayer, { opacity: glowOpacity }]}
            >
              <Text style={styles.wordmarkLine}>
                <Text style={styles.gastadorGlow}>Gastador</Text>
                <Text style={styles.appGlow}> App</Text>
              </Text>
            </Animated.View>
            <Text style={[styles.wordmarkLine, styles.wordmarkFace]}>
              <Text style={styles.gastador}>Gastador</Text>
              <Text style={styles.app}> App</Text>
            </Text>
          </View>
        </Animated.View>

        <View style={styles.taglineWrap}>
          <Animated.View
            style={[styles.taglineGlowLayer, { opacity: glowOpacity }]}
          >
            <Text style={styles.taglineGlow}>
              SNAP IT  ·  TRACK IT  ·  STRETCH IT
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
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: "#06165B",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  content: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  dotTravel: {
    position: "absolute",
    zIndex: 3,
    bottom: -18,
    alignSelf: "center",
  },
  dot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#55B9FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#29A7FF",
    shadowOpacity: 0.9,
    shadowRadius: 15,
    elevation: 10,
  },
  dotHighlight: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#EAF8FF",
    position: "absolute",
    top: 2,
    left: 2,
  },
  logoWrap: {
    width: 148,
    height: 148,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 148,
    height: 148,
  },
  wordmarkWrap: {
    marginTop: -7,
    alignItems: "center",
  },
  wordmarkStack: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  wordmarkLine: {
    fontFamily: "serif",
    fontWeight: "900",
    fontSize: 39,
    lineHeight: 48,
    letterSpacing: -1.3,
    includeFontPadding: false,
  },
  wordmarkDepth: {
    position: "absolute",
    top: 3,
  },
  gastadorDepth: {
    color: "#073A8C",
  },
  appDepth: {
    color: "#805300",
  },
  wordmarkGlowLayer: {
    position: "absolute",
  },
  gastadorGlow: {
    color: COLORS.blue,
    textShadowColor: COLORS.brightBlue,
    textShadowRadius: 12,
  },
  appGlow: {
    color: COLORS.gold,
    textShadowColor: "#FFB21C",
    textShadowRadius: 10,
  },
  wordmarkFace: {
    position: "relative",
  },
  gastador: {
    color: COLORS.blue,
  },
  app: {
    color: COLORS.gold,
  },
  taglineWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  taglineGlowLayer: {
    position: "absolute",
  },
  taglineGlow: {
    color: COLORS.tagline,
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 9,
    letterSpacing: 1.15,
    includeFontPadding: false,
    textShadowColor: COLORS.brightBlue,
    textShadowRadius: 7,
  },
  tagline: {
    color: COLORS.tagline,
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 9,
    letterSpacing: 1.15,
    includeFontPadding: false,
  },
});
