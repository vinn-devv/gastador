import { Tabs, useRouter, type Href } from "expo-router";
import type { ReactNode } from "react";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

type TabState = { index: number; routes: Array<{ key: string; name: string }> };
type TabDescriptors = Record<string, { options: {
  title?: string;
  tabBarAccessibilityLabel?: string;
  tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => ReactNode;
} }>;

const VISIBLE_TABS = ["index", "explore", "insights", "settings"] as const;

function EditorialTabBar({ state, descriptors }: { state: TabState; descriptors: TabDescriptors }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const routes = state.routes.filter((route) => VISIBLE_TABS.includes(route.name as (typeof VISIBLE_TABS)[number]));
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const renderTab = (route: (typeof routes)[number]) => {
    const focused = state.routes[state.index]?.key === route.key;
    const options = descriptors[route.key]?.options;
    const label = options?.title ?? route.name;
    return (
      <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
        accessibilityState={focused ? { selected: true } : {}}
        onPress={() => router.navigate((route.name === "index" ? "/" : `/${route.name}`) as Href)}
        style={styles.tab}>
        {options?.tabBarIcon?.({ focused, color: focused ? theme.primary : "#8A8D8B", size: 20 })}
        <ThemedText style={[styles.tabLabel, { color: focused ? theme.primary : "#777E82" }]}>{label}</ThemedText>
        <View style={[styles.activeMark, { backgroundColor: focused ? theme.primary : "transparent" }]} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.host, { paddingBottom: Math.max(insets.bottom, 7) }]}>
      <View style={[styles.bar, { borderTopColor: theme.line }]}>
        {left.map(renderTab)}
        <Pressable accessibilityRole="button" accessibilityLabel="Add expense or scan"
          onPress={() => router.navigate("/scan" as Href)} style={[styles.addButton, { backgroundColor: theme.primary }]}>
          <SymbolView name={{ ios: "plus", android: "add", web: "add" }} tintColor="#FFFFFF" size={25} weight="medium" />
        </Pressable>
        {right.map(renderTab)}
      </View>
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs tabBar={(props) => <EditorialTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: "house", android: "home", web: "home" }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="explore" options={{ title: "Activity", tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: "list.bullet", android: "receipt_long", web: "receipt_long" }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="insights" options={{ title: "Insights", tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: "chart.bar", android: "bar_chart", web: "bar_chart" }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: "slider.horizontal.3", android: "tune", web: "tune" }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="scan" options={{ href: null }} />
      <Tabs.Screen name="new-expense" options={{ href: null }} />
      <Tabs.Screen name="new-cycle" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#FFFFFF" },
  bar: { minHeight: 65, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: "#FFFFFF" },
  tab: { flex: 1, minWidth: 0, minHeight: 58, alignItems: "center", justifyContent: "center", gap: 2, paddingTop: 5 },
  tabLabel: { fontFamily: "IBMPlexSans_500Medium", fontSize: 9, lineHeight: 12 },
  activeMark: { width: 14, height: 2, borderRadius: 2, marginTop: 1 },
  addButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", marginHorizontal: 5 },
});
