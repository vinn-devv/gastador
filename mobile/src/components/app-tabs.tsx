import { useEffect, useRef, useState, type ReactNode } from "react";
import { Tabs, useRouter, type Href } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassSurface } from "@/components/glass-surface";
import {
  resetTabBar,
  setTabBarHidden,
  subscribeTabBarHidden,
  tabBarHidden,
} from "@/components/tab-bar-visibility";

const TAB_NAMES = ["index", "explore", "scan", "insights", "settings"] as const;
const BAR_H = 66;
const PAD = 8;
const LENS_H = 94;
const LENS_EXTRA_W = 20;

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);
const xFor = (index: number, tabWidth: number) =>
  PAD + index * tabWidth - LENS_EXTRA_W / 2;

/** One tab. The active icon pops (magnifies) as the lens settles on it. */
function TabItem({
  focused,
  selected,
  label,
  accessibilityLabel,
  onPress,
  icon,
}: {
  focused: boolean;
  selected: boolean;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  icon: ReactNode;
}) {
  const pop = useRef(new Animated.Value(focused ? 1.12 : 1)).current;

  useEffect(() => {
    Animated.spring(pop, {
      toValue: focused ? 1.12 : 1,
      damping: 11,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  }, [focused, pop]);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={selected ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.tab}
    >
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        {icon}
      </Animated.View>
      {focused && <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

/** Small glass handle shown at the bottom edge while the bar is collapsed. */
function TabBarHandle({ active, bottom }: { active: boolean; bottom: number }) {
  const startY = useRef(0);

  return (
    <Animated.View
      pointerEvents={active ? "box-none" : "none"}
      style={[styles.handleHost, { bottom, opacity: tabBarHidden }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Show navigation bar"
        hitSlop={{ top: 16, bottom: 16, left: 24, right: 24 }}
        onPress={() => setTabBarHidden(false)}
        onTouchStart={(e) => {
          startY.current = e.nativeEvent.pageY;
        }}
        onTouchMove={(e) => {
          // Swipe up on the handle also brings the bar back.
          if (startY.current - e.nativeEvent.pageY > 8) setTabBarHidden(false);
        }}
      >
        <GlassSurface radius={12} style={styles.handle}>
          <View style={styles.handleBar} />
        </GlassSurface>
      </Pressable>
    </Animated.View>
  );
}

function LiquidTabBar({ state, descriptors }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const slide = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const stretch = useRef(new Animated.Value(1)).current;
  const startX = useRef(0);
  const grantDx = useRef(0);
  const mode = useRef<"h" | "v">("h");
  const [collapsed, setCollapsed] = useState(false);
  const prevIndex = useRef<number | null>(null);

  const routes = state.routes.filter((r) =>
    TAB_NAMES.includes(r.name as (typeof TAB_NAMES)[number]),
  );
  const activeKey = state.routes[state.index]?.key;
  const activeIndex = routes.findIndex((r) => r.key === activeKey);
  const tabWidth = barWidth > 0 ? (barWidth - PAD * 2) / routes.length : 0;
  const lensWidth = tabWidth + LENS_EXTRA_W;
  const displayIndex = dragIndex ?? activeIndex;

  const navigate = (name: string) => {
    const href = (name === "index" ? "/" : `/${name}`) as Href;
    router.navigate(href);
  };

  // Always-fresh values for the pan handlers (which are created only once).
  const latest = useRef({
    tabWidth,
    count: routes.length,
    activeIndex,
    routes,
    navigate,
  });
  latest.current = {
    tabWidth,
    count: routes.length,
    activeIndex,
    routes,
    navigate,
  };

  const pan = useRef(
    PanResponder.create({
      // Only take over once the finger moves sideways, so taps still reach the tabs.
      onMoveShouldSetPanResponderCapture: (_, g) =>
        (Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy)) ||
        (g.dy > 8 && g.dy > Math.abs(g.dx) * 1.5),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_, g) => {
        // Swipe down on the bar collapses it into the handle.
        mode.current = g.dy > 8 && g.dy > Math.abs(g.dx) * 1.5 ? "v" : "h";
        if (mode.current === "v") {
          setTabBarHidden(true);
          return;
        }
        const { tabWidth: tw, activeIndex: ai } = latest.current;
        startX.current = xFor(Math.max(ai, 0), tw);
        grantDx.current = g.dx;
        setDragIndex(Math.max(ai, 0));
        Animated.spring(fade, { toValue: 1, useNativeDriver: true }).start();
        Animated.spring(scale, {
          toValue: 1.12,
          damping: 14,
          stiffness: 200,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, g) => {
        if (mode.current === "v") return;
        const { tabWidth: tw, count } = latest.current;
        const min = xFor(0, tw);
        const max = xFor(count - 1, tw);
        const x = clamp(startX.current + g.dx - grantDx.current, min, max);
        slide.setValue(x);
        const idx = clamp(Math.round((x - min) / tw), 0, count - 1);
        setDragIndex((prev) => (prev === idx ? prev : idx));
      },
      onPanResponderRelease: (_, g) => finish(g),
      onPanResponderTerminate: (_, g) => finish(g),
    }),
  ).current;

  function finish(g: { dx: number; vx: number }) {
    if (mode.current === "v") {
      mode.current = "h";
      return;
    }
    const { tabWidth: tw, count, activeIndex: ai, routes: rs } = latest.current;
    const min = xFor(0, tw);
    const max = xFor(count - 1, tw);
    // A little momentum so a quick flick carries to the next tab.
    const projected = clamp(
      startX.current + g.dx - grantDx.current + g.vx * 80,
      min,
      max,
    );
    const idx = clamp(Math.round((projected - min) / tw), 0, count - 1);

    Animated.spring(slide, {
      toValue: xFor(idx, tw),
      damping: 16,
      stiffness: 170,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
    Animated.spring(scale, {
      toValue: 1,
      damping: 14,
      stiffness: 200,
      useNativeDriver: true,
    }).start();

    if (idx !== ai) {
      // dragIndex is cleared by the effect below once navigation lands.
      latest.current.navigate(rs[idx].name);
    } else {
      setDragIndex(null);
    }
  }

  // Slide the lens to the active tab whenever it changes (taps, navigation, layout).
  useEffect(() => {
    if (!tabWidth) return;
    setDragIndex(null);

    const changed =
      prevIndex.current !== null && prevIndex.current !== activeIndex;
    prevIndex.current = activeIndex;

    Animated.parallel([
      Animated.spring(slide, {
        toValue: xFor(Math.max(activeIndex, 0), tabWidth),
        damping: 16,
        stiffness: 170,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: activeIndex >= 0 ? 1 : 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Liquid stretch: the lens elongates mid-travel, then snaps back.
    if (changed) {
      Animated.sequence([
        Animated.timing(stretch, {
          toValue: 1.25,
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.spring(stretch, {
          toValue: 1,
          damping: 10,
          stiffness: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [activeIndex, tabWidth, slide, fade, stretch]);

  // Bar is always visible after switching tabs.
  // The camera screen starts with the bar collapsed; every other tab shows it.
  useEffect(() => {
    resetTabBar();
    if (routes[activeIndex]?.name === "scan") setTabBarHidden(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  useEffect(() => subscribeTabBarHidden(setCollapsed), []);

  const hideY = tabBarHidden.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BAR_H + Math.max(insets.bottom, 12) + 40],
  });

  return (
    <>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.host,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            transform: [{ translateY: hideY }],
          },
        ]}
      >
        <View
          style={styles.bar}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
          {...pan.panHandlers}
        >
          {/* Glass body of the bar */}
          <GlassSurface
            radius={BAR_H / 2}
            fill={0.04}
            blur={45}
            style={StyleSheet.absoluteFill}
          />

          {/* Sliding glass lens: taller than the bar so it bulges out above and below */}
          {tabWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.lensWrap,
                {
                  width: lensWidth,
                  opacity: fade,
                  transform: [
                    { translateX: slide },
                    { scale },
                    { scaleX: stretch },
                  ],
                },
              ]}
            >
              <GlassSurface radius={30} interactive style={styles.lens} />
            </Animated.View>
          )}

          {routes.map((route, i) => {
            const options = descriptors[route.key].options;
            const label =
              typeof options.title === "string" ? options.title : route.name;
            const focused = i === displayIndex;

            return (
              <TabItem
                key={route.key}
                focused={focused}
                selected={route.key === activeKey}
                label={label}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                onPress={() => {
                  if (route.key !== activeKey) navigate(route.name);
                }}
                icon={options.tabBarIcon?.({
                  focused,
                  color: "#FFFFFF",
                  size: 26,
                })}
              />
            );
          })}
        </View>
      </Animated.View>
      <TabBarHandle active={collapsed} bottom={Math.max(insets.bottom, 12)} />
    </>
  );
}

export default function AppTabs() {
  return (
    <Tabs
      tabBar={(props) => <LiquidTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{
                ios: "wallet.pass",
                android: "account_balance_wallet",
                web: "account_balance_wallet",
              }}
              tintColor={color}
              size={size}
              weight="light"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{
                ios: "receipt",
                android: "receipt_long",
                web: "receipt_long",
              }}
              tintColor={color}
              size={size}
              weight="light"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{
                ios: "viewfinder",
                android: "qr_code_scanner",
                web: "qr_code_scanner",
              }}
              tintColor={color}
              size={size}
              weight="light"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{
                ios: "chart.bar.xaxis",
                android: "query_stats",
                web: "query_stats",
              }}
              tintColor={color}
              size={size}
              weight="light"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{
                ios: "slider.horizontal.3",
                android: "tune",
                web: "tune",
              }}
              tintColor={color}
              size={size}
              weight="light"
            />
          ),
        }}
      />
      <Tabs.Screen name="new-expense" options={{ href: null }} />
      <Tabs.Screen name="new-cycle" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 0,
  },
  bar: {
    height: BAR_H,
    borderRadius: BAR_H / 2,
    backgroundColor: "rgba(11,14,17,0.38)",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: PAD,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 14,
  },
  lensWrap: {
    position: "absolute",
    left: 0,
    top: (BAR_H - LENS_H) / 2,
    height: LENS_H,
  },
  lens: {
    flex: 1,
  },
  handleHost: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  handle: {
    width: 64,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  handleBar: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  tab: {
    flex: 1,
    height: LENS_H,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  label: {
    color: "#FFFFFF",
    fontFamily: "IBMPlexSans_500Medium",
    fontSize: 11,
    lineHeight: 14,
  },
});
