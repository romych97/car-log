import { File } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import type { DocumentPickerAsset } from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { SQLiteDatabase } from "expo-sqlite";

import { buildBackupPayload } from "@/backup/database";
import { normalizeBackupRaw } from "@/backup/serialize";

function backupFileName(date = new Date()): string {
  const stamp = date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `carlog-backup-${stamp}.json`;
}

export async function exportAndShareBackup(db: SQLiteDatabase): Promise<void> {
  const payload = await buildBackupPayload(db);
  const json = JSON.stringify(payload, null, 2);
  const uri = `${FileSystem.cacheDirectory}${backupFileName()}`;
  await FileSystem.writeAsStringAsync(uri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (Platform.OS === "web") {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = backupFileName();
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("sharing_unavailable");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/json",
    dialogTitle: backupFileName(),
  });
}

async function readTextFromDocumentAsset(
  asset: DocumentPickerAsset,
): Promise<string> {
  if (Platform.OS === "web") {
    if (asset.file) {
      return asset.file.text();
    }
    const response = await fetch(asset.uri);
    if (!response.ok) {
      throw new Error("read_failed");
    }
    return response.text();
  }

  try {
    return await new File(asset.uri).text();
  } catch {
    return FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }
}

export async function readBackupFromPicker(): Promise<string> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "application/json",
      "text/json",
      "text/plain",
      "application/octet-stream",
    ],
    copyToCacheDirectory: true,
    multiple: false,
    base64: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    throw new Error("canceled");
  }

  const raw = await readTextFromDocumentAsset(result.assets[0]);
  return normalizeBackupRaw(raw);
}
