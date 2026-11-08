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
  const [dotVisible, setDotVisible] = useState(true);
  const [logoVisible, setLogoVisible] = useState(false);
  const { height } = useWindowDimensions();

  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const dotY = useRef(new Animated.Value(0)).current;
  const dotSize = useRef(new Animated.Value(9)).current;
  const dotRadius = useRef(new Animated.Value(5)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordY = useRef(new Animated.Value(13)).current;
  const wordScale = useRef(new Animated.Value(0.94)).current;
  const wordGlow = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(7)).current;
  const taglineGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      // The blue point rises from below the phone while physically growing
      // into the rounded-square footprint of the app mark.
      Animated.parallel([
        Animated.spring(dotY, {
          toValue: -(height * 0.5 + 35),
          stiffness: 112,
          damping: 15,
          mass: 0.72,
          velocity: -1.15,
          overshootClamping: false,
          restDisplacementThreshold: 0.5,
          restSpeedThreshold: 0.5,
          useNativeDriver: true,
        }),
        Animated.timing(dotSize, {
          toValue: 144,
          duration: 760,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(dotRadius, {
          toValue: 31,
          duration: 760,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
    ]);
