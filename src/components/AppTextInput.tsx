"use no memo";

import { TextInput, type TextInputProps } from "react-native";

/** Controlled TextInput — opt out of React Compiler (IME / Cyrillic composition). */
export function AppTextInput(props: TextInputProps) {
  return <TextInput {...props} />;
}
