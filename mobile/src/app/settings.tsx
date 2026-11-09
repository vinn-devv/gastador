import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
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
  const theme = useTheme();
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
    <ScrollView
      contentContainerStyle={styles.content}
      onScroll={onTabBarScroll}
      scrollEventThrottle={16}
    >
      <ThemedText type="small" themeColor="muted">
        MAKE IT YOURS
      </ThemedText>
      <ThemedText style={styles.title}>Settings</ThemedText>
      <ThemedText type="small" themeColor="muted" style={styles.subtitle}>
        Your preferences are saved locally on this device.
      </ThemedText>

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
              placeholder="Name for your greeting"
              placeholderTextColor={theme.muted}
              maxLength={80}
              style={fieldStyle}
            />
            <Pressable
              disabled={saving || name.trim() === settings.displayName}
              onPress={() => void update({ displayName: name.trim() })}
              style={[
                styles.saveButton,
                {
                  backgroundColor: theme.primary,
                  opacity:
                    saving || name.trim() === settings.displayName ? 0.45 : 1,
                },
              ]}
            >
              <ThemedText style={[styles.saveText, { color: theme.onPrimary }]}>
                Save name
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.section}>
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
                        { color: selected ? theme.onPrimary : theme.text },
                      ]}
                    >
                      {currency}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Budget method</ThemedText>
            <View style={styles.methodList}>
              {BUDGET_METHODS.map((method) => {
                const selected = settings.budgetMethod === method.value;
                return (
                  <Pressable
                    key={method.value}
                    onPress={() => void update({ budgetMethod: method.value })}
                    disabled={saving || selected}
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
                        { color: selected ? theme.onPrimary : theme.text },
                      ]}
                    >
                      {method.label}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={{
                        color: selected ? theme.onPrimary : theme.muted,
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
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 124 },
  title: {
    fontFamily: "IBMPlexSans_700Bold",
    fontSize: 29,
    lineHeight: 36,
    marginTop: 2,
  },
  subtitle: { marginTop: 3, marginBottom: 24 },
  section: { marginBottom: 18, padding: 15, borderRadius: 16, borderWidth: 1 },
  sectionTitle: {
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 17,
    marginBottom: 12,
  },
  sectionHint: { marginTop: -6, marginBottom: 12 },
  label: { fontFamily: "IBMPlexSans_500Medium", fontSize: 13, marginBottom: 7 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    fontFamily: "IBMPlexSans_400Regular",
    fontSize: 15,
  },
  saveButton: {
    alignSelf: "flex-start",
    minHeight: 43,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  saveText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  choice: {
    minWidth: 68,
    minHeight: 43,
    borderWidth: 1,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
  },
  choiceText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  methodList: { gap: 9 },
  method: { borderWidth: 1, borderRadius: 13, padding: 14, gap: 3 },
  methodTitle: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  message: { marginTop: -12, marginBottom: 20 },
  privacy: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 17, gap: 5 },
  privacyTitle: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
});
