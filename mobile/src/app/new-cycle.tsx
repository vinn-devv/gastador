import { useState } from "react";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { onTabBarScroll } from "@/components/tab-bar-visibility";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { createCycle } from "@/data/repository";
import { addDays, isValidDate, manilaToday } from "@/domain/dates";
import { nextAllowanceDate } from "@/domain/allowance";
import { parseMoney } from "@/domain/money";
import type { Frequency } from "@/domain/types";

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
];

export default function NewCycleScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const today = manilaToday();
  const [name, setName] = useState("");
  const [allowance, setAllowance] = useState("");
  const [savings, setSavings] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("biweekly");
  const [startDate, setStartDate] = useState(today);
  const [nextDate, setNextDate] = useState(
    nextAllowanceDate("biweekly", today) ?? addDays(today, 14),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function changeFrequency(value: Frequency) {
    setFrequency(value);
    const suggested = nextAllowanceDate(value, startDate);
    if (suggested) setNextDate(suggested);
  }

  function changeStart(value: string) {
    setStartDate(value);
    if (isValidDate(value)) {
      const suggested = nextAllowanceDate(frequency, value);
      if (suggested) setNextDate(suggested);
    }
  }

  async function save() {
    const allowanceCents = parseMoney(allowance);
    const savingsCents = savings.trim() ? parseMoney(savings) : 0;
    if (allowanceCents === null || allowanceCents <= 0) {
      setError("Enter an allowance amount greater than zero.");
      return;
    }
    if (savingsCents === null) {
      setError("Enter a valid savings amount or leave it blank.");
      return;
    }
    if (
      !isValidDate(startDate) ||
      !isValidDate(nextDate) ||
      nextDate <= startDate
    ) {
      setError("Choose a valid next allowance date after the start date.");
      return;
    }
    if (savingsCents > allowanceCents) {
      setError("Planned savings cannot be greater than your allowance.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await createCycle(db, {
        name,
        frequency,
        startDate,
        endDate: addDays(nextDate, -1),
        allowanceCentavos: allowanceCents,
        plannedSavingsCentavos: savingsCents,
      });
      router.back();
    } catch (saveError) {
      console.error("Could not create allowance cycle:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this cycle.",
      );
    } finally {
      setSaving(false);
    }
  }

  const fieldStyle = [
    styles.input,
    {
      backgroundColor: theme.surface,
      borderColor: theme.line,
      color: theme.text,
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      onScroll={onTabBarScroll}
      scrollEventThrottle={16}
    >
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
        <ThemedText style={[styles.backText, { color: theme.primary }]}>
          ‹ Back
        </ThemedText>
      </Pressable>
      <ThemedText type="small" themeColor="muted">
        Allowance setup
      </ThemedText>
      <ThemedText style={styles.title}>New allowance cycle</ThemedText>
      <ThemedText type="small" themeColor="muted" style={styles.subtitle}>
        Set the amount you receive and the dates it needs to cover.
      </ThemedText>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Allowance amount (PHP)</ThemedText>
        <TextInput
          value={allowance}
          onChangeText={setAllowance}
          placeholder="e.g. 3000"
          accessibilityLabel="Allowance amount in Philippine pesos"
          placeholderTextColor={theme.muted}
          keyboardType="decimal-pad"
          style={[...fieldStyle, styles.amountInput]}
        />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>
          How often do you receive it?
        </ThemedText>
        <View style={styles.options}>
          {FREQUENCIES.map((item) => {
            const selected = frequency === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => changeFrequency(item.value)}
                style={[
                  styles.option,
                  {
                    backgroundColor: selected
                      ? theme.primarySoft
                      : theme.surface,
                    borderColor: selected ? theme.primary : theme.line,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.optionText,
                    { color: selected ? theme.primary : theme.text },
                  ]}
                >
                  {item.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Allowance starts on</ThemedText>
        <TextInput
          value={startDate}
          onChangeText={changeStart}
          placeholder="YYYY-MM-DD"
          accessibilityLabel="Allowance start date"
          placeholderTextColor={theme.muted}
          style={fieldStyle}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Next allowance arrives</ThemedText>
        <TextInput
          value={nextDate}
          onChangeText={setNextDate}
          placeholder="YYYY-MM-DD"
          accessibilityLabel="Next allowance arrival date"
          placeholderTextColor={theme.muted}
          style={fieldStyle}
          autoCapitalize="none"
        />
        <ThemedText type="small" themeColor="muted">
          Your cycle ends the day before your next allowance arrives.
        </ThemedText>
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Planned savings (optional)</ThemedText>
        <TextInput
          value={savings}
          onChangeText={setSavings}
          placeholder="0.00"
          accessibilityLabel="Planned savings amount"
          placeholderTextColor={theme.muted}
          keyboardType="decimal-pad"
          style={fieldStyle}
        />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Cycle name (optional)</ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. November allowance"
          accessibilityLabel="Allowance cycle name"
          placeholderTextColor={theme.muted}
          maxLength={80}
          style={fieldStyle}
        />
      </View>

      {!!error && (
        <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
          <ThemedText style={[styles.errorText, { color: theme.danger }]}>
            {error}
          </ThemedText>
        </View>
      )}

      <Pressable
        onPress={() => void save()}
        disabled={saving}
        style={[
          styles.saveButton,
          { backgroundColor: theme.primary, opacity: saving ? 0.55 : 1 },
        ]}
      >
        <ThemedText style={[styles.saveText, { color: theme.onPrimary }]}>
          {saving ? "Saving…" : "Save allowance cycle"}
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 124 },
  back: { alignSelf: "flex-start", marginBottom: 22 },
  backText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  title: {
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 30,
    lineHeight: 36,
    marginTop: 2,
  },
  subtitle: { marginTop: 3, marginBottom: 25 },
  field: { marginBottom: 19, gap: 8 },
  label: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 13,
    fontFamily: "IBMPlexSans_400Regular",
    fontSize: 15,
  },
  amountInput: {
    minHeight: 58,
    fontFamily: "IBMPlexSans_700Bold",
    fontSize: 25,
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 13,
    justifyContent: "center",
  },
  optionText: { fontFamily: "IBMPlexSans_500Medium", fontSize: 12 },
  error: { padding: 12, borderRadius: 10, marginBottom: 14 },
  errorText: { fontFamily: "IBMPlexSans_500Medium", fontSize: 13 },
  saveButton: {
    minHeight: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15 },
});
