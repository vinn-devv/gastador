import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import {
  BackHandler,
  Pressable,
  Platform,
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
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
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
  withSequence,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DateField } from "@/components/date-field";
import { saveSettings, getSettings, getCycles, saveAllowance, CycleOverlapError } from "@/data/repository";
import { addDays, addMonths, daysInclusive, formatDate, manilaToday } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import type { Cycle } from "@/domain/types";

const BLUE = "#1E40AF";
const ACCENT = "#EAF3FF";
const SKY = "#8EC5FF";
const WHITE = "#FFFFFF";
const COIN = require("@/assets/images/peso-coin.png");
const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

type Period = "weekly" | "biweekly" | "monthly";

function ProgressSegment({ index, progress, active, onPress }: { index: number; progress: SharedValue<number>; active: boolean; onPress: () => void }) {
  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.get() - index)) * 100}%`,
  }));
  return <Pressable disabled={!active} onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Go to onboarding page ${index + 1}`} style={styles.segmentHit}>
    <View style={styles.segmentTrack}><Reanimated.View style={[styles.segmentFill, fillStyle]} /></View>
  </Pressable>;
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
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);
  const [fade] = useState(() => new RNAnimated.Value(1));
  const pageProgress = useSharedValue(0);
  const progressValue = useSharedValue(0);
  const float = useSharedValue(0);
  const pulse = useSharedValue(0);
  const confettiProgress = useSharedValue(0);
  const confettiPlayed = useRef(false);
  const buttonScale = useSharedValue(1);
  const [page, setPage] = useState(0);
  const [skippedAllowance, setSkippedAllowance] = useState(false);
  const [savedCycle, setSavedCycle] = useState<Cycle | null>(null);
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<Period>("monthly");
  const [periodWidth, setPeriodWidth] = useState(0);
  const [coinSlotHeight, setCoinSlotHeight] = useState(0);
  const [keypadLayout, setKeypadLayout] = useState({ width: 0, height: 0 });
  const periodIndex = period === "weekly" ? 0 : period === "biweekly" ? 1 : 2;
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
    progressValue.set(withTiming(page + 1, { duration: reducedMotion ? 180 : 400 }));
  }, [page, progressValue, reducedMotion]);

  useEffect(() => {
    if (!reducedMotion) {
      float.set(withRepeat(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ));
    }
  }, [float, reducedMotion]);

  useEffect(() => {
    if (page === 2 && allowanceSaved) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [page, allowanceSaved]);

  useEffect(() => {
    if (page === 2 && !confettiPlayed.current && !reducedMotion) {
      confettiPlayed.current = true;
      confettiProgress.set(withSequence(withTiming(1, { duration: 1200 }), withTiming(0, { duration: 500 })));
    }
  }, [page, confettiProgress, reducedMotion]);

  useEffect(() => {
    if (page === 2 && !reducedMotion) pulse.set(withRepeat(withTiming(1, { duration: 1200 }), -1, true));
    else pulse.set(0);
  }, [page, pulse, reducedMotion]);

  const moveTo = (next: number, allowForward = false) => {
    const safe = Math.max(0, Math.min(2, next));
    if (safe > 1 && !allowForward && !allowanceSaved && !skippedAllowance) return;
    setPage(safe);
    pageProgress.set(withTiming(safe, { duration: reducedMotion ? 180 : 420 }));
    pager.current?.scrollTo({ x: safe * width, animated: true });
    void Haptics.selectionAsync();
  };

  useEffect(() => {
    let active = true;
    void getCycles(db).then((cycles) => {
      if (!active) return;
      const today = manilaToday();
      const current = cycles.find((cycle) => cycle.startDate <= today && today <= cycle.endDate) ?? null;
      if (!current) return;
      setSavedCycle(current);
      setAllowanceSaved(true);
      setSavedAmount(current.allowanceCentavos);
      setAmount(String(Math.round(current.allowanceCentavos / 100)));
      setPeriod(current.frequency === "weekly" || current.frequency === "biweekly" ? current.frequency : "monthly");
      setStartDate(current.startDate);
    }).catch((loadError) => console.error("Could not load current allowance:", loadError));
    return () => { active = false; };
  }, [db]);

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
      setSkippedAllowance(true);
      moveTo(2, true);
      return;
    }
    void finish();
  };

  const saveAllowanceWithMode = async (mode: "edit_current" | "start_next" = "edit_current") => {
    if (numericAmount <= 0 || saving) return;
    setSaving(true);
    setError("");
    try {
      await saveAllowance(db, {
        name: "Allowance",
        period,
        startDate: savedCycle?.startDate ?? startDate,
        lengthDays: days,
        amountCentavos: numericAmount * 100,
        mode,
      });
      setAllowanceSaved(true);
      setSavedAmount(numericAmount * 100);
      setSkippedAllowance(false);
      const refreshedCycles = await getCycles(db);
      const today = manilaToday();
      setSavedCycle(refreshedCycles.find((cycle) => cycle.startDate <= today && today <= cycle.endDate) ?? null);
      moveTo(2, true);
    } catch (e) {
      if (e instanceof CycleOverlapError) {
        setError("You already have an allowance for these dates. Update it or start the next cycle.");
      } else {
        setError(e instanceof Error ? e.message : "Couldn't save your allowance. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const saveAllowanceForOnboarding = () => saveAllowanceWithMode("edit_current");

  const welcomeCoinStyle = useAnimatedStyle(() => ({ transform: [{ translateY: reducedMotion ? 0 : Math.sin(float.get() * Math.PI * 2) * 6 }] }));
  const buttonAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.get() }] }));
  const periodIndicatorStyle = useAnimatedStyle(() => {
    const segmentWidth = Math.max(0, (periodWidth - 12) / 3);
    return { width: segmentWidth, transform: [{ translateX: withTiming(periodIndex * (segmentWidth + 2), { duration: 250 }) }] };
  }, [periodIndex, periodWidth]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.8 + pulse.get() * 0.6 }],
    opacity: reducedMotion ? 0.24 : 0.35 * (1 - pulse.get()),
  }));

  const confettiStyle = useAnimatedStyle(() => ({
    opacity: confettiProgress.get(),
    transform: [{ scale: 0.75 + confettiProgress.get() * 0.3 }],
  }));

  const shadowStyle = useAnimatedStyle(() => {
    const lift = Math.max(0, -Math.sin(float.get() * Math.PI * 2));
    return {
      transform: [{ scaleX: 1 - lift * 0.08 }, { scaleY: 1 - lift * 0.06 }],
      opacity: 0.85 - lift * 0.12,
    };
  });

  const pageOneCoinSize = Math.min(width * 0.7, 280, Math.max(0, coinSlotHeight - 36));
  const welcomeCoinSize = 220;
  const keypadRowHeight = Math.max(0, (keypadLayout.height - 30) / 4);
  const keypadColumnWidth = keypadLayout.width / 3;
  const keySize = Math.max(44, Math.min(56, Math.min(keypadRowHeight, keypadColumnWidth) - 8));
  const showQuickAmounts = height >= 800 && keySize > 44;
  const showSubtitle = height >= 640;

  return (
    <RNAnimated.View style={[styles.root, { opacity: fade }]}>
      <StatusBar style="light" />
      <LinearGradient colors={["#1E40AF", "#2563EB", "#0B1F5C"]} locations={[0, 0.52, 1]} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[styles.orb, { width: width * 0.9, height: width * 0.9, top: -width * 0.42, right: -width * 0.32 }]} />
      {page === 0 ? <View pointerEvents="none" style={[styles.orb, styles.pageOneOrb, { width: width * 0.75, height: width * 0.75, bottom: height * 0.12, left: -width * 0.42 }]} /> : null}

      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        {page > 0 ? <Pressable onPress={() => moveTo(page - 1)} accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton}>
          <SymbolView name={{ ios: "chevron.left", android: "chevron_left", web: "chevron_left" }} tintColor={WHITE} size={18} />
        </Pressable> : <View style={styles.backPlaceholder} />}
        <Text maxFontSizeMultiplier={1.2} style={styles.counter}>{String(page + 1).padStart(2, "0")} / 03</Text>
        <View style={styles.progress} accessibilityRole="progressbar" accessibilityLabel={`Onboarding page ${page + 1} of 3`} accessibilityValue={{ min: 1, max: 3, now: page + 1 }}>
          {[0, 1, 2].map((item) => <ProgressSegment key={item} index={item} progress={progressValue} active={item <= page} onPress={() => moveTo(item)} />)}
        </View>
        {page < 2 ? <Pressable onPress={skip} accessibilityRole="button" accessibilityLabel={page === 1 ? "Skip allowance" : "Skip onboarding"} hitSlop={8} style={styles.skip}>
          <Text maxFontSizeMultiplier={1.2} style={styles.skipText}>Skip</Text>
        </Pressable> : <View style={styles.skipPlaceholder} />}
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
            if (next > 1 && !allowanceSaved && !skippedAllowance) {
              pager.current?.scrollTo({ x: width, animated: true });
              setPage(1);
              pageProgress.set(withTiming(1, { duration: reducedMotion ? 180 : 420 }));
              return;
            }
            if (next !== page) {
              setPage(next);
              pageProgress.set(withTiming(next, { duration: reducedMotion ? 180 : 420 }));

            }
          }}
          style={{ flex: 1 }}
          contentContainerStyle={{ width: width * 3 }}
        >
          <View style={[styles.page, { width }]}>
            <View style={[styles.copy, { paddingTop: Math.max(24, height * 0.035) }]}>
              <Reanimated.View entering={reducedMotion ? undefined : FadeInUp.duration(500)}>
                <Text maxFontSizeMultiplier={1.2} style={styles.headline}>Your Money,</Text>
              </Reanimated.View>
              <Reanimated.View entering={reducedMotion ? undefined : FadeInUp.duration(500).delay(80)}>
                <Text maxFontSizeMultiplier={1.2} style={[styles.headline, styles.headlineAccent]}>Better Days</Text>
              </Reanimated.View>
              <Reanimated.View entering={reducedMotion ? undefined : FadeInUp.duration(500).delay(160)}>
                <Text maxFontSizeMultiplier={1.2} style={styles.subtitle}>Track what you spend, set a smart allowance, and know what’s safe to spend every day. All on your phone.</Text>
              </Reanimated.View>
              <Reanimated.View entering={reducedMotion ? undefined : FadeInUp.duration(500).delay(240)} style={styles.chips}>
                {[
                  { label: "Track expenses", icon: { ios: "checkmark.circle.fill", android: "check_circle", web: "check-circle" } },
                  { label: "Daily allowance", icon: { ios: "calendar", android: "calendar_month", web: "calendar" } },
                  { label: "Private on-device", icon: { ios: "lock.fill", android: "lock", web: "lock" } },
                ].map((item) => (
                  <View key={item.label} style={styles.chip}>
                    {Platform.OS === "android" ? <Text maxFontSizeMultiplier={1.2} style={styles.materialIcon}>{item.icon.android}</Text> : <SymbolView name={item.icon as ComponentProps<typeof SymbolView>["name"]} tintColor={WHITE} size={12} />}
                    <Text maxFontSizeMultiplier={1.2} style={styles.chipText}>{item.label}</Text>
                  </View>
                ))}
              </Reanimated.View>
            </View>
            <View style={styles.pageOneCoinSlot} onLayout={(event) => setCoinSlotHeight(event.nativeEvent.layout.height)}>
              {pageOneCoinSize > 0 ? <>
                <Image source={COIN} contentFit="contain" style={{ width: pageOneCoinSize, height: pageOneCoinSize }} accessibilityLabel="3D peso coin" />
                <View style={styles.coinContactShadow}>
                  <Svg width="100%" height="100%" viewBox="0 0 100 20">
                    <Defs><RadialGradient id="pageOneCoinContact" cx="50%" cy="50%" rx="50%" ry="50%">
                      <Stop offset="0" stopColor="#050F32" stopOpacity="0.35" />
                      <Stop offset="1" stopColor="#050F32" stopOpacity="0" />
                    </RadialGradient></Defs>
                    <Ellipse cx="50" cy="10" rx="50" ry="10" fill="url(#pageOneCoinContact)" />
                  </Svg>
                </View>
              </> : null}
            </View>
          </View>

          <View style={[styles.page, styles.allowancePage, { width }]>
            <View style={styles.allowanceHeading}>
              <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit style={[styles.allowanceHeadline, { maxWidth: width - 64 - 48 }]}>Set Your Allowance</Text>
              <Image source={COIN} contentFit="contain" style={styles.headerCoin} accessibilityLabel="3D peso coin" />
            </View>
            {showSubtitle ? <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.allowanceSubtitle}>You can change this anytime in Settings.</Text> : null}
            <View style={styles.amountLine}>
              <Text maxFontSizeMultiplier={1.2} style={styles.currencySign}>₱</Text>
              <Text maxFontSizeMultiplier={1.2} adjustsFontSizeToFit numberOfLines={1} style={styles.amount}>{amount ? Number(amount).toLocaleString("en-PH") : "0"}</Text>
            </View>
            <View style={styles.periodPill} onLayout={(event) => setPeriodWidth(event.nativeEvent.layout.width)}>
              <Reanimated.View pointerEvents="none" style={[styles.periodIndicator, periodIndicatorStyle]} />
              {(["weekly", "biweekly", "monthly"] as Period[]).map((value) => {
                const active = period === value;
                return <Pressable key={value} onPress={() => { setPeriod(value); void Haptics.selectionAsync(); }} accessibilityRole="button" accessibilityState={{ selected: active }} style={styles.periodOption}>
                  <Text maxFontSizeMultiplier={1.2} style={[styles.periodText, active && styles.periodTextActive]}>{value === "biweekly" ? "Every 2 weeks" : value === "weekly" ? "Weekly" : "Monthly"}</Text>
                </Pressable>;
              })}
            </View>
            <View style={styles.dateRow}>
              <Text maxFontSizeMultiplier={1.2} style={styles.dateLabel}>Start date</Text>
              <View style={styles.dateControl}><DateField label="Start date" accessibilityLabel="Change start date" compact value={startDate} onChange={setStartDate} maxFontSizeMultiplier={1.2} /></View>
            </View>
            <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.helper}>Ends {formatDate(endDate, false)} · About {formatMoney(perDay, "PHP")} per day</Text>
            {showQuickAmounts ? <View style={styles.quickAmounts}>
              {[5000, 10000, 15000, 20000].map((value) => <Pressable key={value} onPress={() => setAmount(String(value))} style={styles.quickChip}><Text maxFontSizeMultiplier={1.2} style={styles.quickText}>₱{value.toLocaleString("en-PH")}</Text></Pressable>)}
            </View> : null}
            <View style={styles.keypad} onLayout={(event) => setKeypadLayout({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
              {[["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["", "0", "⌫"]].map((row, rowIndex) => (
                <View key={rowIndex} style={styles.keypadRow}>
                  {row.map((key, columnIndex) => (
                    <View key={`${rowIndex}-${columnIndex}`} style={styles.keypadCell}>
                      <Pressable disabled={!key} onPress={() => {
                        void Haptics.selectionAsync();
                        setAmount((old) => key === "⌫" ? old.slice(0, -1) : moneyDigits(old + key));
                      }} accessibilityRole="button" accessibilityLabel={key === "⌫" ? "Backspace" : key ? `Enter ${key} pesos` : undefined} style={[styles.key, { width: keySize, height: keySize, borderRadius: keySize / 2 }, !key && styles.keyEmpty]}>
                        <Text maxFontSizeMultiplier={1.2} style={styles.keyText}>{key}</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ))}
            </View>
            {!!error && <Text maxFontSizeMultiplier={1.2} style={styles.error}>{error}</Text>}
          </View>

          <View style={[styles.page, styles.welcomePage, { width }]}>
            <View style={styles.welcomeStack}>
              <View style={styles.welcomeVisual}>
                <Reanimated.View style={[styles.ring, ringStyle]} />
                <Reanimated.View style={[styles.confetti, confettiStyle]} importantForAccessibility="no-hide-descendants">
                  {[[0,-42], [34,-22], [-38,-14], [45,22], [-48,34], [4,48]].map(([x,y],i) => <View key={i} style={[styles.confettiDot, { transform: [{ translateX: x }, { translateY: y }] }]} />)}
                </Reanimated.View>
                <Reanimated.View style={[styles.welcomeCoin, welcomeCoinStyle]}>
                  <Image source={COIN} contentFit="contain" style={{ width: welcomeCoinSize, height: welcomeCoinSize }} accessibilityLabel="3D peso coin" />
                </Reanimated.View>
                <Reanimated.View style={[styles.welcomeContactShadow, shadowStyle]}>
                  <Svg width="100%" height="100%" viewBox="0 0 100 20">
                    <Defs><RadialGradient id="welcomeCoinContact" cx="50%" cy="50%" rx="50%" ry="50%">
                      <Stop offset="0" stopColor="#050F32" stopOpacity="0.35" />
                      <Stop offset="1" stopColor="#050F32" stopOpacity="0" />
                    </RadialGradient></Defs>
                    <Ellipse cx="50" cy="10" rx="50" ry="10" fill="url(#welcomeCoinContact)" />
                  </Svg>
                </Reanimated.View>
              </View>
              <View style={styles.welcomeCopy}>
                <Text maxFontSizeMultiplier={1.2} style={styles.welcomeHeadline}>Welcome to</Text>
                <Text maxFontSizeMultiplier={1.2} style={styles.welcomeBrand}>Gastador</Text>
                <Text maxFontSizeMultiplier={1.2} style={styles.welcomeSubtitle}>
                  {allowanceSaved
                    ? `You have ${formatMoney(savedAmount, "PHP")} to spend this period. Let’s make every peso count.`
                    : "Your wallet is ready. Add your first expense, or set an allowance later in Settings."}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>


      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {page === 0 ? <View style={styles.noLogin}>
          <SymbolView name={{ ios: "checkmark.shield.fill", android: "verified_user", web: "verified_user" }} tintColor="rgba(255,255,255,0.9)" size={17} />
          <Text maxFontSizeMultiplier={1.2} style={styles.noLoginText}>No login or sign-up needed. Just start.</Text>
        </View> : null}
        {page === 1 ? (
          <AnimatedPressable onPress={() => { void Haptics.selectionAsync(); void saveAllowanceForOnboarding(); }} onPressIn={() => { buttonScale.set(withSpring(0.96)); }} onPressOut={() => { buttonScale.set(withSpring(1)); }} disabled={numericAmount <= 0 || saving} accessibilityRole="button" accessibilityLabel={allowanceSaved ? "Update allowance and continue" : "Set allowance and continue"} style={[styles.cta, buttonAnimatedStyle, (numericAmount <= 0 || saving) && styles.ctaDisabled]}>
            <Text maxFontSizeMultiplier={1.2} style={[styles.ctaText, (numericAmount <= 0 || saving) && styles.ctaDisabledText]}>{saving ? "Saving…" : allowanceSaved ? "Update Allowance" : "Set Allowance"}</Text>
            <View style={styles.arrowCircle}><SymbolView name={{ ios: "arrow.right", android: "arrow_forward", web: "arrow_right" }} tintColor={BLUE} size={17} /></View>
          </AnimatedPressable>
        ) : (
          <AnimatedPressable
            onPress={() => {
              void Haptics.selectionAsync();
              if (page === 0) {
                moveTo(1);
              } else {
                void finish();
              }
            }}
            onPressIn={() => { buttonScale.set(withSpring(0.96)); }}
            onPressOut={() => { buttonScale.set(withSpring(1)); }}
            accessibilityRole="button"
            accessibilityLabel={page === 0 ? "Get started" : "Start tracking"}
            entering={page === 0 && !reducedMotion ? FadeInUp.duration(500).delay(320) : undefined}
            style={[styles.cta, buttonAnimatedStyle]}
          >
            <Text maxFontSizeMultiplier={1.2} style={styles.ctaText}>{page === 0 ? "Get Started" : "Start Tracking"}</Text>
            <View style={styles.arrowCircle}><SymbolView name={{ ios: "arrow.right", android: "arrow_forward", web: "arrow_right" }} tintColor={BLUE} size={17} /></View>
          </AnimatedPressable>
        )}
      </View>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1E40AF" },
  orb: { position: "absolute", zIndex: 0, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.05)" },
  pageOneOrb: { zIndex: 0 },
  top: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 18, paddingBottom: 8, zIndex: 4 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  backPlaceholder: { width: 40, height: 40 },
  counter: { color: "rgba(255,255,255,0.7)", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14, width: 52 },
  progress: { flex: 1, flexDirection: "row", gap: 8, alignItems: "center" },
  segmentHit: { flex: 1, minHeight: 32, justifyContent: "center" },
  segmentTrack: { width: "100%", height: 4, alignSelf: "center", borderRadius: 999, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.28)" },
  segmentFill: { height: 4, backgroundColor: WHITE, borderRadius: 999 },
  skip: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "flex-end" },
  skipText: { color: WHITE, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15 },
  skipPlaceholder: { width: 44 },
  pagerHost: { flex: 1, zIndex: 1 },
  page: { flex: 1, paddingHorizontal: 24 },
  copy: { zIndex: 2, paddingTop: 12 },
  headline: { color: WHITE, fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 44, lineHeight: 49, includeFontPadding: false },
  headlineAccent: { color: SKY },
  subtitle: { color: "rgba(255,255,255,0.85)", fontFamily: "IBMPlexSans_400Regular", fontSize: 17, lineHeight: 24, marginTop: 16, maxWidth: 340 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
  chip: { flexGrow: 0, flexShrink: 0, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 999, paddingHorizontal: 12, height: 36, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 6 },
  materialIcon: { color: WHITE, fontFamily: "MaterialSymbols_400Regular", fontSize: 16, lineHeight: 18 },
  chipText: { flexShrink: 0, color: WHITE, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  pageOneCoinSlot: { flex: 1, minHeight: 0, marginVertical: 16, alignItems: "center", justifyContent: "center", zIndex: 1 },
  coinContactShadow: { width: "70%", height: 16, marginTop: 8 },
  allowancePage: { paddingTop: 0, paddingBottom: 0, gap: 2 },
  allowanceHeading: { height: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
  allowanceHeadline: { color: WHITE, fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 34, lineHeight: 40, flex: 1 },
  headerCoin: { width: 64, height: 64, flexShrink: 0 },
  allowanceSubtitle: { color: "rgba(255,255,255,0.9)", fontFamily: "IBMPlexSans_400Regular", fontSize: 14, lineHeight: 18 },
  dateRow: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 10 },
  dateLabel: { color: WHITE, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14, width: 78 },
  dateControl: { flex: 1, alignSelf: "center" },
  amountLine: { flexDirection: "row", alignItems: "center", minHeight: 60, marginTop: 0 },
  currencySign: { color: WHITE, fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 31, lineHeight: 48 },
  amount: { flex: 1, color: WHITE, fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 50, lineHeight: 60, includeFontPadding: false },
  periodPill: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, padding: 4, gap: 2 },
  periodOption: { flex: 1, minHeight: 36, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  periodIndicator: { position: "absolute", top: 4, bottom: 4, left: 4, backgroundColor: WHITE, borderRadius: 999 },
  periodText: { color: WHITE, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 11 },
  periodTextActive: { color: BLUE },
  helper: { color: "rgba(255,255,255,0.9)", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13, lineHeight: 18, textAlign: "center", marginVertical: 8 },
  quickAmounts: { height: 32, flexDirection: "row", flexWrap: "nowrap", justifyContent: "space-between", gap: 5 },
  quickChip: { flex: 1, minWidth: 0, height: 32, paddingHorizontal: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", justifyContent: "center", alignItems: "center" },
  quickText: { color: WHITE, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 12 },
  keypad: { flex: 1, minHeight: 188, flexDirection: "column", gap: 10 },
  keypadRow: { flex: 1, flexDirection: "row", alignItems: "center" },
  keypadCell: { flex: 1, alignItems: "center", justifyContent: "center" },
  key: { backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  keyEmpty: { backgroundColor: "transparent" },
  keyText: { color: WHITE, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 18 },
  error: { color: "#FFE0E0", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  welcomePage: { alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  welcomeStack: { width: "100%", alignItems: "center", justifyContent: "center" },
  welcomeVisual: { width: 230, height: 252, alignItems: "center", justifyContent: "flex-start", overflow: "hidden" },
  welcomeCoin: { width: 220, height: 220, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", top: 22, width: 176, height: 176, borderRadius: 999, borderWidth: 3, borderColor: "rgba(142,197,255,0.35)", backgroundColor: "rgba(142,197,255,0.05)" },
  confetti: { position: "absolute", top: 0, width: 220, height: 220, alignItems: "center", justifyContent: "center" },
  confettiDot: { position: "absolute", width: 7, height: 7, borderRadius: 4, backgroundColor: SKY },
  welcomeContactShadow: { position: "absolute", bottom: 0, width: "70%", height: 16 },
  welcomeStack: { width: "100%", alignItems: "center", justifyContent: "center" },
  welcomeVisual: { width: 230, height: 252, alignItems: "center", justifyContent: "flex-start", overflow: "hidden" },
  welcomeCoin: { width: 220, height: 220, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", top: 22, width: 176, height: 176, borderRadius: 999, borderWidth: 3, borderColor: "rgba(142,197,255,0.35)", backgroundColor: "rgba(142,197,255,0.05)" },
  confetti: { position: "absolute", top: 0, width: 220, height: 220, alignItems: "center", justifyContent: "center" },
  confettiDot: { position: "absolute", width: 7, height: 7, borderRadius: 4, backgroundColor: SKY },
  welcomeContactShadow: { position: "absolute", bottom: 0, width: "70%", height: 16 },
  welcomeCopy: { width: "100%", alignItems: "center", paddingHorizontal: 8, marginTop: 32 },
  welcomeHeadline: { color: WHITE, fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 42, lineHeight: 49, textAlign: "center" },
  welcomeBrand: { color: "#CFE6FF", fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 52, lineHeight: 58, textAlign: "center" },
  welcomeSubtitle: { color: "rgba(255,255,255,0.9)", fontFamily: "IBMPlexSans_400Regular", fontSize: 16, lineHeight: 23, textAlign: "center", marginTop: 16 },
  bottom: { paddingHorizontal: 24, paddingTop: 8, zIndex: 4 },
  noLogin: { minHeight: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginBottom: 12 },
  noLoginText: { color: "rgba(255,255,255,0.9)", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15, textAlign: "center" },
  cta: { height: 64, borderRadius: 999, backgroundColor: WHITE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, shadowColor: "#061747", shadowOpacity: 0.2, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  ctaDisabled: { backgroundColor: "rgba(255,255,255,0.35)" },
  ctaDisabledText: { color: WHITE },
  ctaText: { color: BLUE, fontFamily: "IBMPlexSans_700Bold", fontSize: 17 },
  arrowCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "rgba(30,64,175,0.3)", alignItems: "center", justifyContent: "center" },
});