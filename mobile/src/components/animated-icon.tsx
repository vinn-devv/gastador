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
import { useFonts } from "expo-font";

const COLORS = {
  blue: "#8BCBFF",
  gold: "#FFC928",
  tagline: "#B7DFFF",
};

export function AnimatedSplashOverlay() {
  const [fontsLoaded] = useFonts({
    TANNimbus: require("@/assets/fonts/TAN-NIMBUS.otf"),
  });
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
          <Text style={[styles.wordmark, fontsLoaded && styles.customWordmark]}>
            <Text style={styles.gastador}>Gastador</Text>
            <Text style={styles.app}> App</Text>
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
  wordmark: {
    color: COLORS.blue,
    fontFamily: "serif",
    fontSize: 42,
    lineHeight: 54,
    letterSpacing: 0.1,
    includeFontPadding: false,
    textAlign: "center",
  },
  customWordmark: {
    fontFamily: "TANNimbus",
    fontSize: 43,
    letterSpacing: 0,
  },
  gastador: {
    color: COLORS.blue,
  },
  app: {
    color: COLORS.gold,
  },
  tagline: {
    color: COLORS.tagline,
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 9,
    letterSpacing: 1.15,
    includeFontPadding: false,
    textAlign: "center",
    marginTop: 12,
  },
});
