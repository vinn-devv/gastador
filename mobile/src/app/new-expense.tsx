import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { createTransaction, getCategories, getSettings } from "@/data/repository";
import { manilaToday, isValidDate } from "@/domain/dates";
import { parseMoney } from "@/domain/money";
import { PAYMENT_METHODS, type Category, type PaymentMethod } from "@/domain/types";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        try {
          const [items, settings] = await Promise.all([getCategories(db), getSettings(db)]);
          if (!active) return;
          setCategories(items.filter((item) => !item.archivedAt));
          setCurrency(settings.currency);
          setCategoryId((current) => current || items.find((item) => !item.archivedAt)?.id || "");
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

  async function save() {
    const cents = parseMoney(amount);
    if (cents === null || cents <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!categoryId) {
      setError("Choose a category.");
      return;
    }
    if (!isValidDate(date)) {
      setError("Enter a valid date in YYYY-MM-DD format.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await createTransaction(db, {
        amountCentavos: cents,
        date,
        merchant,
        categoryId,
        paymentMethod,
        description,
      });
      router.back();
    } catch (saveError) {
      console.error("Could not save expense:", saveError);
      setError("Your expense could not be saved. Please check the details and try again.");
    } finally {
      setSaving(false);
    }
  }

  const fieldStyle = [
    styles.input,
    { backgroundColor: theme.surface, borderColor: theme.line, color: theme.text },
  ];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
        <ThemedText style={[styles.backText, { color: theme.primary }]}>‹ Back</ThemedText>
      </Pressable>

      <ThemedText type="small" themeColor="muted">RECORD A PURCHASE</ThemedText>
      <ThemedText style={styles.title}>Add expense</ThemedText>
      <ThemedText type="small" themeColor="muted" style={styles.intro}>
        Add the details now. Your record stays on this device.
      </ThemedText>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Amount ({currency})</ThemedText>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={theme.muted}
          keyboardType="decimal-pad"
          style={[...fieldStyle, styles.amountInput]}
          accessibilityLabel="Expense amount"
        />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>What did you spend on?</ThemedText>
        <TextInput
          value={merchant}
          onChangeText={setMerchant}
          placeholder="e.g. Lunch, Jeepney fare"
          placeholderTextColor={theme.muted}
          style={fieldStyle}
          maxLength={100}
        />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Category</ThemedText>
        {loading ? (
          <ThemedText type="small" themeColor="muted">Loading categories…</ThemedText>
        ) : (
          <View style={styles.optionGrid}>
            {categories.map((category) => {
              const selected = categoryId === category.id;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setCategoryId(category.id)}
                  style={[
                    styles.option,
                    {
                      backgroundColor: selected ? theme.primarySoft : theme.surface,
                      borderColor: selected ? theme.primary : theme.line,
                    },
                  ]}
                >
                  <ThemedText style={[
                    styles.optionText,
                    { color: selected ? theme.onPrimary : theme.text },
                  ]}>{category.name}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Paid with</ThemedText>
        <View style={styles.optionGrid}>
          {PAYMENT_METHODS.map((method) => {
            const selected = paymentMethod === method.value;
            return (
              <Pressable
                key={method.value}
                onPress={() => setPaymentMethod(method.value)}
                style={[
                  styles.option,
                  {
                    backgroundColor: selected ? theme.primarySoft : theme.surface,
                    borderColor: selected ? theme.primary : theme.line,
                  },
                ]}
              >
                <ThemedText style={[
                  styles.optionText,
                  { color: selected ? theme.onPrimary : theme.text },
                ]}>{method.label}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Date</ThemedText>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.muted}
          style={fieldStyle}
          autoCapitalize="none"
        />
        <ThemedText type="small" themeColor="muted">Use Philippine date format: YYYY-MM-DD.</ThemedText>
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Note (optional)</ThemedText>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Add a short note"
          placeholderTextColor={theme.muted}
          style={[...fieldStyle, styles.noteInput]}
          multiline
          maxLength={500}
        />
      </View>

      {!!error && (
        <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
          <ThemedText style={[styles.errorText, { color: theme.danger }]}>{error}</ThemedText>
        </View>
      )}

      <Pressable
        onPress={() => void save()}
        disabled={saving || loading}
        style={[
          styles.saveButton,
          { backgroundColor: theme.primary, opacity: saving || loading ? 0.55 : 1 },
        ]}
      >
        <ThemedText style={[styles.saveText, { color: theme.onPrimary }]}>
          {saving ? "Saving…" : "Save expense"}
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 44 },
  back: { alignSelf: "flex-start", marginBottom: 22 },
  backText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  title: { fontFamily: "IBMPlexSans_700Bold", fontSize: 29, lineHeight: 36, marginTop: 2 },
  intro: { marginTop: 3, marginBottom: 25 },
  field: { marginBottom: 19, gap: 8 },
  label: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontFamily: "IBMPlexSans_400Regular", fontSize: 15 },
  amountInput: { minHeight: 58, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 23 },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { minHeight: 42, borderWidth: 1, borderRadius: 22, paddingHorizontal: 14, justifyContent: "center" },
  optionText: { fontFamily: "IBMPlexSans_500Medium", fontSize: 13 },
  noteInput: { minHeight: 88, paddingTop: 12, textAlignVertical: "top" },
  error: { padding: 12, borderRadius: 10, marginBottom: 14 },
  errorText: { fontFamily: "IBMPlexSans_500Medium", fontSize: 13 },
  saveButton: { minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
  saveText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15 },
});
