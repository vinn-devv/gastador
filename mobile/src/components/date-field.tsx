import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { ThemedText } from "@/components/themed-text";
import { formatDate, isValidDate } from "@/domain/dates";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maximumDate?: string;
  minimumDate?: string;
  error?: string;
  accessibilityLabel?: string;
  maxFontSizeMultiplier?: number;
};

function dateFromIso(value: string): Date {
  if (!isValidDate(value)) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function isoFromDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DateField({ label, value, onChange, maximumDate, minimumDate, error, accessibilityLabel, maxFontSizeMultiplier }: Props) {
  const theme = useTheme();
  const [iosVisible, setIosVisible] = useState(false);
  const [draft, setDraft] = useState(dateFromIso(value));
  const selected = dateFromIso(value);
  const min = minimumDate ? dateFromIso(minimumDate) : undefined;
  const max = maximumDate ? dateFromIso(maximumDate) : undefined;

  function openPicker() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: selected,
        mode: "date",
        display: "calendar",
        minimumDate: min,
        maximumDate: max,
        onChange: (event: DateTimePickerEvent, chosen?: Date) => {
          if (event.type !== "set" || !chosen) return;
          onChange(isoFromDate(chosen));
        },
      });
      return;
    }
    setDraft(selected);
    setIosVisible(true);
  }

  return (
    <View style={styles.field}>
      <ThemedText maxFontSizeMultiplier={maxFontSizeMultiplier} style={[styles.label, { color: theme.text }]}>{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={openPicker}
        style={[styles.value, { borderColor: error ? theme.danger : theme.line, backgroundColor: theme.surface }]}
      >
        <ThemedText maxFontSizeMultiplier={maxFontSizeMultiplier} style={[styles.valueText, { color: theme.text }]}>{formatDate(value)}</ThemedText>
        <ThemedText maxFontSizeMultiplier={maxFontSizeMultiplier} style={{ color: theme.primary, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 }}>Change</ThemedText>
      </Pressable>
      {!!error && <ThemedText maxFontSizeMultiplier={maxFontSizeMultiplier} style={[styles.error, { color: theme.danger }]}>{error}</ThemedText>}
      {Platform.OS === "ios" && (
        <Modal visible={iosVisible} transparent animationType="slide" onRequestClose={() => setIosVisible(false)}>
          <Pressable style={styles.backdrop} onPress={() => setIosVisible(false)}>
            <Pressable style={[styles.modal, { backgroundColor: theme.surface }]} onPress={() => undefined}>
              <View style={styles.modalHeader}>
                <ThemedText maxFontSizeMultiplier={maxFontSizeMultiplier} style={[styles.modalTitle, { color: theme.text }]}>{label}</ThemedText>
                <Pressable accessibilityRole="button" onPress={() => { onChange(isoFromDate(draft)); setIosVisible(false); }}>
                  <ThemedText maxFontSizeMultiplier={maxFontSizeMultiplier} style={{ color: theme.primary, fontFamily: "IBMPlexSans_700Bold" }}>Done</ThemedText>
                </Pressable>
              </View>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                minimumDate={min}
                maximumDate={max}
                onChange={(_event, chosen) => { if (chosen) setDraft(chosen); }}
                themeVariant="light"
                accentColor={theme.primary}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  value: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  valueText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15 },
  error: { fontFamily: "IBMPlexSans_400Regular", fontSize: 12 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  modalTitle: { fontFamily: "IBMPlexSans_700Bold", fontSize: 16 },
});
