import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SHEET_GAP } from "@/constants/layout";
import { ScreenLayout } from "@/components/screen-layout";
import { DateField } from "@/components/date-field";
import { SymbolView } from "expo-symbols";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { createTransaction, getAllTransactions, getCategories, getCycles, getCustomPaymentMethods, getSettings, InsufficientFundsError } from "@/data/repository";
import { expensesInCycle, cycleForDate } from "@/domain/allowance";
import { remainingCentavos, validateExpense } from "@/domain/spending-limit";
import { manilaToday, isValidDate } from "@/domain/dates";
import { formatMoneyWithPreferences, parseMoney } from "@/domain/money";
import { DEFAULT_PREFERENCES, PAYMENT_METHODS, type Category, type Cycle, type PaymentMethod, type Transaction, type SettingsPreferences } from "@/domain/types";
import type { RootStackParamList } from "@/types/navigation";

export default function NewExpenseScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<NonNullable<RootStackParamList["new-expense"]>>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [customMethods, setCustomMethods] = useState<import("@/domain/types").CustomPaymentMethod[]>([]);
  const [currency, setCurrency] = useState("PHP");
  const [displayPreferences, setDisplayPreferences] = useState<SettingsPreferences>(DEFAULT_PREFERENCES);
  const [amount, setAmount] = useState(params.amount ?? "");
  const [merchant, setMerchant] = useState(params.merchant ?? "");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(manilaToday());
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fundsError, setFundsError] = useState("");
  const invalidHapticSent = useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dateError, setDateError] = useState("");
  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        try {
          const [items, settings, cycles, transactions, methods] = await Promise.all([
            getCategories(db), getSettings(db), getCycles(db), getAllTransactions(db), getCustomPaymentMethods(db),
          ]);
          if (!active) return;
          setCategories(items.filter((item) => !item.archivedAt));
          setCurrency(settings.currency);
          setDisplayPreferences(settings.preferences);
          setCustomMethods(methods);
          setCycles(cycles);
          setTransactions(transactions);
          setCategoryId((current) => current || (settings.preferences.defaultCategoryId && items.some((item) => item.id === settings.preferences.defaultCategoryId && !item.archivedAt) ? settings.preferences.defaultCategoryId : items.find((item) => !item.archivedAt)?.id) || "");
          setPaymentMethod(settings.preferences.defaultPaymentMethod);

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

  const displayMoney = (amount: number) => formatMoneyWithPreferences(amount, currency, displayPreferences);
  const selectedCycle = cycleForDate(cycles, date);
  const selectedCycleRemaining = selectedCycle
    ? remainingCentavos(selectedCycle, expensesInCycle(selectedCycle, transactions))
    : null;
  const parsedAmount = parseMoney(amount);
  const amountIsInvalid = parsedAmount === null || parsedAmount <= 0;
  const insufficientFunds = Boolean(
    selectedCycle &&
    parsedAmount !== null &&
    parsedAmount > 0 &&
    !validateExpense({
      amountCentavos: parsedAmount,
      remainingCentavos: selectedCycleRemaining ?? 0,
    }).ok,
  );
  const liveFundsMessage = insufficientFunds
    ? selectedCycleRemaining === 0
      ? "You have no allowance left."
      : `Not enough allowance. You only have ${displayMoney(selectedCycleRemaining ?? 0)} left.`
    : fundsError;

  useEffect(() => {
    if (insufficientFunds && !invalidHapticSent.current) {
      invalidHapticSent.current = true;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (!insufficientFunds) {
      invalidHapticSent.current = false;
    }
  }, [insufficientFunds]);

  async function save() {
    const cents = parsedAmount;
    if (cents === null || cents <= 0) { setError("Enter an amount greater than zero."); return; }
    if (selectedCycle && cents !== null && cents > 0 && insufficientFunds) {
      Alert.alert("Expense not allowed", `This expense exceeds your available allowance of ${displayMoney(selectedCycleRemaining ?? 0)}. Reduce the amount to continue.`, [{ text: "OK" }]);
      return;
    }
    if (!categoryId) { setError("Choose a category."); return; }
    if (!isValidDate(date) || date > manilaToday()) { setDateError("Expense date cannot be in the future."); setError("Review the expense date."); return; }
    setDateError("");

    setSaving(true);
    setError("");
    setFundsError("");
    try {
      await createTransaction(db, { amountCentavos: cents, date, merchant, categoryId, paymentMethod, description });
      Alert.alert("Expense saved", "Your expense has been added.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (saveError) {
      if (saveError instanceof InsufficientFundsError) {
        setFundsError(saveError.remainingCentavos === 0
          ? "You have no allowance left."
          : `Not enough allowance. You only have ${displayMoney(saveError.remainingCentavos)} left.`);
      } else {
        console.error("Could not save expense:", saveError);
        setError("Your expense could not be saved. Please check the details and try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  const fieldStyle = [styles.input, { backgroundColor: theme.surface, borderColor: theme.line, color: theme.text }];

  return (
    <ScreenLayout title="Add expense" subtitle="Record what you spent and keep your allowance up to date." onBack={() => router.back()} stackScreen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={styles.screen} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + SHEET_GAP + 24 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.sheet}>
          <View style={[styles.balancePanel, { backgroundColor: theme.background }]}>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.balanceLabel, { color: theme.muted }]}>Current allowance balance</ThemedText>
              <ThemedText style={[styles.balanceValue, { color: theme.text }]}>{selectedCycleRemaining === null ? "No allowance for this date" : displayMoney(selectedCycleRemaining)}</ThemedText>
            </View>
            <Pressable onPress={() => router.push("/new-cycle")} accessibilityRole="button" accessibilityLabel="Set up allowance" style={styles.balanceAdd}>
              <SymbolView name={{ ios: "plus", android: "add", web: "add" }} tintColor={theme.primary} size={19} />
            </Pressable>
          </View>

          <View style={styles.amountArea}>
            <ThemedText style={[styles.amountLabel, { color: theme.text }]}>Expense amount</ThemedText>
            <View style={[styles.amountInputWrap, { borderColor: theme.line, backgroundColor: theme.surface }]}>
              <ThemedText style={[styles.currencyPrefix, { color: theme.primary }]}>{currency === "PHP" ? "₱" : currency}</ThemedText>
              <TextInput value={amount} onChangeText={(value) => { setAmount(value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")); setError(""); setFundsError(""); }} placeholder="0.00" placeholderTextColor={theme.muted} keyboardType="decimal-pad" accessibilityLabel="Expense amount" style={[styles.amountInput, { color: theme.text }]} />
            </View>
            {!!liveFundsMessage && <ThemedText accessibilityLiveRegion="polite" style={styles.fundsError}>{liveFundsMessage}</ThemedText>}
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: theme.text }]}>What did you spend on?</ThemedText>
            <TextInput value={merchant} onChangeText={setMerchant} placeholder="e.g. Lunch, Jeepney fare" placeholderTextColor={theme.muted} accessibilityLabel="Merchant or expense description" style={fieldStyle} />
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: theme.text }]}>Category</ThemedText>
            {loading ? <ThemedText style={styles.muted}>Loading categories…</ThemedText> : (
              <View style={styles.optionGrid}>
                {categories.map((category) => {
                  const selected = categoryId === category.id;
                  return <Pressable key={category.id} onPress={() => setCategoryId(category.id)} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={category.name} style={[styles.option, { backgroundColor: selected ? theme.primarySoft : theme.surface, borderColor: selected ? theme.primary : theme.line }]}>
                    <ThemedText style={[styles.optionText, { color: selected ? theme.primary : theme.text }]}>{category.name}</ThemedText>
                  </Pressable>;
                })}
              </View>
            )}
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: theme.text }]}>Paid with</ThemedText>
            <View style={styles.optionGrid}>
              {[...PAYMENT_METHODS, ...customMethods.map((method) => ({ value: ("custom:" + method.id) as PaymentMethod, label: method.name }))].map((method) => {
                const selected = paymentMethod === method.value;
                return <Pressable key={method.value} onPress={() => setPaymentMethod(method.value)} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={method.label} style={[styles.option, { backgroundColor: selected ? theme.primarySoft : theme.surface, borderColor: selected ? theme.primary : theme.line }]}>
                  <ThemedText style={[styles.optionText, { color: selected ? theme.primary : theme.text }]}>{method.label}</ThemedText>
                </Pressable>;
              })}
            </View>
          </View>

          <View style={styles.field}>
            <DateField label="Date" dateFormat={displayPreferences.dateFormat} value={date} onChange={(value) => { setDate(value); setDateError(""); setFundsError(""); }} maximumDate={manilaToday()} error={dateError} />
          </View>
          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: theme.text }]}>Note (optional)</ThemedText>
            <TextInput value={description} onChangeText={setDescription} placeholder="Add a short note" placeholderTextColor={theme.muted} accessibilityLabel="Optional expense note" style={[...fieldStyle, styles.noteInput]} multiline />
          </View>

          {!!error && <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}><ThemedText style={[styles.errorText, { color: theme.danger }]}>{error}</ThemedText></View>}
          <Pressable onPress={() => void save()} disabled={saving || loading || amountIsInvalid || !categoryId || !isValidDate(date) || date > manilaToday()} accessibilityRole="button" accessibilityLabel="Save expense" style={[styles.saveButton, { backgroundColor: theme.primary, opacity: saving || loading || amountIsInvalid || !categoryId || !isValidDate(date) || date > manilaToday() ? 0.55 : 1 }]}>
            <ThemedText style={styles.saveButtonText}>{saving ? "Saving expense…" : "Save expense"}</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  sheet: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 },
  balancePanel: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 15, padding: 14, marginBottom: 18 },
  balanceLabel: { fontFamily: "IBMPlexSans_400Regular", fontSize: 11 },
  balanceValue: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 19, marginTop: 3 },
  balanceAdd: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  amountArea: { paddingVertical: 4, marginBottom: 18, gap: 8 },
  amountLabel: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  amountInputWrap: { minHeight: 60, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  currencyPrefix: { fontFamily: "IBMPlexSans_700Bold", fontSize: 24 },
  amountInput: { flex: 1, minWidth: 0, fontFamily: "IBMPlexSans_700Bold", fontSize: 25, paddingVertical: 8 },
  fundsError: { color: "#DC2626", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15 },
  field: { marginBottom: 18, gap: 8 },
  label: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, fontFamily: "IBMPlexSans_400Regular", fontSize: 14 },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { minHeight: 43, borderWidth: 1, borderRadius: 9, paddingHorizontal: 13, justifyContent: "center" },
  optionText: { fontFamily: "IBMPlexSans_500Medium", fontSize: 12 },
  muted: { color: "#68747D", fontSize: 12 },
  noteInput: { minHeight: 78, paddingTop: 11, textAlignVertical: "top" },
  error: { padding: 12, borderRadius: 10, marginBottom: 14 },
  errorText: { fontFamily: "IBMPlexSans_500Medium", fontSize: 13 },
  saveButton: { minHeight: 52, borderRadius: 15, marginTop: 4, alignItems: "center", justifyContent: "center" },
  saveButtonText: { color: "#FFFFFF", fontFamily: "IBMPlexSans_700Bold", fontSize: 15 },
});
