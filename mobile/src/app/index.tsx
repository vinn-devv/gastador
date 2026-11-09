import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { SymbolView } from "expo-symbols";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Animated as RNAnimated, Easing as RNEasing, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Reanimated, { Easing, FadeInDown, FadeInLeft, FadeInRight, FadeOutLeft, FadeOutRight, interpolateColor, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

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

const TAB_HEIGHT = 48;
const FLARE_RADIUS = 16;
const SHEET_RADIUS = 32;
const TAB_CORNER = 20;
const SHAPE_HEIGHT = TAB_HEIGHT + SHEET_RADIUS;

function buildPath(p: number, W: number, Hs: number) {
  "worklet";
  const w = W / 2;
  const x = p * w;
  const rl = FLARE_RADIUS * p;
  const rr = FLARE_RADIUS * (1 - p);
  const sl = SHEET_RADIUS * p;
  const sr = SHEET_RADIUS * (1 - p);

  return [
    `M 0 ${Hs}`,
    `L 0 ${TAB_HEIGHT + sl}`,
    `A ${sl} ${sl} 0 0 1 ${sl} ${TAB_HEIGHT}`,
    `L ${x - rl} ${TAB_HEIGHT}`,
    `A ${rl} ${rl} 0 0 0 ${x} ${TAB_HEIGHT - rl}`,
    `L ${x} ${TAB_CORNER}`,
    `A ${TAB_CORNER} ${TAB_CORNER} 0 0 1 ${x + TAB_CORNER} 0`,
    `L ${x + w - TAB_CORNER} 0`,
    `A ${TAB_CORNER} ${TAB_CORNER} 0 0 1 ${x + w} ${TAB_CORNER}`,
    `L ${x + w} ${TAB_HEIGHT - rr}`,
    `A ${rr} ${rr} 0 0 0 ${x + w + rr} ${TAB_HEIGHT}`,
    `L ${W - sr} ${TAB_HEIGHT}`,
    `A ${sr} ${sr} 0 0 1 ${W} ${TAB_HEIGHT + sr}`,
    `L ${W} ${Hs}`,
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
  const { width } = useWindowDimensions();
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sheetTab, setSheetTab] = useState<"activity" | "insight">("activity");
  const [contentDirection, setContentDirection] = useState<1 | -1>(1);
  const progress = useSharedValue(0);
  const animatedPathProps = useAnimatedProps(() => ({ d: buildPath(progress.value, width, SHAPE_HEIGHT) }));
  const activityLabelStyle = useAnimatedStyle(() => ({ color: interpolateColor(progress.value, [0, 1], ["#1E40AF", "#FFE88A"]) }));
  const insightLabelStyle = useAnimatedStyle(() => ({ color: interpolateColor(progress.value, [0, 1], ["#FFE88A", "#1E40AF"]) }));
  const sheetEntrance = useRef(new RNAnimated.Value(0)).current;

  const balanceProgress = useRef(new RNAnimated.Value(0)).current;
  const balanceLabelOpacity = useRef(new RNAnimated.Value(0)).current;
  const [animatedRemaining, setAnimatedRemaining] = useState(0);
  const donutProgress = useSharedValue(0);
  const donutCircumference = 2 * Math.PI * 66;
  const donutAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: donutCircumference * (1 - donutProgress.value),
  }));

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
  const spentPercent = spendable > 0 ? Math.max(0, Math.min(100, (summary!.spentCentavos / spendable) * 100)) : 0;
  const formattedBalance = formatMoney(summary ? (remaining < 0 ? -animatedRemaining : animatedRemaining) : 0, currency);
  const balanceFirstDigit = formattedBalance.search(/\d/);
  const balancePrefix = balanceFirstDigit >= 0 ? formattedBalance.slice(0, balanceFirstDigit) : "";
  const balanceDigits = balanceFirstDigit >= 0 ? formattedBalance.slice(balanceFirstDigit) : formattedBalance;
  const balanceSign = /^[−-]/.test(balancePrefix.trim()) ? balancePrefix.trim().slice(0, 1) : "";
  const balanceCurrencySymbol = balancePrefix.replace(balanceSign, "").trim();
  const hasInsightExpenses = Boolean(summary && summary.spentCentavos > 0);
  const insightPercent = hasInsightExpenses ? Math.round(spentPercent) : 0;
  const insightSpent = summary?.spentCentavos ?? 0;
  const insightLeft = summary?.remainingCentavos ?? 0;
  const insightDaysLeft = summary?.daysRemaining ?? 0;

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
    if (sheetTab !== "insight") return;
    donutProgress.value = 0;
    donutProgress.value = withTiming(hasInsightExpenses ? spentPercent / 100 : 0, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [donutProgress, hasInsightExpenses, sheetTab, spentPercent]);

  const switchSheetTab = useCallback((next: "activity" | "insight") => {
    if (next === sheetTab) return;
    const target = next === "insight" ? 1 : 0;
    setContentDirection(next === "insight" ? 1 : -1);
    setSheetTab(next);
    progress.value = withTiming(target, { duration: 300, easing: Easing.inOut(Easing.ease) });
  }, [progress, sheetTab]);

  return (
    <>
    <StatusBar style="light" />
    <ScrollView style={[styles.screen, { backgroundColor: "#2563EB" }]} contentContainerStyle={styles.scrollContent}>
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

      <View style={styles.shapeHeader}>
        <Svg width={width} height={SHAPE_HEIGHT}>
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
      </View>
      <RNAnimated.View style={[styles.sheetShadow, { opacity: sheetEntrance, transform: [{ translateY: sheetEntrance.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }) }] }]}>
        <View style={[styles.whiteSheet, { paddingBottom: insets.bottom + 138 }]}>
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
        <ThemedText style={styles.privacyNote}>Your financial records stay on this device.</ThemedText>
        </>
        ) : (
          <View style={styles.insightContent}>
            <StaggeredRow index={0}>
              <View style={styles.donutWrap}>
                <Svg width={160} height={160} viewBox="0 0 160 160">
                  <Circle cx={80} cy={80} r={66} stroke="#EAF3FF" strokeWidth={14} fill="none" />
                  <AnimatedCircle
                    cx={80}
                    cy={80}
                    r={66}
                    stroke="#2563EB"
                    strokeWidth={14}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${donutCircumference} ${donutCircumference}`}
                    animatedProps={donutAnimatedProps}
                    transform="rotate(-90 80 80)"
                  />
                </Svg>
                <View pointerEvents="none" style={styles.donutCenter}>
                  <ThemedText style={styles.donutPercent}>{insightPercent}%</ThemedText>
                  <ThemedText style={styles.donutLabel}>spent</ThemedText>
                </View>
              </View>
            </StaggeredRow>
            <View style={styles.insightStatsRow}>
              <StaggeredRow index={1}>
                <View style={styles.insightStatChip}>
                  <ThemedText style={styles.insightStatValue}>{formatMoney(insightSpent, currency)}</ThemedText>
                  <ThemedText style={styles.insightStatLabel}>Spent</ThemedText>
                </View>
              </StaggeredRow>
              <StaggeredRow index={2}>
                <View style={styles.insightStatChip}>
                  <ThemedText style={styles.insightStatValue}>{formatMoney(insightLeft, currency)}</ThemedText>
                  <ThemedText style={styles.insightStatLabel}>Left</ThemedText>
                </View>
              </StaggeredRow>
              <StaggeredRow index={3}>
                <View style={styles.insightStatChip}>
                  <ThemedText style={styles.insightStatValue}>{insightDaysLeft}</ThemedText>
                  <ThemedText style={styles.insightStatLabel}>Days left</ThemedText>
                </View>
              </StaggeredRow>
            </View>
            {!hasInsightExpenses ? (
              <StaggeredRow index={4}>
                <ThemedText style={styles.insightEmptyCaption}>Add expenses to see your summary.</ThemedText>
              </StaggeredRow>
            ) : null}
          </View>
        )}
        </Reanimated.View>
        </View>
      </RNAnimated.View>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 0, flexGrow: 1 },
  blueHeader: { paddingHorizontal: 23, paddingTop: 0, paddingBottom: 18 },
  topLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  notificationButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#EAF3FF", alignItems: "center", justifyContent: "center" },
  walletTitle: { color: "#FFFFFF", fontFamily: "IBMPlexSans_700Bold", fontSize: 18 },
  balanceBlock: { minHeight: 122, alignItems: "center", justifyContent: "center" },
  balanceLabel: { color: "rgba(255,232,138,0.9)", textAlign: "center", fontFamily: "IBMPlexSans_400Regular", fontSize: 14, lineHeight: 20, marginBottom: 1 },
  balanceAmount: { color: "#FFD54A", textAlign: "center", fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 64, lineHeight: 72, letterSpacing: -2, includeFontPadding: false },
  balanceSign: { color: "#FFD54A", fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 38, lineHeight: 64, includeFontPadding: false, verticalAlign: "top" },
  pesoSign: { color: "#FFD54A", fontFamily: "IBMPlexSans_800ExtraBold", fontWeight: "800", fontSize: 38, lineHeight: 64, includeFontPadding: false, verticalAlign: "top", textShadowColor: "transparent", textShadowRadius: 0 },
  shapeHeader: { height: SHAPE_HEIGHT, backgroundColor: "#2563EB", marginBottom: -1 },
  shapeTabLabels: { position: "absolute", top: 0, left: 0, right: 0, height: TAB_HEIGHT, flexDirection: "row" },
  sheetShadow: { flexGrow: 1, backgroundColor: "transparent", shadowColor: "#000000", shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 10, zIndex: 1 },
  whiteSheet: { flexGrow: 1, backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingTop: 13, paddingBottom: 100, minHeight: 390 },
  sheetTab: { flex: 1, height: TAB_HEIGHT, alignItems: "center", justifyContent: "center" },
  sheetTabText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  insightContent: { alignItems: "center", paddingTop: 8, paddingBottom: 12, gap: 18 },
  donutWrap: { width: 160, height: 160, alignItems: "center", justifyContent: "center" },
  donutCenter: { position: "absolute", alignItems: "center", justifyContent: "center" },
  donutPercent: { color: "#1E40AF", fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 28, lineHeight: 34 },
  donutLabel: { color: "#68747D", fontFamily: "IBMPlexSans_400Regular", fontSize: 11, lineHeight: 15 },
  insightStatsRow: { width: "100%", flexDirection: "row", gap: 12 },
  insightStatChip: { flex: 1, minWidth: 0, minHeight: 68, borderRadius: 16, backgroundColor: "#EAF3FF", alignItems: "center", justifyContent: "center", paddingHorizontal: 5, paddingVertical: 9, gap: 3 },
  insightStatValue: { color: "#1E40AF", fontFamily: "IBMPlexSans_700Bold", fontSize: 16, lineHeight: 21 },
  insightStatLabel: { color: "#68747D", fontFamily: "IBMPlexSans_400Regular", fontSize: 12, lineHeight: 16 },
  insightEmptyCaption: { color: "#68747D", fontFamily: "IBMPlexSans_400Regular", fontSize: 12, textAlign: "center", marginTop: -4 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 17 },
  sectionHeaderActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  addExpenseButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#EAF3FF", alignItems: "center", justifyContent: "center" },
  sectionTitle: { color: "#202A35", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 18 },
  sectionSubtitle: { color: "#68747D", fontFamily: "IBMPlexSans_400Regular", fontSize: 11, marginTop: 2 },
  link: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 12 },
  transactionList: { marginTop: 2 },
  transactionRow: { minHeight: 67, flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#D9DEE2" },
  categoryIcon: { width: 39, height: 39, borderRadius: 20, backgroundColor: "#EAF3FF", alignItems: "center", justifyContent: "center" },
  transactionInfo: { flex: 1, gap: 3 },
  transactionName: { color: "#202A35", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  transactionMeta: { color: "#68747D", fontFamily: "IBMPlexSans_400Regular", fontSize: 10 },
  transactionAmount: { color: "#202A35", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 12 },
  emptyState: { alignItems: "center", paddingVertical: 22, gap: 7 },
  emptyIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#EAF3FF", alignItems: "center", justifyContent: "center", marginBottom: 2 },
  emptyTitle: { color: "#202A35", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15 },
  emptyText: { color: "#68747D", fontFamily: "IBMPlexSans_400Regular", fontSize: 12, textAlign: "center" },
  emptyButton: { minHeight: 43, paddingHorizontal: 18, borderRadius: 22, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", marginTop: 6 },
  emptyButtonText: { color: "#FFFFFF", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 12 },
  privacyNote: { color: "#68747D", fontFamily: "IBMPlexSans_400Regular", fontSize: 10, textAlign: "center", marginTop: 22 },
});
