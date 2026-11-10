import { useState, type ComponentProps, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { ScreenLayout } from "@/components/screen-layout";
import { ThemedText } from "@/components/themed-text";
import { navBarSpace } from "@/constants/layout";
import { useSettings } from "@/hooks/use-settings";
import type { SettingsPreferences } from "@/domain/types";

type IconName = ComponentProps<typeof SymbolView>["name"];
type PrefKey = keyof SettingsPreferences;

const optionLabels: Partial<Record<PrefKey, Record<string, string>>> = {
  numberFormat: { comma: "1,234.56", dot: "1.234,56" },
  symbolPlacement: { before: "Before amount", after: "After amount", hidden: "Hidden" },
  dateFormat: { DMY: "DD/MM/YYYY", MDY: "MM/DD/YYYY", YMD: "YYYY-MM-DD", DMMM: "D MMM YYYY" },
  firstDayOfWeek: { sunday: "Sunday", monday: "Monday" },
  textSize: { default: "Default", large: "Large" },
  defaultPaymentMethod: { cash: "Cash", gcash: "GCash", maya: "Maya", bank_transfer: "Bank", other: "Other" },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}>
    <ThemedText style={styles.sectionHeading}>{title.toUpperCase()}</ThemedText>
    {children}
  </View>;
}

