import { useRef, type ReactNode } from "react";
import { PanResponder, StyleSheet, View } from "react-native";

import { setTabBarHidden } from "@/components/tab-bar-visibility";

export function SwipeToHideTabBar({ children }: { children: ReactNode }) {
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderTerminationRequest: () => true,
      onPanResponderMove: (_, g) => {
        if (g.dy > 20) setTabBarHidden(true);
        else if (g.dy < -20) setTabBarHidden(false);
      },
    }),
  ).current;

  return (
    <View style={styles.fill} {...pan.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
