import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#8795AA",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E8EEF7",
          height: 64,
          paddingTop: 7,
          paddingBottom: 7,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
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
          title: "Transactions",
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
    </Tabs>
  );
}
