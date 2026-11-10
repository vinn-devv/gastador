import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { archiveCategory, createCategory, createCustomPaymentMethod, deleteCustomPaymentMethod, getCategories, getCustomPaymentMethods, renameCustomPaymentMethod, reorderCategory, updateCategory } from "@/data/repository";
import Constants from "expo-constants";
import { ScreenLayout } from "@/components/screen-layout";
import { ThemedText } from "@/components/themed-text";
import { navBarSpace } from "@/constants/layout";
import { useSettings } from "@/hooks/use-settings";
import type { Category, CustomPaymentMethod, SettingsPreferences, CurrencyCode } from "@/domain/types";

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
  const db = useSQLiteContext();
  const { settings, loading, update } = useSettings();
  const [versionTaps, setVersionTaps] = useState(0);
  const [developerVisible, setDeveloperVisible] = useState(__DEV__);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState("#3B82F6");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [methodsOpen, setMethodsOpen] = useState(false);
  const [methods, setMethods] = useState<CustomPaymentMethod[]>([]);
  const [methodName, setMethodName] = useState("");
  const [editingMethod, setEditingMethod] = useState<string | null>(null);
  const version = Constants.expoConfig?.version ?? "1.0.0";
  useEffect(() => { void getCustomPaymentMethods(db).then(setMethods).catch((error) => console.error("Could not load payment methods:", error)); }, [db]);

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
  const openCategories = async () => {
    try { setCategories(await getCategories(db)); setCategoryName(""); setEditingCategory(null); setCategoriesOpen(true); }
    catch (error) { console.error("Could not load categories:", error); Alert.alert("Categories unavailable", "Please try again."); }
  };
  const saveCategory = async () => {
    try {
      if (editingCategory) await updateCategory(db, editingCategory, { name: categoryName, color: categoryColor });
      else await createCategory(db, categoryName, categoryColor);
      setCategories(await getCategories(db)); setCategoryName(""); setEditingCategory(null);
    } catch (error) { Alert.alert("Could not save category", error instanceof Error ? error.message : "Please try again."); }
  };
  const openMethods = async () => {
    try { setMethods(await getCustomPaymentMethods(db)); setMethodName(""); setEditingMethod(null); setMethodsOpen(true); }
    catch (error) { console.error("Could not load payment methods:", error); Alert.alert("Payment methods unavailable", "Please try again."); }
  };
  const saveMethod = async () => {
    try {
      if (editingMethod) await renameCustomPaymentMethod(db, editingMethod, methodName);
      else await createCustomPaymentMethod(db, methodName);
      setMethods(await getCustomPaymentMethods(db)); setMethodName(""); setEditingMethod(null);
    } catch (error) { Alert.alert("Could not save payment method", error instanceof Error ? error.message : "Please try again."); }
  };
  const chooseDefaultMethod = () => {
    const options = [
      { value: "cash", label: "Cash" }, { value: "gcash", label: "GCash" },
      { value: "maya", label: "Maya" }, { value: "bank_transfer", label: "Bank" }, { value: "other", label: "Other" },
      ...methods.map((item) => ({ value: "custom:" + item.id, label: item.name })),
    ];
    Alert.alert("Default payment method", "Choose the method preselected for new expenses.", [
      ...options.map((item) => ({ text: item.label + (settings?.preferences.defaultPaymentMethod === item.value ? "  ✓" : ""), onPress: () => settings && void update({ preferences: { ...settings.preferences, defaultPaymentMethod: item.value as SettingsPreferences["defaultPaymentMethod"] } }) })),
      { text: "Cancel", style: "cancel" },
    ]);
  };
  const chooseCategory = async () => {
    if (!settings) return;
    try {
      const categories = (await getCategories(db)).filter((item) => !item.archivedAt);
      Alert.alert("Default category", "Choose the category preselected for new expenses.", [
        ...categories.map((item) => ({ text: item.name + (settings.preferences.defaultCategoryId === item.id ? "  ✓" : ""), onPress: () => void update({ preferences: { ...settings.preferences, defaultCategoryId: item.id } }) })),
        { text: "Cancel", style: "cancel" },
      ]);
    } catch (error) {
      console.error("Could not load categories:", error);
      Alert.alert("Categories unavailable", "Please try again.");
    }
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
          <SettingRow icon="square.grid.2x2" title="Categories" subtitle="Add, rename, recolor, reorder or archive" onPress={() => void openCategories()} />
          <SettingRow icon="creditcard" title="Payment methods" subtitle="Manage built-in and custom methods" onPress={() => void openMethods()} />
          <SettingRow icon="tag" title="Default category" value={settings.preferences.defaultCategoryId || "First available"} onPress={() => void chooseCategory()} />
          <SettingRow icon="creditcard" title="Default payment method" value={methods.find((item) => settings.preferences.defaultPaymentMethod === "custom:" + item.id)?.name ?? value("defaultPaymentMethod")} onPress={chooseDefaultMethod} />
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

    <Modal visible={methodsOpen} animationType="slide" transparent onRequestClose={() => setMethodsOpen(false)}>
      <View style={styles.modalBackdrop}><View style={styles.modalCard}>
        <View style={styles.modalHeader}><ThemedText style={styles.modalTitle}>Payment methods</ThemedText><Pressable accessibilityRole="button" accessibilityLabel="Close payment methods" onPress={() => setMethodsOpen(false)}><ThemedText style={styles.modalClose}>Done</ThemedText></Pressable></View>
        <ThemedText style={styles.note}>Built-in methods: Cash, GCash, Maya, Bank and Other. Add your own below.</ThemedText>
        {methods.map((item) => <View key={item.id} style={styles.categoryItem}>
          <Pressable style={styles.categoryNameArea} accessibilityRole="button" accessibilityLabel={"Rename " + item.name} onPress={() => { setEditingMethod(item.id); setMethodName(item.name); }}><ThemedText style={styles.rowTitle}>{item.name}</ThemedText></Pressable>
          <Pressable style={styles.smallAction} accessibilityRole="button" accessibilityLabel={"Delete " + item.name} onPress={() => Alert.alert("Remove payment method?", "Past expenses will keep this method in their history.", [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: async () => { await deleteCustomPaymentMethod(db, item.id); setMethods(await getCustomPaymentMethods(db)); if (settings.preferences.defaultPaymentMethod === "custom:" + item.id) void update({ preferences: { ...settings.preferences, defaultPaymentMethod: "cash" } }); } }])}><SymbolView name="trash" size={17} tintColor="#DC2626" /></Pressable>
        </View>)}
        <ThemedText style={styles.editorHeading}>{editingMethod ? "RENAME METHOD" : "NEW METHOD"}</ThemedText>
        <TextInput value={methodName} onChangeText={setMethodName} placeholder="e.g. Credit card" placeholderTextColor="#94A3B8" style={styles.categoryInput} maxLength={32} accessibilityLabel="Payment method name" />
        <View style={styles.modalActions}><Pressable style={styles.secondaryButton} onPress={() => { setEditingMethod(null); setMethodName(""); }}><ThemedText style={styles.secondaryButtonText}>New</ThemedText></Pressable><Pressable style={styles.primaryButton} onPress={() => void saveMethod()}><ThemedText style={styles.primaryButtonText}>{editingMethod ? "Save changes" : "Add method"}</ThemedText></Pressable></View>
      </View></View>
    </Modal>
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
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.38)" },
  modalCard: { maxHeight: "88%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, gap: 12 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { color: "#0F172A", fontFamily: "IBMPlexSans_700Bold", fontSize: 22 },
  modalClose: { color: "#2563EB", fontFamily: "IBMPlexSans_700Bold", fontSize: 15 },
  categoryList: { maxHeight: 300 },
  categoryItem: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0" },
  categorySwatch: { width: 13, height: 13, borderRadius: 7 },
  categoryNameArea: { flex: 1, justifyContent: "center", minHeight: 48 },
  smallAction: { width: 34, height: 40, alignItems: "center", justifyContent: "center" },
  editorHeading: { color: "#475569", fontFamily: "IBMPlexSans_700Bold", fontSize: 12, letterSpacing: 0.6 },
  categoryInput: { minHeight: 48, borderRadius: 14, backgroundColor: "#F1F5F9", paddingHorizontal: 14, color: "#0F172A", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 16 },
  palette: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  paletteDot: { width: 27, height: 27, borderRadius: 14 },
  paletteSelected: { borderWidth: 3, borderColor: "#0F172A" },
  modalActions: { flexDirection: "row", gap: 10 },
  secondaryButton: { minHeight: 48, minWidth: 72, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF1FF" },
  secondaryButtonText: { color: "#1D4ED8", fontFamily: "IBMPlexSans_700Bold", fontSize: 15 },
  primaryButton: { flex: 1, minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#2563EB" },
  primaryButtonText: { color: "#FFFFFF", fontFamily: "IBMPlexSans_700Bold", fontSize: 15 },
});
