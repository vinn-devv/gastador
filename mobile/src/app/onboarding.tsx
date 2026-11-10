import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import {
  BackHandler,
  Keyboard,
  Pressable,
  TextInput,
  Platform,
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
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  useAnimatedScrollHandler,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DateField } from "@/components/date-field";
import { saveSettings, getSettings, getCycles, saveAllowance, CycleOverlapError } from "@/data/repository";
import { addDays, addMonths, daysInclusive, formatDate, manilaToday } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import type { Cycle } from "@/domain/types";

const BLUE = "#1E40AF";
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

function normalizeAllowanceInput(value: string): string {
  const cleaned = value.replace(/,/g, "").replace(/[^0-9.]/g, "");
  const hasDecimal = cleaned.includes(".");
  const [wholeRaw, ...fractionParts] = cleaned.split(".");
  const whole = (wholeRaw ?? "").replace(/\D/g, "").slice(0, 9).replace(/^0+(?=\d)/, "");
  const fraction = fractionParts.join("").replace(/\D/g, "").slice(0, 2);
  return hasDecimal ? `${whole || "0"}.${fraction}` : whole;
}

function formatAllowanceInput(value: string): string {
  if (!value) return "";
  const [whole, fraction] = value.split(".");
  const formattedWhole = Number(whole || "0").toLocaleString("en-PH");
  return value.includes(".") ? `${formattedWhole}.${fraction ?? ""}` : formattedWhole;
}

