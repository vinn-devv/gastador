import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const INTRO_DURATION_MS = 3600;
const INTRO_EXIT_MS = 420;

export function AnimatedSplashOverlay() {
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const dark = scheme === "dark";
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const markOpacity = useRef(new Animated.Value(0)).current;
  const markScale = useRef(new Animated.Value(0.78)).current;
  const markY = useRef(new Animated.Value(16)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordY = useRef(new Animated.Value(10)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = () => {
    if (exiting) return;
    setExiting(true);
    Animated.timing(opacity, {
      toValue: 0,
      duration: INTRO_EXIT_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setVisible(false);
    });
  };

  useEffect(() => {
    Animated.parallel([
      Animated.parallel([
        Animated.timing(markOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(markScale, { toValue: 1, friction: 5, tension: 58, useNativeDriver: true }),
        Animated.timing(markY, { toValue: 0, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(650),
        Animated.parallel([
          Animated.timing(wordOpacity, { toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(wordY, { toValue: 0, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]),
    ]).start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, { toValue: 1.07, duration: 2300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1, duration: 2300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    glowLoop.start();

    timer.current = setTimeout(finish, INTRO_DURATION_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      glowLoop.stop();
    };
  }, []);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="auto"
      style={[styles.overlay, { opacity, backgroundColor: dark ? "#080F20" : "#F8FBFF" }]}
    >
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: dark ? "#0C1930" : "#EDF5FF", opacity: 0.55 }]} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            backgroundColor: dark ? "#264B85" : "#C7E2FF",
            opacity: dark ? 0.18 : 0.42,
            transform: [{ scale: glowScale }],
          },
        ]}
      />
      <View style={styles.ambientOne} pointerEvents="none" />
      <View style={styles.ambientTwo} pointerEvents="none" />

      <View style={styles.content}>
        <View style={styles.stage}>
          <View pointerEvents="none" style={[styles.halo, { borderColor: dark ? "rgba(117,177,255,0.2)" : "rgba(71,135,217,0.16)" }]} />
          <View pointerEvents="none" style={[styles.innerHalo, { borderColor: dark ? "rgba(117,177,255,0.16)" : "rgba(71,135,217,0.12)" }]} />
          <Animated.View style={{ opacity: markOpacity, transform: [{ translateY: markY }, { scale: markScale }] }}>
            <Image
              source={require("@/assets/images/icon-512.png")}
              style={styles.mark}
              contentFit="contain"
              transition={0}
            />
          </Animated.View>
        </View>

        <Animated.View style={[styles.brandCopy, { opacity: wordOpacity, transform: [{ translateY: wordY }] }]}>
          <Text style={[styles.wordmark, { color: dark ? "#F1F6FF" : "#173A70" }]}>Gastador</Text>
          <Text style={[styles.tagline, { color: dark ? "#A9BFDF" : "#62789F" }]}>
            SNAP IT  ·  TRACK IT  ·  STRETCH IT
          </Text>
        </Animated.View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip intro"
        disabled={exiting}
        onPress={() => {
          if (timer.current) clearTimeout(timer.current);
          finish();
        }}
        style={({ pressed }) => [
          styles.skip,
          {
            bottom: Math.max(insets.bottom, 16) + 12,
            borderColor: dark ? "rgba(160,189,231,0.2)" : "rgba(88,124,174,0.2)",
            backgroundColor: dark ? "rgba(13,27,50,0.72)" : "rgba(255,255,255,0.68)",
            opacity: pressed ? 0.65 : 1,
          },
        ]}
      >
        <Text style={[styles.skipText, { color: dark ? "#A9BFDF" : "#607493" }]}>Skip intro</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    top: "23%",
    alignSelf: "center",
  },
  ambientOne: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -150,
    left: -120,
    backgroundColor: "#9CCAFF",
    opacity: 0.12,
  },
  ambientTwo: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    bottom: -180,
    right: -150,
    backgroundColor: "#80B9F6",
    opacity: 0.13,
  },
  content: { width: "100%", maxWidth: 440, alignItems: "center", paddingHorizontal: 20 },
  stage: { width: 280, height: 280, maxWidth: "88%", alignItems: "center", justifyContent: "center", marginBottom: 2 },
  halo: { position: "absolute", width: "72%", height: "72%", borderWidth: 1, borderRadius: 999 },
  innerHalo: { position: "absolute", width: "54%", height: "54%", borderWidth: 1, borderRadius: 999 },
  mark: { width: 192, height: 192 },
  brandCopy: { alignItems: "center" },
  wordmark: { fontFamily: "IBMPlexSans_700Bold", fontSize: 35, lineHeight: 43, letterSpacing: -1.5 },
  tagline: { marginTop: 7, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 10, letterSpacing: 1.15 },
  skip: { position: "absolute", right: 20, minHeight: 44, paddingHorizontal: 16, borderWidth: 1, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  skipText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
});
