import { useCallback, useEffect, useRef, useState } from "react";
import { useIsFocused, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenLayout } from "@/components/screen-layout";
import { navBarSpace } from "@/constants/layout";
import { Camera, CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export default function ScanScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [lastCode, setLastCode] = useState("");

  useEffect(() => {
    if (focused && permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [focused, permission, requestPermission]);

  const onBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    if (result.data && result.data !== lastCode) {
      setLastCode(result.data);
      setQrValue(result.data);
      setError("");
    }
  }, [lastCode]);

  async function captureReceipt() {
    if (!cameraRef.current || busy || !cameraReady) return;
    setBusy(true);
    setError("");
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.88, skipProcessing: false });
      if (photo?.uri) setPhotoUri(photo.uri);
    } catch {
      setError("The camera couldn't capture that image. Try again or upload a QR image.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadQR() {
    setError("");
    setQrValue("");
    setLastCode("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled || !result.assets[0]?.uri) return;
      setBusy(true);
      const codes = await Camera.scanFromURLAsync(result.assets[0].uri, ["qr"]);
      if (codes.length > 0) {
        setQrValue(codes[0].data);
      } else {
        setError("No QR code was found in that image. Choose a clearer image with the full code visible.");
      }
    } catch {
      setError("The QR image couldn't be read. Try another image or scan it with the camera.");
    } finally {
      setBusy(false);
    }
  }

  const clearCapture = () => {
    setPhotoUri(null);
    setCameraReady(false);
    setQrValue("");
    setLastCode("");
    setError("");
  };

  return (
    <ScreenLayout title="Scan QR" subtitle="Scan a payment QR or upload one from your gallery." onBack={() => router.back()}>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: navBarSpace(insets.bottom) }]} keyboardShouldPersistTaps="handled">

      <View style={styles.actions}>
        <Pressable onPress={() => router.push("/new-expense")} style={[styles.action, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
          <SymbolView name={{ ios: "square.and.pencil", android: "edit", web: "edit" }} tintColor={theme.primary} size={18} />
          <ThemedText style={[styles.actionText, { color: theme.primary }]}>Add manually</ThemedText>
        </Pressable>
        <Pressable onPress={() => void uploadQR()} disabled={busy} style={[styles.action, { backgroundColor: theme.surface, borderColor: theme.line, opacity: busy ? 0.55 : 1 }]}>
          <SymbolView name={{ ios: "qrcode", android: "qr_code", web: "qr_code" }} tintColor={theme.text} size={18} />
          <ThemedText style={styles.actionText}>Upload QR from gallery</ThemedText>
        </Pressable>
      </View>

      {permission?.granted && focused ? (
        <View style={styles.cameraShell}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} contentFit="contain" style={styles.photo} />
          ) : (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              active={focused}
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onCameraReady={() => setCameraReady(true)}
              onBarcodeScanned={onBarcodeScanned}
              onMountError={() => setError("The camera couldn't start. Check camera access in your phone settings and try again.")}
            />
          )}
          <View pointerEvents="none" style={styles.frame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          {!photoUri && (
            <View style={styles.cameraControls}>
              <Pressable accessibilityRole="button" accessibilityLabel={torch ? "Turn flash off" : "Turn flash on"} onPress={() => setTorch((value) => !value)} style={styles.roundControl}>
                <SymbolView name={{ ios: torch ? "bolt.fill" : "bolt.slash", android: "flash_on", web: "flash_on" }} tintColor="#FFFFFF" size={20} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Capture receipt" disabled={busy || !cameraReady} onPress={() => void captureReceipt()} style={[styles.shutter, busy && { opacity: 0.5 }]}>
                <View style={styles.shutterInner} />
              </Pressable>
            </View>
          )}
          {photoUri && (
            <View style={styles.photoActions}>
              <Pressable onPress={clearCapture} style={styles.secondaryButton}><ThemedText style={styles.secondaryText}>Retake</ThemedText></Pressable>
              <Pressable onPress={() => router.push("/new-expense")} style={[styles.primaryButton, { backgroundColor: theme.primary }]}><ThemedText style={styles.primaryText}>Add details manually</ThemedText></Pressable>
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.permissionPanel, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <SymbolView name={{ ios: "camera.fill", android: "photo_camera", web: "photo_camera" }} tintColor={theme.primary} size={30} />
          <ThemedText style={styles.permissionTitle}>{permission?.canAskAgain === false ? "Camera access is off" : "Allow camera access"}</ThemedText>
          <ThemedText type="small" themeColor="muted">{permission?.canAskAgain === false ? "Enable camera permission in your phone settings to scan and capture receipts." : "Gastador uses the camera only when you open Scan. Photos stay on this device."}</ThemedText>
          {permission?.canAskAgain === false ? (
            <Pressable onPress={() => void Linking.openSettings()} style={[styles.primaryButton, { backgroundColor: theme.primary }]}><ThemedText style={styles.primaryText}>Open settings</ThemedText></Pressable>
          ) : (
            <Pressable onPress={() => void requestPermission()} style={[styles.primaryButton, { backgroundColor: theme.primary }]}><ThemedText style={styles.primaryText}>Enable camera</ThemedText></Pressable>
          )}
        </View>
      )}

      {!!qrValue && (
        <View style={[styles.result, { backgroundColor: theme.tealSoft, borderColor: theme.teal }]}>
          <View style={styles.resultHeading}>
            <ThemedText style={[styles.resultTitle, { color: theme.text }]}>QR code detected</ThemedText>
            <Pressable onPress={() => { setQrValue(""); setLastCode(""); }}><ThemedText style={{ color: theme.primary }}>Clear</ThemedText></Pressable>
          </View>
          <ThemedText selectable style={styles.qrText}>{qrValue}</ThemedText>
          <ThemedText type="small" themeColor="muted">This shows the QR payload only. No payment is sent and nothing is saved.</ThemedText>
        </View>
      )}

      {!!error && (
        <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
          <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>
        </View>
      )}
      <ThemedText type="small" themeColor="muted" style={styles.privacy}>QR codes are read on this device. No payment is sent.</ThemedText>
    </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 130, gap: 16 },
  header: { gap: 4 },
  title: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 30, lineHeight: 36 },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 6, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 8 },
  actionText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 12 },
  cameraShell: { height: 430, borderRadius: 6, overflow: "hidden", backgroundColor: "#233E59", justifyContent: "center" },
  camera: { ...StyleSheet.absoluteFill },
  photo: { width: "100%", height: "100%" },
  frame: { ...StyleSheet.absoluteFill, margin: 28 },
  corner: { position: "absolute", width: 30, height: 30, borderColor: "#FFFFFF", borderWidth: 3 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 10 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 10 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 10 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 10 },
  cameraControls: { position: "absolute", left: 0, right: 0, bottom: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-evenly" },
  roundControl: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  shutter: { width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#FFFFFF" },
  photoActions: { position: "absolute", bottom: 18, left: 14, right: 14, flexDirection: "row", gap: 10 },
  secondaryButton: { minHeight: 48, flex: 1, backgroundColor: "rgba(20,30,45,0.75)", borderRadius: 8, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#FFFFFF", fontFamily: "IBMPlexSans_600SemiBold" },
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
