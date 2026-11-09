import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import {
  getAllTransactions,
  getCategories,
  getSettings,
} from "@/data/repository";
import { formatDate, formatTime } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import {
  methodLabel,
  type Category,
  type CurrencyCode,
  type Transaction,
} from "@/domain/types";
import { onTabBarScroll } from "@/components/tab-bar-visibility";

export default function ActivityScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState<CurrencyCode>("PHP");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        setLoading(true);
        setLoadError(false);
        try {
          const [all, categoryList, settings] = await Promise.all([
            getAllTransactions(db),
            getCategories(db),
            getSettings(db),
          ]);
          if (!active) return;
          setTransactions(all);
          setCategories(categoryList);
          setCurrency(settings.currency);
        } catch (error) {
          console.error("Failed to load activity:", error);
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

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return transactions;
    return transactions.filter((item) => {
      const category = categoryNames.get(item.categoryId) ?? "";
      return `${item.merchant} ${item.description ?? ""} ${category} ${item.paymentMethod}`
        .toLowerCase()
        .includes(needle);
    });
  }, [transactions, categoryNames, query]);

  const total = filtered.reduce((sum, item) => sum + item.amountCentavos, 0);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      onScroll={onTabBarScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.header}>
        <ThemedText type="small" themeColor="muted">
          Your spending history
        </ThemedText>
        <ThemedText style={styles.title}>Activity</ThemedText>
        <ThemedText type="small" themeColor="muted">
          {transactions.length}{" "}
          {transactions.length === 1 ? "expense" : "expenses"} recorded
        </ThemedText>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search merchant, category, or note"
        placeholderTextColor={theme.muted}
        returnKeyType="search"
        style={[
          styles.search,
          {
            backgroundColor: theme.surface,
            borderColor: theme.line,
            color: theme.text,
          },
        ]}
        accessibilityLabel="Search expenses"
      />

      <View
        style={[
          styles.summary,
          { backgroundColor: theme.surface, borderColor: theme.line },
        ]}
      >
        <View>
          <ThemedText type="small" themeColor="muted">
            Showing {filtered.length}{" "}
            {filtered.length === 1 ? "expense" : "expenses"}
          </ThemedText>
          <ThemedText style={styles.total}>
            {formatMoney(total, currency)}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="muted">
          Total shown
        </ThemedText>
      </View>

      {loadError ? (
        <ThemedText type="small" themeColor="muted">
          We couldn't load your expenses. Please try again.
        </ThemedText>
      ) : loading ? (
        <ThemedText type="small" themeColor="muted">
          Loading expenses…
        </ThemedText>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <ThemedText style={styles.emptyTitle}>
            {transactions.length === 0
              ? "No expenses yet"
              : "No matching expenses"}
          </ThemedText>
          <ThemedText type="small" themeColor="muted">
            {transactions.length === 0
              ? "Expenses you add will be listed here."
              : "Try another search term."}
          </ThemedText>
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <ThemedText style={[styles.clear, { color: theme.primary }]}>
                Clear search
              </ThemedText>
            </Pressable>
          )}
        </View>
      ) : (
        <View>
          {filtered.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.transaction,
                index < filtered.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.line,
                },
              ]}
            >
              <View style={[styles.rowRule, { backgroundColor: theme.primary }]} />
              <View style={styles.info}>
                <ThemedText style={styles.merchant} numberOfLines={1}>
                  {item.merchant || "Untitled expense"}
                </ThemedText>
                <ThemedText type="small" themeColor="muted" numberOfLines={1}>
                  {categoryNames.get(item.categoryId) ?? "Unknown category"} ·{" "}
                  {formatDate(item.date, false)} · {formatTime(item.occurredAt)}
                </ThemedText>
                <ThemedText type="small" themeColor="muted">
                  {methodLabel(item.paymentMethod)}
                </ThemedText>
              </View>
              <ThemedText style={styles.amount}>
                −{formatMoney(item.amountCentavos, currency)}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rowRule: { width: 3, height: 34, borderRadius: 2 },
  screen: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 124 },
  header: { gap: 3, marginBottom: 20 },
  title: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 30, lineHeight: 36 },
  search: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 14,
    fontFamily: "IBMPlexSans_400Regular",
    fontSize: 14,
    marginBottom: 16,
  },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  total: {
    fontFamily: "IBMPlexSans_700Bold",
    fontSize: 25,
    marginTop: 2,
    color: "#202A35",
  },
  empty: { paddingVertical: 34, alignItems: "center", gap: 6 },
  emptyTitle: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 16 },
  clear: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13, marginTop: 8 },
  transaction: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 11,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15 },
  info: { flex: 1, gap: 2 },
  merchant: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  amount: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
});
