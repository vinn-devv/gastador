import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

export const tabBarHidden = new Animated.Value(0);

let hidden = false;
let lastY = 0;
const listeners = new Set<(hidden: boolean) => void>();

export function subscribeTabBarHidden(fn: (hidden: boolean) => void) {
  listeners.add(fn);
  fn(hidden);
  return () => {
    listeners.delete(fn);
  };
}

function setHidden(next: boolean) {
  if (hidden === next) return;
  hidden = next;
  listeners.forEach((fn) => fn(next));
  Animated.spring(tabBarHidden, {
    toValue: next ? 1 : 0,
    damping: 20,
    stiffness: 220,
    mass: 0.8,
    useNativeDriver: true,
  }).start();
}

export function setTabBarHidden(next: boolean) {
  setHidden(next);
}

export function resetTabBar() {
  lastY = 0;
  setHidden(false);
}

export function onTabBarScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
  const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
  const y = contentOffset.y;
  const maxY = contentSize.height - layoutMeasurement.height;
  const dy = y - lastY;
  lastY = y;

  if (y <= 0) {
    setHidden(false);
    return;
  }
  if (y >= maxY) return;

  if (dy > 6 && y > 40) setHidden(true);
  else if (dy < -6) setHidden(false);
}
