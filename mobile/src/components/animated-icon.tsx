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
  background: "#06165B",
  tile: "#263A91",
  blue: "#78BFFF",
  gold: "#FFC20E",
  white: "#F7F9FF",
  tagline: "#A9B7D4",
};

const DOTS = Array.from({ length: 11 * 11 }, (_, index) => {
  const x = index % 11;
  const y = Math.floor(index / 11);
  const distance = Math.hypot(x - 5, y - 5);
  return {
    key: index,
    left: `${x * 10}%` as `${number}%`,
    top: `${y * 10}%` as `${number}%`,
    opacity: distance > 5 ? 0 : Math.max(0, 0.2 - distance * 0.025),
  };
});

function CornerMarks() {
  return (
    <>
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
    </>
  );
}

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const { width, height } = useWindowDimensions();

  const tileScale = useRef(new Animated.Value(0.035)).current;
  const tileY = useRef(new Animated.Value(0)).current;
  const dotY = useRef(new Animated.Value(height * 0.43)).current;
  const dotOpacity = useRef(new Animated.Value(1)).current;
  const tileOpacity = useRef(new Animated.Value(1)).current;
  const fillOpacity = useRef(new Animated.Value(0)).current;
  const borderOpacity = useRef(new Animated.Value(0)).current;
  const pesoOpacity = useRef(new Animated.Value(0)).current;
  const pesoScale = useRef(new Animated.Value(0.72)).current;
  const cornersOpacity = useRef(new Animated.Value(0)).current;
  const stackY = useRef(new Animated.Value(0)).current;
  const stackScale = useRef(new Animated.Value(1)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordY = useRef(new Animated.Value(16)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(7)).current;
  const dotsOpacity = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const intro = Animated.sequence([
      Animated.timing(dotY, {
        toValue: 0,
        duration: 820,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(dotOpacity, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(tileScale, {
          toValue: 1,
          stiffness: 150,
          damping: 15,
          mass: 0.8,
          useNativeDriver: true,
        }),

        Animated.timing(tileOpacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(fillOpacity, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(borderOpacity, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pesoOpacity, {
          toValue: 1,
          duration: 300,
          delay: 80,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(pesoScale, {
          toValue: 1,
          stiffness: 170,
          damping: 13,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(cornersOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(dotsOpacity, {
          toValue: 0.15,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(stackScale, {
          toValue: 0.82,
          stiffness: 125,
          damping: 15,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.spring(stackY, {
          toValue: -38,
          stiffness: 115,
          damping: 15,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(wordOpacity, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(wordY, {
          toValue: 0,
          stiffness: 115,
          damping: 15,
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
      Animated.delay(2850),
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
    tileScale,
    tileY,
    dotY,
    dotOpacity,
    tileOpacity,
    fillOpacity,
    borderOpacity,
    pesoOpacity,
    pesoScale,
    cornersOpacity,
    stackY,
    stackScale,
    wordOpacity,
    wordY,
    taglineOpacity,
    taglineY,
    dotsOpacity,
    overlayOpacity,
  ]);

  if (!visible) return null;

  const tileSize = Math.min(width * 0.405, 164);

  return (
    <Animated.View
      pointerEvents="auto"
      style={[styles.overlay, { opacity: overlayOpacity }]}
    >
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ translateY: stackY }, { scale: stackScale }],
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.startDot, { opacity: dotOpacity, transform: [{ translateY: dotY }] }]}
        />

        <Animated.View
          style={[
            styles.tile,
            {
              width: tileSize,
              height: tileSize,
              opacity: tileOpacity,
              transform: [{ translateY: tileY }, { scale: tileScale }],
            },
          ]}
        >
          <Animated.View style={[styles.tileFill, { opacity: fillOpacity }]} />
          <Animated.View style={[styles.tileBorder, { opacity: borderOpacity }]} />
          <Animated.Text
            style={[
              styles.peso,
              {
                opacity: pesoOpacity,
                transform: [{ scale: pesoScale }],
              },
            ]}
          >
            ₱
          </Animated.Text>
          <Animated.View style={[styles.cornerLayer, { opacity: cornersOpacity }]}>
            <CornerMarks />
          </Animated.View>
        </Animated.View>

        <Animated.View
          style={[
            styles.wordmarkWrap,
            { opacity: wordOpacity, transform: [{ translateY: wordY }] },
          ]}
        >
          <Text style={styles.wordmark}>
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
          Scan it. Track it. Save it.
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  glowLarge: {
    position: "absolute",
    width: 470,
    height: 470,
    borderRadius: 235,
    backgroundColor: "#101E59",
    opacity: 0.42,
  },
  glowSmall: {
    position: "absolute",
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: "#17275F",
    opacity: 0.22,
  },
  dotField: {
    ...StyleSheet.absoluteFill,
  },
  backgroundDot: {
    position: "absolute",
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#52669B",
  },
  content: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  startDot: {
    position: "absolute",
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: COLORS.gold,
  },
  tile: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 34,
    overflow: "visible",
  },
  tileFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 34,
    backgroundColor: COLORS.tile,
  },
  tileBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
  },
  peso: {
    color: COLORS.white,
    fontFamily: "sans-serif",
    fontWeight: "800",
    fontSize: 83,
    lineHeight: 96,
    includeFontPadding: false,
    textAlign: "center",
    marginTop: -5,
  },
  cornerLayer: {
    ...StyleSheet.absoluteFill,
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
  },
  topLeft: {
    top: "20%",
    left: "20%",
  },
  topRight: {
    top: "20%",
    right: "20%",
    transform: [{ rotate: "90deg" }],
  },
  bottomRight: {
    bottom: "20%",
    right: "20%",
    transform: [{ rotate: "180deg" }],
  },
  bottomLeft: {
    bottom: "20%",
    left: "20%",
    transform: [{ rotate: "270deg" }],
  },
  cornerVertical: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 6,
    height: 24,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
  },
  cornerHorizontal: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
  },
  wordmarkWrap: {
    marginTop: 12,
    alignItems: "center",
  },
  wordmark: {
    color: COLORS.blue,
    fontFamily: "sans-serif",
    fontWeight: "700",
    fontSize: 39,
    lineHeight: 49,
    letterSpacing: 0,
    includeFontPadding: false,
    textAlign: "center",
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
    fontSize: 11,
    letterSpacing: 0.3,
    includeFontPadding: false,
    textAlign: "center",
    marginTop: 7,
  },
});
