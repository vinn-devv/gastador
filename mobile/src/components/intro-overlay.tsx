import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { INTRO_HTML } from "@/components/intro-html";

const BG = "#2563EB";

export function IntroOverlay({ onFinished }: { onFinished?: () => void | Promise<void> }) {
  const [visible, setVisible] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;
  const finished = useRef(false);

  const finish = useCallback((): void => {
    if (finished.current) return;
    finished.current = true;
    Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => { void Promise.resolve(onFinished?.()).finally(() => setVisible(false)); });
  }, [opacity, onFinished]);

  useEffect(() => {
    const t = setTimeout(finish, 6000);
    return () => clearTimeout(t);
  }, [finish]);

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
        onMessage={(e: WebViewMessageEvent): void => { if (e.nativeEvent.data === "done") finish(); }}
        onError={finish}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: BG, zIndex: 999, elevation: 999 },
  web: { flex: 1, backgroundColor: BG },
});
