import type { ReactNode } from "react";
import { Text, View } from "react-native";

import type { createFormScreenStyles } from "@/theme/screenStyles";

type FormStyles = ReturnType<typeof createFormScreenStyles>;

export function FormField({
  label,
  children,
  styles,
}: {
  label: string;
  children: ReactNode;
  styles: FormStyles;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}
