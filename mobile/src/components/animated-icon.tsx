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
  const wordY = useRef(new Animated.Value(22)).current;
  const wordScale = useRef(new Animated.Value(0.92)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(10)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const launch = Animated.parallel([
      Animated.spring(dotY, {
        toValue: -(height * 0.47 + 34),
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
            duration: 180,
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
        Animated.timing(glow, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.delay(1050),
      ]);

      reveal.start(() => setVisible(false));
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
    glow,
  ]);

  if (!visible) return null;

  const wordGlow = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });
  const taglineGlow = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6],
  });

  return (
    <View pointerEvents="auto" style={styles.overlay}>
      <Image
        source={require("@/assets/images/gastador-intro-background.jpg")}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        transition={0}
      />

      {dotVisible && (
        <Animated.View
          style={[
            styles.launchDot,
            {
              transform: [{ translateY: dotY }, { scale: dotScale }],
            },
          ]}
        >
          <View style={styles.dotCore} />
        </Animated.View>
      )}

      <View style={styles.lockup}>
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
            <Text style={[styles.wordmark, styles.wordmarkBack]}>
              <Text style={styles.gastadorBack}>Gastador</Text>
              <Text style={styles.appBack}> App</Text>
            </Text>
            <Animated.Text
              style={[
                styles.wordmark,
                { textShadowRadius: wordGlow },
              ]}
            >
              <Text style={styles.gastador}>Gastador</Text>
              <Text style={styles.app}> App</Text>
            </Animated.Text>
          </View>
        </Animated.View>

        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineY }],
              textShadowRadius: taglineGlow,
            },
          ]}
        >
          SNAP IT  ·  TRACK IT  ·  STRETCH IT
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: "#06134F",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  launchDot: {
    position: "absolute",
    zIndex: 2,
    bottom: -8,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#087EFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#13A8FF",
    shadowOpacity: 0.9,
    shadowRadius: 13,
    elevation: 10,
  },
  dotCore: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#BCEBFF",
  },
  lockup: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  logoWrap: {
    width: 158,
    height: 158,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 158,
    height: 158,
  },
  wordmarkWrap: {
    marginTop: -2,
    alignItems: "center",
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
    lineHeight: 49,
    letterSpacing: -1.2,
    includeFontPadding: false,
    textShadowColor: COLORS.brightBlue,
  },
  wordmarkBack: {
    position: "absolute",
    top: 3,
  },
  gastadorBack: {
    color: "#17458F",
  },
  appBack: {
    color: "#986300",
  },
  gastador: {
    color: COLORS.blue,
  },
  app: {
    color: COLORS.gold,
  },
  tagline: {
    marginTop: 7,
    color: COLORS.tagline,
    fontFamily: "IBMPlexSans_700Bold",
    fontSize: 9,
    letterSpacing: 1.45,
    textAlign: "center",
    textShadowColor: COLORS.brightBlue,
    includeFontPadding: false,
  },
});
