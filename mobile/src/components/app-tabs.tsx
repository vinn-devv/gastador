import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";

import { useTheme } from "@/hooks/use-theme";

export default function AppTabs() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          backgroundColor: "#C5DFF5",
          borderTopColor: "transparent",
          borderTopWidth: 0,
          height: 72,
          paddingTop: 9,
          paddingBottom: 9,
        },
        tabBarLabelStyle: {
          fontFamily: "IBMPlexSans_500Medium",
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: "wallet.pass", android: "account_balance_wallet", web: "account_balance_wallet" }}
              tintColor={color}
              size={size}
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
              name={{ ios: "receipt", android: "receipt_long", web: "receipt_long" }}
              tintColor={color}
              size={size}
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
              name={{ ios: "viewfinder", android: "qr_code_scanner", web: "qr_code_scanner" }}
              tintColor={color}
              size={size}
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
              name={{ ios: "chart.bar.xaxis", android: "query_stats", web: "query_stats" }}
              tintColor={color}
              size={size}
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
              name={{ ios: "slider.horizontal.3", android: "tune", web: "tune" }}
              tintColor={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen name="new-expense" options={{ href: null }} />
      <Tabs.Screen name="new-cycle" options={{ href: null }} />
    </Tabs>
  );
}