function SettingRow({ icon, title, subtitle, value, onPress, toggle, disabled = false }: {
  icon: IconName; title: string; subtitle?: string; value?: string; onPress?: () => void;
  toggle?: { value: boolean; onChange: (value: boolean) => void }; disabled?: boolean;
}) {
  const currentValue = toggle ? (toggle.value ? "On" : "Off") : value ?? subtitle ?? "Not set";
  return <Pressable
    disabled={!onPress || disabled}
    onPress={onPress}
    accessibilityRole={toggle ? "switch" : onPress ? "button" : "text"}
    accessibilityLabel={title + ", " + currentValue}
    accessibilityState={toggle ? { checked: toggle.value, disabled } : { disabled: disabled || !onPress }}
    style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
  >
    <View style={styles.iconCircle}><SymbolView name={icon} tintColor="#2563EB" size={20} /></View>
    <View style={styles.rowText}>
      <ThemedText style={styles.rowTitle}>{title}</ThemedText>
      {subtitle ? <ThemedText style={styles.rowSubtitle}>{subtitle}</ThemedText> : null}
    </View>
    {toggle ? <Switch value={toggle.value} onValueChange={toggle.onChange} trackColor={{ false: "#CBD5E1", true: "#93BDFB" }} thumbColor={toggle.value ? "#2563EB" : "#FFFFFF"} /> :
      <View style={styles.trailing}>
        {value ? <ThemedText style={styles.rowValue}>{value}</ThemedText> : null}
        {onPress ? <SymbolView name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }} tintColor="#94A3B8" size={17} /> : null}
      </View>}
  </Pressable>;
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
        text: optionLabels[key]?.[value] ?? value,
        onPress: () => void update({ preferences: { ...settings.preferences, [key]: value } }),
        style: value === current ? "default" as const : "default" as const,
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  };
  const toggle = (key: PrefKey, value: boolean) => {
    if (settings) void update({ preferences: { ...settings.preferences, [key]: value } });
  };

  return <ScreenLayout title="Settings" subtitle="">
    <ScrollView
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingBottom: navBarSpace(insets.bottom) + 32 }]}
    >
      {loading || !settings ? <ThemedText style={styles.loading}>Loading settings…</ThemedText> : <>
        <Section title="Regional">
          <SettingRow icon="dollarsign.circle" title="Currency" value={settings.currency === "PHP" ? "PHP · ₱" : settings.currency} onPress={() => Alert.alert("Currency", "Choose a currency.", ["PHP", "USD", "EUR", "SGD"].map((currency) => ({ text: currency, onPress: () => void update({ currency: currency as typeof settings.currency }) })).concat([{ text: "Cancel", style: "cancel" as const }]))} />
          <SettingRow icon="number" title="Number format" value={optionLabels.numberFormat?.[settings.preferences.numberFormat]} onPress={() => choose("numberFormat", "Number format", ["comma", "dot"])} />
          <SettingRow icon="textformat" title="Currency symbol" value={optionLabels.symbolPlacement?.[settings.preferences.symbolPlacement]} onPress={() => choose("symbolPlacement", "Currency symbol placement", ["before", "after", "hidden"])} />
          <SettingRow icon="calendar" title="Show decimals" toggle={{ value: settings.preferences.showDecimals, onChange: (v) => toggle("showDecimals", v) }} />
          <SettingRow icon="calendar" title="Date format" value={optionLabels.dateFormat?.[settings.preferences.dateFormat]} onPress={() => choose("dateFormat", "Date format", ["DMY", "MDY", "YMD", "DMMM"])} />
          <SettingRow icon="calendar.badge.clock" title="First day of the week" value={settings.preferences.firstDayOfWeek === "monday" ? "Monday" : "Sunday"} onPress={() => choose("firstDayOfWeek", "First day of the week", ["sunday", "monday"])} />
        </Section>

        <Section title="Expenses">
          <SettingRow icon="square.grid.2x2" title="Categories" subtitle="Manage names, colors and order" disabled />
          <SettingRow icon="creditcard" title="Payment methods" subtitle="Cash, GCash, Maya, Bank and custom" disabled />
          <SettingRow icon="tag" title="Default category" subtitle="Choose a category for new expenses" disabled />
          <SettingRow icon="creditcard" title="Default payment method" value={optionLabels.defaultPaymentMethod?.[settings.preferences.defaultPaymentMethod]} onPress={() => choose("defaultPaymentMethod", "Default payment method", ["cash", "gcash", "maya", "bank_transfer", "other"])} />
        </Section>

        <Section title="Notifications">
          <SettingRow icon="bell.badge" title="Budget alert at 80%" toggle={{ value: settings.preferences.budgetAlert80, onChange: (v) => toggle("budgetAlert80", v) }} />
          <SettingRow icon="bell" title="Budget alert at 100%" toggle={{ value: settings.preferences.budgetAlert100, onChange: (v) => toggle("budgetAlert100", v) }} />
          <SettingRow icon="sun.max" title="Daily reminder" subtitle={settings.preferences.dailyReminderTime} toggle={{ value: settings.preferences.dailyReminderEnabled, onChange: (v) => toggle("dailyReminderEnabled", v) }} />
          <SettingRow icon="calendar.badge.clock" title="Weekly summary" subtitle="Choose day and time" toggle={{ value: settings.preferences.weeklySummary, onChange: (v) => toggle("weeklySummary", v) }} />
          <SettingRow icon="moon" title="Quiet hours" subtitle={settings.preferences.quietHoursStart + " – " + settings.preferences.quietHoursEnd} toggle={{ value: settings.preferences.quietHoursEnabled, onChange: (v) => toggle("quietHoursEnabled", v) }} />
        </Section>

        <Section title="Appearance and feel">
          <SettingRow icon="textformat.size" title="Text size" value={optionLabels.textSize?.[settings.preferences.textSize]} onPress={() => choose("textSize", "Text size", ["default", "large"])} />
          <SettingRow icon="hand.tap" title="Haptic feedback" toggle={{ value: settings.preferences.haptics, onChange: (v) => toggle("haptics", v) }} />
          <SettingRow icon="figure.walk" title="Reduce motion" toggle={{ value: settings.preferences.reduceMotion, onChange: (v) => toggle("reduceMotion", v) }} />
        </Section>

        <Section title="Privacy and security">
          <SettingRow icon="lock" title="App lock" subtitle="Passcode and biometrics" disabled />
          <SettingRow icon="eye.slash" title="Hide balance" subtitle="Hide the balance on Home" toggle={{ value: settings.preferences.hideBalance, onChange: (v) => toggle("hideBalance", v) }} />
          <SettingRow icon="rectangle.on.rectangle.slash" title="Hide app preview" subtitle="Hide content in the app switcher" toggle={{ value: settings.preferences.hideAppPreview, onChange: (v) => toggle("hideAppPreview", v) }} />
        </Section>

        <Section title="Data">
          <SettingRow icon="arrow.up.doc" title="Back up data" subtitle="Create an encrypted backup" disabled />
          <SettingRow icon="arrow.down.doc" title="Restore from backup" disabled />
          <SettingRow icon="tablecells" title="Export to CSV" subtitle="Choose a date range" disabled />
          <SettingRow icon="square.and.arrow.down" title="Import from CSV" subtitle="Skip duplicates by default" disabled />
          <SettingRow icon="internaldrive" title="Storage used" value="Calculating unavailable" />
          <SettingRow icon="trash" title="Delete all data" subtitle="Permanently erase local data" disabled />
        </Section>

        <Section title="Gastador Unlock">
          <SettingRow icon="lock.open" title="Unlock Gastador" subtitle="Unlock premium features" disabled />
          <SettingRow icon="arrow.clockwise" title="Restore purchases" disabled />
          <ThemedText style={styles.note}>Your personal data and exports remain yours.</ThemedText>
        </Section>

        <Section title="Help and about">
          <SettingRow icon="book" title="How it works" subtitle="Replay the welcome walkthrough" onPress={() => Alert.alert("Walkthrough", "Replay onboarding from the Developer section for now.")} />
          <SettingRow icon="envelope" title="Send feedback" subtitle="Email support" disabled />
          <SettingRow icon="hand.raised" title="Privacy policy" disabled />
          <SettingRow icon="doc.text" title="Terms" disabled />
          <SettingRow icon="doc.text.magnifyingglass" title="Open-source licenses" onPress={() => Alert.alert("Open-source licenses", "Third-party license details are available in the app dependencies.")} />
          <Pressable style={styles.versionRow} accessibilityRole="button" accessibilityLabel={"Version " + version + ". Tap seven times to reveal developer options."} onPress={() => { const next = versionTaps + 1; setVersionTaps(next); if (next >= 7) setDeveloperVisible(true); }}>
            <ThemedText style={styles.rowTitle}>Version</ThemedText>
            <ThemedText style={styles.rowValue}>{version}</ThemedText>
          </Pressable>
        </Section>

        {developerVisible ? <Section title="Developer">
          <SettingRow icon="arrow.counterclockwise" title="Replay onboarding" onPress={() => Alert.alert("Replay onboarding", "Onboarding reset action is not wired yet.")} />
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
  content: { paddingHorizontal: 20, paddingTop: 10, gap: 14 },
  section: { borderRadius: 24, backgroundColor: "#F3F7FF", paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
  sectionHeading: { color: "#475569", fontFamily: "IBMPlexSans_700Bold", fontSize: 13, letterSpacing: 0.65, marginBottom: 3 },
  row: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.52 },
  iconCircle: { width: 40, height: 40, borderRadius: 15, backgroundColor: "#E3EDFF", alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: "#0F172A", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 17 },
  rowSubtitle: { color: "#475569", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  rowValue: { color: "#475569", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  trailing: { flexDirection: "row", alignItems: "center", gap: 6 },
  note: { color: "#475569", fontFamily: "IBMPlexSans_400Regular", fontSize: 13, paddingVertical: 8 },
  versionRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  loading: { padding: 20, color: "#475569" },
});
