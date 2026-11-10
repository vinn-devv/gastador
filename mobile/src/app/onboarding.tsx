import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Animated as RNAnimated,
} from "react-native";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import Reanimated, {
  Easing,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DateField } from "@/components/date-field";
import { saveSettings, getSettings, createCycle } from "@/data/repository";
import { addDays, addMonths, daysInclusive, formatDate, manilaToday } from "@/domain/dates";
import { formatMoney } from "@/domain/money";

const BLUE = "#1E40AF";
const ACCENT = "#EAF3FF";
const SKY = "#8EC5FF";
const WHITE = "#FFFFFF";
const COIN = require("@/assets/images/peso-coin.png");
const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

type Period = "weekly" | "biweekly" | "monthly";

function ProgressSegment({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.value - index)) * 100}%`,
  }));
  return <View style={styles.segmentTrack}><Reanimated.View style={[styles.segmentFill, fillStyle]} /></View>;
}

function endFor(start: string, period: Period): string {
  if (period === "weekly") return addDays(start, 6);
  if (period === "biweekly") return addDays(start, 13);
  return addDays(addMonths(start, 1), -1);
}

function moneyDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 9);
}

export default function OnboardingScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const pager = useRef<ScrollView>(null);
  const fade = useRef(new RNAnimated.Value(1)).current;
  const pageProgress = useSharedValue(0);
  const progressValue = useSharedValue(0);
  const float = useSharedValue(0);
  const pulse = useSharedValue(0);
  const coinEntry = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const [page, setPage] = useState(0);
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<Period>("monthly");
  const [startDate, setStartDate] = useState(manilaToday());
  const [allowanceSaved, setAllowanceSaved] = useState(false);
  const [savedAmount, setSavedAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const numericAmount = Number(amount || "0");
  const endDate = useMemo(() => endFor(startDate, period), [startDate, period]);
  const days = daysInclusive(startDate, endDate);
  const perDay = days > 0 ? Math.floor((numericAmount * 100) / days) : 0;

  useEffect(() => {
    progressValue.value = withTiming(page + 1, { duration: reducedMotion ? 180 : 400 });
  }, [page, progressValue, reducedMotion]);

  useEffect(() => {
    coinEntry.value = withTiming(1, { duration: reducedMotion ? 180 : 700 });
  }, [coinEntry, reducedMotion]);

  useEffect(() => {
    if (!reducedMotion) {
      float.value = withRepeat(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    }
  }, [float, reducedMotion]);

  useEffect(() => {
    if (page === 2 && allowanceSaved) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [page, allowanceSaved]);

  useEffect(() => {
    if (page === 2 && !reducedMotion) pulse.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
    else pulse.value = 0;
  }, [page, pulse, reducedMotion]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (page > 0) {
        moveTo(page - 1);
        return true;
      }
      return true;
    });
    return () => sub.remove();
  });

  const moveTo = useCallback((next: number) => {
    const safe = Math.max(0, Math.min(2, next));
    setPage(safe);
    pageProgress.value = withTiming(safe, { duration: reducedMotion ? 180 : 420 });
    pager.current?.scrollTo({ x: safe * width, animated: true });
    void Haptics.selectionAsync();
  }, [pageProgress, reducedMotion, width]);

  const finish = useCallback(async () => {
    try {
      const current = await getSettings(db);
      await saveSettings(db, { ...current, hasOnboarded: true, onboardingCompleted: true });
      RNAnimated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
        router.replace("/");
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't finish setup. Please try again.");
    }
  }, [db, fade, router]);

  const skip = () => {
    if (page === 1) {
      moveTo(2);
      return;
    }
    void finish();
  };

  const saveAllowance = async () => {
    if (numericAmount <= 0 || saving) return;
    setSaving(true);
    setError("");
    try {
      await createCycle(db, {
        name: "Allowance",
        frequency: period,
        startDate,
        endDate,
        allowanceCentavos: numericAmount * 100,
      });
      setAllowanceSaved(true);
      setSavedAmount(numericAmount * 100);
      moveTo(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your allowance. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const coinStyle = useAnimatedStyle(() => {
    const progress = pageProgress.value;
    const size = interpolate(progress, [0, 1, 2], [0.85, 0.55, 0.9]);
    const x = interpolate(progress, [0, 1, 2], [0, width * 0.23, 0]);
    const y = interpolate(progress, [0, 1, 2], [0, -height * 0.14, 0]);
    const tilt = reducedMotion ? 0 : interpolate(progress, [0, 1, 2], [-8, 0, 0]);
    const bob = reducedMotion ? 0 : Math.sin(float.value * Math.PI * 2) * 10;
    return {
      opacity: coinEntry.value,
      transform: [
        { perspective: 800 },
        { translateX: x },
        { translateY: y + bob },
        { scale: withSpring(size, { damping: 14, stiffness: 110 }) },
        { rotateZ: `${tilt + (reducedMotion ? 0 : Math.sin(float.value * Math.PI * 2) * 3)}deg` },
        { rotateY: reducedMotion ? "0deg" : `${interpolate(progress, [0, 1, 2], [0, 360, 720])}deg` },
      ],
    };
  }, [coinEntry]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.8 + pulse.value * 0.6 }],
    opacity: reducedMotion ? 0.24 : 0.35 * (1 - pulse.value),
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 - float.value * 0.08 }, { scaleY: 1 - float.value * 0.06 }],
    opacity: 0.85 - float.value * 0.12,
  }));

  const coinSize = Math.min(width * 0.92, height * 0.48, 380);

  return (
    <RNAnimated.View style={[styles.root, { opacity: fade }]}>
      <StatusBar style="light" />
      <LinearGradient colors={["#1E40AF", "#2563EB", "#0B1F5C"]} locations={[0, 0.52, 1]} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[styles.orb, { width: width * 0.9, height: width * 0.9, top: -width * 0.42, right: -width * 0.32 }]} />
      <View pointerEvents="none" style={[styles.orb, { width: width * 0.75, height: width * 0.75, bottom: height * 0.18, left: -width * 0.42 }]} />

      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Text maxFontSizeMultiplier={1.2} style={styles.counter}>{String(page + 1).padStart(2, "0")} / 03</Text>
        <View style={styles.progress} accessibilityRole="progressbar" accessibilityLabel={`Onboarding page ${page + 1} of 3`} accessibilityValue={{ min: 1, max: 3, now: page + 1 }}>
          {[0, 1, 2].map((item) => (
            <View key={item} style={styles.segmentTrack}>
              <Reanimated.View style={[styles.segmentFill, { width: page >= item ? "100%" : "0%" }]} />
            </View>
          ))}
        </View>
        {page < 2 ? (
          <Pressable onPress={skip} accessibilityRole="button" accessibilityLabel="Skip welcome" hitSlop={8} style={styles.skip}>
            <Text maxFontSizeMultiplier={1.2} style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : <View style={styles.skipPlaceholder} />}
      </View>

      <View style={styles.pagerHost}>
        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          scrollEnabled={true}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={(event) => {
            const next = Math.round(event.nativeEvent.contentOffset.x / width);
            if (next === 2 && page !== 2 && numericAmount <= 0) {
              pager.current?.scrollTo({ x: width, animated: true });
              return;
            }
            if (next !== page) {
              setPage(next);
              pageProgress.value = withTiming(next, { duration: reducedMotion ? 180 : 420 });

            }
          }}
          style={{ flex: 1 }}
          contentContainerStyle={{ width: width * 3 }}
        >
          <View style={[styles.page, { width }]}>
            <View style={[styles.copy, { paddingTop: Math.max(24, height * 0.035) }]}>
              <Text maxFontSizeMultiplier={1.2} style={styles.headline}>Your Money,</Text>
              <Text maxFontSizeMultiplier={1.2} style={[styles.headline, styles.headlineAccent]}>Better Days</Text>
              <Text maxFontSizeMultiplier={1.2} style={styles.subtitle}>Track what you spend, set a smart allowance, and know what’s safe to spend every day. All on your phone.</Text>
              <View style={styles.chips}>
                {["Track expenses", "Daily allowance", "Private on-device"].map((label) => (
                  <View key={label} style={styles.chip}><Text maxFontSizeMultiplier={1.2} style={styles.chipText}>{label}</Text></View>
                ))}
              </View>
            </View>
            <View style={{ flex: 1 }} />
          </View>

          <View style={[styles.page, { width, paddingTop: 8 }]}>
            <View style={[styles.copy, { paddingTop: 4 }]}>
              <Text maxFontSizeMultiplier={1.2} style={styles.headline}>Set Your</Text>
              <Text maxFontSizeMultiplier={1.2} style={[styles.headline, styles.headlineAccent]}>Allowance</Text>
              <Text maxFontSizeMultiplier={1.2} style={styles.subtitle}>How much can you spend this period? You can change this anytime in Settings.</Text>
            </View>
            <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.glassCard}>
                <View style={styles.amountLine}>
                  <Text maxFontSizeMultiplier={1.2} style={styles.currencySign}>₱</Text>
                  <Text maxFontSizeMultiplier={1.2} adjustsFontSizeToFit numberOfLines={1} style={styles.amount}>{amount ? Number(amount).toLocaleString("en-PH") : "0"}</Text>
                </View>
                <View style={styles.periodPill}>
                  {(["weekly", "biweekly", "monthly"] as Period[]).map((value) => {
                    const active = period === value;
                    return <Pressable key={value} onPress={() => { setPeriod(value); void Haptics.selectionAsync(); }} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.periodOption, active && styles.periodActive]}>
                      <Text maxFontSizeMultiplier={1.2} style={[styles.periodText, active && styles.periodTextActive]}>{value === "biweekly" ? "Every 2 weeks" : value === "weekly" ? "Weekly" : "Monthly"}</Text>
                    </Pressable>;
                  })}
                </View>
                <DateField label="Start date" value={startDate} onChange={setStartDate} maxFontSizeMultiplier={1.2} />
                <Text maxFontSizeMultiplier={1.2} style={styles.endDate}>Ends {formatDate(endDate, false)}</Text>
                <Text maxFontSizeMultiplier={1.2} style={styles.helper}>About {formatMoney(perDay, "PHP")} per day</Text>
              </View>
              <View style={styles.quickAmounts}>
                {[5000, 10000, 15000, 20000].map((value) => <Pressable key={value} onPress={() => setAmount(String(value))} style={styles.quickChip}><Text maxFontSizeMultiplier={1.2} style={styles.quickText}>₱{value.toLocaleString("en-PH")}</Text></Pressable>)}
              </View>
              <View style={styles.keypad}>
                {["1","2","3","4","5","6","7","8","9","", "0", "⌫"].map((key, index) => (
                  <Pressable key={index} disabled={!key} onPress={() => {
                    void Haptics.selectionAsync();
                    setAmount((old) => key === "⌫" ? old.slice(0, -1) : moneyDigits(old + key));
                  }} accessibilityRole="button" accessibilityLabel={key === "⌫" ? "Backspace" : key ? `Enter ${key} pesos` : undefined} style={[styles.key, !key && styles.keyEmpty]}>
                    <Text maxFontSizeMultiplier={1.2} style={styles.keyText}>{key}</Text>
                  </Pressable>
                ))}
              </View>
              {!!error && <Text maxFontSizeMultiplier={1.2} style={styles.error}>{error}</Text>}
            </ScrollView>
          </View>

          <View style={[styles.page, styles.welcomePage, { width }]}>
            <View style={{ flex: 1 }} />
            <View style={styles.welcomeCopy}>
              <Text maxFontSizeMultiplier={1.2} style={styles.welcomeHeadline}>Welcome to</Text>
              <Text maxFontSizeMultiplier={1.2} style={styles.welcomeBrand}>Gastador</Text>
              <Text maxFontSizeMultiplier={1.2} style={styles.welcomeSubtitle}>
                {allowanceSaved
                  ? `You have ${formatMoney(savedAmount, "PHP")} to spend this period. Let’s make every peso count.`
                  : "Your wallet is ready. Add your first expense, or set an allowance later in Settings."}
              </Text>
            </View>
            <View style={{ flex: 1 }} />
          </View>
        </ScrollView>

        <View pointerEvents="none" style={[styles.coinStage, { top: page === 0 ? height * 0.34 : page === 1 ? 0 : height * 0.04, height: coinSize, width: coinSize, left: (width - coinSize) / 2 }]}>
          {page === 2 && <Reanimated.View style={[styles.ring, ringStyle]} />}
          {page === 2 && <Reanimated.View entering={reducedMotion ? undefined : FadeInUp.duration(1200)} style={styles.confetti} importantForAccessibility="no-hide-descendants">{[[0,-42], [34,-22], [-38,-14], [45,22], [-48,34], [4,48]].map(([x,y],i) => <View key={i} style={[styles.confettiDot, { transform: [{ translateX: x }, { translateY: y }] }]} />)}</Reanimated.View>}
          <View style={styles.pedestal} />\n          <Reanimated.View style={[styles.contactShadow, shadowStyle]} />
          <Reanimated.View style={[styles.coinWrap, coinStyle]}>
            <Image source={COIN} contentFit="contain" style={{ width: coinSize, height: coinSize }} accessibilityLabel="Peso coin" />
          </Reanimated.View>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {page === 1 ? (
          <AnimatedPressable onPress={() => { void Haptics.selectionAsync(); void saveAllowance(); }} onPressIn={() => { buttonScale.value = withSpring(0.96); }} onPressOut={() => { buttonScale.value = withSpring(1); }} disabled={numericAmount <= 0 || saving} accessibilityRole="button" accessibilityLabel="Set allowance and continue" entering={page === 0 && !reducedMotion ? FadeInUp.duration(500).delay(320) : undefined} style={[styles.cta, buttonAnimatedStyle, (numericAmount <= 0 || saving) && styles.ctaDisabled]}>
            <Text maxFontSizeMultiplier={1.2} style={styles.ctaText}>{saving ? "Saving…" : "Set Allowance"}</Text>
            <View style={styles.arrowCircle}><SymbolView name={{ ios: "arrow.right", android: "arrow-forward", web: "arrow-right" }} tintColor={BLUE} size={17} /></View>
          </AnimatedPressable>
        ) : (
          <AnimatedPressable onPress={() => { void Haptics.selectionAsync(); page === 0 ? moveTo(1) : void finish(); }} onPressIn={() => { buttonScale.value = withSpring(0.96); }} onPressOut={() => { buttonScale.value = withSpring(1); }} accessibilityRole="button" accessibilityLabel={page === 0 ? "Get started" : "Start tracking"} entering={page === 0 && !reducedMotion ? FadeInUp.duration(500).delay(320) : undefined} style={[styles.cta, buttonAnimatedStyle]}>
            <Text maxFontSizeMultiplier={1.2} style={styles.ctaText}>{page === 0 ? "Get Started" : "Start Tracking"}</Text>
            <View style={styles.arrowCircle}><SymbolView name={{ ios: "arrow.right", android: "arrow-forward", web: "arrow-right" }} tintColor={BLUE} size={17} /></View>
          </AnimatedPressable>
        )}
      </View>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1E40AF" },
  orb: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" },
  top: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 24, paddingBottom: 8, zIndex: 4 },
  counter: { color: "rgba(255,255,255,0.7)", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14, width: 52 },
  progress: { flex: 1, flexDirection: "row", gap: 8, alignItems: "center" },
  segmentTrack: { flex: 1, height: 3, borderRadius: 99, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.25)" },
  segmentFill: { height: 3, backgroundColor: ACCENT, borderRadius: 99 },
  skip: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "flex-end" },
  skipText: { color: WHITE, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15 },
  skipPlaceholder: { width: 44 },
  pagerHost: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 24 },
  copy: { zIndex: 1 },
  headline: { color: WHITE, fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 44, lineHeight: 49, includeFontPadding: false },
  headlineAccent: { color: SKY },
  subtitle: { color: "rgba(255,255,255,0.85)", fontFamily: "IBMPlexSans_400Regular", fontSize: 17, lineHeight: 24, marginTop: 16, maxWidth: 340 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 18 },
  chip: { backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 999, paddingHorizontal: 11, minHeight: 32, justifyContent: "center" },
  chipText: { color: WHITE, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 12 },
  formScroll: { flex: 1, marginTop: 8 },
  formContent: { paddingBottom: 8, gap: 10 },
  glassCard: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 28, padding: 18, gap: 10 },
  amountLine: { flexDirection: "row", alignItems: "flex-start", minHeight: 70 },
  currencySign: { color: WHITE, fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 31, lineHeight: 48, marginTop: 2 },
  amount: { flex: 1, color: WHITE, fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 56, lineHeight: 68, includeFontPadding: false },
  periodPill: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, padding: 4, gap: 2 },
  periodOption: { flex: 1, minHeight: 40, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  periodActive: { backgroundColor: WHITE },
  periodText: { color: WHITE, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 11 },
  periodTextActive: { color: BLUE },
  endDate: { color: "rgba(255,255,255,0.8)", fontFamily: "IBMPlexSans_400Regular", fontSize: 12, marginTop: -6 },
  helper: { color: ACCENT, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  quickAmounts: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 7 },
  quickChip: { minHeight: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", justifyContent: "center" },
  quickText: { color: WHITE, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 12 },
  keypad: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  key: { width: "30%", maxWidth: 94, height: 42, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  keyEmpty: { backgroundColor: "transparent" },
  keyText: { color: WHITE, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 18 },
  error: { color: "#FFE0E0", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  coinStage: { position: "absolute", zIndex: 0, alignItems: "center", justifyContent: "center" },
  coinWrap: { alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: "76%", height: "76%", borderRadius: 999, borderWidth: 3, borderColor: "rgba(142,197,255,0.35)", backgroundColor: "rgba(142,197,255,0.05)" },
  confetti: { position: "absolute", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  confettiDot: { position: "absolute", width: 7, height: 7, borderRadius: 4, backgroundColor: SKY },
  pedestal: { position: "absolute", width: "88%", height: "24%", bottom: "6%", borderRadius: 999, backgroundColor: "rgba(11,31,92,0.6)" },\n  contactShadow: { position: "absolute", width: "68%", height: "16%", bottom: "8%", borderRadius: 999, backgroundColor: "rgba(5,15,50,0.45)", shadowColor: "#050F32", shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  welcomePage: { alignItems: "center" },
  welcomeCopy: { width: "100%", alignItems: "center", paddingHorizontal: 8, marginTop: 20 },
  welcomeHeadline: { color: WHITE, fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 42, lineHeight: 49, textAlign: "center" },
  welcomeBrand: { color: SKY, fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 52, lineHeight: 58, textAlign: "center" },
  welcomeSubtitle: { color: "rgba(255,255,255,0.85)", fontFamily: "IBMPlexSans_400Regular", fontSize: 16, lineHeight: 23, textAlign: "center", marginTop: 16 },
  bottom: { paddingHorizontal: 24, paddingTop: 8 },
  cta: { height: 64, borderRadius: 999, backgroundColor: WHITE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, shadowColor: "#061747", shadowOpacity: 0.2, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: BLUE, fontFamily: "IBMPlexSans_700Bold", fontSize: 17 },
  arrowCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "rgba(30,64,175,0.3)", alignItems: "center", justifyContent: "center" },
});
