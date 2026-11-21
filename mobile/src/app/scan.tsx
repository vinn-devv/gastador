import { useEffect, useRef, useState } from "react";
import { useIsFocused, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenLayout } from "@/components/screen-layout";
import { SHEET_GAP } from "@/constants/layout";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { recognizeText } from "expo-ocr-kit";
import { parseReceiptText } from "@/domain/receipt-ocr";
import { createTransaction, getCategories, getSettings } from "@/data/repository";
import { findStandardMatch, suggestCategoryKey } from "@/domain/categories";
import { parseMoney } from "@/domain/money";
import { manilaToday } from "@/domain/dates";
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";


export default function ScanScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (focused && permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [focused, permission, requestPermission]);

  async function readReceipt(uri: string) {
    setBusy(true);
    setError("");
    try {
      const result = await recognizeText(uri);
      const parsed = parseReceiptText(result.text);
      const amountCentavos = parsed.amount ? parseMoney(parsed.amount) : null;
      if (!result.text.trim() || amountCentavos === null || amountCentavos <= 0) {
        setError("Gastador couldn't identify a reliable receipt total. Retake the photo with the total clearly visible, or enter the expense manually. No expense was saved.");
        return;
      }

      const [categories, settings] = await Promise.all([getCategories(db), getSettings(db)]);
      const categoryKey = suggestCategoryKey(
        [parsed.merchant ?? "", parsed.description ?? "", parsed.rawText].join(" "),
      ) ?? "others";
      const category =
        findStandardMatch(categories, categoryKey) ??
        findStandardMatch(categories, "others") ??
        categories.find((item) => !item.archivedAt);

      if (!category) {
        setError("Gastador couldn't find an active expense category. Please add or restore a category in Settings.");
        return;
      }

      await createTransaction(db, {
        amountCentavos,
        date: parsed.date ?? manilaToday(),
        merchant: parsed.merchant ?? "Supermarket",
        categoryId: category.id,
        paymentMethod: settings.preferences.defaultPaymentMethod,
        description: parsed.description,
        source: "receipt",
        ocrStatus: "succeeded",
      });

      Alert.alert(
        "Expense saved",
        `${parsed.merchant ?? "Receipt purchase"} was saved under ${category.name}.`,
        [{ text: "Done", onPress: () => router.back() }],
      );
    } catch (ocrError) {
      console.error("Receipt OCR failed:", ocrError);
      const message = ocrError instanceof Error ? ocrError.message : String(ocrError);
      if (message.includes("Native module 'ExpoOcrKit' is not available")) {
        setError("Receipt scanning needs the installed Gastador Android build. Expo Go does not include the OCR module. Rebuild and launch Gastador with `npx expo run:android`, then try again.");
      } else {
        setError("Gastador couldn't read this photo. Try retaking it or use manual entry.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function captureReceipt() {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    setError("");
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) { setReceiptUri(photo.uri); await readReceipt(photo.uri); }
      else setError("The receipt photo could not be captured. Please try again.");
    } catch {
      setError("The camera couldn't capture your receipt. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function chooseReceiptPhoto() {
    setError("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setReceiptUri(result.assets[0].uri);
        await readReceipt(result.assets[0].uri);
      }
    } catch {
      setError("The receipt photo couldn't be opened. Please try another image.");
    }
  }

  function continueManualEntry() {
    router.push("/new-expense");
  }

  return (
    <ScreenLayout title="Scan Receipt" subtitle="Capture a receipt and Gastador will read its details on this device." onBack={() => router.back()} stackScreen>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SHEET_GAP + 24 }]} keyboardShouldPersistTaps="handled">

      <View style={styles.actions}>
        <Pressable onPress={continueManualEntry} style={[styles.action, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
          <SymbolView name={{ ios: "square.and.pencil", android: "edit", web: "edit" }} tintColor={theme.primary} size={18} />
          <ThemedText style={[styles.actionText, { color: theme.primary }]}>Manual entry</ThemedText>
        </Pressable>
        <Pressable onPress={() => void chooseReceiptPhoto()} style={[styles.action, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <SymbolView name={{ ios: "photo", android: "photo_library", web: "photo_library" }} tintColor={theme.text} size={18} />
          <ThemedText style={styles.actionText}>Choose photo</ThemedText>
        </Pressable>
      </View>

      {receiptUri ? (
        <View style={styles.previewShell}>
          <Image source={{ uri: receiptUri }} style={styles.receiptPreview} resizeMode="contain" />
          <View style={styles.previewActions}>
            <Pressable onPress={() => { setReceiptUri(null); setError(""); }} accessibilityRole="button" style={[styles.action, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <SymbolView name={{ ios: "arrow.counterclockwise", android: "refresh", web: "refresh" }} tintColor={theme.text} size={18} />
              <ThemedText style={styles.actionText}>Retake photo</ThemedText>
            </Pressable>
            <Pressable onPress={continueManualEntry} accessibilityRole="button" style={[styles.action, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
              <ThemedText style={[styles.actionText, { color: "#FFFFFF" }]}>Enter manually</ThemedText>
            </Pressable>
          </View>
          {!!error && (
            <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
              <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>
            </View>
          )}
        </View>
      ) : permission?.granted && focused ? (
        <View style={styles.cameraShell}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            active={focused}
            onMountError={() => setError("The camera couldn't start. Check camera access in your phone settings and try again.")}
          />
          <View pointerEvents="none" style={styles.frame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.cameraControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take receipt photo"
              onPress={() => void captureReceipt()}
              disabled={busy}
              style={[styles.captureButton, { opacity: busy ? 0.6 : 1 }]}
            >
              <View style={styles.captureButtonInner} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={[styles.permissionPanel, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <SymbolView name={{ ios: "camera.fill", android: "photo_camera", web: "photo_camera" }} tintColor={theme.primary} size={30} />
          <ThemedText style={styles.permissionTitle}>{permission?.canAskAgain === false ? "Camera access is off" : "Allow camera access"}</ThemedText>
          <ThemedText type="small" themeColor="muted">{permission?.canAskAgain === false ? "Enable camera permission in your phone settings to take receipt photos." : "Gastador uses the camera only when you open Scan. Photos stay on this device."}</ThemedText>
          {permission?.canAskAgain === false ? (
            <Pressable onPress={() => void Linking.openSettings()} style={[styles.primaryButton, { backgroundColor: theme.primary }]}><ThemedText style={styles.primaryText}>Open settings</ThemedText></Pressable>
          ) : (
            <Pressable onPress={() => void requestPermission()} style={[styles.primaryButton, { backgroundColor: theme.primary }]}><ThemedText style={styles.primaryText}>Enable camera</ThemedText></Pressable>
          )}
        </View>
      )}

      <ThemedText type="small" themeColor="muted" style={styles.privacy}>Receipt photos stay on this device. No payment is sent.</ThemedText>
    </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, gap: 16 },
  header: { gap: 4 },
  title: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 30, lineHeight: 36 },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 6, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 8 },
  actionText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 12 },
  cameraShell: { height: 430, borderRadius: 16, overflow: "hidden", backgroundColor: "#233E59", justifyContent: "center" },
  camera: { ...StyleSheet.absoluteFill },
  frame: { ...StyleSheet.absoluteFill, margin: 28 },
  corner: { position: "absolute", width: 30, height: 30, borderColor: "#FFFFFF", borderWidth: 3 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 10 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 10 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 10 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 10 },
  cameraControls: { position: "absolute", left: 0, right: 0, bottom: 18, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  captureButton: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.32)", borderWidth: 3, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  captureButtonInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#FFFFFF" },
  previewShell: { borderRadius: 16, overflow: "hidden", backgroundColor: "#111827", padding: 12, gap: 12 },
  receiptPreview: { width: "100%", height: 390, backgroundColor: "#111827" },
  previewActions: { flexDirection: "row", gap: 10 },
  primaryButton: { minHeight: 48, paddingHorizontal: 16, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
  permissionPanel: { borderWidth: 1, borderRadius: 8, padding: 24, alignItems: "center", gap: 12 },
  permissionTitle: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 17 },
  result: { borderWidth: 1, borderRadius: 8, padding: 16, gap: 9 },
  resultHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  resultTitle: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15 },
  qrText: { fontFamily: "IBMPlexSans_400Regular", fontSize: 13, lineHeight: 19 },
  error: { borderRadius: 8, padding: 13 },
  privacy: { textAlign: "center", marginTop: 2 },
});
