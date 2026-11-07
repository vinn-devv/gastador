import { StyleSheet, Text, View } from "react-native";

export default function TransactionsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transactions</Text>
      <Text style={styles.subtitle}>
        Your income and expenses will appear here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F2A6B",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: "#777777",
  },
});
