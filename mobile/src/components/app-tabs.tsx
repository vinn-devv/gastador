import { Tabs, useRouter, type Href } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

type TabState = { index: number; routes: Array<{ key: string; name: string }> };
type TabDescriptors = Record<string, { options: {
  title?: string;
  tabBarAccessibilityLabel?: string;
  tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
} }>;

const VISIBLE_TABS = ["index", "explore", "insights", "settings"] as const;

function WalletTabBar({ state, descriptors }: { state: TabState; descriptors: TabDescriptors }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View style={[styles.host, { paddingBottom: Math.max(insets.bottom, 7), backgroundColor: theme.surface }]}>
      <View style={[styles.bar, { borderTopColor: theme.line, backgroundColor: theme.surface }]}>
        {state.routes.filter((route) => VISIBLE_TABS.includes(route.name as (typeof VISIBLE_TABS)[number])).map((route) => {
          const focused = state.routes[state.index]?.key === route.key;
          const options = descriptors[route.key]?.options;
          const label = options?.title ?? route.name;
          const color = focused ? theme.primary : theme.muted;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
              accessibilityState={focused ? { selected: true } : {}}
              onPress={() => router.navigate((route.name === "index" ? "/" : `/${route.name}`) as Href)}
              style={styles.tab}
            >
              {options?.tabBarIcon?.({ focused, color, size: 21 })}
              <ThemedText style={[styles.tabLabel, { color }]}>{label}</ThemedText>
              <View style={[styles.activeMark, { backgroundColor: focused ? theme.primary : "transparent" }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs tabBar={(props) => <WalletTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: "house", android: "home", web: "home" }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="explore" options={{ title: "Activity", tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: "wallet.pass", android: "account_balance_wallet", web: "account_balance_wallet" }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="insights" options={{ title: "Insights", tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: "chart.pie", android: "pie_chart", web: "pie_chart" }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: "gearshape", android: "settings", web: "settings" }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="scan" options={{ href: null }} />
      <Tabs.Screen name="new-expense" options={{ href: null }} />
      <Tabs.Screen name="new-cycle" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: 0, right: 0, bottom: 0 },
  bar: { minHeight: 65, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  tab: { flex: 1, minWidth: 0, minHeight: 58, alignItems: "center", justifyContent: "center", gap: 2, paddingTop: 5 },
  tabLabel: { fontFamily: "IBMPlexSans_500Medium", fontSize: 10, lineHeight: 14 },
  activeMark: { width: 13, height: 2, borderRadius: 2, marginTop: 1 },
});
