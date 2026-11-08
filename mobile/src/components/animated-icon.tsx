import { useState } from "react";
import { StyleSheet, View } from "react-native";
import LottieView from "lottie-react-native";

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <View pointerEvents="auto" style={styles.overlay}>
      <LottieView
        source={require("@/assets/animations/gastador-intro.json")}
        autoPlay
        loop={false}
        resizeMode="cover"
        onAnimationFinish={() => setVisible(false)}
        style={styles.animation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: "#050B14",
    alignItems: "center",
    justifyContent: "center",
  },
  animation: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
});
