import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { ScreenLayout } from "@/components/screen-layout";
import { ThemedText } from "@/components/themed-text";
import { navBarSpace } from "@/constants/layout";

const guides = [
  {
    number: "01",
    title: "Set your allowance",
    description: "Start by entering the money you receive and choosing how long it needs to last. Gastador uses your allowance cycle to calculate your available balance and daily safe amount.",
    icon: "wallet",
  },
  {
    number: "02",
    title: "Record every expense",
    description: "Add an expense with its amount, category, date and payment method. You can use Add expense for manual entries or open Scan for supported scanning options.",
    icon: "receipt",
  },
  {
    number: "03",
    title: "Keep track of your balance",
    description: "Your Home screen gives you a quick view of how much you have spent and how much allowance remains. Gastador prevents an expense that would exceed your remaining allowance.",
    icon: "chart.pie",
  },
  {
    number: "04",
    title: "Review your activity",
    description: "Open Activity to check your recorded expenses and look back at where your money went.",
    icon: "list.bullet",
  },
  {
    number: "05",
    title: "Understand your spending",
    description: "Open Insights for a fuller breakdown of your spending, including totals and spending by category. Use it to notice habits and make better decisions for your next allowance cycle.",
    icon: "chart.bar",
  },
  {
    number: "06",
    title: "Make Gastador yours",
    description: "In Settings, choose your currency and number or date formats, manage expense categories and payment methods, and set your defaults.",
    icon: "gearshape",
  },
];

export default function HowGastadorWorksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScreenLayout title="How Gastador works" subtitle="A simple guide to managing your allowance.">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: navBarSpace(insets.bottom) + 28 }]}
      >
        <View style={styles.intro}>
          <ThemedText style={styles.introTitle}>Your money, made easier to follow.</ThemedText>
          <ThemedText style={styles.introText}>
            Gastador helps you record expenses, keep an eye on your remaining allowance, and understand your spending—all in one place.
          </ThemedText>
        </View>

        {guides.map((item) => (
          <View key={item.number} style={styles.guideRow}>
            <View style={styles.iconCircle}>
              <SymbolView name={item.icon} tintColor="#2563EB" size={21} />
            </View>
            <View style={styles.guideCopy}>
              <View style={styles.titleLine}>
                <ThemedText style={styles.number}>{item.number}</ThemedText>
                <ThemedText style={styles.guideTitle}>{item.title}</ThemedText>
              </View>
              <ThemedText style={styles.description}>{item.description}</ThemedText>
            </View>
          </View>
        ))}

        <View style={styles.tip}>
          <SymbolView name="lightbulb" tintColor="#2563EB" size={20} />
          <ThemedText style={styles.tipText}>
            Tip: Record expenses as soon as you make them. Keeping your entries up to date makes your balance and insights more useful.
          </ThemedText>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 20 },
  intro: { padding: 18, borderRadius: 22, backgroundColor: "#EEF4FF", gap: 7 },
  introTitle: { color: "#1E3A8A", fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 20, lineHeight: 27 },
  introText: { color: "#475569", fontFamily: "IBMPlexSans_400Regular", fontSize: 14, lineHeight: 21 },
  guideRow: { flexDirection: "row", alignItems: "flex-start", gap: 13 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#EAF1FF", alignItems: "center", justifyContent: "center" },
  guideCopy: { flex: 1, gap: 5, paddingTop: 1 },
  titleLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  number: { color: "#60A5FA", fontFamily: "IBMPlexSans_800ExtraBold", fontSize: 12 },
  guideTitle: { color: "#0F172A", fontFamily: "IBMPlexSans_700Bold", fontSize: 16 },
  description: { color: "#64748B", fontFamily: "IBMPlexSans_400Regular", fontSize: 13, lineHeight: 20 },
  tip: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 15, borderRadius: 18, backgroundColor: "#F3F7FF" },
  tipText: { flex: 1, color: "#475569", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 13, lineHeight: 20 },
});
