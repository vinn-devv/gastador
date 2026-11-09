import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { SymbolView } from "expo-symbols";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { onTabBarScroll } from "@/components/tab-bar-visibility";

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
import {
  formatDate,
  formatTime,
  manilaHour,
  manilaToday,
} from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import type { AppSettings } from "@/domain/types";

type Dashboard = {
  summary: CycleSummary;
  cycleName: string;
  startDate: string;
  endDate: string;
};

function greeting() {
  const hour = manilaHour();
  return hour < 12
    ? "Good morning"
    : hour < 18
      ? "Good afternoon"
      : "Good evening";
}

function formatTransactionDate(date: string, occurredAt: string) {
  return `${formatDate(date, false)} · ${formatTime(occurredAt)}`;
}

const QUICK_ACTIONS = [
  {
    label: "Add expense",
    icon: {
      ios: "plus.circle",
      android: "add_circle_outline",
      web: "add_circle_outline",
    },
    route: "/new-expense" as const,
  },
  {
    label: "Scan receipt",
    icon: {
      ios: "viewfinder",
      android: "qr_code_scanner",
      web: "qr_code_scanner",
    },
    route: "/scan" as const,
  },
  {
    label: "Insights",
    icon: {
      ios: "chart.bar.xaxis",
      android: "query_stats",
      web: "query_stats",
    },
    route: "/insights" as const,
  },
  {
    label: "Settings",
    icon: { ios: "slider.horizontal.3", android: "tune", web: "tune" },
    route: "/settings" as const,
  },
] as const;

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
          const [recent, cycles, allTransactions, appSettings] =
            await Promise.all([
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
                  summary: summarizeCycle(
                    current.cycle,
                    allTransactions,
                    manilaToday(),
                  ),
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
  const firstName = settings?.displayName.trim().split(/\s+/)[0] ?? "";
  const summary = dashboard?.summary;
  const remaining = summary?.remainingCentavos ?? 0;
  const spendable = summary?.spendableCentavos ?? 0;
  const spentPercent =
    spendable > 0
      ? Math.max(0, Math.min(100, (summary!.spentCentavos / spendable) * 100))
      : 0;
  const remainingPercent = Math.round(100 - spentPercent);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      onScroll={onTabBarScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <ThemedText style={styles.overline} themeColor="muted">
            YOUR ALLOWANCE
          </ThemedText>
          <ThemedText style={styles.greeting}>
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </ThemedText>
        </View>
        <Image
          source={require("@/assets/images/icon-512.png")}
          style={styles.brandMark}
          contentFit="contain"
        />
      </View>

      <LinearGradient colors={[theme.primary, theme.balanceEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceSection}>
        <View style={styles.balanceTop}>
          <ThemedText style={[styles.balanceLabel, { color: "#EAF4FC" }]}>
            AVAILABLE BALANCE
          </ThemedText>
          {summary && (
            <View style={styles.status}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      summary.pace === "on_track"
                        ? "#62E0C2"
                        : "#FFD08A",
                  },
                ]}
              />
              <ThemedText style={[styles.statusText, { color: "#D8EAF8" }]}>
                {summary.pace === "on_track"
                  ? "On track"
                  : summary.pace === "above_pace"
                    ? "Above pace"
                    : summary.pace === "over_budget"
                      ? "Over allowance"
                      : summary.pace === "ended"
                        ? "Cycle ended"
                        : "Not started"}
              </ThemedText>
            </View>
          )}
        </View>

        {loading ? (
          <ThemedText style={[styles.balanceAmount, { color: "#FFFFFF" }]}>
            ••••••
          </ThemedText>
        ) : summary ? (
          <ThemedText style={styles.balanceAmount}>
            {remaining < 0 ? "−" : ""}
            {formatMoney(Math.abs(remaining), currency)}
          </ThemedText>
        ) : (
          <ThemedText style={[styles.balanceEmpty, { color: "#FFFFFF" }]}>
            Give every peso somewhere to go.
          </ThemedText>
        )}

        {summary ? (
          <>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: "rgba(255,255,255,0.24)" },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  { width: `${spentPercent}%`, backgroundColor: "#62E0C2" },
                ]}
              />
            </View>
            <View style={styles.balanceFooter}>
              <ThemedText style={[styles.balanceCaption, { color: "#D8EAF8" }]}>
                {formatMoney(summary.spentCentavos, currency)} spent
              </ThemedText>
              <ThemedText style={styles.balanceCaption} themeColor="muted">
                {remainingPercent}% left · of {formatMoney(spendable, currency)}
              </ThemedText>
            </View>
          </>
        ) : (
          <ThemedText style={styles.balanceCaption} themeColor="muted">
            Set up your allowance once to see what is available.
          </ThemedText>
        )}
        {dashboard && (
          <ThemedText style={[styles.cycleDate, { color: "#D8EAF8" }]}>
            {dashboard.cycleName} · {formatDate(dashboard.startDate, false)} –{" "}
            {formatDate(dashboard.endDate, false)}
          </ThemedText>
        )}
      </LinearGradient>

      {!summary && !loading ? (
        <Pressable
          onPress={() => router.push("/new-cycle")}
          style={[styles.setupAction, { backgroundColor: theme.primary }]}
        >
          <ThemedText style={styles.setupActionText}>
            Set up allowance
          </ThemedText>
          <SymbolView
            name={{
              ios: "arrow.up.right",
              android: "north_east",
              web: "north_east",
            }}
            tintColor="#FFFFFF"
            size={17}
          />
        </Pressable>
      ) : null}

      <View
        style={[
          styles.quickActions,
          { borderTopColor: theme.line, borderBottomColor: theme.line },
        ]}
      >
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => router.push(action.route)}
            style={styles.quickAction}
          >
            <View
              style={[styles.quickIcon, { backgroundColor: theme.primarySoft }]}
            >
              <SymbolView
                name={action.icon}
                tintColor={theme.primary}
                size={21}
              />
            </View>
            <ThemedText style={styles.quickLabel}>{action.label}</ThemedText>
          </Pressable>
        ))}
      </View>

      {summary && (
        <View style={[styles.metrics, { borderBottomColor: theme.line }]}>
          <View style={styles.metric}>
            <ThemedText style={styles.metricLabel} themeColor="muted">
              Allowance
            </ThemedText>
            <ThemedText style={styles.metricValue}>
              {formatMoney(spendable, currency)}
            </ThemedText>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <ThemedText style={styles.metricLabel} themeColor="muted">
              Safe per day
            </ThemedText>
            <ThemedText style={styles.metricValue}>
              {summary.dailySafeLimitCentavos === null
                ? "—"
                : formatMoney(summary.dailySafeLimitCentavos, currency)}
            </ThemedText>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <ThemedText style={styles.metricLabel} themeColor="muted">
              Days left
            </ThemedText>
            <ThemedText style={styles.metricValue}>
              {summary.daysRemaining}
            </ThemedText>
          </View>
        </View>
      )}

      <View style={styles.sectionHeading}>
        <View>
          <ThemedText style={styles.sectionKicker} themeColor="muted">
            YOUR LATEST SPENDING
          </ThemedText>
          <ThemedText style={styles.sectionTitle}>
            Recent transactions
          </ThemedText>
        </View>
        <Pressable
          onPress={() => router.push("/explore")}
          hitSlop={10}
          style={styles.seeAll}
        >
          <ThemedText style={[styles.seeAllText, { color: theme.primary }]}>
            See all
          </ThemedText>
          <SymbolView
            name={{
              ios: "arrow.up.right",
              android: "north_east",
              web: "north_east",
            }}
            tintColor={theme.primary}
            size={13}
          />
        </Pressable>
      </View>

      {loadError ? (
        <ThemedText type="small" themeColor="muted">
          We couldn't load your activity. Please try again.
        </ThemedText>
      ) : loading ? (
        <ThemedText type="small" themeColor="muted">
          Loading activity…
        </ThemedText>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyActivity}>
          <ThemedText style={styles.emptyTitle}>
            No transactions yet.
          </ThemedText>
          <ThemedText type="small" themeColor="muted">
            Your latest expenses will appear here after your first entry.
          </ThemedText>
        </View>
      ) : (
        <View>
          {transactions.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.transaction,
                index < transactions.length - 1 && {
                  borderBottomColor: theme.line,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View
                style={[
                  styles.transactionIcon,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <ThemedText
                  style={[styles.transactionInitial, { color: theme.primary }]}
                >
                  {(item.merchant || item.categoryName || "E")
                    .charAt(0)
                    .toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.transactionInfo}>
                <ThemedText style={styles.transactionName} numberOfLines={1}>
                  {item.merchant || "Untitled expense"}
                </ThemedText>
                <ThemedText
                  style={styles.transactionMeta}
                  themeColor="muted"
                  numberOfLines={1}
                >
                  {item.categoryName} ·{" "}
                  {formatTransactionDate(item.date, item.occurredAt)}
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
  content: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 124 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  headerCopy: { flex: 1, gap: 4 },
  overline: {
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.5,
  },
  greeting: {
    fontFamily: "IBMPlexSans_700Bold",
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.9,
  },
  brandMark: { width: 38, height: 38 },
  balanceSection: {
    marginBottom: 20,
    padding: 18,
    borderRadius: 18,
    overflow: "hidden",
  },
  balanceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  balanceLabel: {
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.15,
  },
  status: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: "IBMPlexSans_500Medium", fontSize: 11 },
  balanceAmount: {
    color: "#FFFFFF",
    fontFamily: "IBMPlexSans_700Bold",
    fontSize: 43,
    lineHeight: 54,
    letterSpacing: -2.1,
    marginTop: 8,
  },
  balanceEmpty: {
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 22,
    lineHeight: 30,
    marginTop: 12,
    marginBottom: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 99,
    overflow: "hidden",
    marginTop: 15,
  },
  progressFill: { height: "100%", borderRadius: 99 },
  balanceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 8,
  },
  balanceCaption: { color: "#EAF2FF", fontFamily: "IBMPlexSans_400Regular", fontSize: 11 },
  cycleDate: {
    fontFamily: "IBMPlexSans_400Regular",
    fontSize: 11,
    marginTop: 10,
  },
  setupAction: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  setupActionText: {
    color: "#FFFFFF",
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 14,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    marginBottom: 19,
  },
  quickAction: { flex: 1, alignItems: "center", gap: 7, paddingVertical: 3 },
  quickIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontFamily: "IBMPlexSans_500Medium",
    fontSize: 10,
    textAlign: "center",
  },
  metrics: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 19,
    marginBottom: 24,
  },
  metric: { flex: 1, gap: 5 },
  metricLabel: { fontFamily: "IBMPlexSans_400Regular", fontSize: 10 },
  metricValue: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: "#94A3B8",
    opacity: 0.45,
    marginHorizontal: 9,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionKicker: {
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 9,
    letterSpacing: 1.25,
    marginBottom: 3,
  },
  sectionTitle: {
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 19,
    letterSpacing: -0.45,
  },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingBottom: 3,
  },
  seeAllText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 12 },
  emptyActivity: { paddingVertical: 20, gap: 4 },
  emptyTitle: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  transaction: {
    minHeight: 69,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    gap: 11,
  },
  transactionIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  transactionInitial: { fontFamily: "IBMPlexSans_700Bold", fontSize: 15 },
  transactionInfo: { flex: 1, gap: 3 },
  transactionName: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  transactionMeta: { fontFamily: "IBMPlexSans_400Regular", fontSize: 10 },
  transactionAmount: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 12 },
  privacyNote: { textAlign: "center", marginTop: 28, fontSize: 10 },
});
