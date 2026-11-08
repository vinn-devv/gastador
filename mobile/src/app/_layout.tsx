import { useEffect } from "react";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "@expo-google-fonts/ibm-plex-sans";
import { View, useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { AmbientBackdrop } from "@/components/ambient-backdrop";
import AppTabs from "@/components/app-tabs";
import { DB_NAME, initializeDatabase } from "@/data/database";
import { useTheme } from "@/hooks/use-theme";

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = useTheme();

  const [fontsLoaded] = useFonts({
    IBMPlexSans_400Regular: require("@expo-google-fonts/ibm-plex-sans/400Regular/IBMPlexSans_400Regular.ttf"),
    IBMPlexSans_500Medium: require("@expo-google-fonts/ibm-plex-sans/500Medium/IBMPlexSans_500Medium.ttf"),
    IBMPlexSans_600SemiBold: require("@expo-google-fonts/ibm-plex-sans/600SemiBold/IBMPlexSans_600SemiBold.ttf"),
    IBMPlexSans_700Bold: require("@expo-google-fonts/ibm-plex-sans/700Bold/IBMPlexSans_700Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <AmbientBackdrop />
        <SQLiteProvider databaseName={DB_NAME} onInit={initializeDatabase}>
          <AppTabs />
        </SQLiteProvider>
        <AnimatedSplashOverlay />
      </View>
    </ThemeProvider>
  );
}
