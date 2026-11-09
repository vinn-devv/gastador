import { Tabs, useRouter, type Href } from "expo-router";
import { SymbolView } from "expo-symbols";
import { GlassView } from "expo-glass-effect";
import { Animated, PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { useMemo, useRef, type ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

const TAB_NAMES = ["index", "explore", "scan", "insights", "settings"] as const;

type LiquidTabBarProps = {
  state: {
    index: number;
    routes: Array<{ key: string; name: string }>;
  };
  descriptors: Record<string, {
    options: {
      title?: string;
      tabBarAccessibilityLabel?: string;
      tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => ReactNode;
    };
  }>;
};

function LiquidTabBar({ state, descriptors }: LiquidTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const barWidth = Math.min(screenWidth - 36, 420);
  const drag = useRef(new Animated.ValueXY()).current;
  const tabWidth = useRef(0);
  const currentIndex = useRef(0);
  const routeNames = useRef<string[]>([]);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5,
        onPanResponderMove: (_, gesture) =>
          drag.setValue({ x: gesture.dx, y: 0 }),
        onPanResponderRelease: (_, gesture) => {
          const width = tabWidth.current;
          const current = currentIndex.current;
          const target = width > 0
            ? Math.max(0, Math.min(routeNames.current.length - 1, current + Math.round(gesture.dx / width)))
            : current;
          const destination = routeNames.current[target];
          Animated.spring(drag, {
            toValue: { x: (target - current) * width, y: 0 },
            useNativeDriver: true,
            stiffness: 220,
            damping: 24,
            mass: 0.7,
          }).start(() => {
            drag.setValue({ x: 0, y: 0 });
            if (destination && target !== current) {
              const href = (destination === "index" ? "/" : "/" + destination) as Href;
              router.navigate(href);
            }
          });
        },
        onPanResponderTerminate: () => {
          Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [drag],
  );
  const routes = state.routes.filter((route) =>
    TAB_NAMES.includes(route.name as (typeof TAB_NAMES)[number]),
  );
  currentIndex.current = routes.findIndex((route) => route.key === state.routes[state.index]?.key);
  routeNames.current = routes.map((route) => route.name);

  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={[styles.shadow, { width: barWidth }]}>
        <GlassView
          glassEffectStyle="regular"
          tintColor="#142536"
          style={[styles.bar, { width: "100%" }]}
          onLayout={(event) => {
            tabWidth.current = (event.nativeEvent.layout.width - 14) / Math.max(routes.length, 1);
          }}
        >
          <View pointerEvents="none" style={styles.topShine} />
          {routes.map((route) => {
            const routeIndex = state.routes.findIndex((item) => item.key === route.key);
            const focused = state.index === routeIndex;
            const options = descriptors[route.key].options;
            const color = focused ? "#FFFFFF" : "rgba(238,246,255,0.68)";
            const label = typeof options.title === "string" ? options.title : route.name;
            const onPress = () => {
              if (focused) return;
              const href = (route.name === "index" ? "/" : `/${route.name}`) as Href;
              router.navigate(href);
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                onPress={onPress}
                style={styles.tab}
              >
                {focused ? (
                  <Animated.View
                    {...panResponder.panHandlers}
                    style={[styles.activeGlass, { transform: drag.getTranslateTransform() }]}
                  >
                    <GlassView
                      glassEffectStyle="regular"
                      tintColor="#54799A"
                      isInteractive
                      style={styles.activeGlassFill}
                    >
                      <View style={styles.activeInner}>
                        {options.tabBarIcon?.({ focused, color, size: 21 })}
                        <ThemedText style={styles.activeLabel}>{label}</ThemedText>
                      </View>
                    </GlassView>
                  </Animated.View>
                ) : (
                  <View style={styles.inactiveIcon}>
                    {options.tabBarIcon?.({ focused, color, size: 23 })}
                  </View>
                )}
              </Pressable>
            );
          })}
        </GlassView>
      </View>
    </View>
  );
}

export default function AppTabs() {
  const theme = useTheme();

  return (
    <Tabs
      tabBar={(props) => <LiquidTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: { position: "absolute", backgroundColor: "transparent", borderTopWidth: 0 },
        tabBarLabelStyle: { fontFamily: "IBMPlexSans_500Medium", fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <SymbolView name={{ ios: "wallet.pass", android: "account_balance_wallet", web: "account_balance_wallet" }} tintColor={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => (
            <SymbolView name={{ ios: "receipt", android: "receipt_long", web: "receipt_long" }} tintColor={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, size }) => (
            <SymbolView name={{ ios: "viewfinder", android: "qr_code_scanner", web: "qr_code_scanner" }} tintColor={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          tabBarIcon: ({ color, size }) => (
            <SymbolView name={{ ios: "chart.bar.xaxis", android: "query_stats", web: "query_stats" }} tintColor={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <SymbolView name={{ ios: "slider.horizontal.3", android: "tune", web: "tune" }} tintColor={color} size={size} />
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
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    width: "100%",
  },
  shadow: {
    borderRadius: 28,
    shadowColor: "#06111D",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 12,
  },
  bar: {
    minHeight: 70,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "rgba(15,29,43,0.94)",
    borderWidth: 1,
    borderColor: "rgba(226,241,255,0.24)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 7,
    paddingVertical: 7,
  },
  topShine: {
    position: "absolute",
    top: 0,
    left: 22,
    right: 22,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.34)",
  },
  tab: {
    flex: 1,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  inactiveIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  activeGlass: {
    width: "100%",
    maxWidth: 82,
    height: 56,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  activeGlassFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(116,157,192,0.42)",
    borderWidth: 1,
    borderColor: "rgba(235,246,255,0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  activeInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  activeLabel: {
    color: "#FFFFFF",
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 9,
    lineHeight: 12,
  },
});
