import { DefaultTheme, ThemeProvider } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "@expo-google-fonts/ibm-plex-sans";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";

import AppTabs from "@/components/app-tabs";
import { DB_NAME, initializeDatabase } from "@/data/database";
import { IntroOverlay } from "@/components/intro-overlay";

void SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const [fontsLoaded] = useFonts({
    IBMPlexSans_400Regular: require("@expo-google-fonts/ibm-plex-sans/400Regular/IBMPlexSans_400Regular.ttf"),
    IBMPlexSans_500Medium: require("@expo-google-fonts/ibm-plex-sans/500Medium/IBMPlexSans_500Medium.ttf"),
    IBMPlexSans_600SemiBold: require("@expo-google-fonts/ibm-plex-sans/600SemiBold/IBMPlexSans_600SemiBold.ttf"),
    IBMPlexSans_700Bold: require("@expo-google-fonts/ibm-plex-sans/700Bold/IBMPlexSans_700Bold.ttf"),
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={DefaultTheme}>
      <View style={{ flex: 1, backgroundColor: "#F3F5F6" }} onLayout={() => { void SplashScreen.hideAsync(); }}>
        <StatusBar style="dark" backgroundColor="#F3F5F6" />
        <SQLiteProvider databaseName={DB_NAME} onInit={initializeDatabase}>
          <AppTabs />
        </SQLiteProvider>
        <IntroOverlay />
      </View>
    </ThemeProvider>
  );
}
