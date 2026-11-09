import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { SymbolView } from "expo-symbols";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import {
  getAllTransactions,
  getCycles,
  getRecentTransactions,
  getSettings,
  type RecentTransaction,
} from "@/data/repository";
import { pickCurrentCycle, summarizeCycle, type CycleSummary } from "@/domain/allowance";
import { formatDate, formatTime, manilaHour, manilaToday } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import type { AppSettings } from "@/domain/types";

type Dashboard = {
  summary: CycleSummary;
  cycleName: string;
  startDate: string;
  endDate: string;
};

const ACTIONS = [
  { label: "Allowance", sub: "Set or update", icon: { ios: "wallet.pass", android: "account_balance_wallet", web: "account_balance_wallet" }, route: "/new-cycle" as const },
  { label: "Add expense", sub: "Record spending", icon: { ios: "plus", android: "add", web: "add" }, route: "/new-expense" as const },
  { label: "Scan receipt", sub: "Use camera", icon: { ios: "viewfinder", android: "qr_code_scanner", web: "qr_code_scanner" }, route: "/scan" as const },
  { label: "Insights", sub: "See your habits", icon: { ios: "chart.pie", android: "pie_chart", web: "pie_chart" }, route: "/insights" as const },
];

function greeting() {
  const hour = manilaHour();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function categorySymbol(category: string) {
  const value = category.toLowerCase();
  if (value.includes("food")) return { ios: "fork.knife", android: "restaurant", web: "restaurant" };
  if (value.includes("transport")) return { ios: "bus", android: "directions_bus", web: "directions_bus" };
  if (value.includes("school")) return { ios: "book", android: "school", web: "school" };
  if (value.includes("bill")) return { ios: "receipt", android: "receipt_long", web: "receipt_long" };
  if (value.includes("personal")) return { ios: "person", android: "person", web: "person" };
  return { ios: "wallet", android: "account_balance_wallet", web: "account_balance_wallet" };
}

export default function HomeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const theme = useTheme();
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

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
  const firstName = settings?.displayName.trim().split(/\s+/)[0] ?? "";
  const summary = dashboard?.summary;
  const remaining = summary?.remainingCentavos ?? 0;
  const spendable = summary?.spendableCentavos ?? 0;
  const spentPercent = spendable > 0 ? Math.max(0, Math.min(100, (summary!.spentCentavos / spendable) * 100)) : 0;

  return (
    <>
    <StatusBar style="light" backgroundColor="#315D8A" />
    <ScrollView style={[styles.screen, { backgroundColor: "#315D8A" }]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.orangeHeader}>
        <View style={styles.topLine}>
          <View>
            <ThemedText style={styles.walletTitle}>Wallet</ThemedText>
            <ThemedText style={styles.greeting}>{greeting()}{firstName ? `, ${firstName}` : ""}</ThemedText>
          </View>
          <Pressable onPress={() => router.push("/settings")} accessibilityRole="button" accessibilityLabel="Open settings" style={styles.profileButton}>
            <Image source={require("@/assets/images/icon-512.png")} style={styles.profileMark} contentFit="contain" />
          </Pressable>
        </View>

        <ThemedText style={styles.balanceLabel}>Available to spend</ThemedText>
        {loading ? (
          <ThemedText style={styles.balanceAmount}>••••••</ThemedText>
        ) : summary ? (
          <ThemedText style={styles.balanceAmount}>{remaining < 0 ? "−" : ""}{formatMoney(Math.abs(remaining), currency)}</ThemedText>
        ) : (
          <Pressable onPress={() => router.push("/new-cycle")} accessibilityRole="button" accessibilityLabel="Set up allowance">
            <ThemedText style={styles.balanceSetup}>Set up your allowance <ThemedText style={styles.balanceArrow}>↗</ThemedText></ThemedText>
          </Pressable>
        )}
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
            <Pressable key={action.label} onPress={() => router.push(action.route)} accessibilityRole="button" accessibilityLabel={action.label} style={styles.action}>
              <View style={styles.actionCircle}>
                <SymbolView name={action.icon} tintColor="#202A35" size={22} />
              </View>
              <ThemedText style={styles.actionLabel}>{action.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.whiteSheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sectionHeader}>
          <View>
            <ThemedText style={styles.sectionTitle}>My expenses</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>Your latest spending activity</ThemedText>
          </View>
          <Pressable onPress={() => router.push("/explore")} accessibilityRole="button" accessibilityLabel="View all activity" hitSlop={10}>
            <ThemedText style={[styles.link, { color: "#315D8A" }]}>See all ↗</ThemedText>
          </Pressable>
        </View>

        {summary && (
          <View style={styles.quickStats}>
            <View style={styles.statBlock}>
              <ThemedText style={styles.statLabel}>Safe per day</ThemedText>
              <ThemedText style={styles.statValue}>{summary.dailySafeLimitCentavos === null ? "—" : formatMoney(summary.dailySafeLimitCentavos, currency)}</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <ThemedText style={styles.statLabel}>Days left</ThemedText>
              <ThemedText style={styles.statValue}>{summary.daysRemaining}</ThemedText>
            </View>
          </View>
        )}

        {loadError ? (
          <ThemedText style={styles.emptyText}>We couldn't load your expenses. Please try again.</ThemedText>
        ) : loading ? (
          <ThemedText style={styles.emptyText}>Loading expenses…</ThemedText>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><SymbolView name={{ ios: "receipt", android: "receipt_long", web: "receipt_long" }} tintColor="#315D8A" size={22} /></View>
            <ThemedText style={styles.emptyTitle}>No expenses yet</ThemedText>
            <ThemedText style={styles.emptyText}>Add an expense or scan a receipt to see it here.</ThemedText>
            <Pressable onPress={() => router.push("/new-expense")} style={styles.emptyButton}>
              <ThemedText style={styles.emptyButtonText}>Add your first expense</ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.transactionList}>
            {transactions.map((item, index) => (
              <View key={item.id} style={[styles.transactionRow, index < transactions.length - 1 && styles.rowDivider]}>
                <View style={styles.categoryIcon}>
                  <SymbolView name={categorySymbol(item.categoryName)} tintColor="#315D8A" size={19} />
                </View>
                <View style={styles.transactionInfo}>
                  <ThemedText style={styles.transactionName} numberOfLines={1}>{item.merchant || "Expense"}</ThemedText>
                  <ThemedText style={styles.transactionMeta} numberOfLines={1}>{item.categoryName} · {formatDate(item.date, false)}, {formatTime(item.occurredAt)}</ThemedText>
                </View>
                <ThemedText style={styles.transactionAmount}>−{formatMoney(item.amountCentavos, currency)}</ThemedText>
              </View>
            ))}
          </View>
        )}
        <ThemedText style={styles.privacyNote}>Your financial records stay on this device.</ThemedText>
      </View>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  orangeHeader: { paddingHorizontal: 23, paddingTop: 18, paddingBottom: 27 },
  topLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  walletTitle: { color: "#FFFFFF", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 18 },
  greeting: { color: "rgba(255,255,255,0.78)", fontFamily: "IBMPlexSans_400Regular", fontSize: 12, marginTop: 2 },
  profileButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E7EDF3", alignItems: "center", justifyContent: "center" },
  profileMark: { width: 27, height: 27 },
  balanceLabel: { color: "rgba(255,255,255,0.82)", textAlign: "center", fontFamily: "IBMPlexSans_500Medium", fontSize: 12, marginTop: 2 },
  balanceAmount: { color: "#FFFFFF", textAlign: "center", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 43, lineHeight: 54, letterSpacing: -1.5, marginTop: 3 },
  balanceSetup: { color: "#FFFFFF", textAlign: "center", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 24, marginTop: 12 },
  balanceArrow: { color: "#C8D8E7" },
  balanceMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  balanceMetaText: { color: "rgba(255,255,255,0.88)", fontFamily: "IBMPlexSans_500Medium", fontSize: 11 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.24)", overflow: "hidden", marginTop: 7 },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: "#C8D8E7" },
  cycleText: { color: "rgba(255,255,255,0.78)", textAlign: "center", fontFamily: "IBMPlexSans_400Regular", fontSize: 10, marginTop: 8 },
  actionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 25, gap: 5 },
  action: { flex: 1, alignItems: "center", gap: 7, minWidth: 0 },
  actionCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#C8D8E7", alignItems: "center", justifyContent: "center" },
  actionLabel: { color: "#FFFFFF", fontFamily: "IBMPlexSans_500Medium", fontSize: 10, textAlign: "center" },
  whiteSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 34, borderTopRightRadius: 34, marginTop: 0, paddingHorizontal: 21, paddingTop: 13, paddingBottom: 30, minHeight: 390 },
  sheetHandle: { width: 34, height: 4, borderRadius: 2, backgroundColor: "#D9DEE2", alignSelf: "center", marginBottom: 19 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 17 },
  sectionTitle: { color: "#202A35", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 18 },
  sectionSubtitle: { color: "#68747D", fontFamily: "IBMPlexSans_400Regular", fontSize: 11, marginTop: 2 },
  link: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 12 },
  quickStats: { flexDirection: "row", backgroundColor: "#F3F5F6", borderRadius: 14, paddingVertical: 13, paddingHorizontal: 15, marginBottom: 12 },
  statBlock: { flex: 1, gap: 3 },
  statLabel: { color: "#68747D", fontFamily: "IBMPlexSans_500Medium", fontSize: 10 },
  statValue: { color: "#202A35", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 16 },
  statDivider: { width: 1, backgroundColor: "#D9DEE2", marginHorizontal: 14 },
  transactionList: { marginTop: 2 },
  transactionRow: { minHeight: 67, flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#D9DEE2" },
  categoryIcon: { width: 39, height: 39, borderRadius: 20, backgroundColor: "#E7EDF3", alignItems: "center", justifyContent: "center" },
  transactionInfo: { flex: 1, gap: 3 },
  transactionName: { color: "#202A35", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  transactionMeta: { color: "#68747D", fontFamily: "IBMPlexSans_400Regular", fontSize: 10 },
  transactionAmount: { color: "#202A35", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 12 },
  emptyState: { alignItems: "center", paddingVertical: 22, gap: 7 },
  emptyIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#E7EDF3", alignItems: "center", justifyContent: "center", marginBottom: 2 },
  emptyTitle: { color: "#202A35", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15 },
  emptyText: { color: "#68747D", fontFamily: "IBMPlexSans_400Regular", fontSize: 12, textAlign: "center" },
  emptyButton: { minHeight: 43, paddingHorizontal: 18, borderRadius: 22, backgroundColor: "#315D8A", alignItems: "center", justifyContent: "center", marginTop: 6 },
  emptyButtonText: { color: "#FFFFFF", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 12 },
  privacyNote: { color: "#68747D", fontFamily: "IBMPlexSans_400Regular", fontSize: 10, textAlign: "center", marginTop: 22 },
});
