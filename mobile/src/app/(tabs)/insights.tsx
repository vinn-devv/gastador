import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenLayout } from "@/components/screen-layout";
import { navBarSpace } from "@/constants/layout";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import {
  getAllTransactions,
  getCategories,
  getCycles,
  getSettings,
} from "@/data/repository";
import { pickCurrentCycle, summarizeCycle } from "@/domain/allowance";
import { formatMoney } from "@/domain/money";
import { manilaToday } from "@/domain/dates";
import type { Category, CurrencyCode, Transaction } from "@/domain/types";

export default function InsightsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState<CurrencyCode>("PHP");
  const [cycleSummary, setCycleSummary] = useState<ReturnType<
    typeof summarizeCycle
  > | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        setLoading(true);
        try {
          const [all, categoryList, cycles, settings] = await Promise.all([
            getAllTransactions(db),
            getCategories(db),
            getCycles(db),
            getSettings(db),
          ]);
          if (!active) return;
          const current = pickCurrentCycle(cycles, manilaToday());
          setTransactions(all);
          setCategories(categoryList);
          setCurrency(settings.currency);
          setCycleSummary(
            current ? summarizeCycle(current.cycle, all, manilaToday()) : null,
          );
        } catch (error) {
          console.error("Failed to load insights:", error);
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

  const breakdown = useMemo(() => {
    const names = new Map(
      categories.map((category) => [category.id, category.name]),
    );
    const totals = new Map<string, number>();
    transactions.forEach((item) => {
      totals.set(
        item.categoryId,
        (totals.get(item.categoryId) ?? 0) + item.amountCentavos,
      );
    });
    return [...totals.entries()]
      .map(([id, amount]) => ({ id, name: names.get(id) ?? "Unknown", amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, categories]);

  const totalSpent = transactions.reduce(
    (sum, item) => sum + item.amountCentavos,
    0,
  );
  const largest = breakdown[0];

  return (
    <ScreenLayout title="Insights" subtitle="A simple view of where your allowance goes.">
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: navBarSpace(insets.bottom) }]}
    >

      {loading ? (
        <ThemedText type="small" themeColor="muted">
          Calculating your spending…
        </ThemedText>
      ) : (
        <>
          <View
            style={[
              styles.summary,
              { borderColor: theme.line, backgroundColor: theme.surface },
            ]}
          >
            <View style={styles.summaryItem}>
              <ThemedText type="small" themeColor="muted">
                All expenses
              </ThemedText>
              <ThemedText style={[styles.summaryValue, { color: theme.text }]}>
                {formatMoney(totalSpent, currency)}
              </ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.line }]} />
            <View style={styles.summaryItem}>
              <ThemedText type="small" themeColor="muted">
                Transactions
              </ThemedText>
              <ThemedText style={styles.summaryValue}>
                {transactions.length}
              </ThemedText>
            </View>
          </View>

          {cycleSummary ? (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                This allowance cycle
              </ThemedText>
              <View
                style={[
                  styles.cyclePanel,
                  { backgroundColor: theme.surface, borderColor: theme.line },
                ]}
              >
                <View style={styles.cycleRow}>
                  <ThemedText type="small" themeColor="muted">
                    Spent so far
                  </ThemedText>
                  <ThemedText style={styles.cycleValue}>
                    {formatMoney(cycleSummary.spentCentavos, currency)}
                  </ThemedText>
                </View>
                <View style={styles.cycleRow}>
                  <ThemedText type="small" themeColor="muted">
                    Still available
                  </ThemedText>
                  <ThemedText style={styles.cycleValue}>
                    {formatMoney(cycleSummary.remainingCentavos, currency)}
                  </ThemedText>
                </View>
                <View style={styles.cycleRow}>
                  <ThemedText type="small" themeColor="muted">
                    Daily safe amount
                  </ThemedText>
                  <ThemedText style={styles.cycleValue}>
                    {cycleSummary.dailySafeLimitCentavos === null
                      ? "—"
                      : formatMoney(
                          cycleSummary.dailySafeLimitCentavos,
                          currency,
                        )}
                  </ThemedText>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                Allowance cycle
              </ThemedText>
              <ThemedText type="small" themeColor="muted">
                Set up a cycle to see your available balance and daily safe
                amount.
              </ThemedText>
              <Pressable onPress={() => router.push("/new-cycle")} style={styles.setupButton} accessibilityRole="button" accessibilityLabel="Set up allowance">
                <ThemedText style={styles.setupButtonText}>Set up allowance</ThemedText>
              </Pressable>
            </View>
          )}

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>
              Spending by category
            </ThemedText>
            {breakdown.length === 0 ? (
              <>
                <ThemedText type="small" themeColor="muted">
                  Your category breakdown will appear after you record an expense.
                </ThemedText>
                <Pressable onPress={() => router.push("/new-expense")} style={styles.setupButton} accessibilityRole="button" accessibilityLabel="Add an expense">
                  <ThemedText style={styles.setupButtonText}>Add an expense</ThemedText>
                </Pressable>
              </>
            ) : (
              breakdown.map((item) => {
                const percent =
                  totalSpent > 0 ? (item.amount / totalSpent) * 100 : 0;
                return (
                  <View key={item.id} style={styles.category}>
                    <View style={styles.categoryTop}>
                      <ThemedText style={styles.categoryName}>
                        {item.name}
                      </ThemedText>
                      <ThemedText style={styles.categoryAmount}>
                        {formatMoney(item.amount, currency)}
                      </ThemedText>
                    </View>
                    <View
                      style={[styles.track, { backgroundColor: theme.sunken }]}
                    >
                      <View
                        style={[
                          styles.fill,
                          {
                            width: `${Math.max(0, Math.min(100, percent))}%`,
                            backgroundColor: theme.primary,
                          },
                        ]}
                      />
                    </View>
                    <ThemedText type="small" themeColor="muted">
                      {Math.round(percent)}% of recorded spending
                    </ThemedText>
                  </View>
                );
              })
            )}
            <Pressable onPress={() => router.push("/expenses")} style={styles.viewExpenses} accessibilityRole="button" accessibilityLabel="View all expenses">
              <ThemedText style={{ color: theme.primary, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 }}>View all expenses</ThemedText>
            </Pressable>
          </View>

          {largest && (
            <View style={[styles.note, { backgroundColor: theme.primarySoft }]}>
              <ThemedText
                style={[styles.noteTitle, { color: theme.primary }]}
              >
                Largest category
              </ThemedText>
              <ThemedText style={[styles.noteText, { color: theme.text }]}>
                {largest.name}, {formatMoney(largest.amount, currency)}
              </ThemedText>
            </View>
          )}
        </>
      )}
    </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 24 },
  viewExpenses: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", marginTop: 4 },
  setupButton: { minHeight: 48, paddingHorizontal: 20, borderRadius: 14, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", alignSelf: "flex-start", marginTop: 12 },
  setupButtonText: { color: "#FFFFFF", fontFamily: "IBMPlexSans_700Bold", fontSize: 14 },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  summaryItem: { flex: 1, gap: 4 },
  summaryValue: {
    fontFamily: "IBMPlexSans_700Bold",
    fontSize: 25,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    marginHorizontal: 14,
  },
  section: { marginTop: 26 },
  sectionTitle: {
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 17,
    marginBottom: 12,
  },
  cyclePanel: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 15,
    paddingVertical: 6,
  },
  cycleRow: {
    minHeight: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cycleValue: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  category: { marginBottom: 17, gap: 6 },
  categoryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryName: { fontFamily: "IBMPlexSans_500Medium", fontSize: 14 },
  categoryAmount: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  track: { height: 7, borderRadius: 8, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 8 },
  note: { borderRadius: 6, padding: 15, marginTop: 10 },
  noteTitle: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  noteText: { fontFamily: "IBMPlexSans_500Medium", fontSize: 14, marginTop: 3 },
});
