import { useEffect, useRef, useState } from "react";
import { useIsFocused, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenLayout } from "@/components/screen-layout";
import { SHEET_GAP } from "@/constants/layout";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { recognizeText } from "expo-ocr-kit";
import { parseReceiptText, type ReceiptExtraction } from "@/domain/receipt-ocr";
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";


export default function ScanScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ReceiptExtraction | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (focused && permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [focused, permission, requestPermission]);

  async function readReceipt(uri: string) {
    setBusy(true);
    setError("");
    setExtraction(null);
    try {
      const result = await recognizeText(uri);
      const parsed = parseReceiptText(result.text);
      if (!result.text.trim()) {
        setError("No readable text was found. Try a brighter, sharper photo or enter the expense manually.");
      } else {
        setExtraction(parsed);
        if (!parsed.amount) setError("Receipt text was detected, but the total wasn't clear. Please enter or correct it yourself.");
      }
    } catch (ocrError) {
      console.error("Receipt OCR failed:", ocrError);
      setError("Gastador couldn't read this photo. Try retaking it or use manual entry.");
    } finally {
      setBusy(false);
    }
  }

  function continueWithExtractedDetails() {
    router.push({
      pathname: "/new-expense",
      params: {
        amount: extraction?.amount ?? "",
        merchant: extraction?.merchant ?? "",
        date: extraction?.date ?? "",
      },
    });
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
    <ScreenLayout title="Scan Receipt" subtitle="Take a clear photo of your receipt, then enter the expense details." onBack={() => router.back()} stackScreen>
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
            <Pressable onPress={() => { setReceiptUri(null); setExtraction(null); setError(""); }} accessibilityRole="button" style={[styles.action, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <SymbolView name={{ ios: "arrow.counterclockwise", android: "refresh", web: "refresh" }} tintColor={theme.text} size={18} />
              <ThemedText style={styles.actionText}>Retake</ThemedText>
            </Pressable>
            <Pressable onPress={continueManualEntry} accessibilityRole="button" style={[styles.action, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
              <ThemedText style={[styles.actionText, { color: "#FFFFFF" }]}>Enter expense details</ThemedText>
            </Pressable>
          </View>
          <View style={[styles.extractionPanel, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <ThemedText style={styles.extractionTitle}>Detected details</ThemedText>
            {busy ? <ThemedText type="small" themeColor="muted">Reading receipt on this device…</ThemedText> : extraction ? (
              <>
                <View style={styles.extractionRow}><ThemedText type="small" themeColor="muted">Total</ThemedText><ThemedText style={styles.extractionValue}>{extraction.amount ? `₱${extraction.amount}` : "Not detected"}</ThemedText></View>
                <View style={styles.extractionRow}><ThemedText type="small" themeColor="muted">Merchant</ThemedText><ThemedText style={styles.extractionValue}>{extraction.merchant ?? "Not detected"}</ThemedText></View>
                <View style={styles.extractionRow}><ThemedText type="small" themeColor="muted">Date</ThemedText><ThemedText style={styles.extractionValue}>{extraction.date ?? "Not detected"}</ThemedText></View>
                <ThemedText type="small" themeColor="muted">Check every field before saving. Receipt layouts and print quality can affect recognition.</ThemedText>
              </>
            ) : <ThemedText type="small" themeColor="muted">Waiting to read the receipt…</ThemedText>}
          </View>
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

      {!!error && (
        <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
          <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>
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
  extractionPanel: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  extractionTitle: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14 },
  extractionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  extractionValue: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14, flexShrink: 1, textAlign: "right" },
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
