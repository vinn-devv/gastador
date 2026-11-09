import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { StatusBar } from "expo-status-bar";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { createTransaction, getAllTransactions, getCategories, getCycles, getSettings } from "@/data/repository";
import { pickCurrentCycle, summarizeCycle } from "@/domain/allowance";
import { manilaToday, isValidDate } from "@/domain/dates";
import { formatMoney, parseMoney } from "@/domain/money";
import { PAYMENT_METHODS, type Category, type PaymentMethod } from "@/domain/types";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", ".", "delete"] as const;

export default function NewExpenseScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState("PHP");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(manilaToday());
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        try {
          const [items, settings, cycles, transactions] = await Promise.all([
            getCategories(db), getSettings(db), getCycles(db), getAllTransactions(db),
          ]);
          if (!active) return;
          setCategories(items.filter((item) => !item.archivedAt));
          setCurrency(settings.currency);
          setCategoryId((current) => current || items.find((item) => !item.archivedAt)?.id || "");
          const current = pickCurrentCycle(cycles, manilaToday());
          setAvailableBalance(current ? summarizeCycle(current.cycle, transactions, manilaToday()).remainingCentavos : null);
        } catch (loadError) {
          console.error("Could not load expense form:", loadError);
          if (active) setError("Could not load your categories. Please try again.");
        } finally {
          if (active) setLoading(false);
        }
      }
      void load();
      return () => { active = false; };
    }, [db]),
  );

  function pressKey(key: (typeof KEYS)[number]) {
    setError("");
    if (key === "clear") { setAmount(""); return; }
    if (key === "delete") { setAmount((value) => value.slice(0, -1)); return; }
    if (key === ".") {
      setAmount((value) => value.includes(".") ? value : value ? value + "." : "0.");
      return;
    }
    setAmount((value) => {
      const [whole, decimal] = value.split(".");
      if (decimal !== undefined) return decimal.length >= 2 ? value : value + key;
      const next = value === "0" ? key : value + key;
      return next.length > 9 ? value : next;
    });
  }

  async function save() {
    const cents = parseMoney(amount);
    if (cents === null || cents <= 0) { setError("Enter an amount greater than zero."); return; }
    if (!categoryId) { setError("Choose a category."); return; }
    if (!isValidDate(date)) { setError("Enter a valid date in YYYY-MM-DD format."); return; }

    setSaving(true);
    setError("");
    try {
      await createTransaction(db, { amountCentavos: cents, date, merchant, categoryId, paymentMethod, description });
      router.back();
    } catch (saveError) {
      console.error("Could not save expense:", saveError);
      setError("Your expense could not be saved. Please check the details and try again.");
    } finally {
      setSaving(false);
    }
  }

  const fieldStyle = [styles.input, { backgroundColor: theme.surface, borderColor: theme.line, color: theme.text }];
  const formattedAmount = amount ? amount : "0.00";

  return (
    <>
      <StatusBar style="light" backgroundColor="#315D8A" />
      <ScrollView style={[styles.screen, { backgroundColor: "#315D8A" }]} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.orangeHeader}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={styles.back}>
            <SymbolView name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }} tintColor="#FFFFFF" size={21} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Add expense</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.balancePanel}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.balanceLabel}>Current allowance balance</ThemedText>
              <ThemedText style={styles.balanceValue}>{availableBalance === null ? "No active allowance" : formatMoney(availableBalance, currency)}</ThemedText>
            </View>
            <Pressable onPress={() => router.push("/new-cycle")} accessibilityRole="button" accessibilityLabel="Set up allowance" style={styles.balanceAdd}>
              <SymbolView name={{ ios: "plus", android: "add", web: "add" }} tintColor={theme.primary} size={19} />
            </Pressable>
          </View>

          <View style={styles.amountArea}>
            <ThemedText style={styles.amountLabel}>Expense amount</ThemedText>
            <ThemedText style={styles.amountValue}>{currency === "PHP" ? "₱" : currency + " "}{formattedAmount}</ThemedText>
          </View>

          <View style={styles.keypad}>
            {KEYS.map((key) => (
              <Pressable key={key} onPress={() => pressKey(key)} accessibilityRole="button" accessibilityLabel={key === "clear" ? "Clear amount" : key === "delete" ? "Delete last digit" : key} style={styles.key}>
                {key === "clear" ? (
                  <SymbolView name={{ ios: "arrow.counterclockwise", android: "refresh", web: "refresh" }} tintColor={theme.textSecondary} size={20} />
                ) : key === "delete" ? (
                  <SymbolView name={{ ios: "delete.left", android: "backspace", web: "backspace" }} tintColor={theme.textSecondary} size={20} />
                ) : (
                  <ThemedText style={styles.keyText}>{key}</ThemedText>
                )}
              </Pressable>
            ))}
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>What did you spend on?</ThemedText>
            <TextInput value={merchant} onChangeText={setMerchant} placeholder="e.g. Lunch, Jeepney fare" placeholderTextColor={theme.muted} accessibilityLabel="Merchant or expense description" style={fieldStyle} />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Category</ThemedText>
            {loading ? <ThemedText style={styles.muted}>Loading categories…</ThemedText> : (
              <View style={styles.optionGrid}>
                {categories.map((category) => {
                  const selected = categoryId === category.id;
                  return <Pressable key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.option, { backgroundColor: selected ? theme.primarySoft : theme.surface, borderColor: selected ? theme.primary : theme.line }]}>
                    <ThemedText style={[styles.optionText, { color: selected ? theme.primary : theme.text }]}>{category.name}</ThemedText>
                  </Pressable>;
                })}
              </View>
            )}
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Paid with</ThemedText>
            <View style={styles.optionGrid}>
              {PAYMENT_METHODS.map((method) => {
                const selected = paymentMethod === method.value;
                return <Pressable key={method.value} onPress={() => setPaymentMethod(method.value)} style={[styles.option, { backgroundColor: selected ? theme.primarySoft : theme.surface, borderColor: selected ? theme.primary : theme.line }]}>
                  <ThemedText style={[styles.optionText, { color: selected ? theme.primary : theme.text }]}>{method.label}</ThemedText>
                </Pressable>;
              })}
            </View>
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Date</ThemedText>
            <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.muted} accessibilityLabel="Expense date" style={fieldStyle} />
          </View>
          <View style={styles.field}>
            <ThemedText style={styles.label}>Note (optional)</ThemedText>
            <TextInput value={description} onChangeText={setDescription} placeholder="Add a short note" placeholderTextColor={theme.muted} accessibilityLabel="Optional expense note" style={[...fieldStyle, styles.noteInput]} multiline />
          </View>

          {!!error && <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}><ThemedText style={[styles.errorText, { color: theme.danger }]}>{error}</ThemedText></View>}
          <Pressable onPress={() => void save()} disabled={saving || loading} style={[styles.saveButton, { backgroundColor: theme.primary, opacity: saving || loading ? 0.55 : 1 }]}>
            <ThemedText style={styles.saveText}>{saving ? "Saving…" : "Save expense"}</ThemedText>
            <SymbolView name={{ ios: "arrow.right", android: "arrow_forward", web: "arrow_forward" }} tintColor="#FFFFFF" size={18} />
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 35 },
  orangeHeader: { minHeight: 106, paddingHorizontal: 21, paddingTop: 16, paddingBottom: 23, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 17 },
  headerSpacer: { width: 42 },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 31, borderTopRightRadius: 31, paddingHorizontal: 20, paddingTop: 13, paddingBottom: 35 },
  sheetHandle: { width: 35, height: 4, borderRadius: 2, backgroundColor: "#D9DEE2", alignSelf: "center", marginBottom: 18 },
  balancePanel: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F3F5F6", borderRadius: 15, padding: 14, marginBottom: 18 },
  balanceLabel: { color: "#68747D", fontFamily: "IBMPlexSans_400Regular", fontSize: 11 },
  balanceValue: { color: "#202A35", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 19, marginTop: 3 },
  balanceAdd: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  amountArea: { alignItems: "center", paddingVertical: 7, marginBottom: 9 },
  amountLabel: { color: "#68747D", fontFamily: "IBMPlexSans_400Regular", fontSize: 11 },
  amountValue: { color: "#315D8A", fontFamily: "IBMPlexSans_700Bold", fontSize: 34, lineHeight: 43, marginTop: 4 },
  keypad: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginBottom: 21, columnGap: 10, rowGap: 8 },
  key: { width: "30%", maxWidth: 100, aspectRatio: 1.42, borderRadius: 50, borderWidth: 1, borderColor: "#D9DEE2", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  keyText: { color: "#202A35", fontFamily: "IBMPlexSans_500Medium", fontSize: 20 },
  field: { marginBottom: 18, gap: 8 },
  label: { color: "#202A35", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 9, paddingHorizontal: 13, fontFamily: "IBMPlexSans_400Regular", fontSize: 14 },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { minHeight: 43, borderWidth: 1, borderRadius: 9, paddingHorizontal: 13, justifyContent: "center" },
  optionText: { fontFamily: "IBMPlexSans_500Medium", fontSize: 12 },
  muted: { color: "#68747D", fontSize: 12 },
  noteInput: { minHeight: 78, paddingTop: 11, textAlignVertical: "top" },
  error: { padding: 12, borderRadius: 10, marginBottom: 14 },
  errorText: { fontFamily: "IBMPlexSans_500Medium", fontSize: 13 },
  saveButton: { minHeight: 54, borderRadius: 27, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 4 },
  saveText: { color: "#FFFFFF", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
});
