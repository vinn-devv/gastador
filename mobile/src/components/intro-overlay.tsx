import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { INTRO_HTML } from "@/components/intro-html";

const BG = "#061230";

/**
 * Full-screen animated intro. Plays once per app launch, then fades out.
 * Tap anywhere to skip.
 */
export function IntroOverlay() {
  const [visible, setVisible] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  // Safety net: never leave the user stuck on the intro.
  useEffect(() => {
    const t = setTimeout(finish, 6000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity }]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: INTRO_HTML }}
        style={styles.web}
        containerStyle={styles.web}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onMessage={(e: WebViewMessageEvent) => {
          if (e.nativeEvent.data === "done") finish();
        }}
        onError={finish}
        onHttpError={finish}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: BG,
    zIndex: 999,
    elevation: 999,
  },
  web: {
    flex: 1,
    backgroundColor: BG,
  },
});
