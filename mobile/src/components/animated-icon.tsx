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
  const glowOpacity = useRef(new Animated.Value(0)).current;

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
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
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
    glowOpacity,
  ]);

  if (!visible) return null;


