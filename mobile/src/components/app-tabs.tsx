import { Tabs, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { GlassView } from "expo-glass-effect";
import { Pressable, StyleSheet, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

const TAB_NAMES = ["index", "explore", "scan", "insights", "settings"] as const;

function LiquidTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const routes = state.routes.filter((route) =>
    TAB_NAMES.includes(route.name as (typeof TAB_NAMES)[number]),
  );

  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.shadow}>
        <GlassView
          glassEffectStyle="regular"
          tintColor="#142536"
          style={styles.bar}
        >
          <View pointerEvents="none" style={styles.topShine} />
          {routes.map((route) => {
            const routeIndex = state.routes.findIndex((item) => item.key === route.key);
            const focused = state.index === routeIndex;
            const options = descriptors[route.key].options;
            const color = focused ? "#FFFFFF" : "rgba(238,246,255,0.68)";
            const label = typeof options.title === "string" ? options.title : route.name;
            const onPress = () => {\n              if (!focused) router.navigate(route.name as never);\n            };

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
                  <GlassView
                    glassEffectStyle="regular"
                    tintColor="#54799A"
                    isInteractive
                    style={styles.activeGlass}
                  >
                    <View style={styles.activeInner}>
                      {options.tabBarIcon?.({ focused, color, size: 21 })}
                      <ThemedText style={styles.activeLabel}>{label}</ThemedText>
                    </View>
                  </GlassView>
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
    left: 18,
    right: 18,
    bottom: 0,
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
    width: 82,
    height: 56,
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
