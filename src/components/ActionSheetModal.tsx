import { Modal, Pressable, StyleSheet, Text } from "react-native";

type Option = {
  key: string;
  label: string;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title: string;
  options: Option[];
  onClose: () => void;
};

export function ActionSheetModal({ visible, title, options, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {options.map((opt) => (
            <Pressable
              key={opt.key}
              style={styles.row}
              onPress={() => {
                onClose();
                opt.onPress();
              }}
            >
              <Text style={styles.rowText}>{opt.label}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>×</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
    color: "#666",
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  rowText: {
    fontSize: 18,
    color: "#208AEF",
  },
  cancel: {
    alignItems: "center",
    paddingTop: 12,
  },
  cancelText: {
    fontSize: 28,
    color: "#999",
  },
});
