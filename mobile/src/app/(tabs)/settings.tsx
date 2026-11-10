import { useState, type ComponentProps, type ReactNode } from "react";
import { useRouter, type Href } from "expo-router";
import Constants from "expo-constants";
import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenLayout } from "@/components/screen-layout";
import { ThemedText } from "@/components/themed-text";
import { navBarSpace } from "@/constants/layout";
import { FEATURES } from "@/constants/features";
import { useSettings } from "@/hooks/use-settings";
import type { CurrencyCode, BudgetMethod } from "@/domain/types";

type SettingIcon = ComponentProps<typeof SymbolView>["name"];
const CURRENCIES: CurrencyCode[] = ["PHP", "USD", "EUR", "SGD"];
const METHODS: { value: BudgetMethod; label: string }[] = [
  { value: "daily_pace", label: "Daily pace" },
  { value: "category_limits", label: "Category limits" },
  { value: "simple_total", label: "Remaining" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}>
    <ThemedText style={styles.sectionHeading}>{title.toUpperCase()}</ThemedText>
    {children}
  </View>;
}

function Row({ icon, title, subtitle, value, onPress }: {
  icon: SettingIcon; title: string; subtitle?: string; value?: string; onPress?: () => void;
}) {
  return <Pressable
    disabled={!onPress}
    onPress={onPress}
    accessibilityRole={onPress ? "button" : "text"}
    accessibilityLabel={value ? title + ", " + value : title}
    style={({ pressed }) => [styles.row, pressed && onPress ? styles.pressed : null]}
  >
    <View style={styles.iconCircle}><SymbolView name={icon} tintColor="#2563EB" size={20} /></View>
    <View style={styles.rowText}>
      <ThemedText style={styles.rowTitle}>{title}</ThemedText>
      {subtitle ? <ThemedText style={styles.rowSubtitle}>{subtitle}</ThemedText> : null}
    </View>
    {value ? <ThemedText style={styles.rowValue}>{value}</ThemedText> : null}
    {onPress ? <SymbolView name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }} tintColor="#64748B" size={17} /> : null}
  </Pressable>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, loading, saving, saved, update } = useSettings();
  const [nickname, setNickname] = useState("");
  const [versionTaps, setVersionTaps] = useState(0);
  const [developerVisible, setDeveloperVisible] = useState(__DEV__);
  const displayName = settings?.displayName.trim() || "Gastador";

  return <ScreenLayout title="Settings" subtitle="Your preferences stay on this device.">
    <ScrollView
      style={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingBottom: navBarSpace(insets.bottom) + 24 }]}
    >
      {loading || !settings ? <ThemedText style={styles.rowSubtitle}>Loading settings…</ThemedText> : <>
        <View style={styles.profileCard}>
          <View style={styles.avatar}><ThemedText style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</ThemedText></View>
          <View style={styles.profileText}>
            <TextInput
              value={nickname || displayName}
              onChangeText={setNickname}
              onEndEditing={() => {
                const next = nickname.trim() || "Gastador";
                if (next !== displayName) void update({ displayName: next });
                setNickname("");
              }}
              accessibilityLabel="Nickname"
              placeholder="Gastador"
              placeholderTextColor="#64748B"
              maxLength={40}
              maxFontSizeMultiplier={1.3}
              style={styles.nickname}
            />
            <ThemedText style={styles.rowSubtitle}>Stored on this device</ThemedText>
          </View>
          {saving ? <ThemedText style={styles.rowSubtitle}>Saving…</ThemedText> : saved ? <ThemedText style={styles.saved}>Saved</ThemedText> : null}
        </View>

        <Section title="Allowance">
          <Row
            icon={{ ios: "wallet.pass", android: "account_balance_wallet", web: "account_balance_wallet" }}
            title="Manage allowance"
            subtitle="View and manage your allowance cycles"
            onPress={() => router.navigate("/allowance" as Href)}
          />
        </Section>

        <Section title="Budget">
          <ThemedText style={styles.helper}>Overview style</ThemedText>
          <View style={styles.methodChoices}>
            {METHODS.map((method) => {
              const selected = settings.budgetMethod === method.value;
              return <Pressable
                key={method.value}
                onPress={() => void update({ budgetMethod: method.value })}
                accessibilityRole="radio"
                accessibilityLabel={"Budget method, " + method.label}
                accessibilityState={{ selected }}
                style={[styles.methodChip, selected && styles.methodChipSelected]}
              >
                <ThemedText style={[styles.methodText, selected && styles.methodTextSelected]}>{method.label}</ThemedText>
              </Pressable>;
            })}
          </View>
          {FEATURES.goals ? <Row icon={{ ios: "target", android: "track_changes", web: "track_changes" }} title="Savings goals" onPress={() => router.push("/goals" as Href)} /> : null}
          {FEATURES.limits ? <Row icon={{ ios: "slider.horizontal.3", android: "tune", web: "tune" }} title="Category limits" onPress={() => router.push("/category-limits" as Href)} /> : null}
        </Section>

        <Section title="Currency and format">
          <View style={styles.currencyChoices}>
            {CURRENCIES.map((currency) => {
              const selected = settings.currency === currency;
              return <Pressable
                key={currency}
                onPress={() => void update({ currency })}
                accessibilityRole="radio"
                accessibilityLabel={"Currency, " + currency}
                accessibilityState={{ selected }}
                style={[styles.currencyChip, selected && styles.currencyChipSelected]}
              >
                <ThemedText style={[styles.currencyText, selected && styles.currencyTextSelected]}>{currency}</ThemedText>
              </Pressable>;
            })}
          </View>
          <ThemedText style={styles.helper}>Changes how amounts are displayed, not the stored value.</ThemedText>
        </Section>

        {FEATURES.notifications ? <Section title="Notifications">
          <Row icon={{ ios: "bell", android: "notifications", web: "notifications" }} title="Notification settings" onPress={() => router.push("/notifications" as Href)} />
        </Section> : null}

        {FEATURES.backup || FEATURES.restore || FEATURES.exportCsv || FEATURES.importCsv ? <Section title="Data">
          {FEATURES.backup ? <Row icon={{ ios: "icloud.and.arrow.up", android: "cloud_upload", web: "cloud_upload" }} title="Back up my data" /> : null}
          {FEATURES.restore ? <Row icon={{ ios: "icloud.and.arrow.down", android: "cloud_download", web: "cloud_download" }} title="Restore from backup" /> : null}
          {FEATURES.exportCsv ? <Row icon={{ ios: "tablecells", android: "table_view", web: "table_view" }} title="Export to CSV" /> : null}
          {FEATURES.importCsv ? <Row icon={{ ios: "doc.badge.plus", android: "upload_file", web: "upload_file" }} title="Import from CSV" /> : null}
        </Section> : null}

        <Section title="Help and about">
          <Row icon={{ ios: "book", android: "menu_book", web: "menu_book" }} title="How it works" subtitle="Replay the welcome walkthrough" onPress={() => router.push("/onboarding" as Href)} />
          <Pressable
            onPress={() => {
              const count = versionTaps + 1;
              setVersionTaps(count);
              if (count >= 7) setDeveloperVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={"Version " + (Constants.expoConfig?.version ?? "1.0.0")}
            style={styles.versionRow}
          >
            <ThemedText style={styles.rowTitle}>Version</ThemedText>
            <ThemedText style={styles.rowValue}>{Constants.expoConfig?.version ?? "1.0.0"}</ThemedText>
          </Pressable>
        </Section>

        {developerVisible ? <Section title="Developer">
          <Row icon={{ ios: "arrow.counterclockwise", android: "replay", web: "replay" }} title="Replay onboarding" onPress={() => router.push("/onboarding" as Href)} />
        </Section> : null}
      </>}
    </ScrollView>
  </ScreenLayout>;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 10, gap: 12 },
  profileCard: { minHeight: 100, borderRadius: 24, backgroundColor: "#F3F7FF", padding: 18, flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#1E3A8A", fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 22 },
  profileText: { flex: 1, gap: 3 },
  nickname: { minHeight: 30, padding: 0, color: "#0F172A", fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 20 },
  section: { borderRadius: 24, backgroundColor: "#F3F7FF", paddingHorizontal: 20, paddingVertical: 16, gap: 8 },
  sectionHeading: { color: "#475569", fontFamily: "IBMPlexSans_700Bold", fontSize: 13, letterSpacing: 0.6 },
  row: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12 },
  pressed: { transform: [{ scale: 0.98 }] },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E3EDFF", alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: "#0F172A", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 17 },
  rowSubtitle: { color: "#475569", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  rowValue: { color: "#475569", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  helper: { color: "#64748B", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  methodChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  methodChip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  methodChipSelected: { backgroundColor: "#DBEAFE" },
  methodText: { color: "#475569", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  methodTextSelected: { color: "#1E3A8A" },
  currencyChoices: { flexDirection: "row", gap: 8 },
  currencyChip: { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  currencyChipSelected: { backgroundColor: "#DBEAFE" },
  currencyText: { color: "#475569", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  currencyTextSelected: { color: "#1E3A8A" },
  saved: { color: "#2563EB", fontFamily: "IBMPlexSans_700Bold", fontSize: 12 },
  versionRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
