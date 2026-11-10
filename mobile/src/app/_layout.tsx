import { useCallback } from "react";
import { DefaultTheme, Stack, ThemeProvider, useRouter, type Href } from "expo-router";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "@expo-google-fonts/nunito";
import { Image as NativeImage, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { DB_NAME, initializeDatabase } from "@/data/database";
import { getSettings, saveSettings } from "@/data/repository";
import { IntroOverlay } from "@/components/intro-overlay";

void SplashScreen.preventAutoHideAsync();

function AppNavigator() {
  const db = useSQLiteContext();
  const router = useRouter();

  const afterIntro = useCallback(async () => {
    try {
      const settings = await getSettings(db);
      if (settings.hasOnboarded || settings.onboardingCompleted) return;

      const [cycles, transactions] = await Promise.all([
        db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM cycles"),
        db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM transactions"),
      ]);
      if ((cycles?.count ?? 0) > 0 || (transactions?.count ?? 0) > 0) {
        await saveSettings(db, { ...settings, hasOnboarded: true, onboardingCompleted: true });
        return;
      }
      const coinAsset = NativeImage.resolveAssetSource(require("@/assets/images/peso-coin.png"));
      if (coinAsset?.uri) {
        try {
          await ExpoImage.prefetch(coinAsset.uri);
        } catch (prefetchError) {
          console.warn("Peso coin preload failed; continuing to onboarding:", prefetchError);
        }
      }
      router.replace("/onboarding" as Href);
    } catch (error) {
      console.error("Could not determine first-launch onboarding state:", error);
    }
  }, [db, router]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          animationDuration: 280,
          contentStyle: { backgroundColor: "#2563EB" },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="new-expense" options={{ animation: "fade_from_bottom" }} />
        <Stack.Screen name="scan" options={{ animation: "fade_from_bottom" }} />
        <Stack.Screen name="expenses" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="new-cycle" options={{ animation: "slide_from_right" }} />
      </Stack>
      <IntroOverlay onFinished={afterIntro} />
    </>
  );
}

export default function TabLayout() {
  const [fontsLoaded] = useFonts({
    IBMPlexSans_400Regular: require("@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf"),
    IBMPlexSans_500Medium: require("@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf"),
    IBMPlexSans_600SemiBold: require("@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf"),
    IBMPlexSans_700Bold: require("@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf"),
    IBMPlexSans_800ExtraBold: require("@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf"),
    MaterialSymbols_400Regular: require("@expo-google-fonts/material-symbols/400Regular/MaterialSymbols_400Regular.ttf"),
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={DefaultTheme}>
      <View style={{ flex: 1, backgroundColor: "#2563EB" }} onLayout={() => { void SplashScreen.hideAsync(); }}>
        <SQLiteProvider databaseName={DB_NAME} onInit={initializeDatabase}>
          <AppNavigator />
        </SQLiteProvider>
      </View>
    </ThemeProvider>
  );
}
