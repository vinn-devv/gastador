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
              name={{ ios: "house.fill", android: "home", web: "home" }}
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
              name={{
                ios: "arrow.left.arrow.right",
                android: "swap_horiz",
                web: "swap_horiz",
              }}
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
              name={{ ios: "chart.bar.fill", android: "bar_chart", web: "bar_chart" }}
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
              name={{ ios: "gearshape.fill", android: "settings", web: "settings" }}
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
