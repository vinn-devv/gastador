import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { onTabBarScroll } from "@/components/tab-bar-visibility";

export default function ScanScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      onScroll={onTabBarScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.header}>
        <ThemedText style={[styles.brand, { color: theme.primary }]}>
          GastadorApp
        </ThemedText>
        <ThemedText style={styles.title}>Scan receipt</ThemedText>
        <ThemedText type="small" themeColor="muted">
          Capture a receipt to log an expense.
        </ThemedText>
      </View>

      <View style={[styles.modeSwitch, { backgroundColor: theme.surface }]}>
        <View style={[styles.modeActive, { backgroundColor: theme.primary }]}>
          <ThemedText style={styles.modeActiveText}>Receipt</ThemedText>
        </View>
        <View style={styles.modeInactive}>
          <ThemedText type="small" themeColor="muted">
            QR / Code
          </ThemedText>
        </View>
      </View>

      <View style={[styles.preview, { backgroundColor: "#142432" }]}>
        <View style={styles.frame}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
          <View style={styles.scanLine} />
        </View>
        <ThemedText style={styles.hint}>
          Align your receipt within the frame
        </ThemedText>
      </View>

      <View style={styles.bottom}>
        <ThemedText type="small" themeColor="muted">
          Prefer to add it yourself?
        </ThemedText>
        <Pressable
          onPress={() => router.push("/new-expense")}
          style={[styles.manualButton, { backgroundColor: theme.surface }]}
        >
          <ThemedText style={[styles.manualText, { color: theme.primary }]}>
            Add expense manually
          </ThemedText>
          <SymbolView
            name={{
              ios: "arrow.right",
              android: "arrow_forward",
              web: "arrow_forward",
            }}
            tintColor={theme.primary}
            size={16}
          />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 30,
    flexGrow: 1,
  },
  header: { gap: 5, marginBottom: 22 },
  brand: { fontFamily: "IBMPlexSans_700Bold", fontSize: 13, marginBottom: 7 },
  title: { fontFamily: "IBMPlexSans_700Bold", fontSize: 27, lineHeight: 34 },
  modeSwitch: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 13,
    marginBottom: 16,
  },
  modeActive: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modeActiveText: {
    color: "#FFFFFF",
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 12,
  },
  modeInactive: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  preview: {
    flex: 1,
    minHeight: 390,
    borderRadius: 19,
    padding: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: "100%",
    maxWidth: 280,
    aspectRatio: 0.82,
    borderWidth: 1,
    borderColor: "#65A8D5",
    borderRadius: 13,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  cornerTL: {
    position: "absolute",
    top: -1,
    left: -1,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#8CC7EE",
  },
  cornerTR: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: "#8CC7EE",
  },
  cornerBL: {
    position: "absolute",
    bottom: -1,
    left: -1,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#8CC7EE",
  },
  cornerBR: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: "#8CC7EE",
  },
  scanLine: { width: "84%", height: 1, backgroundColor: "#8CC7EE" },
  hint: {
    color: "#D7E7F2",
    fontFamily: "IBMPlexSans_500Medium",
    fontSize: 11,
    marginTop: 16,
  },
  bottom: { alignItems: "center", gap: 13, paddingTop: 23 },
  manualButton: {
    minHeight: 49,
    width: "100%",
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  manualText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13 },
});
