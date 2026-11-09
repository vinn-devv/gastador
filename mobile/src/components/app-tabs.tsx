import { Tabs, useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { SymbolView } from "expo-symbols";
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";

type TabState = { index: number; routes: Array<{ key: string; name: string }> };
type TabDescriptors = Record<string, { options: {
  title?: string;
  tabBarAccessibilityLabel?: string;
  tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => ReactNode;
} }>;

const VISIBLE_TABS = ["index", "new-cycle", "insights", "settings"] as const;

function WalletTabItem({ focused, label, icon, onPress, accessibilityLabel }: { focused: boolean; label: string; icon: ReactNode; onPress: () => void; accessibilityLabel: string }) {
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(progress, { toValue: focused ? 1 : 0, damping: 16, stiffness: 190, mass: 0.7, useNativeDriver: true }).start();
  }, [focused, progress]);

  const color = focused ? "#2563EB" : "#9A9A9A";
  return (
    <Pressable accessibilityRole="tab" accessibilityLabel={accessibilityLabel} accessibilityState={focused ? { selected: true } : {}} onPress={onPress} style={styles.tab}>
      <Animated.View style={{ alignItems: "center", justifyContent: "center", transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }] }}>
        {icon}
        <Animated.View style={{ opacity: progress }}>
          <ThemedText style={[styles.tabLabel, { color }]}>{label}</ThemedText>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function WalletTabBar({ state, descriptors }: { state: TabState; descriptors: TabDescriptors }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);
  const overlayProgress = useRef(new Animated.Value(0)).current;
  const menuItemProgress = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  const buttonRotation = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const dockHeight = 72 + insets.bottom;

  const openMenu = useCallback(() => {
    if (menuOpen) return;
    setMenuOpen(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    overlayProgress.setValue(0);
    menuItemProgress.forEach((value) => value.setValue(0));
    Animated.parallel([
      Animated.timing(overlayProgress, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(buttonRotation, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.stagger(60, menuItemProgress.map((value) => Animated.spring(value, { toValue: 1, damping: 15, stiffness: 190, mass: 0.72, useNativeDriver: true }))),
    ]).start();
  }, [menuOpen, overlayProgress, menuItemProgress, buttonRotation]);

  const closeMenu = useCallback((afterClose?: () => void) => {
    if (!menuOpen) {
      afterClose?.();
      return;
    }
    Animated.parallel([
      Animated.timing(overlayProgress, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(buttonRotation, { toValue: 0, duration: 200, useNativeDriver: true }),
      ...menuItemProgress.map((value) => Animated.timing(value, { toValue: 0, duration: 180, useNativeDriver: true })),
    ]).start(({ finished }) => {
      if (!finished) return;
      setMenuOpen(false);
      afterClose?.();
    });
  }, [menuOpen, overlayProgress, buttonRotation, menuItemProgress]);

  const chooseAction = useCallback((route: "/scan" | "/new-expense") => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeMenu(() => router.push(route));
  }, [closeMenu, router]);

  const visibleRoutes = state.routes.filter((route) => VISIBLE_TABS.includes(route.name as (typeof VISIBLE_TABS)[number]));
  const centerX = width / 2;
  const notchPath = `M 0 0 L ${centerX - 52} 0 C ${centerX - 34} 0 ${centerX - 34} 25 ${centerX} 25 C ${centerX + 34} 25 ${centerX + 34} 0 ${centerX + 52} 0 L ${width} 0 L ${width} 72 L 0 72 Z`;
  const rotate = buttonRotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] });

  return (
    <View pointerEvents="box-none" style={[styles.host, { height: dockHeight }]}>
      {menuOpen ? (
        <>
          <Animated.View pointerEvents="none" style={[styles.dimLayer, { top: -height + dockHeight, bottom: -dockHeight, opacity: overlayProgress }]} />
          <Pressable accessibilityRole="button" accessibilityLabel="Close add expense menu" onPress={() => closeMenu()} style={[styles.dismissLayer, { top: -height + dockHeight, bottom: -dockHeight }]} />
          <View pointerEvents="box-none" style={[styles.menuStack, { bottom: insets.bottom + 104 }]}>
            <Animated.View style={{ opacity: menuItemProgress[0], transform: [{ translateY: menuItemProgress[0].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }, { scale: menuItemProgress[0].interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Scan receipt" onPress={() => chooseAction("/scan")} style={styles.menuPill}>
                <SymbolView name={{ ios: "viewfinder", android: "qr_code_scanner", web: "qr_code_scanner" }} tintColor="#2563EB" size={20} />
                <ThemedText style={styles.menuText}>Scan receipt</ThemedText>
              </Pressable>
            </Animated.View>
            <Animated.View style={{ opacity: menuItemProgress[1], transform: [{ translateY: menuItemProgress[1].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }, { scale: menuItemProgress[1].interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Add manually" onPress={() => chooseAction("/new-expense")} style={styles.menuPill}>
                <SymbolView name={{ ios: "plus", android: "add", web: "add" }} tintColor="#2563EB" size={20} />
                <ThemedText style={styles.menuText}>Add manually</ThemedText>
              </Pressable>
            </Animated.View>
          </View>
        </>
      ) : null}

      <View style={[styles.dock, { bottom: insets.bottom }]}>
        <View style={styles.barSurface}>
          <Svg width={width} height={72} style={StyleSheet.absoluteFill}>
            <Path d={notchPath} fill="#FFFFFF" />
          </Svg>
          <View style={styles.tabsRow}>
            {visibleRoutes.slice(0, 2).map((route) => {
              const focused = state.routes[state.index]?.key === route.key;
              const options = descriptors[route.key]?.options;
              const label = options?.title ?? route.name;
              return (
                <WalletTabItem
                  key={route.key}
                  focused={focused}
                  label={label}
                  accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
                  icon={options?.tabBarIcon?.({ focused, color: focused ? "#2563EB" : "#9A9A9A", size: 24 })}
                  onPress={() => router.navigate((route.name === "index" ? "/" : "/new-cycle") as Href)}
                />
              );
            })}
            <View style={styles.centerSlot} />
            {visibleRoutes.slice(2).map((route) => {
              const focused = state.routes[state.index]?.key === route.key;
              const options = descriptors[route.key]?.options;
              const label = options?.title ?? route.name;
              return (
                <WalletTabItem
                  key={route.key}
                  focused={focused}
                  label={label}
                  accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
                  icon={options?.tabBarIcon?.({ focused, color: focused ? "#2563EB" : "#9A9A9A", size: 24 })}
                  onPress={() => router.navigate((`/${route.name}`) as Href)}
                />
              );
            })}
          </View>
        </View>
      </View>

      <Animated.View style={[styles.scanButtonWrap, { bottom: insets.bottom + 28, transform: [{ scale: buttonScale }, { rotate }] }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add expense menu"
          accessibilityState={{ expanded: menuOpen }}
          onPress={() => menuOpen ? closeMenu() : openMenu()}
          onPressIn={() => Animated.spring(buttonScale, { toValue: 0.92, useNativeDriver: true, speed: 30 }).start()}
          onPressOut={() => Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, speed: 24 }).start()}
          style={styles.scanButton}
        >
          <SymbolView name={{ ios: "plus", android: "add", web: "add" }} tintColor="#FFFFFF" size={28} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs tabBar={(props) => <WalletTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: "house", android: "home", web: "home" }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="new-cycle" options={{ title: "Allowance", tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: "wallet.pass", android: "account_balance_wallet", web: "account_balance_wallet" }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="insights" options={{ title: "Insights", tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: "chart.pie", android: "pie_chart", web: "pie_chart" }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: "gearshape", android: "settings", web: "settings" }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="scan" options={{ href: null }} />
      <Tabs.Screen name="new-expense" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 100, overflow: "visible" },
  dimLayer: { position: "absolute", left: 0, right: 0, backgroundColor: "rgba(30,30,30,0.35)", zIndex: 0 },
  dismissLayer: { position: "absolute", left: 0, right: 0, zIndex: 1 },
  menuStack: { position: "absolute", left: 0, right: 0, alignItems: "center", gap: 12, zIndex: 4 },
  menuPill: { minWidth: 184, minHeight: 48, paddingHorizontal: 17, borderRadius: 16, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#142B55", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 8 },
  menuText: { color: "#1E40AF", fontFamily: "IBMPlexSans_700Bold", fontSize: 15 },
  dock: { position: "absolute", left: 0, right: 0, bottom: 0, height: 72, paddingBottom: 0, backgroundColor: "transparent", zIndex: 2 },
  barSurface: { height: 72, width: "100%", backgroundColor: "transparent" },
  tabsRow: { height: 72, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  tab: { flex: 1, minWidth: 0, minHeight: 52, alignItems: "center", justifyContent: "center", paddingTop: 3 },
  tabLabel: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 11, lineHeight: 15, marginTop: 1 },
  centerSlot: { flex: 1, minWidth: 0, height: 52 },
  scanButtonWrap: { position: "absolute", alignSelf: "center", left: "50%", marginLeft: -32, width: 64, height: 64, zIndex: 5, elevation: 15 },
  scanButton: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: "#FFFFFF", backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", shadowColor: "#2563EB", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 12 },
});
