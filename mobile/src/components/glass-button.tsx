import { useState, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { GlassSurface } from "@/components/glass-surface";

type Props = {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Pill-shaped glass button that squishes slightly when pressed.
 *
 *   <GlassButton label="Scan receipt" onPress={...} />
 */
export function GlassButton({ label, onPress, icon, disabled, style }: Props) {
  const [scale] = useState(() => new Animated.Value(1));

  const to = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      damping: 14,
      stiffness: 260,
      useNativeDriver: true,
    }).start();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => to(0.95)}
      onPressOut={() => to(1)}
    >
      <Animated.View
        style={[{ transform: [{ scale }], opacity: disabled ? 0.5 : 1 }, style]}
      >
        <GlassSurface radius={999} interactive>
          <View style={styles.row}>
            {icon}
            <Text style={styles.label}>{label}</Text>
          </View>
        </GlassSurface>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    paddingHorizontal: 22,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    color: "#FFFFFF",
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 15,
  },
});
