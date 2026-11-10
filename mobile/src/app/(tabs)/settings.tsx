import { useCallback, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenLayout } from "@/components/screen-layout";
import { navBarSpace } from "@/constants/layout";
import { useFocusEffect, useRouter, type Href } from "expo-router";
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
import { getSettings, saveSettings } from "@/data/repository";
import type { AppSettings, BudgetMethod, CurrencyCode } from "@/domain/types";

const CURRENCIES: CurrencyCode[] = ["PHP", "USD", "EUR", "SGD"];
const BUDGET_METHODS: { value: BudgetMethod; label: string; detail: string }[] =
  [
    {
      value: "daily_pace",
      label: "Daily safe amount",
      detail: "See a suggested amount for each remaining day.",
    },
    {
      value: "category_limits",
      label: "Category limits",
      detail: "Organise spending around category budgets.",
    },
    {
      value: "simple_total",
      label: "Just what is left",
      detail: "Keep the focus on your remaining balance.",
    },
  ];

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        setLoading(true);
        try {
          const current = await getSettings(db);
          if (!active) return;
          setSettings(current);
          setName(current.displayName);
        } catch (error) {
          console.error("Failed to load settings:", error);
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

  async function update(patch: Partial<AppSettings>) {
    if (!settings) return;
    setSaving(true);
    setMessage("");
    const next = { ...settings, ...patch };
    try {
      await saveSettings(db, next);
      setSettings(next);
      setMessage("Saved on this device.");
    } catch (error) {
      console.error("Failed to save settings:", error);
      setMessage("Couldn't save that change. Please try again.");
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
    <ScreenLayout title="Settings" subtitle="Your preferences are saved locally on this device.">
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingBottom: navBarSpace(insets.bottom) }]}
    >

      {loading || !settings ? (
        <ThemedText type="small" themeColor="muted">
          Loading settings…
        </ThemedText>
      ) : (
        <>
          <View
            style={[
              styles.section,
              { backgroundColor: theme.surface, borderColor: theme.line },
            ]}
          >
            <ThemedText style={styles.sectionTitle}>Profile</ThemedText>
            <ThemedText style={styles.label}>Your name</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              accessibilityLabel="Your name"
              placeholder="Name for your greeting"
              placeholderTextColor={theme.muted}
              maxLength={80}
              style={fieldStyle}
            />
            <Pressable
              disabled={saving || name.trim() === settings.displayName}
              accessibilityRole="button"
              accessibilityLabel="Save name"
              onPress={() => void update({ displayName: name.trim() })}
              style={[
                styles.saveButton,
                {
                  backgroundColor:
                    saving || name.trim() === settings.displayName
                      ? theme.sunken
                      : theme.primary,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.saveText,
                  {
                    color:
                      saving || name.trim() === settings.displayName
                        ? theme.textSecondary
                        : theme.onPrimary,
                  },
                ]}
              >
                Save name
              </ThemedText>
            </Pressable>
          </View>

          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <ThemedText style={styles.sectionTitle}>
              Display currency
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="muted"
              style={styles.sectionHint}
            >
              This changes how amounts are shown, not the value of existing
              records.
            </ThemedText>
            <View style={styles.choices}>
              {CURRENCIES.map((currency) => {
                const selected = settings.currency === currency;
                return (
                  <Pressable
                    key={currency}
                    onPress={() => void update({ currency })}
                    disabled={saving || selected}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[
                      styles.choice,
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
                        styles.choiceText,
                        { color: selected ? theme.primary : theme.text },
                      ]}
                    >
                      {currency}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <ThemedText style={styles.sectionTitle}>Budget method</ThemedText>
            <View style={styles.methodList}>
              {BUDGET_METHODS.map((method) => {
                const selected = settings.budgetMethod === method.value;
                return (
                  <Pressable
                    key={method.value}
                    onPress={() => void update({ budgetMethod: method.value })}
                    disabled={saving || selected}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[
                      styles.method,
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
                        styles.methodTitle,
                        { color: selected ? theme.primary : theme.text },
                      ]}
                    >
                      {method.label}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={{
                        color: theme.textSecondary,
                      }}
                    >
                      {method.detail}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {!!message && (
            <ThemedText type="small" themeColor="muted" style={styles.message}>
              {message}
            </ThemedText>
          )}
        </>
      )}

      {__DEV__ && !loading && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Replay welcome onboarding"
          onPress={() => router.push("/onboarding" as Href)}
          style={[styles.replayRow, { borderColor: theme.line }]}
        >
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.privacyTitle}>Replay welcome</ThemedText>
            <ThemedText type="small" themeColor="muted">Preview the first-launch introduction.</ThemedText>
          </View>
          <ThemedText style={{ color: theme.primary, fontFamily: "IBMPlexSans_700Bold" }}>›</ThemedText>
        </Pressable>
      )}

      <View style={[styles.privacy, { borderColor: theme.line }]}>
        <ThemedText style={styles.privacyTitle}>
          Your data stays on this device
        </ThemedText>
        <ThemedText type="small" themeColor="muted">
          Gastador stores your expenses and preferences locally. Back up your
          data regularly so you can restore it if you change or lose your phone.
        </ThemedText>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 24 },
  section: { marginBottom: 22, paddingVertical: 8, borderRadius: 0, borderWidth: 0, gap: 2 },
  sectionTitle: {
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 19,
    marginBottom: 12,
  },
  sectionHint: { marginTop: -6, marginBottom: 12 },
  label: { fontFamily: "IBMPlexSans_500Medium", fontSize: 13, marginBottom: 7 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontFamily: "IBMPlexSans_400Regular",
    fontSize: 15,
  },
  saveButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  saveText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  choice: {
    minWidth: 68,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
  },
  choiceText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  methodList: { gap: 9 },
  method: { minHeight: 68, borderWidth: 1, borderRadius: 9, padding: 13, gap: 4, justifyContent: "center" },
  methodTitle: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  message: { marginTop: -12, marginBottom: 20 },
  replayRow: { minHeight: 58, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  privacy: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 17, gap: 5 },
  privacyTitle: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
});
