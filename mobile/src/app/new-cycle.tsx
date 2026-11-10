import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DateField } from "@/components/date-field";
import { ScreenLayout } from "@/components/screen-layout";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { CycleOverlapError, getCycles, saveAllowance } from "@/data/repository";
import { addDays, diffDays, formatDate, isValidDate, manilaToday } from "@/domain/dates";
import { cycleForDate, nextAllowanceDate } from "@/domain/allowance";
import { parseMoney } from "@/domain/money";
import type { Cycle, Frequency } from "@/domain/types";

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
  const insets = useSafeAreaInsets();
  const today = manilaToday();
  const [currentCycle, setCurrentCycle] = useState<Cycle | null>(null);
  const [mode, setMode] = useState<"edit_current" | "start_next">("start_next");
  const [name, setName] = useState("");
  const [allowance, setAllowance] = useState("");
  const [savings, setSavings] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("biweekly");
  const [startDate, setStartDate] = useState(today);
  const [nextDate, setNextDate] = useState(addDays(today, 14));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [overlapPrompt, setOverlapPrompt] = useState(false);
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    let active = true;
    void getCycles(db).then((cycles) => {
      if (!active) return;
      const current = cycleForDate(cycles, today);
      setCurrentCycle(current);
      if (current) {
        const nextStart = addDays(current.endDate, 1);
        setStartDate(nextStart);
        setNextDate(nextAllowanceDate("biweekly", nextStart) ?? addDays(nextStart, 14));
      }
    }).catch((loadError) => console.error("Could not load allowance cycles:", loadError));
    return () => { active = false; };
  }, [db, today]);

  function changeFrequency(value: Frequency) {
    setFrequency(value);
    const suggested = nextAllowanceDate(value, startDate);
    setNextDate(suggested ?? addDays(startDate, 14));
    setDateError("");
  }

  function changeStart(value: string) {
    setStartDate(value);
    if (isValidDate(value)) {
      const suggested = nextAllowanceDate(frequency, value);
      setNextDate(suggested ?? addDays(value, 14));
      setDateError("");
    }
  }

  function chooseMode(nextMode: "edit_current" | "start_next") {
    setMode(nextMode);
    setError("");
    setOverlapPrompt(false);
    if (nextMode === "edit_current" && currentCycle) {
      setStartDate(currentCycle.startDate);
      setNextDate(addDays(currentCycle.endDate, 1));
      setFrequency(currentCycle.frequency);
      setAllowance(String(currentCycle.allowanceCentavos / 100));
      setSavings(String(currentCycle.plannedSavingsCentavos / 100));
    } else if (currentCycle) {
      const nextStart = addDays(currentCycle.endDate, 1);
      setStartDate(nextStart);
      setNextDate(nextAllowanceDate(frequency, nextStart) ?? addDays(nextStart, 14));
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
    if (!isValidDate(startDate) || !isValidDate(nextDate) || nextDate <= startDate) {
      setDateError("Next allowance must be after the start date.");
      setError("Review the allowance dates.");
      return;
    }
    setDateError("");
    if (savingsCents > allowanceCents) {
      setError("Planned savings cannot be greater than your allowance.");
      return;
    }

    setSaving(true);
    setError("");
    setOverlapPrompt(false);
    try {
      await saveAllowance(db, {
        name,
        period: frequency,
        startDate,
        lengthDays: diffDays(startDate, nextDate),
        amountCentavos: allowanceCents,
        plannedSavingsCentavos: savingsCents,
        mode,
      });
      router.back();
    } catch (saveError) {
      if (saveError instanceof CycleOverlapError) {
        setError("You already have an allowance for these dates. Update it or start the next cycle.");
        setOverlapPrompt(true);
      } else {
        setError(saveError instanceof Error ? saveError.message : "Could not save this cycle.");
      }
    } finally {
      setSaving(false);
    }
  }

  const fieldStyle = [
    styles.input,
    { backgroundColor: theme.surface, borderColor: theme.line, color: theme.text },
  ];

  return (
    <ScreenLayout title={mode === "edit_current" ? "Edit allowance" : "New allowance cycle"} subtitle={mode === "edit_current" ? "Update the current cycle without removing its expenses." : "Set up the next allowance period."} onBack={() => router.back()} stackScreen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          {currentCycle ? (
            <View style={styles.field}>
              <ThemedText style={styles.label}>Allowance action</ThemedText>
              <View style={styles.options}>
                <Pressable onPress={() => chooseMode("edit_current")} style={[styles.option, { backgroundColor: mode === "edit_current" ? theme.primarySoft : theme.surface, borderColor: mode === "edit_current" ? theme.primary : theme.line }]}>
                  <ThemedText style={[styles.optionText, { color: mode === "edit_current" ? theme.primary : theme.text }]}>Edit current cycle</ThemedText>
                </Pressable>
                <Pressable onPress={() => chooseMode("start_next")} style={[styles.option, { backgroundColor: mode === "start_next" ? theme.primarySoft : theme.surface, borderColor: mode === "start_next" ? theme.primary : theme.line }]}>
                  <ThemedText style={[styles.optionText, { color: mode === "start_next" ? theme.primary : theme.text }]}>Start next cycle</ThemedText>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.field}>
            <ThemedText style={styles.label}>Allowance amount (PHP)</ThemedText>
            <TextInput value={allowance} onChangeText={setAllowance} placeholder="e.g. 3000" accessibilityLabel="Allowance amount in Philippine pesos" placeholderTextColor={theme.muted} keyboardType="decimal-pad" style={[...fieldStyle, styles.amountInput]} />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>How often do you receive it?</ThemedText>
            <View style={styles.options}>
              {FREQUENCIES.map((item) => {
                const selected = frequency === item.value;
                return <Pressable key={item.value} onPress={() => changeFrequency(item.value)} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={item.label} style={[styles.option, { backgroundColor: selected ? theme.primarySoft : theme.surface, borderColor: selected ? theme.primary : theme.line }]}>
                  <ThemedText style={[styles.optionText, { color: selected ? theme.primary : theme.text }]}>{item.label}</ThemedText>
                </Pressable>;
              })}
            </View>
          </View>

          <View style={styles.field}>
            {mode === "edit_current" && currentCycle
              ? <View style={{ gap: 7 }}>
                  <ThemedText style={styles.label}>Current cycle starts on</ThemedText>
                  <ThemedText type="small" themeColor="muted">{formatDate(currentCycle.startDate)}</ThemedText>
                </View>
              : <DateField label="Allowance starts on" value={startDate} onChange={changeStart} />}
          </View>

          <View style={styles.field}>
            <DateField label="Next allowance arrives" value={nextDate} onChange={(value) => { setNextDate(value); setDateError(""); }} minimumDate={isValidDate(startDate) ? addDays(startDate, 1) : undefined} error={dateError} />
            <ThemedText type="small" themeColor="muted">{frequency === "custom" ? "Choose your own next allowance date." : "This date is suggested from your allowance frequency."} Your cycle ends the day before.</ThemedText>
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Planned savings (optional)</ThemedText>
            <TextInput value={savings} onChangeText={setSavings} placeholder="0.00" accessibilityLabel="Planned savings amount" placeholderTextColor={theme.muted} keyboardType="decimal-pad" style={fieldStyle} />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Cycle name (optional)</ThemedText>
            <TextInput value={name} onChangeText={setName} placeholder="e.g. November allowance" accessibilityLabel="Allowance cycle name" placeholderTextColor={theme.muted} maxLength={80} style={fieldStyle} />
          </View>

          {!!error ? (
            <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
              <ThemedText style={[styles.errorText, { color: theme.danger }]}>{error}</ThemedText>
              {overlapPrompt ? <View style={styles.options}>
                <Pressable onPress={() => chooseMode("edit_current")} style={[styles.option, { borderColor: theme.primary }]}><ThemedText style={[styles.optionText, { color: theme.primary }]}>Edit current cycle</ThemedText></Pressable>
                <Pressable onPress={() => chooseMode("start_next")} style={[styles.option, { borderColor: theme.primary }]}><ThemedText style={[styles.optionText, { color: theme.primary }]}>Start next cycle</ThemedText></Pressable>
              </View> : null}
            </View>
          ) : null}

          <Pressable onPress={() => void save()} disabled={saving} style={[styles.saveButton, { backgroundColor: theme.primary, opacity: saving ? 0.55 : 1 }]}>
            <ThemedText style={[styles.saveText, { color: theme.onPrimary }]}>{saving ? "Saving…" : mode === "edit_current" ? "Update allowance" : "Save allowance cycle"}</ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 24 },
  field: { marginBottom: 19, gap: 8 },
  label: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, fontFamily: "IBMPlexSans_400Regular", fontSize: 15 },
  amountInput: { minHeight: 58, fontFamily: "IBMPlexSans_700Bold", fontSize: 25 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { minHeight: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 13, justifyContent: "center" },
  optionText: { fontFamily: "IBMPlexSans_500Medium", fontSize: 12 },
  error: { padding: 12, borderRadius: 10, marginBottom: 14, gap: 10 },
  errorText: { fontFamily: "IBMPlexSans_500Medium", fontSize: 13 },
  saveButton: { minHeight: 52, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 4 },
  saveText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15 },
});
