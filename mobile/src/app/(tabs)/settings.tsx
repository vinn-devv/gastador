import { useState, type ComponentProps, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { ScreenLayout } from "@/components/screen-layout";
import { ThemedText } from "@/components/themed-text";
import { navBarSpace } from "@/constants/layout";
import { useSettings } from "@/hooks/use-settings";
import type { SettingsPreferences, CurrencyCode } from "@/domain/types";

type IconName = ComponentProps<typeof SymbolView>["name"];
type PrefKey = keyof SettingsPreferences;

const labels: Partial<Record<PrefKey, Record<string, string>>> = {
  numberFormat: { comma: "1,234.56", dot: "1.234,56" },
  symbolPlacement: { before: "Before amount", after: "After amount", hidden: "Hidden" },
  dateFormat: { DMY: "DD/MM/YYYY", MDY: "MM/DD/YYYY", YMD: "YYYY-MM-DD", DMMM: "D MMM YYYY" },
  firstDayOfWeek: { sunday: "Sunday", monday: "Monday" },
  textSize: { default: "Default", large: "Large" },
  defaultPaymentMethod: { cash: "Cash", gcash: "GCash", maya: "Maya", bank_transfer: "Bank", other: "Other" },
};
const currencyOptions: { code: CurrencyCode; label: string }[] = [
  { code: "PHP", label: "PHP · ₱" }, { code: "USD", label: "USD · $" },
  { code: "EUR", label: "EUR · €" }, { code: "SGD", label: "SGD · $" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}>
    <ThemedText style={styles.sectionHeading}>{title.toUpperCase()}</ThemedText>
    <View style={styles.card}>{children}</View>
  </View>;
}

function SettingRow({ icon, title, subtitle, value, onPress, toggle, danger = false, disabled = false }: {
  icon: IconName; title: string; subtitle?: string; value?: string; onPress?: () => void;
  toggle?: { value: boolean; onChange: (value: boolean) => void }; danger?: boolean; disabled?: boolean;
}) {
  const current = toggle ? (toggle.value ? "On" : "Off") : value ?? subtitle ?? "Unavailable";
  const content = <>
    <View style={[styles.iconCircle, danger && styles.dangerIcon]}><SymbolView name={icon} tintColor={danger ? "#DC2626" : "#2563EB"} size={20} /></View>
    <View style={styles.rowText}>
      <ThemedText style={[styles.rowTitle, danger && styles.dangerText]}>{title}</ThemedText>
      {subtitle ? <ThemedText style={styles.rowSubtitle}>{subtitle}</ThemedText> : null}
    </View>
    {toggle ? <Switch value={toggle.value} onValueChange={toggle.onChange} trackColor={{ false: "#CBD5E1", true: "#93BDFB" }} thumbColor={toggle.value ? "#2563EB" : "#FFFFFF"} /> :
      <View style={styles.trailing}>
        {value ? <ThemedText style={styles.rowValue}>{value}</ThemedText> : null}
        {onPress ? <SymbolView name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }} tintColor="#94A3B8" size={17} /> : null}
      </View>}
  </>;
  const common = {
    accessibilityRole: (toggle ? "switch" : onPress ? "button" : "text") as "switch" | "button" | "text",
    accessibilityLabel: title + ", " + current,
    accessibilityState: toggle ? { checked: toggle.value, disabled } : { disabled: disabled || !onPress },
  };
  if (toggle) return <View style={[styles.row, disabled && styles.disabled]} {...common}>{content}</View>;
  return <Pressable disabled={!onPress || disabled} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]} {...common}>{content}</Pressable>;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, loading, update } = useSettings();
  const [versionTaps, setVersionTaps] = useState(0);
  const [developerVisible, setDeveloperVisible] = useState(__DEV__);
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const choose = (key: PrefKey, title: string, values: string[]) => {
    if (!settings) return;
    const current = String(settings.preferences[key]);
    Alert.alert(title, "Choose your preferred setting.", [
      ...values.map((value) => ({
        text: (labels[key]?.[value] ?? value) + (value === current ? "  ✓" : ""),
        onPress: () => void update({ preferences: { ...settings.preferences, [key]: value } }),
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  };
  const chooseCurrency = () => Alert.alert("Currency", "Choose the currency used to display amounts.", [
    ...currencyOptions.map((item) => ({ text: item.label + (settings?.currency === item.code ? "  ✓" : ""), onPress: () => void update({ currency: item.code }) })),
    { text: "Cancel", style: "cancel" },
  ]);
  const toggle = (key: PrefKey, value: boolean) => {
    if (settings) void update({ preferences: { ...settings.preferences, [key]: value } });
  };
  const value = (key: PrefKey) => labels[key]?.[String(settings?.preferences[key])] ?? String(settings?.preferences[key] ?? "");

  return <ScreenLayout title="Settings" subtitle="">
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingBottom: navBarSpace(insets.bottom) + 32 }]}>
      {loading || !settings ? <ThemedText style={styles.loading}>Loading settings…</ThemedText> : <>
        <Section title="Regional">
          <SettingRow icon="dollarsign.circle" title="Currency" value={currencyOptions.find((item) => item.code === settings.currency)?.label ?? settings.currency} onPress={chooseCurrency} />
          <SettingRow icon="number" title="Number format" value={value("numberFormat")} onPress={() => choose("numberFormat", "Number format", ["comma", "dot"])} />
          <SettingRow icon="textformat" title="Currency symbol placement" value={value("symbolPlacement")} onPress={() => choose("symbolPlacement", "Currency symbol placement", ["before", "after", "hidden"])} />
          <SettingRow icon="123.rectangle" title="Show decimals" toggle={{ value: settings.preferences.showDecimals, onChange: (v) => toggle("showDecimals", v) }} />
          <SettingRow icon="calendar" title="Date format" value={value("dateFormat")} onPress={() => choose("dateFormat", "Date format", ["DMY", "MDY", "YMD", "DMMM"])} />
          <SettingRow icon="calendar.badge.clock" title="First day of the week" value={value("firstDayOfWeek")} onPress={() => choose("firstDayOfWeek", "First day of the week", ["sunday", "monday"])} />
        </Section>

        <Section title="Expenses">
          <SettingRow icon="square.grid.2x2" title="Categories" subtitle="Manage expense categories" disabled />
          <SettingRow icon="creditcard" title="Payment methods" subtitle="Cash, GCash, Maya, Bank and Other" disabled />
          <SettingRow icon="tag" title="Default category" subtitle="Choose a default on the expense form" disabled />
          <SettingRow icon="creditcard" title="Default payment method" value={value("defaultPaymentMethod")} onPress={() => choose("defaultPaymentMethod", "Default payment method", ["cash", "gcash", "maya", "bank_transfer", "other"])} />
        </Section>

        <Section title="Notifications">
          <SettingRow icon="bell.badge" title="Budget alert at 80%" toggle={{ value: settings.preferences.budgetAlert80, onChange: (v) => toggle("budgetAlert80", v) }} />
          <SettingRow icon="bell" title="Budget alert at 100%" toggle={{ value: settings.preferences.budgetAlert100, onChange: (v) => toggle("budgetAlert100", v) }} />
          <SettingRow icon="sun.max" title="Daily reminder" subtitle={settings.preferences.dailyReminderTime} toggle={{ value: settings.preferences.dailyReminderEnabled, onChange: (v) => toggle("dailyReminderEnabled", v) }} />
          <SettingRow icon="calendar.badge.clock" title="Weekly summary" subtitle={"Every " + ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][settings.preferences.weeklySummaryDay] + " · " + settings.preferences.weeklySummaryTime} toggle={{ value: settings.preferences.weeklySummary, onChange: (v) => toggle("weeklySummary", v) }} />
          <SettingRow icon="moon" title="Quiet hours" subtitle={settings.preferences.quietHoursStart + " – " + settings.preferences.quietHoursEnd} toggle={{ value: settings.preferences.quietHoursEnabled, onChange: (v) => toggle("quietHoursEnabled", v) }} />
          <ThemedText style={styles.note}>Notification delivery and time pickers are not connected yet; these preferences are saved locally.</ThemedText>
        </Section>

        <Section title="Appearance and feel">
          <SettingRow icon="textformat.size" title="Text size" value={value("textSize")} onPress={() => choose("textSize", "Text size", ["default", "large"])} />
          <SettingRow icon="hand.tap" title="Haptic feedback" toggle={{ value: settings.preferences.haptics, onChange: (v) => toggle("haptics", v) }} />
          <SettingRow icon="figure.walk.motion" title="Reduce motion" toggle={{ value: settings.preferences.reduceMotion, onChange: (v) => toggle("reduceMotion", v) }} />
        </Section>

        <Section title="Privacy and security">
          <SettingRow icon="lock" title="App lock" subtitle="Passcode or biometrics · Not configured" disabled />
          <SettingRow icon="eye.slash" title="Hide balance" subtitle="Balance privacy preference" toggle={{ value: settings.preferences.hideBalance, onChange: (v) => toggle("hideBalance", v) }} />
          <SettingRow icon="rectangle.on.rectangle.slash" title="Hide app preview" subtitle="App switcher privacy preference" toggle={{ value: settings.preferences.hideAppPreview, onChange: (v) => toggle("hideAppPreview", v) }} />
        </Section>

        <Section title="Data">
          <SettingRow icon="arrow.up.doc" title="Back up data" subtitle="Backup workflow not available yet" disabled />
          <SettingRow icon="arrow.down.doc" title="Restore from backup" subtitle="Restore workflow not available yet" disabled />
          <SettingRow icon="tablecells" title="Export to CSV" subtitle="CSV export workflow not available yet" disabled />
          <SettingRow icon="square.and.arrow.down" title="Import from CSV" subtitle="CSV import workflow not available yet" disabled />
          <SettingRow icon="internaldrive" title="Storage used" value="Not calculated yet" />
          <SettingRow icon="trash" title="Delete all data" subtitle="Data deletion workflow not available yet" danger disabled />
        </Section>

        <Section title="Gastador Unlock">
          <SettingRow icon="lock.open" title="Unlock Gastador" subtitle="Purchases are not configured yet" disabled />
          <SettingRow icon="arrow.clockwise" title="Restore purchases" subtitle="Purchases are not configured yet" disabled />
          <ThemedText style={styles.note}>Your personal data and exports are never locked.</ThemedText>
        </Section>

        <Section title="Help and about">
          <SettingRow icon="book" title="How it works" subtitle="Replay the welcome walkthrough" onPress={() => Alert.alert("How it works", "Use Developer → Replay onboarding to restart the walkthrough.")} />
          <SettingRow icon="envelope" title="Send feedback" subtitle="Feedback email is not configured yet" disabled />
          <SettingRow icon="hand.raised" title="Privacy policy" subtitle="Policy URL is not configured yet" disabled />
          <SettingRow icon="doc.text" title="Terms" subtitle="Terms URL is not configured yet" disabled />
          <SettingRow icon="doc.text.magnifyingglass" title="Open-source licenses" onPress={() => Alert.alert("Open-source licenses", "License details are available from the third-party packages used by Gastador.")} />
          <Pressable style={styles.versionRow} accessibilityRole="button" accessibilityLabel={"Version " + version + ". Tap seven times to reveal developer options."} onPress={() => { const next = versionTaps + 1; setVersionTaps(next); if (next >= 7) setDeveloperVisible(true); }}>
            <ThemedText style={styles.rowTitle}>Version</ThemedText><ThemedText style={styles.rowValue}>{version}</ThemedText>
          </Pressable>
        </Section>

        {developerVisible ? <Section title="Developer">
          <SettingRow icon="arrow.counterclockwise" title="Replay onboarding" onPress={() => Alert.alert("Replay onboarding", "The onboarding reset action is not connected yet.")} />
          <SettingRow icon="flag" title="Reset onboarding flag" disabled />
          <SettingRow icon="lock.open" title="Toggle unlocked" disabled />
          <SettingRow icon="tray.and.arrow.down" title="Seed sample data" disabled />
        </Section> : null}
      </>}
    </ScrollView>
  </ScreenLayout>;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 18 },
  section: { gap: 8 },
  sectionHeading: { color: "#475569", fontFamily: "IBMPlexSans_700Bold", fontSize: 13, letterSpacing: 0.65, paddingHorizontal: 4 },
  card: { borderRadius: 24, backgroundColor: "#F3F7FF", paddingHorizontal: 16, paddingVertical: 8 },
  row: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.55 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E3EDFF", alignItems: "center", justifyContent: "center" },
  dangerIcon: { backgroundColor: "#FEE2E2" },
  dangerText: { color: "#DC2626" },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: "#0F172A", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 17 },
  rowSubtitle: { color: "#475569", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  rowValue: { color: "#475569", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  trailing: { flexDirection: "row", alignItems: "center", gap: 6 },
  note: { color: "#475569", fontFamily: "IBMPlexSans_400Regular", fontSize: 13, paddingVertical: 8 },
  versionRow: { minHeight: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  loading: { padding: 20, color: "#475569" },
});