export default function OnboardingScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const pager = useRef<ComponentRef<typeof Reanimated.ScrollView>>(null);
  const [fade] = useState(() => new RNAnimated.Value(1));
  const progressValue = useSharedValue(0);
  const float = useSharedValue(0);
  const tilt = useSharedValue(0);
  const entryScale = useSharedValue(0.85);
  const entryOpacity = useSharedValue(0);
  const pulse = useSharedValue(0);
  const confettiProgress = useSharedValue(0);
  const confettiPlayed = useRef(false);
  const buttonScale = useSharedValue(1);
  const [page, setPage] = useState(0);
  const [settledPage, setSettledPage] = useState(0);
  const [skippedAllowance, setSkippedAllowance] = useState(false);
  const [savedCycle, setSavedCycle] = useState<Cycle | null>(null);
  const [amount, setAmount] = useState("");
  const [amountSelection, setAmountSelection] = useState({ start: 0, end: 0 });
  const [period, setPeriod] = useState<Period>("monthly");
  const [periodWidth, setPeriodWidth] = useState(0);
  const amountInput = useRef<ComponentRef<typeof TextInput>>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const pageProgress = useSharedValue(0);
  const coinSlots = useSharedValue([{ x: 0, y: 0, width: 0, height: 0 }, { x: 0, y: 0, width: 0, height: 0 }, { x: 0, y: 0, width: 0, height: 0 }]);
  const periodIndex = period === "weekly" ? 0 : period === "biweekly" ? 1 : 2;
  const [startDate, setStartDate] = useState(manilaToday());
  const [allowanceSaved, setAllowanceSaved] = useState(false);
  const [confettiPending, setConfettiPending] = useState(false);
  const [savedAmount, setSavedAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const numericAmount = Number(amount || "0");
  const endDate = useMemo(() => endFor(startDate, period), [startDate, period]);
  const days = daysInclusive(startDate, endDate);
  const perDay = days > 0 ? Math.floor((numericAmount * 100) / days) : 0;

  useEffect(() => {
    progressValue.set(withTiming(page + 1, { duration: reducedMotion ? 180 : 400 }));
    pageProgress.set(withTiming(page, { duration: reducedMotion ? 180 : 600 }));
  }, [page, progressValue, pageProgress, reducedMotion]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) => { setKeyboardVisible(true); setKeyboardHeight(event.endCoordinates.height); });
    const hide = Keyboard.addListener(hideEvent, () => { setKeyboardVisible(false); setKeyboardHeight(0); });
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (page !== 1) return;
    const timer = setTimeout(() => amountInput.current?.focus(), reducedMotion ? 120 : 250);
    return () => clearTimeout(timer);
  }, [settledPage, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    float.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true));
    tilt.set(withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [float, tilt, reducedMotion]);

  useEffect(() => {
    entryScale.set(reducedMotion ? 1 : withSpring(1, { damping: 14, stiffness: 120 }));
    entryOpacity.set(reducedMotion ? 1 : withTiming(1, { duration: 320 }));
  }, [entryScale, entryOpacity, reducedMotion]);

  useEffect(() => {
    if (page === 2 && allowanceSaved) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [page, allowanceSaved]);

  useEffect(() => {
    if (page === 2 && confettiPending && !confettiPlayed.current && !reducedMotion) {
      confettiPlayed.current = true;
      confettiProgress.set(withSequence(withTiming(1, { duration: 1200 }), withTiming(0, { duration: 500 })));
      setConfettiPending(false);
    }
  }, [page, confettiPending, confettiProgress, reducedMotion]);

  useEffect(() => {
    if ((page === 0 || page === 2) && !reducedMotion) pulse.set(withRepeat(withTiming(1, { duration: 1200 }), -1, true));
    else pulse.set(0);
  }, [page, pulse, reducedMotion]);

  const moveTo = useCallback((next: number, allowForward = false) => {
    const safe = Math.max(0, Math.min(2, next));
    if (safe > 1 && !allowForward && !allowanceSaved && !skippedAllowance) return;
    Keyboard.dismiss();
    setPage(safe);
    pageProgress.set(withTiming(safe, { duration: reducedMotion ? 180 : 600 }));
    pager.current?.scrollTo({ x: safe * width, animated: true });
    void Haptics.selectionAsync();
  }, [allowanceSaved, skippedAllowance, reducedMotion, width, pageProgress]);

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
      const loadedAmount = (current.allowanceCentavos / 100).toFixed(2).replace(/\.?0+$/, "");
      setAmount(loadedAmount);
      const loadedDisplay = formatAllowanceInput(loadedAmount).length;
      setAmountSelection({ start: loadedDisplay, end: loadedDisplay });
      setPeriod(current.frequency === "weekly" || current.frequency === "biweekly" ? current.frequency : "monthly");
      setStartDate(current.startDate);
    }).catch((loadError) => console.error("Could not load current allowance:", loadError));
    return () => { active = false; };
  }, [db]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (keyboardVisible) { Keyboard.dismiss(); return true; }
      if (page > 0) {
        moveTo(page - 1);
        return true;
      }
      return true;
    });
    return () => sub.remove();
  }, [page, keyboardVisible, moveTo]);

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
    Keyboard.dismiss();
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
        amountCentavos: Math.round(numericAmount * 100),
        mode,
      });
      setAllowanceSaved(true);
      confettiPlayed.current = false;
      setConfettiPending(true);
      setSavedAmount(Math.round(numericAmount * 100));
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

  const buttonAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.get() }] }));
  const sharedCoinStyle = useAnimatedStyle(() => {
    const slots = coinSlots.get();
    const hostHeight = Math.max(280, height - insets.top - insets.bottom - 150);
    const points = slots.map((slot, index) => {
      const measured = Number.isFinite(slot.x) && Number.isFinite(slot.y) && slot.width > 0 && slot.height > 0;
      const fallback = index === 0
        ? { x: width / 2, y: hostHeight * 0.66, size: Math.max(112, Math.min(width * 0.7, 280, hostHeight * 0.42)) }
        : index === 1
          ? { x: width - 56, y: 32, size: 64 }
          : { x: width / 2, y: hostHeight * 0.34, size: Math.min(220, width - 48, hostHeight * 0.48) };
      const measuredSize = index === 0
        ? Math.min(width * 0.7, 280, slot.height - 24)
        : index === 1
          ? Math.min(64, slot.width, slot.height)
          : Math.min(220, slot.width, slot.height - 8);
      return measured
        ? { x: slot.x + index * width + slot.width / 2, y: slot.y + slot.height / 2, size: Math.max(index === 1 ? 48 : 96, measuredSize) }
        : fallback;
    });
    const rawProgress = pageProgress.get();
    const p = Number.isFinite(rawProgress) ? Math.max(0, Math.min(2, rawProgress)) : page;
    const safeInterpolate = (values: number[]) => values.every(Number.isFinite) ? interpolate(p, [0, 1, 2], values) : values[Math.round(p)] ?? 0;
    const x = safeInterpolate(points.map((point) => point.x)) - p * width;
    const y = safeInterpolate(points.map((point) => point.y));
    const size = Math.max(48, safeInterpolate(points.map((point) => point.size)));
    const idle = p < 0.5 || p > 1.5;
    const bob = reducedMotion ? 0 : Math.sin(float.get() * Math.PI * 2) * (idle ? 10 : 2);
    const rotation = reducedMotion ? 0 : -8 + (tilt.get() - 0.5) * (idle ? 6 : 1.2);
    const spin = reducedMotion ? 0 : interpolate(p, [0, 1, 2], [0, 360, 360]);
    const scale = reducedMotion ? 1 : entryScale.get() * (p > 1 && p < 2 ? 1 + Math.sin((p - 1) * Math.PI) * 0.08 : 1);
    return { position: "absolute" as const, left: x - size / 2, top: y - size / 2, width: size, height: size, opacity: 1, transform: [{ perspective: 800 }, { translateX: 0 }, { translateY: bob }, { scale }, { rotateY: `${spin}deg` }, { rotateZ: `${rotation}deg` }] };
  });
  const periodIndicatorStyle = useAnimatedStyle(() => {
    const segmentWidth = Math.max(0, (periodWidth - 12) / 3);
    return { width: segmentWidth, transform: [{ translateX: withTiming(periodIndex * (segmentWidth + 2), { duration: 250 }) }] };
  });

  const ringStyle = useAnimatedStyle(() => {
    const p = pageProgress.get();
    const visibility = reducedMotion ? 0 : interpolate(p, [0, 0.5, 1, 1.5, 2], [1, 0, 0, 0, 1]);
    return { transform: [{ scale: reducedMotion ? 1 : 0.8 + pulse.get() * 0.6 }], opacity: (0.18 + pulse.get() * 0.22) * visibility };
  });

  const confettiStyle = useAnimatedStyle(() => ({
    opacity: confettiProgress.get(),
    transform: [{ scale: 0.75 + confettiProgress.get() * 0.3 }],
  }));

  const shadowStyle = useAnimatedStyle(() => {
    const lift = reducedMotion ? 0 : Math.max(0, -Math.sin(float.get() * Math.PI * 2));
    const visibility = reducedMotion ? 0 : interpolate(pageProgress.get(), [0, 0.5, 1, 1.5, 2], [1, 0, 0, 0, 1]);
    return { transform: [{ scaleX: 1 - lift * 0.08 }, { scaleY: 1 - lift * 0.06 }], opacity: (0.85 - lift * 0.12) * visibility };
  });

  const formattedAmount = formatAllowanceInput(amount);
  const amountFontSize = formattedAmount.length > 11 ? 42 : formattedAmount.length > 9 ? 52 : formattedAmount.length > 7 ? 62 : keyboardVisible ? 56 : 72;
  const availableHeight = height - (Platform.OS === "ios" && keyboardVisible ? keyboardHeight : 0);
  const showSubtitle = availableHeight >= 700;
  const showQuickAmounts = availableHeight >= 620 && !keyboardVisible;
  const showHelperDetail = availableHeight >= 640;
  const compactHeaderCoin = availableHeight < 480;
  const onCoinSlotLayout = useCallback((index: number, offsetX = 0, offsetY = 0) => (event: { nativeEvent: { layout: { x: number; y: number; width: number; height: number } } }) => {
    const layout = event.nativeEvent.layout;
    const next = coinSlots.get().map((slot, i) => i === index ? { ...layout, x: layout.x + offsetX, y: layout.y + offsetY } : slot);
    coinSlots.set(next);
  }, [coinSlots]);
  const onWelcomeStackLayout = useCallback((event: { nativeEvent: { layout: { x: number; y: number; width: number } } }) => {
    const layout = event.nativeEvent.layout;
    const next = coinSlots.get().map((slot, i) => i === 2 ? { x: layout.x + 24 + (layout.width - 230) / 2, y: layout.y, width: 230, height: 236 } : slot);
    coinSlots.set(next);
  }, [coinSlots]);
  const scrollHandler = useAnimatedScrollHandler({ onScroll: (event) => { pageProgress.set(event.contentOffset.x / Math.max(1, width)); } });

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
        <Reanimated.ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          scrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={(event) => {
            const next = Math.round(event.nativeEvent.contentOffset.x / width);
            if (next > 1 && !allowanceSaved && !skippedAllowance) {
              pager.current?.scrollTo({ x: width, animated: true });
              setPage(1);
              return;
            }
            if (next !== page) {
              Keyboard.dismiss();
              setPage(next);
            }
            setSettledPage(next);
          }}
          style={{ flex: 1 }}
          contentContainerStyle={{ width: width * 3 }}
        >
          <View style={[styles.page, { width }]}>
            <View style={[styles.copy, { paddingTop: Math.max(16, height * 0.02) }]}>
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
                    {Platform.OS === "android" ? <Text maxFontSizeMultiplier={1.2} style={styles.materialIcon}>{item.icon.android}</Text> : <SymbolView name={item.icon as never} tintColor={WHITE} size={16} />}
                    <Text maxFontSizeMultiplier={1.2} style={styles.chipText}>{item.label}</Text>
                  </View>
                ))}
              </Reanimated.View>
            </View>
            <View style={styles.pageOneCoinSlot} onLayout={onCoinSlotLayout(0)} />
          </View>

          <View style={[styles.page, styles.allowancePage, keyboardVisible && styles.allowancePageKeyboard, { width }]}>
            <Pressable pointerEvents="box-only" onPress={Keyboard.dismiss} style={StyleSheet.absoluteFill} />
            <View style={[styles.allowanceHeading, keyboardVisible && styles.allowanceHeadingCompact]}>
              <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit style={[styles.allowanceHeadline, { maxWidth: width - 64 - 48 }]}>Set Your Allowance</Text>
              <View style={[styles.headerCoinSlot, compactHeaderCoin && styles.headerCoinSlotCompact]} onLayout={onCoinSlotLayout(1, 24, 0)} />
            </View>
            {showSubtitle ? <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.allowanceSubtitle}>You can change this anytime in Settings.</Text> : null}
            <View style={styles.allowanceBody}>
              <View style={[styles.allowanceCard, keyboardVisible && styles.allowanceCardKeyboard]}>
                <Pressable style={[styles.amountLine, keyboardVisible && styles.amountLineCompact]} onPress={() => amountInput.current?.focus()}>
                  <Text maxFontSizeMultiplier={1.2} style={[styles.currencySign, keyboardVisible && styles.currencySignCompact]}>₱</Text>
                  <TextInput ref={amountInput} value={formattedAmount} selection={amountSelection} onSelectionChange={(event) => setAmountSelection(event.nativeEvent.selection)} onChangeText={(value) => { const raw = normalizeAllowanceInput(value); const significantBefore = value.slice(0, amountSelection.start).replace(/[^0-9.]/g, "").length; const formatted = formatAllowanceInput(raw); let cursor = 0; let seen = 0; while (cursor < formatted.length && seen < significantBefore) { if (/[0-9.]/.test(formatted[cursor])) seen += 1; cursor += 1; } setAmount(raw); setAmountSelection({ start: cursor, end: cursor }); }} keyboardType="decimal-pad" inputMode="decimal" maxLength={14} selectionColor="#CFE6FF" cursorColor="#FFFFFF" placeholder="0" placeholderTextColor="rgba(255,255,255,0.5)" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} blurOnSubmit style={[styles.amountInput, { width: Math.min(width - 160, Math.max(48, formattedAmount.length * amountFontSize * 0.58 + 12)), fontSize: amountFontSize, lineHeight: amountFontSize + 8 }]} maxFontSizeMultiplier={1.2} />
                </Pressable>
                <View style={[styles.periodPill, keyboardVisible && styles.periodPillCompact]} onLayout={(event) => setPeriodWidth(event.nativeEvent.layout.width)}>
                  <Reanimated.View pointerEvents="none" style={[styles.periodIndicator, periodIndicatorStyle]} />
                  {(["weekly", "biweekly", "monthly"] as Period[]).map((value) => {
                    const active = period === value;
                    return <Pressable key={value} onPress={() => { setPeriod(value); void Haptics.selectionAsync(); }} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.periodOption, keyboardVisible && styles.periodOptionCompact]}>
                      <Text maxFontSizeMultiplier={1.2} style={[styles.periodText, active && styles.periodTextActive]}>{value === "biweekly" ? "Every 2 weeks" : value === "weekly" ? "Weekly" : "Monthly"}</Text>
                    </Pressable>;
                  })}
                </View>
                <View style={[styles.dateRow, keyboardVisible && styles.dateRowCompact]}>
                  <Text maxFontSizeMultiplier={1.2} style={styles.dateLabel}>Start date</Text>
                  <View style={styles.dateControl} onTouchStart={() => Keyboard.dismiss()}><DateField label="Start date" accessibilityLabel="Change start date" compact value={startDate} onChange={setStartDate} maxFontSizeMultiplier={1.2} /></View>
                </View>
                <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[styles.helper, keyboardVisible && styles.helperCompact]}>{showHelperDetail ? `Ends ${formatDate(endDate, false)} · About ${formatMoney(perDay, "PHP")} per day` : `Ends ${formatDate(endDate, false)}`}</Text>
              </View>
              {showQuickAmounts ? <View style={styles.quickAmounts}>
                {[5000, 10000, 15000, 20000].map((value) => <Pressable key={value} onPress={() => { const next = String(value); setAmount(next); const nextDisplayLength = formatAllowanceInput(next).length; setAmountSelection({ start: nextDisplayLength, end: nextDisplayLength }); }} style={styles.quickChip}><Text maxFontSizeMultiplier={1.2} style={styles.quickText}>₱{value.toLocaleString("en-PH")}</Text></Pressable>)}
              </View> : null}
            </View>
            {!!error && <Text maxFontSizeMultiplier={1.2} style={styles.error}>{error}</Text>}
          </View>

          <View style={[styles.page, styles.welcomePage, { width }]}>
            <View style={styles.welcomeStack} onLayout={onWelcomeStackLayout}>
              <View style={styles.welcomeVisual}>
                <View style={styles.welcomeCoinSlot} />
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
        </Reanimated.ScrollView>


        <Reanimated.View pointerEvents="none" style={[styles.sharedCoin, sharedCoinStyle]}>
          <Reanimated.View style={[styles.sharedRing, ringStyle]} />
          <Image source={COIN} contentFit="contain" style={styles.sharedCoinImage} accessibilityLabel="3D peso coin" />
          <Reanimated.View style={[styles.sharedShadow, shadowStyle]}><Svg width="100%" height="100%" viewBox="0 0 100 20"><Defs><RadialGradient id="sharedCoinContact" cx="50%" cy="50%" rx="50%" ry="50%"><Stop offset="0" stopColor="#050F32" stopOpacity="0.35" /><Stop offset="1" stopColor="#050F32" stopOpacity="0" /></RadialGradient></Defs><Ellipse cx="50" cy="10" rx="50" ry="10" fill="url(#sharedCoinContact)" /></Svg></Reanimated.View>
          <Reanimated.View style={[styles.confetti, confettiStyle]}>{[[0,-42], [34,-22], [-38,-14], [45,22], [-48,34], [4,48]].map(([x,y],i) => <View key={i} style={[styles.confettiDot, { transform: [{ translateX: x }, { translateY: y }] }]} />)}</Reanimated.View>
        </Reanimated.View>
      </View>

      <View style={[styles.bottom, { paddingBottom: page === 1 && keyboardVisible ? 12 : insets.bottom + 16, marginBottom: keyboardVisible && Platform.OS === "ios" ? Math.max(0, keyboardHeight - insets.bottom) : 0 }]}>
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
          <Reanimated.View entering={page === 0 && !reducedMotion ? FadeInUp.duration(500).delay(320) : undefined}>
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
              style={[styles.cta, buttonAnimatedStyle]}
            >
              <Text maxFontSizeMultiplier={1.2} style={styles.ctaText}>{page === 0 ? "Get Started" : "Start Tracking"}</Text>
              <View style={styles.arrowCircle}><SymbolView name={{ ios: "arrow.right", android: "arrow_forward", web: "arrow_right" }} tintColor={BLUE} size={17} /></View>
            </AnimatedPressable>
          </Reanimated.View>
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
  pageOneCoinSlot: { flex: 1, minHeight: 0, marginVertical: 16 },
  allowancePage: { paddingTop: 8, paddingBottom: 0, gap: 0 },
  allowancePageKeyboard: { paddingTop: 0 },
  allowanceBody: { flex: 1, justifyContent: "center", gap: 12, minHeight: 0 },
  allowanceCard: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 28, padding: 20, borderWidth: 0, gap: 8 },
  allowanceCardKeyboard: { paddingVertical: 12, gap: 4 },
  allowanceHeading: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
  allowanceHeadingCompact: { height: 48 },
  allowanceHeadline: { color: WHITE, fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 34, lineHeight: 40, flex: 1 },
  headerCoinSlot: { width: 64, height: 64, flexShrink: 0 },
  headerCoinSlotCompact: { width: 48, height: 48 },
  allowanceSubtitle: { color: "rgba(255,255,255,0.9)", fontFamily: "IBMPlexSans_400Regular", fontSize: 14, lineHeight: 16 },
  dateRow: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: 10 },
  dateRowCompact: { minHeight: 30 },
  dateLabel: { color: WHITE, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14, width: 78 },
  dateControl: { flex: 1, alignSelf: "center" },
  amountLine: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center", minHeight: 96, marginTop: 24, marginBottom: 24 },
  amountLineCompact: { minHeight: 60, marginTop: 0, marginBottom: 2 },
  currencySign: { color: WHITE, fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 40, lineHeight: 44, marginTop: 2, marginRight: 6 },
  amountInput: { flexGrow: 0, flexShrink: 1, minWidth: 42, color: WHITE, textAlign: "center", fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 72, lineHeight: 80, includeFontPadding: false, padding: 0 },
  allowancePageKeyboardAmount: { fontSize: 48, lineHeight: 52 },
  currencySignCompact: { fontSize: 31, lineHeight: 36, marginTop: 1 },
  periodPill: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, padding: 4, gap: 2 },
  periodPillCompact: { padding: 2 },
  periodOption: { flex: 1, minHeight: 34, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  periodOptionCompact: { minHeight: 28 },
  periodIndicator: { position: "absolute", top: 4, bottom: 4, left: 4, backgroundColor: WHITE, borderRadius: 999 },
  periodText: { color: WHITE, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 11 },
  periodTextActive: { color: BLUE },
  helper: { color: "rgba(255,255,255,0.9)", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13, lineHeight: 16, textAlign: "center", marginTop: 12, marginBottom: 4 },
  helperCompact: { fontSize: 12, lineHeight: 14, marginVertical: 2 },
  quickAmounts: { height: 32, flexDirection: "row", flexWrap: "nowrap", justifyContent: "space-between", gap: 5 },
  quickChip: { flex: 1, minWidth: 0, height: 32, paddingHorizontal: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", justifyContent: "center", alignItems: "center" },
  quickText: { color: WHITE, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 12 },
  error: { color: "#FFE0E0", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  welcomePage: { alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  welcomeStack: { width: "100%", alignItems: "center", justifyContent: "center" },
  welcomeVisual: { width: 230, height: 236, alignItems: "center", justifyContent: "flex-start", overflow: "hidden" },
  welcomeCoinSlot: { width: 230, height: 236 },
  ring: { position: "absolute", top: 22, width: 176, height: 176, borderRadius: 999, borderWidth: 3, borderColor: "rgba(142,197,255,0.35)", backgroundColor: "rgba(142,197,255,0.05)" },
  confetti: { position: "absolute", top: 0, width: 220, height: 220, alignItems: "center", justifyContent: "center" },
  confettiDot: { position: "absolute", width: 7, height: 7, borderRadius: 4, backgroundColor: SKY },
  sharedCoin: { zIndex: 3, alignItems: "center", justifyContent: "center", overflow: "visible" },
  sharedCoinImage: { width: "100%", height: "100%" },
  sharedRing: { position: "absolute", width: "82%", height: "82%", borderRadius: 999, borderWidth: 3, borderColor: "rgba(142,197,255,0.35)", backgroundColor: "rgba(142,197,255,0.05)" },
  sharedShadow: { position: "absolute", bottom: -8, width: "70%", height: 16 },

  welcomeCopy: { width: "100%", alignItems: "center", paddingHorizontal: 8, marginTop: 32 },
  welcomeHeadline: { color: WHITE, fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 40, lineHeight: 46, textAlign: "center" },
  welcomeBrand: { color: "#CFE6FF", fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 50, lineHeight: 56, textAlign: "center" },
  welcomeSubtitle: { color: "rgba(255,255,255,0.9)", fontFamily: "IBMPlexSans_400Regular", fontSize: 16, lineHeight: 22, textAlign: "center", marginTop: 12 },
  bottom: { paddingHorizontal: 24, paddingTop: 8, zIndex: 4 },
  noLogin: { minHeight: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginBottom: 12 },
  noLoginText: { color: "rgba(255,255,255,0.9)", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15, textAlign: "center" },
  cta: { height: 64, borderRadius: 999, backgroundColor: WHITE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, shadowColor: "#061747", shadowOpacity: 0.2, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  ctaDisabled: { backgroundColor: "rgba(255,255,255,0.35)" },
  ctaDisabledText: { color: WHITE },
  ctaText: { color: BLUE, fontFamily: "IBMPlexSans_700Bold", fontSize: 17 },
  arrowCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "rgba(30,64,175,0.3)", alignItems: "center", justifyContent: "center" },
});