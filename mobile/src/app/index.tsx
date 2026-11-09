import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { SymbolView } from "expo-symbols";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Animated as RNAnimated, Easing as RNEasing, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Reanimated, { Easing, FadeInDown, FadeInLeft, FadeInRight, FadeOutLeft, FadeOutRight, interpolateColor, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle, G, Path } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import {
  getAllTransactions,
  getCycles,
  getRecentTransactions,
  getSettings,
  type RecentTransaction,
} from "@/data/repository";
import { pickCurrentCycle, summarizeCycle, type CycleSummary } from "@/domain/allowance";
import { formatDate, formatTime, manilaToday } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import type { AppSettings } from "@/domain/types";

type Dashboard = {
  summary: CycleSummary;
  cycleName: string;
  startDate: string;
  endDate: string;
};

type WalletSymbolName = ComponentProps<typeof SymbolView>["name"];

const AnimatedPath = Reanimated.createAnimatedComponent(Path);
const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

const TH = 56;
const R = 24;
const SR = 40;
const C = 28;
const SVG_PAD = 16;
const SHEET_GAP = 12;
const RING_SIZE = 240;
const RING_STROKE = 14;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function buildPath(p: number, W: number, H: number) {
  "worklet";
  const q = Math.min(1, Math.max(0, p));
  const top = SVG_PAD;
  const tabBottom = top + TH;
  const half = W / 2;
  const x = q * half;
  const flareLeft = R * q;
  const flareRight = R * (1 - q);
  const sheetLeft = SR * q;
  const sheetRight = SR * (1 - q);
  const bottom = Math.max(tabBottom + 80, H - SHEET_GAP);
  const corner = 12;
  return [
    "M 0 " + (bottom - corner),
    "L 0 " + (tabBottom + sheetLeft),
    "Q 0 " + (tabBottom + sheetLeft * 0.45) + " " + sheetLeft + " " + tabBottom,
    "L " + (x - flareLeft) + " " + tabBottom,
    "Q " + (x - flareLeft) + " " + tabBottom + " " + x + " " + (tabBottom - flareLeft),
    "L " + x + " " + (top + C),
    "Q " + x + " " + top + " " + (x + C) + " " + top,
    "L " + (x + half - C) + " " + top,
    "Q " + (x + half) + " " + top + " " + (x + half) + " " + (top + C),
    "L " + (x + half) + " " + (tabBottom - flareRight),
    "Q " + (x + half + flareRight) + " " + tabBottom + " " + (x + half) + " " + tabBottom,
    "L " + (W - sheetRight) + " " + tabBottom,
    "Q " + W + " " + (tabBottom + sheetRight * 0.45) + " " + W + " " + (tabBottom + sheetRight),
    "L " + W + " " + (bottom - corner),
    "Q " + W + " " + bottom + " " + (W - corner) + " " + bottom,
    "L " + corner + " " + bottom,
    "Q 0 " + bottom + " 0 " + (bottom - corner),
    "Z",
  ].join(" ");
}
function categorySymbol(category: string): WalletSymbolName {
  const value = category.toLowerCase();
  if (value.includes("food")) return { ios: "fork.knife", android: "restaurant", web: "restaurant" };
  if (value.includes("transport")) return { ios: "bus", android: "directions_bus", web: "directions_bus" };
  if (value.includes("school")) return { ios: "book", android: "school", web: "school" };
  if (value.includes("bill")) return { ios: "receipt", android: "receipt_long", web: "receipt_long" };
  if (value.includes("personal")) return { ios: "person", android: "person", web: "person" };
  return { ios: "wallet.pass", android: "account_balance_wallet", web: "account_balance_wallet" };
}

function StaggeredRow({ index, children }: { index: number; children: ReactNode }) {
  return <Reanimated.View entering={FadeInDown.duration(240).delay(index * 50)}>{children}</Reanimated.View>;
}

