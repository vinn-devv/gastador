import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  getAllTransactions,
  getCycles,
  getRecentTransactions,
  type RecentTransaction,
} from "../data/repository";

import {
  pickCurrentCycle,
  summarizeCycle,
  type CycleSummary,
} from "../domain/allowance";

import { manilaToday } from "../domain/dates";
import { formatMoney } from "../domain/money";

function formatTransactionDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HomeScreen() {
  const router = useRouter();

  const db = useSQLiteContext();

  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  const [dashboard, setDashboard] = useState<{
    allowanceCentavos: number;
    summary: CycleSummary;
    cycleName: string;
    startDate: string;
    endDate: string;
  } | null>(null);

  const [loadingDashboard, setLoadingDashboard] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      try {
        const [recent, cycles, allTransactions] = await Promise.all([
          getRecentTransactions(db),
          getCycles(db),
          getAllTransactions(db),
        ]);

        const today = manilaToday();
        const current = pickCurrentCycle(cycles, today);

        if (isActive) {
          setTransactions(recent);

          if (current) {
            const summary = summarizeCycle(
              current.cycle,
              allTransactions,
              today,
            );

            setDashboard({
              allowanceCentavos: current.cycle.allowanceCentavos,
              summary,
              cycleName: current.cycle.name,
              startDate: current.cycle.startDate,
              endDate: current.cycle.endDate,
            });
          } else {
            setDashboard(null);
          }
        }
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        if (isActive) {
          setLoadingTransactions(false);
          setLoadingDashboard(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isActive = false;
    };
  }, [db]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good evening,</Text>
          <Text style={styles.username}>Welcome back!</Text>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>R</Text>
        </View>
      </View>

      <View style={styles.balanceSection}>
        <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
        <Text style={styles.balance}>₱2,450.00</Text>

        <View style={styles.balanceFooter}>
          <Text style={styles.balanceCaption}>Your money, in view.</Text>
          <Text style={styles.balanceCaption}>November 2026</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Overview</Text>
      </View>

      <View style={styles.overview}>
        <View style={styles.overviewItem}>
          <Text style={styles.overviewLabel}>Income</Text>
          <Text style={styles.income}>+₱5,000.00</Text>
        </View>

        <View style={styles.verticalDivider} />

        <View style={styles.overviewItem}>
          <Text style={styles.overviewLabel}>Expenses</Text>
          <Text style={styles.expense}>-₱2,550.00</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/explore")}
        >
          <Text style={styles.primaryButtonText}>+ Add transaction</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent activity</Text>
        <Pressable onPress={() => router.push("/explore")}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>

      {loadingTransactions ? (
        <Text style={styles.disclaimer}>Loading transactions...</Text>
      ) : transactions.length === 0 ? (
        <Text style={styles.disclaimer}>
          No transactions yet. Add your first expense to get started.
        </Text>
      ) : (
        transactions.map((item) => (
          <View key={item.id} style={styles.transaction}>
            <View style={styles.transactionIcon}>
              <Text style={styles.transactionInitial}>
                {(item.merchant || "E").charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.transactionInfo}>
              <Text style={styles.transactionName}>
                {item.merchant || "Untitled expense"}
              </Text>

              <Text style={styles.transactionCategory}>
                {item.categoryName} · {formatTransactionDate(item.occurredAt)}
              </Text>
            </View>

            <Text style={styles.transactionAmount}>
              -{formatMoney(item.amountCentavos)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  greeting: {
    fontSize: 14,
    color: "#7B8496",
  },
  username: {
    fontSize: 23,
    fontWeight: "700",
    color: "#142B5C",
    marginTop: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EAF1FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#2459B5",
    fontSize: 18,
    fontWeight: "700",
  },
  balanceSection: {
    backgroundColor: "#0F2A6B",
    borderRadius: 22,
    padding: 24,
    marginBottom: 30,
  },
  balanceLabel: {
    color: "#B9C9ED",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  balance: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "700",
    marginTop: 12,
  },
  balanceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
  },
  balanceCaption: {
    color: "#C4D2F0",
    fontSize: 11,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#142B5C",
    fontSize: 18,
    fontWeight: "700",
  },
  overview: {
    flexDirection: "row",
    paddingVertical: 8,
    marginBottom: 20,
  },
  overviewItem: {
    flex: 1,
  },
  overviewLabel: {
    color: "#7B8496",
    fontSize: 13,
    marginBottom: 8,
  },
  income: {
    color: "#16866A",
    fontSize: 18,
    fontWeight: "700",
  },
  expense: {
    color: "#D65B65",
    fontSize: 18,
    fontWeight: "700",
  },
  verticalDivider: {
    width: 1,
    backgroundColor: "#E8ECF3",
    marginHorizontal: 18,
  },
  actionRow: {
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: "#EAF1FF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#2459B5",
    fontSize: 14,
    fontWeight: "700",
  },
  seeAll: {
    color: "#3974D6",
    fontSize: 13,
    fontWeight: "600",
  },
  transaction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F6",
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#EFF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  transactionInitial: {
    color: "#2459B5",
    fontSize: 16,
    fontWeight: "700",
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 13,
  },
  transactionName: {
    color: "#182A4D",
    fontSize: 14,
    fontWeight: "600",
  },
  transactionCategory: {
    color: "#8A93A3",
    fontSize: 11,
    marginTop: 5,
  },
  transactionAmount: {
    color: "#D65B65",
    fontSize: 13,
    fontWeight: "600",
  },
  positiveAmount: {
    color: "#16866A",
  },
  disclaimer: {
    color: "#A0A7B3",
    fontSize: 10,
    textAlign: "center",
    marginTop: 22,
  },
});
