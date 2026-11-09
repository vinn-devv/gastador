import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { SymbolView } from "expo-symbols";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

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

const ACTIONS: { label: string; sub: string; icon: WalletSymbolName; route: "/new-cycle" | "/new-expense" | "/scan" | "/insights" }[] = [
  { label: "Allowance", sub: "Set or update", icon: { ios: "wallet.pass", android: "account_balance_wallet", web: "account_balance_wallet" }, route: "/new-cycle" as const },
  { label: "Add expense", sub: "Record spending", icon: { ios: "plus", android: "add", web: "add" }, route: "/new-expense" as const },
  { label: "Scan receipt", sub: "Use camera", icon: { ios: "viewfinder", android: "qr_code_scanner", web: "qr_code_scanner" }, route: "/scan" as const },
  { label: "Insights", sub: "See your habits", icon: { ios: "chart.pie", android: "pie_chart", web: "pie_chart" }, route: "/insights" as const },
];

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
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 240, delay: index * 50, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    return () => progress.stopAnimation();
  }, [index, progress]);
  return (
    <Animated.View style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sheetTab, setSheetTab] = useState<"activity" | "insight">("activity");
  const [sheetTabsWidth, setSheetTabsWidth] = useState(0);
  const tabIndicator = useRef(new Animated.Value(0)).current;
  const tabTextProgress = useRef(new Animated.Value(0)).current;
  const sheetEntrance = useRef(new Animated.Value(0)).current;
  const tabTransition = useRef(new Animated.Value(1)).current;
  const balanceProgress = useRef(new Animated.Value(0)).current;
  const [animatedRemaining, setAnimatedRemaining] = useState(0);

  useEffect(() => {
    Animated.spring(sheetEntrance, { toValue: 1, damping: 19, stiffness: 115, mass: 0.9, useNativeDriver: true }).start();
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

  useEffect(() => {
    if (loading) return;
    const listener = balanceProgress.addListener(({ value }) => setAnimatedRemaining(Math.round(value)));
    balanceProgress.setValue(0);
    Animated.timing(balanceProgress, { toValue: Math.max(0, remaining), duration: 850, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => { balanceProgress.removeListener(listener); balanceProgress.stopAnimation(); };
  }, [balanceProgress, loading, remaining]);

  const switchSheetTab = useCallback((next: "activity" | "insight") => {
    if (next === sheetTab) return;
    Animated.timing(tabTransition, { toValue: 0, duration: 140, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      setSheetTab(next);
      Animated.parallel([
        Animated.timing(tabIndicator, { toValue: next === "insight" ? 1 : 0, duration: 300, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(tabTextProgress, { toValue: next === "insight" ? 1 : 0, duration: 300, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
        Animated.timing(tabTransition, { toValue: 1, duration: 160, delay: 50, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  }, [sheetTab, tabIndicator, tabTextProgress, tabTransition]);

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

        <ThemedText style={styles.balanceLabel}>Available to spend</ThemedText>
        <ThemedText style={styles.balanceAmount}>{loading ? "••••••" : `${remaining < 0 ? "−" : ""}${formatMoney(summary ? animatedRemaining : 0, currency)}`}</ThemedText>
        {!loading && !summary ? (
          <Pressable onPress={() => router.push("/new-cycle")} accessibilityRole="button" accessibilityLabel="Set up allowance" hitSlop={8}>
            <ThemedText style={styles.balanceSetup}>Set up your allowance <ThemedText style={styles.balanceArrow}>↗</ThemedText></ThemedText>
          </Pressable>
        ) : null}
        {summary ? (
          <>
            <View style={styles.balanceMeta}>
              <ThemedText style={styles.balanceMetaText}>{formatMoney(summary.spentCentavos, currency)} spent</ThemedText>
              <ThemedText style={styles.balanceMetaText}>{Math.max(0, Math.round(100 - spentPercent))}% left</ThemedText>
            </View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${spentPercent}%` }]} /></View>
            <ThemedText style={styles.cycleText}>{dashboard?.cycleName} · {formatDate(dashboard?.startDate ?? "", false)} – {formatDate(dashboard?.endDate ?? "", false)}</ThemedText>
          </>
        ) : (
          <ThemedText style={styles.cycleText}>Track your allowance and know what you can safely spend.</ThemedText>
        )}

        <View style={styles.actionRow}>
          {ACTIONS.map((action) => (
            <Pressable key={action.label} onPress={() => router.push(action.route)} accessibilityRole="button" accessibilityLabel={action.label} style={({ pressed }) => [styles.action, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
              <View style={styles.actionCircle}>
                <SymbolView name={action.icon} tintColor="#202A35" size={22} />
              </View>
              <ThemedText style={styles.actionLabel}>{action.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.sheetTabs} onLayout={(event) => setSheetTabsWidth(event.nativeEvent.layout.width)}>
        <Animated.View pointerEvents="none" style={[styles.sheetIndicator, { width: Math.max(0, (sheetTabsWidth - 16) / 2), transform: [{ translateX: tabIndicator.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, (sheetTabsWidth - 16) / 2)] }) }] }]}>
          <Svg width="100%" height="52" viewBox="0 0 200 52" preserveAspectRatio="none">
            <Path d="M16 0 H184 Q200 0 200 16 V36 C200 36 184 36 184 52 H16 C16 36 0 36 0 36 V16 Q0 0 16 0 Z" fill="#FFFFFF" />
          </Svg>
        </Animated.View>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: sheetTab === "activity" }} onPress={() => switchSheetTab("activity")} style={styles.sheetTab}>
          <Animated.Text style={[styles.sheetTabText, { color: tabTextProgress.interpolate({ inputRange: [0, 1], outputRange: ["#1E40AF", "#EAF3FF"] }) }]}>Activity</Animated.Text>
        </Pressable>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: sheetTab === "insight" }} onPress={() => switchSheetTab("insight")} style={styles.sheetTab}>
          <Animated.Text style={[styles.sheetTabText, { color: tabTextProgress.interpolate({ inputRange: [0, 1], outputRange: ["#EAF3FF", "#1E40AF"] }) }]}>Insight</Animated.Text>
        </Pressable>
      </View>
      <Animated.View style={[styles.sheetShadow, { opacity: sheetEntrance, transform: [{ translateY: sheetEntrance.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }) }] }]}>
        <View style={[styles.whiteSheet, {
          paddingBottom: Math.max(insets.bottom + 90, 100),
          borderTopLeftRadius: sheetTab === "activity" ? 0 : 32,
          borderTopRightRadius: sheetTab === "insight" ? 0 : 32,
        }]}>
        <Animated.View style={{ opacity: tabTransition, transform: [{ translateX: tabTransition.interpolate({ inputRange: [0, 1], outputRange: [sheetTab === "activity" ? 16 : -16, 0] }) }] }}>
        {sheetTab === "activity" ? (
        <>
        <View style={styles.sectionHeader}>
          <View>
            <ThemedText style={styles.sectionTitle}>Recent expenses</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>Your latest spending activity</ThemedText>
          </View>
          <Pressable onPress={() => router.push("/explore")} accessibilityRole="button" accessibilityLabel="View all activity" hitSlop={10}>
            <ThemedText style={[styles.link, { color: "#2563EB" }]}>See all ↗</ThemedText>
          </Pressable>
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
            <StaggeredRow index={0}><ThemedText style={styles.insightEyebrow}>ALLOWANCE OVERVIEW</ThemedText></StaggeredRow>
            {summary ? (
              <>
                <StaggeredRow index={1}><View style={styles.insightMetricRow}>
                  <View style={styles.insightMetric}>
                    <ThemedText style={styles.insightMetricLabel}>Spent so far</ThemedText>
                    <ThemedText style={styles.insightMetricValue}>{formatMoney(summary.spentCentavos, currency)}</ThemedText>
                  </View>
                  <View style={styles.insightMetric}>
                    <ThemedText style={styles.insightMetricLabel}>Still available</ThemedText>
                    <ThemedText style={styles.insightMetricValue}>{formatMoney(summary.remainingCentavos, currency)}</ThemedText>
                  </View>
                </View></StaggeredRow>
                <StaggeredRow index={2}><View style={styles.insightTrack}>
                  <View style={[styles.insightFill, { width: `${spentPercent}%` }]} />
                </View>
                <ThemedText style={styles.insightHint}>{Math.round(spentPercent)}% of your spendable allowance used</ThemedText></StaggeredRow>
                <StaggeredRow index={3}><View style={styles.insightDaily}>
                  <ThemedText style={styles.insightMetricLabel}>Safe to spend per day</ThemedText>
                  <ThemedText style={styles.insightDailyValue}>{summary.dailySafeLimitCentavos === null ? "—" : formatMoney(summary.dailySafeLimitCentavos, currency)}</ThemedText>
                </View></StaggeredRow>
              </>
            ) : (
              <View style={styles.insightEmptyState}>
                <View pointerEvents="none" style={styles.ghostPreview}>
                  <View style={styles.ghostRing}><View style={styles.ghostRingInner} /></View>
                  <View style={styles.ghostChart}>
                    {[26, 42, 32, 55, 38, 48, 30].map((height, index) => <View key={index} style={[styles.ghostBar, { height }]} />)}
                  </View>
                </View>
                <View style={styles.insightEmptyCopy}>
                  <ThemedText style={styles.emptyTitle}>Start with an allowance</ThemedText>
                  <ThemedText style={styles.emptyText}>Set up your allowance cycle to see spending insights.</ThemedText>
                  <Pressable onPress={() => router.push("/new-cycle")} style={styles.emptyButton}>
                    <ThemedText style={styles.emptyButtonText}>Set up allowance</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
            <StaggeredRow index={4}><Pressable onPress={() => router.push("/insights")} style={styles.fullInsightsLink}>
              <ThemedText style={styles.fullInsightsText}>View detailed insights</ThemedText>
              <SymbolView name={{ ios: "arrow.up.right", android: "north_east", web: "north_east" }} tintColor="#2563EB" size={16} />
            </Pressable></StaggeredRow>
          </View>
        )}
        </Animated.View>
        </View>
      </Animated.View>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 0, flexGrow: 1 },
  blueHeader: { paddingHorizontal: 23, paddingTop: 4, paddingBottom: 27 },
  topLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  notificationButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#EAF3FF", alignItems: "center", justifyContent: "center" },
  walletTitle: { color: "#FFFFFF", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 18 },
  greeting: { color: "rgba(255,255,255,0.78)", fontFamily: "IBMPlexSans_400Regular", fontSize: 12, marginTop: 2 },
  balanceLabel: { color: "rgba(255,255,255,0.82)", textAlign: "center", fontFamily: "IBMPlexSans_500Medium", fontSize: 12, marginTop: 2 },
  balanceAmount: { color: "#EAF3FF", textAlign: "center", fontFamily: "IBMPlexSans_700Bold", fontSize: 48, lineHeight: 58, letterSpacing: -1.8, marginTop: 3 },
  balanceSetup: { color: "#EAF3FF", textAlign: "center", fontFamily: "IBMPlexSans_500Medium", fontSize: 12, textDecorationLine: "underline", marginTop: 3 },
  balanceArrow: { color: "#8EC5FF" },
  balanceMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  balanceMetaText: { color: "rgba(255,255,255,0.88)", fontFamily: "IBMPlexSans_500Medium", fontSize: 11 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.24)", overflow: "hidden", marginTop: 7 },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: "#8EC5FF" },
  cycleText: { color: "rgba(255,255,255,0.78)", textAlign: "center", fontFamily: "IBMPlexSans_400Regular", fontSize: 10, marginTop: 8 },
  actionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 25, gap: 5 },
  action: { flex: 1, alignItems: "center", gap: 7, minWidth: 0 },
  actionCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#8EC5FF", alignItems: "center", justifyContent: "center" },
  actionLabel: { color: "#FFFFFF", fontFamily: "IBMPlexSans_500Medium", fontSize: 10, textAlign: "center" },
  sheetShadow: { flexGrow: 1, backgroundColor: "transparent", shadowColor: "#000000", shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 10, zIndex: 1 },
  whiteSheet: { flexGrow: 1, backgroundColor: "#FFFFFF", borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: "hidden", marginTop: 0, paddingHorizontal: 21, paddingTop: 13, paddingBottom: 100, minHeight: 390 },
  sheetTabs: { flexDirection: "row", marginTop: 0, paddingHorizontal: 8, height: 52, alignItems: "stretch", backgroundColor: "#2563EB", overflow: "hidden" },
  sheetTab: { flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", zIndex: 2 },
  sheetIndicator: { position: "absolute", left: 8, top: 0, bottom: 0, zIndex: 1 },
  sheetTabText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  insightContent: { paddingTop: 2, paddingBottom: 10 },
  insightEmptyState: { minHeight: 210, justifyContent: "center", alignItems: "center", position: "relative", overflow: "hidden", borderRadius: 18 },
  ghostPreview: { position: "absolute", top: 4, left: 12, right: 12, height: 130, opacity: 0.3, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  ghostRing: { width: 92, height: 92, borderRadius: 46, borderWidth: 12, borderColor: "#8EC5FF", alignItems: "center", justifyContent: "center" },
  ghostRingInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#EAF3FF" },
  ghostChart: { height: 74, flexDirection: "row", alignItems: "flex-end", gap: 6 },
  ghostBar: { width: 10, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: "#2563EB" },
  insightEmptyCopy: { alignItems: "center", gap: 7, paddingTop: 22 },
  insightEyebrow: { color: "#64748B", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 10, letterSpacing: 1, marginBottom: 15 },
  insightMetricRow: { flexDirection: "row", gap: 12 },
  insightMetric: { flex: 1, backgroundColor: "#F4F8FF", borderRadius: 14, padding: 13, gap: 6 },
  insightMetricLabel: { color: "#64748B", fontFamily: "IBMPlexSans_500Medium", fontSize: 11 },
  insightMetricValue: { color: "#1E40AF", fontFamily: "IBMPlexSans_700Bold", fontSize: 18 },
  insightTrack: { height: 8, borderRadius: 4, backgroundColor: "#EAF3FF", overflow: "hidden", marginTop: 18 },
  insightFill: { height: "100%", backgroundColor: "#2563EB", borderRadius: 4 },
  insightHint: { color: "#64748B", fontFamily: "IBMPlexSans_400Regular", fontSize: 11, marginTop: 7 },
  insightDaily: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#DCE7F5", marginTop: 17, paddingTop: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  insightDailyValue: { color: "#1E40AF", fontFamily: "IBMPlexSans_700Bold", fontSize: 18 },
  fullInsightsLink: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", marginTop: 20, minHeight: 40 },
  fullInsightsText: { color: "#2563EB", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 17 },
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
