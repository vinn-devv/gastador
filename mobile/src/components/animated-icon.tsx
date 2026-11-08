import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const COLORS = {
  background: "#050B18",
  tile: "#172F83",
  gold: "#FFC20E",
  white: "#F7F9FF",
  tagline: "#9AA9C4",
};

function CornerMarks({ opacity }: { opacity: Animated.Value }) {
  return (
    <Animated.View pointerEvents="none" style={[styles.cornerLayer, { opacity }]}>
      <View style={[styles.corner, styles.topLeft]}>
        <View style={styles.cornerVertical} />
        <View style={styles.cornerHorizontal} />
      </View>
      <View style={[styles.corner, styles.topRight]}>
        <View style={styles.cornerVertical} />
        <View style={styles.cornerHorizontal} />
      </View>
      <View style={[styles.corner, styles.bottomLeft]}>
        <View style={styles.cornerVertical} />
        <View style={styles.cornerHorizontal} />
      </View>
      <View style={[styles.corner, styles.bottomRight]}>
        <View style={styles.cornerVertical} />
        <View style={styles.cornerHorizontal} />
      </View>
    </Animated.View>
  );
}

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const { width } = useWindowDimensions();
  const tileScale = useRef(new Animated.Value(0.72)).current;
  const tileOpacity = useRef(new Animated.Value(0)).current;
  const borderOpacity = useRef(new Animated.Value(1)).current;
  const markOpacity = useRef(new Animated.Value(0)).current;
  const markScale = useRef(new Animated.Value(0.72)).current;
  const cornersOpacity = useRef(new Animated.Value(0)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordY = useRef(new Animated.Value(12)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(7)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const intro = Animated.sequence([
      Animated.parallel([
        Animated.timing(tileOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(tileScale, {
          toValue: 1,
          stiffness: 150,
          damping: 16,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(markOpacity, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(markScale, {
          toValue: 1,
          stiffness: 180,
          damping: 13,
          useNativeDriver: true,
        }),
        Animated.timing(cornersOpacity, {
          toValue: 1,
          duration: 420,
          delay: 80,
          useNativeDriver: true,
        }),
        Animated.timing(borderOpacity, {
          toValue: 0,
          duration: 420,
          delay: 220,
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
          stiffness: 125,
          damping: 17,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(taglineY, {
          toValue: 0,
          duration: 420,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(3000),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 420,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    intro.start(({ finished }) => {
      if (finished) setVisible(false);
    });

    return () => intro.stop();
  }, [
    tileScale, tileOpacity, borderOpacity, markOpacity, markScale,
    cornersOpacity, wordOpacity, wordY, taglineOpacity, taglineY, overlayOpacity,
  ]);

  if (!visible) return null;

  const tileSize = Math.min(width * 0.34, 142);

  return (
    <Animated.View pointerEvents="auto" style={[styles.overlay, { opacity: overlayOpacity }]}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.tile,
            {
              width: tileSize,
              height: tileSize,
              opacity: tileOpacity,
              transform: [{ scale: tileScale }],
            },
          ]}
        >
          <View style={styles.tileFill} />
          <Animated.View style={[styles.tileBorder, { opacity: borderOpacity }]} />
          <Animated.Text
            style={[
              styles.peso,
              {
                opacity: markOpacity,
                transform: [{ scale: markScale }],
                fontSize: tileSize * 0.59,
                lineHeight: tileSize * 0.72,
              },
            ]}
          >
            ₱
          </Animated.Text>
          <CornerMarks opacity={cornersOpacity} />
        </Animated.View>

        <Animated.View style={{ opacity: wordOpacity, transform: [{ translateY: wordY }] }}>
          <Text style={styles.wordmark}>Gastador</Text>
        </Animated.View>
        <Animated.Text
          style={[
            styles.tagline,
            { opacity: taglineOpacity, transform: [{ translateY: taglineY }] },
          ]}
        >
          Scan it. Track it. Save it.
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  tile: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    overflow: "hidden",
  },
  tileFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 25,
    backgroundColor: COLORS.tile,
  },
  tileBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: "rgba(255,194,14,0.9)",
  },
  peso: {
    color: COLORS.white,
    fontFamily: "sans-serif",
    fontWeight: "800",
    includeFontPadding: false,
    textAlign: "center",
    marginTop: -4,
  },
  cornerLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
  },
  topLeft: { top: "20%", left: "20%" },
  topRight: { top: "20%", right: "20%", transform: [{ rotate: "90deg" }] },
  bottomRight: { bottom: "20%", right: "20%", transform: [{ rotate: "180deg" }] },
  bottomLeft: { bottom: "20%", left: "20%", transform: [{ rotate: "270deg" }] },
  cornerVertical: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 5,
    height: 20,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
  },
  cornerHorizontal: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 20,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
  },
  wordmark: {
    color: COLORS.white,
    fontFamily: "sans-serif",
    fontWeight: "800",
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -1.1,
    includeFontPadding: false,
    textAlign: "center",
    marginTop: 17,
  },
  tagline: {
    color: COLORS.tagline,
    fontFamily: "IBMPlexSans_500Medium",
    fontSize: 11,
    letterSpacing: 0.35,
    includeFontPadding: false,
    textAlign: "center",
    marginTop: 5,
  },
});
