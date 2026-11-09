import { Tabs, useRouter, type Href } from "expo-router";
import type { ReactNode } from "react";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

type TabState = {
  index: number;
  routes: Array<{ key: string; name: string }>;
};
type TabDescriptors = Record<string, { options: {
  title?: string;
  tabBarAccessibilityLabel?: string;
  tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => ReactNode;
} }>;

const VISIBLE_TABS = ["index", "explore", "insights", "settings"] as const;

function ReferenceTabBar({ state, descriptors }: { state: TabState; descriptors: TabDescriptors }) {
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
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
        accessibilityState={focused ? { selected: true } : {}}
        onPress={() => router.navigate((route.name === "index" ? "/" : `/${route.name}`) as Href)}
        style={styles.tab}
      >
        {options?.tabBarIcon?.({ focused, color: focused ? theme.primary : "#7A8798", size: 21 })}
        <ThemedText style={[styles.tabLabel, { color: focused ? theme.primary : "#687589" }]}>{label}</ThemedText>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingBottom: Math.max(insets.bottom, 8) + 5 }]}>
      <View style={[styles.bar, { borderColor: "#E6EBF2" }]}>
        {left.map(renderTab)}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add expense or scan"
          onPress={() => router.navigate("/scan" as Href)}
          style={[styles.addButton, { backgroundColor: theme.primary }]}
        >
          <SymbolView name={{ ios: "plus", android: "add", web: "add" }} tintColor="#FFFFFF" size={27} weight="semibold" />
        </Pressable>
        {right.map(renderTab)}
      </View>
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs
      tabBar={(props) => <ReferenceTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: "house", android: "home", web: "home" }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="explore" options={{ title: "Transactions", tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: "list.bullet.rectangle", android: "receipt_long", web: "receipt_long" }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="insights" options={{ title: "Budget", tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: "chart.pie", android: "pie_chart", web: "pie_chart" }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: "person.crop.circle", android: "account_circle", web: "account_circle" }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="scan" options={{ href: null }} />
      <Tabs.Screen name="new-expense" options={{ href: null }} />
      <Tabs.Screen name="new-cycle" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: 16, right: 16, bottom: 0, alignItems: "center" },
  bar: {
    width: "100%",
    minHeight: 72,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderWidth: 1,
    borderRadius: 26,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "#24344D",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.11,
    shadowRadius: 18,
    elevation: 10,
  },
  tab: { flex: 1, minWidth: 0, minHeight: 60, alignItems: "center", justifyContent: "center", gap: 3 },
  tabLabel: { fontFamily: "IBMPlexSans_500Medium", fontSize: 10, lineHeight: 13 },
  addButton: {
    width: 54,
    height: 54,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 5,
    marginTop: -15,
    shadowColor: "#3478F6",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 9,
    elevation: 8,
  },
});
