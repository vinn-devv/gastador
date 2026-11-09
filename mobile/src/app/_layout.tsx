import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "@expo-google-fonts/nunito";
import { View } from "react-native";
import { DB_NAME, initializeDatabase } from "@/data/database";
import { IntroOverlay } from "@/components/intro-overlay";

void SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const [fontsLoaded] = useFonts({
    IBMPlexSans_400Regular: require("@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf"),
    IBMPlexSans_500Medium: require("@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf"),
    IBMPlexSans_600SemiBold: require("@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf"),
    IBMPlexSans_700Bold: require("@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf"),
    IBMPlexSans_800ExtraBold: require("@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf"),
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={DefaultTheme}>
      <View style={{ flex: 1, backgroundColor: "#2563EB" }} onLayout={() => { void SplashScreen.hideAsync(); }}>
        <SQLiteProvider databaseName={DB_NAME} onInit={initializeDatabase}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
              animationDuration: 280,
              contentStyle: { backgroundColor: "#2563EB" },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="new-expense" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="scan" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="expenses" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="new-cycle" options={{ animation: "slide_from_right" }} />
          </Stack>
        </SQLiteProvider>
        <IntroOverlay />
      </View>
    </ThemeProvider>
  );
}
