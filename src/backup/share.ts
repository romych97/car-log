import * as DocumentPicker from "expo-document-picker";
import type { DocumentPickerAsset } from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { SQLiteDatabase } from "expo-sqlite";

import { buildBackupPayload } from "@/backup/database";
import { readTextFromUri } from "@/backup/readUri";
import { normalizeBackupRaw } from "@/backup/text";

function backupFileName(date = new Date()): string {
  const stamp = date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `carlog-backup-${stamp}.json`;
}

/** Last export in app cache — same session import without document picker. */
let lastExportCacheUri: string | null = null;

export function getLastExportCacheUri(): string | null {
  return lastExportCacheUri;
}

export async function exportAndShareBackup(db: SQLiteDatabase): Promise<void> {
  const payload = await buildBackupPayload(db);
  const json = JSON.stringify(payload, null, 2);
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("no_cache_dir");
  }
  const uri = `${cacheDir}${backupFileName()}`;
  await FileSystem.writeAsStringAsync(uri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  lastExportCacheUri = uri;

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
  if (Platform.OS === "web" && asset.file) {
    return normalizeBackupRaw(await asset.file.text());
  }
  return readTextFromUri(asset.uri);
}

export async function readBackupFromPicker(): Promise<string> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    copyToCacheDirectory: true,
    multiple: false,
    base64: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    throw new Error("canceled");
  }

  return readTextFromDocumentAsset(result.assets[0]);
}

export async function readLastExportBackup(): Promise<string> {
  if (!lastExportCacheUri) {
    throw new Error("no_last_export");
  }
  const info = await FileSystem.getInfoAsync(lastExportCacheUri);
  if (!info.exists) {
    throw new Error("no_last_export");
  }
  return readTextFromUri(lastExportCacheUri);
}