export default function HomeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sheetTab, setSheetTab] = useState<"activity" | "insight">("activity");
  const [contentDirection, setContentDirection] = useState<1 | -1>(1);
  const progress = useSharedValue(0);
  const stageWidth = Math.max(0, width - SHEET_GAP * 2);
  const stageHeight = Math.max(360, height - insets.top - 202 - SHEET_GAP);
  const animatedPathProps = useAnimatedProps(() => ({ d: buildPath(progress.value, stageWidth, stageHeight + SHEET_GAP) }));
  const activityLabelStyle = useAnimatedStyle(() => ({ color: interpolateColor(progress.value, [0, 1], ["#1E40AF", "#FFE88A"]) }));
  const insightLabelStyle = useAnimatedStyle(() => ({ color: interpolateColor(progress.value, [0, 1], ["#FFE88A", "#1E40AF"]) }));
  const sheetEntrance = useRef(new RNAnimated.Value(0)).current;

  const balanceProgress = useRef(new RNAnimated.Value(0)).current;
  const balanceLabelOpacity = useRef(new RNAnimated.Value(0)).current;
  const [animatedRemaining, setAnimatedRemaining] = useState(0);
  const ringProgress = useSharedValue(0);
  const shimmerProgress = useSharedValue(0);
  const ringHeadPulse = useSharedValue(1);
  const ringAnimatedProps = useAnimatedProps(() => {
    const raw = ringProgress.value;
    const visible = raw > 0 && raw < 0.012 ? 0.012 : raw;
    return { strokeDashoffset: RING_CIRCUMFERENCE * (1 - visible) };
  });
  const shimmerAnimatedProps = useAnimatedProps(() => {
    const raw = ringProgress.value;
    const visible = raw > 0 && raw < 0.012 ? 0.012 : raw;
    const segment = Math.min(RING_CIRCUMFERENCE * 0.1, RING_CIRCUMFERENCE * visible);
    const travel = Math.max(0, RING_CIRCUMFERENCE * visible - segment);
    return {
      strokeDasharray: [segment, RING_CIRCUMFERENCE],
      strokeDashoffset: RING_CIRCUMFERENCE * (1 - visible) - travel * shimmerProgress.value,
      opacity: raw > 0 ? 0.8 : 0,
    };
  });
  const ringHeadProps = useAnimatedProps(() => {
    const angle = ringProgress.value * Math.PI * 2;
    const radius = RING_RADIUS;
    return {
      cx: RING_SIZE / 2 + Math.cos(angle) * radius,
      cy: RING_SIZE / 2 + Math.sin(angle) * radius,
      r: 5.5 * ringHeadPulse.value,
      opacity: ringProgress.value > 0 ? 1 : 0,
    };
  });

  useEffect(() => {
    RNAnimated.spring(sheetEntrance, { toValue: 1, damping: 19, stiffness: 115, mass: 0.9, useNativeDriver: true }).start();
    return () => { sheetEntrance.stopAnimation(); };
  }, [sheetEntrance]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        setLoading(true);
        setLoadError(false);
        try {
          const [recent, cycles, allTransactions, appSettings] = await Promise.all([
            getRecentTransactions(db),
            getCycles(db),
            getAllTransactions(db),
            getSettings(db),
          ]);
          const current = pickCurrentCycle(cycles, manilaToday());
          if (!active) return;
          setTransactions(recent);
          setSettings(appSettings);
          setDashboard(current ? {
            summary: summarizeCycle(current.cycle, allTransactions, manilaToday()),
            cycleName: current.cycle.name,
            startDate: current.cycle.startDate,
            endDate: current.cycle.endDate,
          } : null);
        } catch (error) {
          console.error("Failed to load Gastador dashboard:", error);
          if (active) setLoadError(true);
        } finally {
          if (active) setLoading(false);
        }
      }
      void load();
      return () => { active = false; };
    }, [db]),
  );

  const currency = settings?.currency ?? "PHP";
  const summary = dashboard?.summary;
  const remaining = summary?.remainingCentavos ?? 0;
  const spendable = summary?.spendableCentavos ?? 0;
  const rawSpentPercent = spendable > 0 ? Math.max(0, (summary!.spentCentavos / spendable) * 100) : 0;
  const spentPercent = Math.min(100, rawSpentPercent);
  const formattedBalance = formatMoney(summary ? (remaining < 0 ? -animatedRemaining : animatedRemaining) : 0, currency);
  const balanceFirstDigit = formattedBalance.search(/\d/);
  const balancePrefix = balanceFirstDigit >= 0 ? formattedBalance.slice(0, balanceFirstDigit) : "";
  const balanceDigits = balanceFirstDigit >= 0 ? formattedBalance.slice(balanceFirstDigit) : formattedBalance;
  const balanceSign = /^[−-]/.test(balancePrefix.trim()) ? balancePrefix.trim().slice(0, 1) : "";
  const balanceCurrencySymbol = balancePrefix.replace(balanceSign, "").trim();
  const hasAllowance = Boolean(summary);
  const insightSpent = summary?.spentCentavos ?? 0;
  const insightLeft = summary?.remainingCentavos ?? 0;
  const insightDailyLimit = summary?.plannedDailyCentavos ?? 0;
  const insightStatus = rawSpentPercent > 100
    ? "You’ve gone over your allowance."
    : rawSpentPercent > 80
      ? "Careful, you’ve used most of your allowance."
      : "You’re on track. Keep it up!";

  useEffect(() => {
    if (loading) return;
    const listener = balanceProgress.addListener(({ value }) => setAnimatedRemaining(Math.round(value)));
    balanceProgress.setValue(0);
    balanceLabelOpacity.setValue(0);
    RNAnimated.parallel([
      RNAnimated.timing(balanceProgress, { toValue: Math.abs(remaining), duration: 850, easing: RNEasing.out(RNEasing.cubic), useNativeDriver: false }),
      RNAnimated.timing(balanceLabelOpacity, { toValue: 1, duration: 420, easing: RNEasing.out(RNEasing.quad), useNativeDriver: true }),
    ]).start();
    return () => { balanceProgress.removeListener(listener); balanceProgress.stopAnimation(); balanceLabelOpacity.stopAnimation(); };
  }, [balanceProgress, loading, remaining]);

  useEffect(() => {
    ringProgress.value = withSpring(hasAllowance ? spentPercent / 100 : 0, { damping: 16, stiffness: 90, mass: 0.8 });
  }, [hasAllowance, ringProgress, spentPercent]);

  useEffect(() => {
    shimmerProgress.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1, false);
    ringHeadPulse.value = withRepeat(withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [ringHeadPulse, shimmerProgress]);

  const switchSheetTab = useCallback((next: "activity" | "insight") => {
    if (next === sheetTab) return;
    const target = next === "insight" ? 1 : 0;
    setContentDirection(next === "insight" ? 1 : -1);
    setSheetTab(next);
    progress.value = withTiming(target, { duration: 320, easing: Easing.inOut(Easing.cubic) });
  }, [progress, sheetTab]);

  const displayPercent = rawSpentPercent === 0
    ? "0%"
    : rawSpentPercent >= 10
      ? `${Math.round(rawSpentPercent)}%`
      : rawSpentPercent >= 1
        ? `${rawSpentPercent.toFixed(1)}%`
        : `${rawSpentPercent.toFixed(2)}%`;
  const ringColor = rawSpentPercent > 100 ? "#F87171" : rawSpentPercent > 80 ? "#F59E0B" : "#2563EB";

  return (
    <>
    <StatusBar style="light" />
    <View style={styles.screen}>
      <View style={styles.blueHeader}>
        <View style={[styles.topLine, { paddingTop: insets.top + 8 }]}>
          <ThemedText style={styles.walletTitle}>Wallet</ThemedText>
          <View style={styles.headerActions}>
            <View accessibilityLabel="Notifications" style={styles.notificationButton}>
              <SymbolView name={{ ios: "bell.badge", android: "notifications", web: "notifications" }} tintColor="#2563EB" size={19} />
            </View>
          </View>
        </View>
        <View style={styles.balanceBlock}>
          <RNAnimated.Text style={[styles.balanceLabel, { opacity: balanceLabelOpacity }]}>Available to spend</RNAnimated.Text>
          <RNAnimated.Text style={styles.balanceAmount}>
            {balanceSign ? <Text style={styles.balanceSign}>{balanceSign}</Text> : null}
            {balanceCurrencySymbol ? <Text style={styles.pesoSign}>{balanceCurrencySymbol}</Text> : null}
            {balanceDigits}
          </RNAnimated.Text>
        </View>
      </View>

      <View style={styles.sheetStage}>
        <Svg width={stageWidth} height={stageHeight + 40} style={styles.shapeSvg}>
          <AnimatedPath animatedProps={animatedPathProps} fill="rgba(30,64,175,0.05)" transform="translate(0 -8)" />
          <AnimatedPath animatedProps={animatedPathProps} fill="rgba(30,64,175,0.10)" transform="translate(0 -3)" />
          <AnimatedPath animatedProps={animatedPathProps} fill="#FFFFFF" />
        </Svg>
        <View style={styles.shapeTabLabels}>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: sheetTab === "activity" }} onPress={() => switchSheetTab("activity")} style={styles.sheetTab}>
            <Reanimated.Text style={[styles.sheetTabText, activityLabelStyle]}>Activity</Reanimated.Text>
          </Pressable>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: sheetTab === "insight" }} onPress={() => switchSheetTab("insight")} style={styles.sheetTab}>
            <Reanimated.Text style={[styles.sheetTabText, insightLabelStyle]}>Insight</Reanimated.Text>
          </Pressable>
        </View>
        <RNAnimated.View style={[styles.sheetContentHost, { opacity: sheetEntrance, transform: [{ translateY: sheetEntrance.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
        <ScrollView style={styles.contentScroll} contentContainerStyle={[styles.contentScrollInner, { paddingBottom: insets.bottom + 92 }]} showsVerticalScrollIndicator={false}>
        <Reanimated.View
          key={sheetTab}
          entering={(contentDirection === 1 ? FadeInLeft : FadeInRight).duration(180).delay(50)}
          exiting={(contentDirection === 1 ? FadeOutRight : FadeOutLeft).duration(140)}
        >
        {sheetTab === "activity" ? (
        <>
        <View style={styles.sectionHeader}>
          <View>
            <ThemedText style={styles.sectionTitle}>Recent expenses</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>Your latest spending activity</ThemedText>
          </View>
          <View style={styles.sectionHeaderActions}>
            <Pressable onPress={() => router.push("/explore")} accessibilityRole="button" accessibilityLabel="View all activity" hitSlop={10}>
              <ThemedText style={[styles.link, { color: "#2563EB" }]}>See all ↗</ThemedText>
            </Pressable>
            <Pressable onPress={() => router.push("/new-expense")} accessibilityRole="button" accessibilityLabel="Add expense" hitSlop={8} style={({ pressed }) => [styles.addExpenseButton, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
              <SymbolView name={{ ios: "plus", android: "add", web: "add" }} tintColor="#2563EB" size={19} />
            </Pressable>
          </View>
        </View>

        {loadError ? (
          <ThemedText style={styles.emptyText}>We couldn't load your expenses. Please try again.</ThemedText>
        ) : loading ? (
          <ThemedText style={styles.emptyText}>Loading expenses…</ThemedText>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><SymbolView name={{ ios: "receipt", android: "receipt_long", web: "receipt_long" }} tintColor="#2563EB" size={22} /></View>
            <ThemedText style={styles.emptyTitle}>No expenses yet</ThemedText>
            <ThemedText style={styles.emptyText}>Add an expense or scan a receipt to see it here.</ThemedText>
            <Pressable onPress={() => router.push("/new-expense")} style={styles.emptyButton}>
              <ThemedText style={styles.emptyButtonText}>Add your first expense</ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.transactionList}>
            {transactions.map((item, index) => (
              <StaggeredRow key={item.id} index={index}><View style={[styles.transactionRow, index < transactions.length - 1 && styles.rowDivider]}>
                <View style={styles.categoryIcon}>
                  <SymbolView name={categorySymbol(item.categoryName)} tintColor="#2563EB" size={19} />
                </View>
                <View style={styles.transactionInfo}>
                  <ThemedText style={styles.transactionName} numberOfLines={1}>{item.merchant || "Expense"}</ThemedText>
                  <ThemedText style={styles.transactionMeta} numberOfLines={1}>{item.categoryName} · {formatDate(item.date, false)}, {formatTime(item.occurredAt)}</ThemedText>
                </View>
                <ThemedText style={styles.transactionAmount}>−{formatMoney(item.amountCentavos, currency)}</ThemedText>
              </View></StaggeredRow>
            ))}
          </View>
        )}
        </>
        ) : (
          <View style={styles.insightContent}>
            <StaggeredRow index={0}>
              <View style={styles.ringWrap}>
                <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
                  <G rotation={-90} origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}>
                    <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke="#BFDBFE" strokeWidth={RING_STROKE} fill="none" />
                    {hasAllowance && rawSpentPercent > 0 ? (
                      <>
                        <AnimatedCircle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke={ringColor} strokeWidth={RING_STROKE} strokeLinecap="round" fill="none" strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`} animatedProps={ringAnimatedProps} />
                        <AnimatedCircle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke="#93C5FD" strokeWidth={RING_STROKE} strokeLinecap="round" fill="none" animatedProps={shimmerAnimatedProps} />
                        <AnimatedCircle cx={RING_SIZE / 2} cy={RING_SIZE / 2} fill="#FFFFFF" stroke={ringColor} strokeWidth={3} animatedProps={ringHeadProps} />
                      </>
                    ) : null}
                  </G>
                </Svg>
                <View pointerEvents="none" style={styles.ringCenter}>
                  {hasAllowance ? (
                    <>
                      <ThemedText style={[styles.ringPercent, { color: ringColor }]}>{displayPercent}</ThemedText>
                      <ThemedText style={styles.ringLabel}>of allowance spent</ThemedText>
                    </>
                  ) : (
                    <ThemedText style={styles.noAllowanceText}>No allowance tracked.</ThemedText>
                  )}
                </View>
              </View>
            </StaggeredRow>
            {hasAllowance ? (
            <>
            <View style={styles.insightStatsRow}>
              <Reanimated.View style={styles.insightStatSlot} entering={FadeInDown.duration(240).delay(50)}>
                <View style={styles.insightStatChip}>
                  <ThemedText style={styles.insightStatValue}>{formatMoney(insightSpent, currency)}</ThemedText>
                  <ThemedText style={styles.insightStatLabel}>Spent</ThemedText>
                </View>
              </Reanimated.View>
              <Reanimated.View style={styles.insightStatSlot} entering={FadeInDown.duration(240).delay(100)}>
                <View style={styles.insightStatChip}>
                  <ThemedText style={styles.insightStatValue}>{formatMoney(insightLeft, currency)}</ThemedText>
                  <ThemedText style={styles.insightStatLabel}>Left</ThemedText>
                </View>
              </Reanimated.View>
              <Reanimated.View style={styles.insightStatSlot} entering={FadeInDown.duration(240).delay(150)}>
                <View style={styles.insightStatChip}>
                  <ThemedText style={styles.insightStatValue}>{formatMoney(insightDailyLimit, currency)}</ThemedText>
                  <ThemedText style={styles.insightStatLabel}>Daily limit</ThemedText>
                </View>
              </Reanimated.View>
            </View>
            <StaggeredRow index={4}>
              <View style={styles.insightStatusPill}>
                <SymbolView name={{ ios: "info.circle", android: "info", web: "info" }} tintColor="#2563EB" size={16} />
                <ThemedText style={styles.insightStatusText}>{insightStatus}</ThemedText>
              </View>
            </StaggeredRow>
            </>
            ) : null}
          </View>
        )}
        </Reanimated.View>
        </ScrollView>
        </RNAnimated.View>
      </View>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#2563EB" },
  blueHeader: { paddingHorizontal: 24, paddingTop: 0, paddingBottom: 16 },
  topLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  notificationButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#EAF3FF", alignItems: "center", justifyContent: "center" },
  walletTitle: { color: "#FFFFFF", fontFamily: "IBMPlexSans_700Bold", fontSize: 22, lineHeight: 29 },
  balanceBlock: { minHeight: 132, alignItems: "center", justifyContent: "center", gap: 7 },
  balanceLabel: { color: "rgba(255,255,255,0.85)", textAlign: "center", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 16, lineHeight: 22, marginBottom: 0 },
  balanceAmount: { color: "#FFFFFF", textAlign: "center", fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 64, lineHeight: 84, letterSpacing: -1.5, includeFontPadding: false },
  balanceSign: { color: "#FFFFFF", fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 35, lineHeight: 84, includeFontPadding: false, verticalAlign: "top" },
  pesoSign: { color: "#FFFFFF", fontFamily: "IBMPlexSans_800ExtraBold", fontWeight: "800", fontSize: 35, lineHeight: 84, includeFontPadding: false, verticalAlign: "top" },
  sheetStage: { flex: 1, minHeight: 360, marginHorizontal: SHEET_GAP, marginBottom: SHEET_GAP, backgroundColor: "#2563EB", borderRadius: 12, overflow: "hidden" },
  shapeSvg: { position: "absolute", top: 0, left: 0, zIndex: 0 },
  shapeTabLabels: { position: "absolute", top: SVG_PAD, left: 0, right: 0, height: TH, flexDirection: "row", zIndex: 2 },
  sheetContentHost: { position: "absolute", top: SVG_PAD + TH + 24, left: 0, right: 0, bottom: 0, zIndex: 1 },
  contentScroll: { flex: 1, backgroundColor: "transparent" },
  contentScrollInner: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 0 },
  sheetTab: { flex: 1, height: TH, alignItems: "center", justifyContent: "center" },
  sheetTabText: { fontFamily: "IBMPlexSans_700Bold", fontSize: 16, lineHeight: 22 },
  insightContent: { flexGrow: 1, width: "100%", alignItems: "center", justifyContent: "center", paddingTop: 0, paddingBottom: 24, gap: 18 },
  noAllowanceText: { color: "#6B7280", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 18, lineHeight: 25, textAlign: "center", maxWidth: 150 },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" },
  ringCenter: { position: "absolute", width: RING_SIZE - 52, minHeight: 92, alignItems: "center", justifyContent: "center" },
  ringPercent: { fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 40, lineHeight: 54, textAlign: "center" },
  ringLabel: { color: "#6B7280", fontFamily: "IBMPlexSans_400Regular", fontSize: 13, lineHeight: 18, textAlign: "center" },
  insightStatsRow: { width: "100%", flexDirection: "row", gap: 12 },
  insightStatSlot: { flex: 1, minWidth: 0 },
  insightStatChip: { flex: 1, minWidth: 0, minHeight: 72, borderRadius: 16, backgroundColor: "#F3F7FF", alignItems: "center", justifyContent: "center", paddingHorizontal: 5, paddingVertical: 10, gap: 3 },
  insightStatValue: { color: "#1E40AF", fontFamily: "IBMPlexSans_700Bold", fontSize: 17, lineHeight: 23, textAlign: "center" },
  insightStatLabel: { color: "#6B7280", fontFamily: "IBMPlexSans_400Regular", fontSize: 12, lineHeight: 17 },
  insightStatusPill: { width: "100%", minHeight: 48, borderRadius: 999, backgroundColor: "#EAF3FF", paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  insightStatusText: { flex: 1, color: "#1E40AF", fontFamily: "IBMPlexSans_400Regular", fontSize: 14, lineHeight: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 17 },
  sectionHeaderActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  addExpenseButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#EAF3FF", alignItems: "center", justifyContent: "center" },
  sectionTitle: { color: "#202A35", fontFamily: "IBMPlexSans_700Bold", fontSize: 22, lineHeight: 30 },
  sectionSubtitle: { color: "#6B7280", fontFamily: "IBMPlexSans_400Regular", fontSize: 15, lineHeight: 21, marginTop: 4 },
  link: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15, lineHeight: 21 },
  transactionList: { marginTop: 2 },
  transactionRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#D9DEE2" },
  categoryIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#EAF3FF", alignItems: "center", justifyContent: "center" },
  transactionInfo: { flex: 1, gap: 3 },
  transactionName: { color: "#202A35", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15, lineHeight: 21 },
  transactionMeta: { color: "#6B7280", fontFamily: "IBMPlexSans_400Regular", fontSize: 13, lineHeight: 18 },
  transactionAmount: { color: "#202A35", fontFamily: "IBMPlexSans_700Bold", fontSize: 16, lineHeight: 22 },
  emptyState: { alignItems: "center", paddingVertical: 22, gap: 7 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#EAF3FF", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { color: "#202A35", fontFamily: "IBMPlexSans_700Bold", fontSize: 20, lineHeight: 27 },
  emptyText: { color: "#6B7280", fontFamily: "IBMPlexSans_400Regular", fontSize: 15, lineHeight: 21, textAlign: "center" },
  emptyButton: { minHeight: 48, paddingHorizontal: 28, borderRadius: 999, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", marginTop: 8 },
  emptyButtonText: { color: "#FFFFFF", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15, lineHeight: 21 },
});
