import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
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
import {
  pickCurrentCycle,
  summarizeCycle,
  type CycleSummary,
} from "@/domain/allowance";
import { formatDate, formatTime, manilaToday } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import type { AppSettings } from "@/domain/types";

type Dashboard = {
  summary: CycleSummary;
  cycleName: string;
  startDate: string;
  endDate: string;
};

function formatTransactionDate(date: string, occurredAt: string): string {
  return `${formatDate(date, false)} · ${formatTime(occurredAt)}`;
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
          setDashboard(
            current
              ? {
                  summary: summarizeCycle(current.cycle, allTransactions, manilaToday()),
                  cycleName: current.cycle.name,
                  startDate: current.cycle.startDate,
                  endDate: current.cycle.endDate,
                }
              : null,
          );
        } catch (error) {
          console.error("Failed to load Gastador dashboard:", error);
          if (active) setLoadError(true);
        } finally {
          if (active) setLoading(false);
        }
      }

      void load();
      return () => {
        active = false;
      };
    }, [db]),
  );

  const currency = settings?.currency ?? "PHP";
  const firstName = settings?.displayName.trim().split(/\\s+/)[0] ?? "";
  const summary = dashboard?.summary;
  const remaining = summary?.remainingCentavos ?? 0;
  const spendable = summary?.spendableCentavos ?? 0;
  const progress = spendable > 0
    ? Math.max(0, Math.min(100, (summary!.spentCentavos / spendable) * 100))
    : 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <ThemedText type="small" themeColor="muted">YOUR MONEY, IN VIEW</ThemedText>
          <ThemedText style={styles.greeting}>
            {firstName ? `Hi, ${firstName}` : "Welcome to Gastador"}
          </ThemedText>
        </View>
        <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
          <ThemedText style={[styles.avatarText, { color: theme.onPrimary }]}>
            {(firstName || "G").charAt(0).toUpperCase()}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.balancePanel, { backgroundColor: theme.navy }]}>
        <View style={styles.balanceTop}>
          <ThemedText style={styles.balanceLabel}>AVAILABLE BALANCE</ThemedText>
          {summary && (
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, { backgroundColor: summary.pace === "on_track" ? "#8ECDF5" : "#F9BE58" }]} />
              <ThemedText style={styles.statusText}>
                {summary.pace === "on_track" ? "On track" :
                  summary.pace === "above_pace" ? "Above pace" :
                  summary.pace === "over_budget" ? "Over allowance" :
                  summary.pace === "ended" ? "Cycle ended" : "Not started"}
              </ThemedText>
            </View>
          )}
        </View>

        {loading ? (
          <ThemedText style={styles.balanceAmount}>••••••</ThemedText>
        ) : summary ? (
          <ThemedText style={styles.balanceAmount}>
            {remaining < 0 ? "−" : ""}{formatMoney(Math.abs(remaining), currency)}
          </ThemedText>
        ) : (
          <ThemedText style={styles.balanceEmpty}>Set up an allowance cycle</ThemedText>
        )}

        {summary ? (
          <>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <View style={styles.balanceFooter}>
              <ThemedText style={styles.balanceCaption}>
                {formatMoney(summary.spentCentavos, currency)} spent
              </ThemedText>
              <ThemedText style={styles.balanceCaption}>
                of {formatMoney(spendable, currency)}
              </ThemedText>
            </View>
          </>
        ) : (
          <ThemedText style={styles.balanceCaption}>
            Your allowance and expenses will show here.
          </ThemedText>
        )}
      </View>

      <View style={styles.sectionHeading}>
        <ThemedText style={styles.sectionTitle}>Your allowance</ThemedText>
        {dashboard && (
          <ThemedText type="small" themeColor="muted">
            {formatDate(dashboard.startDate, false)} – {formatDate(dashboard.endDate, false)}
          </ThemedText>
        )}
      </View>

      {summary ? (
        <View style={[styles.metrics, { borderColor: theme.line }]}>
          <View style={styles.metric}>
            <ThemedText type="small" themeColor="muted">Allowance</ThemedText>
            <ThemedText style={styles.metricValue}>{formatMoney(spendable, currency)}</ThemedText>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: theme.line }]} />
          <View style={styles.metric}>
            <ThemedText type="small" themeColor="muted">Safe per day</ThemedText>
            <ThemedText style={styles.metricValue}>
              {summary.dailySafeLimitCentavos === null
                ? "—"
                : formatMoney(summary.dailySafeLimitCentavos, currency)}
            </ThemedText>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: theme.line }]} />
          <View style={styles.metric}>
            <ThemedText type="small" themeColor="muted">Days left</ThemedText>
            <ThemedText style={styles.metricValue}>{summary.daysRemaining}</ThemedText>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => router.push("/new-cycle")}
          style={[styles.setupAction, { borderColor: theme.line }]}
        >
          <ThemedText style={styles.setupActionText}>Create your allowance cycle</ThemedText>
          <ThemedText type="small" themeColor="muted">Tell Gastador how much allowance you receive and when your next one arrives.</ThemedText>
        </Pressable>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push("/new-expense")}
          style={[styles.primaryAction, { backgroundColor: theme.primarySoft }]}
        >
          <ThemedText style={[styles.primaryActionText, { color: theme.onPrimary }]}>+ Add expense</ThemedText>
        </Pressable>
      </View>

      <View style={styles.sectionHeading}>
        <ThemedText style={styles.sectionTitle}>Recent activity</ThemedText>
        <Pressable onPress={() => router.push("/explore")} hitSlop={10}>
          <ThemedText style={[styles.seeAll, { color: theme.primary }]}>See all</ThemedText>
        </Pressable>
      </View>

      {loadError ? (
        <ThemedText type="small" themeColor="muted">We couldn't load your activity. Pull down to refresh the app and try again.</ThemedText>
      ) : loading ? (
        <ThemedText type="small" themeColor="muted">Loading activity…</ThemedText>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyActivity}>
          <ThemedText style={styles.emptyTitle}>No expenses yet</ThemedText>
          <ThemedText type="small" themeColor="muted">Your latest expenses will appear here once you add one.</ThemedText>
        </View>
      ) : (
        <View>
          {transactions.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.transaction,
                index < transactions.length - 1 && { borderBottomColor: theme.line, borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <View style={[styles.transactionIcon, { backgroundColor: theme.primarySoft }]}>
                <ThemedText style={[styles.transactionInitial, { color: theme.onPrimary }]}>
                  {(item.merchant || item.categoryName || "E").charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.transactionInfo}>
                <ThemedText style={styles.transactionName} numberOfLines={1}>
                  {item.merchant || "Untitled expense"}
                </ThemedText>
                <ThemedText type="small" themeColor="muted" numberOfLines={1}>
                  {item.categoryName} · {formatTransactionDate(item.date, item.occurredAt)}
                </ThemedText>
              </View>
              <ThemedText style={styles.transactionAmount}>
                −{formatMoney(item.amountCentavos, currency)}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
      <ThemedText type="small" themeColor="muted" style={styles.privacyNote}>
        Your financial records stay on this device.
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 36 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  headerCopy: { flex: 1, gap: 3 },
  greeting: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 25, lineHeight: 32 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 18 },
  balancePanel: { borderRadius: 18, padding: 20, marginBottom: 27 },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  balanceLabel: { color: "#BBD2E3", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 11, letterSpacing: 1.1 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.10)" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: "#EAF5FC", fontFamily: "IBMPlexSans_500Medium", fontSize: 11 },
  balanceAmount: { color: "#FFFFFF", fontFamily: "IBMPlexSans_700Bold", fontSize: 35, lineHeight: 44, marginTop: 14, marginBottom: 16 },
  balanceEmpty: { color: "#FFFFFF", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 23, lineHeight: 30, marginTop: 16, marginBottom: 12 },
  progressTrack: { height: 5, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 5, backgroundColor: "#8ECDF5" },
  balanceFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  balanceCaption: { color: "#C6D8E5", fontFamily: "IBMPlexSans_400Regular", fontSize: 12 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 18 },
  metrics: { flexDirection: "row", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 15, marginBottom: 22 },
  metric: { flex: 1, gap: 5 },
  metricValue: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  metricDivider: { width: StyleSheet.hairlineWidth, height: 34, marginHorizontal: 10 },
  setupAction: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 22, gap: 4 },
  setupActionText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15 },
  actions: { marginBottom: 27 },
  primaryAction: { minHeight: 49, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryActionText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15 },
  seeAll: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  emptyActivity: { paddingVertical: 18, gap: 4 },
  emptyTitle: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15 },
  transaction: { minHeight: 68, flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12 },
  transactionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  transactionInitial: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15 },
  transactionInfo: { flex: 1, gap: 3 },
  transactionName: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  transactionAmount: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  privacyNote: { textAlign: "center", marginTop: 26 },
});
