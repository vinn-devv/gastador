import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenLayout } from "@/components/screen-layout";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { navBarSpace } from "@/constants/layout";
import { getCycles, getSettings } from "@/data/repository";
import { formatDate } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import { cycleStatus } from "@/domain/allowance";
import { manilaToday } from "@/domain/dates";
import type { Cycle, CurrencyCode } from "@/domain/types";

const frequencyLabel: Record<Cycle["frequency"], string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  custom: "Custom",
};

export default function AllowanceScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [currency, setCurrency] = useState<CurrencyCode>("PHP");
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([getCycles(db), getSettings(db)]).then(([items, settings]) => {
      if (!active) return;
      setCycles(items);
      setCurrency(settings.currency);
    }).catch((error) => console.error("Could not load allowance cycles:", error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [db]));

  return (
    <ScreenLayout title="Allowance" subtitle="Manage your allowance schedule and available budget.">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, { paddingBottom: navBarSpace(insets.bottom) }]} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.push("/new-cycle")} accessibilityRole="button" style={[styles.primary, { backgroundColor: theme.primary }]}>
          <ThemedText style={styles.primaryText}>Set up a new allowance</ThemedText>
        </Pressable>
        <ThemedText style={styles.sectionTitle}>Allowance cycles</ThemedText>
        {loading ? <ThemedText type="small" themeColor="muted">Loading allowance cycles…</ThemedText> :
          cycles.length === 0 ? (
            <View style={styles.empty}>
              <ThemedText style={styles.emptyTitle}>No allowance cycle yet</ThemedText>
              <ThemedText type="small" themeColor="muted">Set up your first cycle to see how much you can safely spend.</ThemedText>
            </View>
          ) : cycles.map((cycle) => {
            const status = cycleStatus(cycle, manilaToday());
            return (
              <View key={cycle.id} style={[styles.cycle, { borderBottomColor: theme.line }]}>
                <View style={styles.cycleTop}>
                  <ThemedText style={styles.cycleName}>{cycle.name}</ThemedText>
                  <ThemedText style={[styles.status, { color: status === "active" ? theme.primary : theme.textSecondary }]}>{status === "active" ? "Active" : status === "upcoming" ? "Upcoming" : "Ended"}</ThemedText>
                </View>
                <ThemedText type="small" themeColor="muted">{frequencyLabel[cycle.frequency]} · {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}</ThemedText>
                <ThemedText style={styles.amount}>{formatMoney(cycle.allowanceCentavos, currency)}</ThemedText>
              </View>
            );
          })}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 24 },
  primary: { minHeight: 52, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 25 },
  primaryText: { color: "#FFFFFF", fontFamily: "IBMPlexSans_700Bold", fontSize: 15 },
  sectionTitle: { color: "#1E40AF", fontFamily: "IBMPlexSans_700Bold", fontSize: 18, marginBottom: 12 },
  empty: { paddingVertical: 22, gap: 5 },
  emptyTitle: { color: "#202A35", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 16 },
  cycle: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 5 },
  cycleTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cycleName: { color: "#202A35", fontFamily: "IBMPlexSans_700Bold", fontSize: 15, flex: 1 },
  status: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 12 },
  amount: { color: "#1E40AF", fontFamily: "IBMPlexSans_700Bold", fontSize: 18, marginTop: 2 },
});
